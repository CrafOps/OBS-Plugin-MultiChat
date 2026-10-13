import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';

function packet(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Packet timeout')), 5000);
    socket.once('message', raw => {
      clearTimeout(timeout);
      resolve(JSON.parse(raw.toString()));
    });
  });
}

test('local bridge authenticates controls, restricts overlay and shuts down', { timeout: 20000 }, async () => {
  const directory = await mkdtemp(join(process.cwd(), '.test-data-'));
  const token = randomBytes(32).toString('hex');
  const port = 21000 + Math.floor(Math.random() * 10000);
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['dist/main.js'], {
    env: { ...process.env, BRIDGE_TOKEN: token, BRIDGE_PORT: String(port), BRIDGE_DATA: directory,
      YOUTUBE_CLIENT_ID: '', YOUTUBE_CLIENT_SECRET: '', YOUTUBE_API_KEY: '' },
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const sockets: WebSocket[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Bridge did not start')), 10000);
      child.stdout.on('data', data => {
        if (String(data).includes('READY')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('exit', code => {
        clearTimeout(timeout);
        reject(new Error(`Bridge startup exited ${code}`));
      });
      child.once('error', reject);
    });
    assert.equal((await fetch(`${origin}/health`)).status, 200);
    assert.equal((await fetch(`${origin}/health`, { headers: { Origin: 'https://evil.invalid' } })).status, 403);
    const page = await fetch(`${origin}/overlay`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy') ?? '', /default-src 'none'/);

    const denied = new WebSocket(`ws://127.0.0.1:${port}/control`);
    sockets.push(denied);
    await new Promise<void>((resolve, reject) => {
      denied.once('unexpected-response', (request, response) => {
        assert.equal(response.statusCode, 403);
        response.resume();
        request.destroy();
        resolve();
      });
      denied.once('open', () => reject(new Error('Unauthorized control was accepted')));
      denied.on('error', () => undefined);
    });

    const control = new WebSocket(`ws://127.0.0.1:${port}/control`, { headers: { Authorization: `Bearer ${token}` } });
    sockets.push(control);
    let overlayUrl = '';
    await new Promise<void>((resolve, reject) => {
      control.on('message', raw => {
        const message = JSON.parse(raw.toString());
        if (message.kind === 'state' && message.overlayUrl) {
          overlayUrl = message.overlayUrl;
          resolve();
        }
      });
      control.once('error', reject);
    });
    const overlay = new WebSocket(`ws://127.0.0.1:${port}/events?token=${new URL(overlayUrl).hash.slice(1)}`, { origin });
    sockets.push(overlay);
    const snapshot = await packet(overlay);
    assert.deepEqual(Object.keys(snapshot.settings as object).sort(), ['overlayLimit', 'overlaySeconds']);
    assert.equal(snapshot.youtube, undefined);
    const alertSocket = new WebSocket(`ws://127.0.0.1:${port}/events?mode=alerts&token=${new URL(overlayUrl).hash.slice(1)}`, { origin });
    sockets.push(alertSocket);
    const alertSnapshot = await packet(alertSocket);
    assert.equal((alertSnapshot.settings as { alerts: { audio: string } }).alerts.audio, 'stream');
    assert.equal((alertSnapshot.settings as Record<string, unknown>).youtubeLiveUrl, undefined);
    const sharingDenied = packet(control);
    control.send(JSON.stringify({ kind: 'sharing', action: 'start', consent: false, requestId: 'no-consent' }));
    assert.equal((await sharingDenied).ok, false);
    const alertReceived = packet(alertSocket);
    const alertResult = packet(control);
    control.send(JSON.stringify({ kind: 'testAlert', type: 'gift', requestId: 'test-gift' }));
    const alertPacket = await alertReceived;
    assert.equal(alertPacket.kind, 'alert');
    assert.equal(alertPacket.test, true);
    assert.equal((await alertResult).ok, true);
    assert.equal((await fetch(`${origin}/sounds/gift?token=wrong`)).status, 403);

    const replyResult = packet(control);
    control.send(JSON.stringify({ kind: 'reply', requestId: 'no-auth', message: 'hello' }));
    const reply = await replyResult;
    assert.equal(reply.ok, false);
    assert.equal(reply.requestId, 'no-auth');

    const invalidResult = packet(control);
    control.send(JSON.stringify({ kind: 'settings', requestId: 'invalid-settings',
      settings: { tiktokUsername: 'invalid handle' } }));
    const invalid = await invalidResult;
    assert.equal(invalid.ok, false);
    assert.match(String(invalid.error), /settings.tiktokUsername/);

    const closed = once(overlay, 'close');
    overlay.send(JSON.stringify({ kind: 'login' }));
    assert.equal((await closed)[0], 1008);
    const exit = once(child, 'exit');
    child.stdin.write('shutdown\n');
    assert.equal((await exit)[0], 0);
  } finally {
    for (const socket of sockets) {
      socket.on('error', () => undefined);
      if (socket.readyState === WebSocket.OPEN) {
        socket.terminate();
      }
    }
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
    await rm(directory, { recursive: true, force: true });
  }
});
