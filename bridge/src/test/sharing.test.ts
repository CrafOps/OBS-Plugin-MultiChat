import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { SharingService } from '../services/sharing.js';

test('sharing needs consent, preserves keys, resets only on request and cannot relay controls',
  { timeout: 20000 }, async () => {
    let stored: unknown;
    const storage = {
      async loadSharing() {
        return stored;
      },
      async saveSharing(value: unknown) {
        stored = structuredClone(value);
      }
    };
    const keys = { id: randomBytes(16).toString('hex'), readKey: randomBytes(32).toString('hex'),
      writeKey: randomBytes(32).toString('hex') };
    let creates = 0;
    let resets = 0;
    const packets: Record<string, any>[] = [];
    const server = createServer((request, response) => {
      response.setHeader('Content-Type', 'application/json');
      if (request.url === '/rooms' && request.method === 'POST') {
        creates += 1;
        response.end(JSON.stringify(keys));
      } else if (request.url === `/rooms/${keys.id}/reset` && request.method === 'POST'
          && request.headers.authorization === `Bearer ${keys.writeKey}`) {
        resets += 1;
        keys.readKey = randomBytes(32).toString('hex');
        response.end(JSON.stringify({ readKey: keys.readKey }));
      } else {
        response.writeHead(403);
        response.end('{}');
      }
    });
    const wss = new WebSocketServer({ server });
    wss.on('connection', (socket, request) => {
      assert.equal(request.headers.origin, undefined);
      assert.equal(request.headers['sec-websocket-protocol'], `chat,${keys.writeKey}`);
      socket.on('message', raw => {
        if (raw.toString() === 'ping') {
          socket.send('pong');
        } else {
          packets.push(JSON.parse(raw.toString()));
        }
      });
      socket.send(JSON.stringify({ kind: 'settings', settings: { sharingAutoStart: true },
        detail: 'FORGED REMOTE CONTROL' }));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const service = new SharingService(storage, origin);
    const restored = new SharingService(storage, origin);
    try {
      await service.initialize(true);
      assert.equal(creates, 0);
      assert.equal(service.state.status, 'off');
      await assert.rejects(service.start(false), /consent/);
      assert.equal(creates, 0);
      const ready = once(service, 'ready');
      await service.start(true);
      await ready;
      assert.equal(creates, 1);
      assert.equal(service.state.status, 'live');
      assert.match(service.state.qr ?? '', /^data:image\/png;base64,/);
      const originalLink = service.state.link;
      const event = { id: 'one', platform: 'tiktok', type: 'message', timestamp: Date.now(),
        user: { id: 'u', username: 'u', displayName: 'User' }, message: 'Hello' };
      service.publish({ kind: 'settings', settings: { secret: true } });
      service.publish({ kind: 'event', event, secret: 'must-not-cross' });
      await new Promise(resolve => setTimeout(resolve, 40));
      assert.equal(packets.length, 1);
      assert.equal(packets[0]?.secret, undefined);
      assert.equal(service.state.detail.includes('FORGED'), false);
      service.stop();
      assert.equal(service.state.link, originalLink);
      await restored.initialize(false);
      assert.equal(restored.state.link, originalLink);
      assert.equal(restored.state.status, 'off');
      assert.equal(creates, 1);
      assert.equal(resets, 0);
      await restored.reset();
      assert.equal(resets, 1);
      assert.notEqual(restored.state.link, originalLink);
      assert.equal((stored as typeof keys).writeKey, keys.writeKey);
    } finally {
      service.stop();
      restored.stop();
      for (const socket of wss.clients) {
        socket.terminate();
      }
      wss.close();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
