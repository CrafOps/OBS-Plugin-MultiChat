import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import WebSocket from 'ws';

const origin = 'http://localhost:8787';
const savedRoom = new URL('../build/worker-test-room.json', import.meta.url);
const sockets = [];
await mkdir(new URL('../build/', import.meta.url), { recursive: true });

async function connect(path, secret, reader) {
  const socket = new WebSocket(`ws://localhost:8787${path}`, ['chat', secret], reader ? { origin } : {});
  sockets.push(socket);
  const queue = [];
  const waiting = [];
  socket.on('message', raw => {
    const packet = JSON.parse(raw.toString());
    if (waiting.length) {
      waiting.shift()(packet);
    } else {
      queue.push(packet);
    }
  });
  await once(socket, 'open');
  const next = () => new Promise((resolve, reject) => {
    if (queue.length) {
      resolve(queue.shift());
      return;
    }
    const timeout = setTimeout(() => reject(new Error('Packet timeout')), 5000);
    waiting.push(packet => {
      clearTimeout(timeout);
      resolve(packet);
    });
  });
  return { socket, next };
}

async function denied(path, secret, reader) {
  const socket = new WebSocket(`ws://localhost:8787${path}`, ['chat', secret], reader ? { origin } : {});
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Authorization timeout')), 5000);
    socket.once('unexpected-response', (request, response) => {
      clearTimeout(timeout);
      assert.equal(response.statusCode, 403);
      response.resume();
      request.destroy();
      resolve();
    });
    socket.once('open', () => {
      clearTimeout(timeout);
      reject(new Error('Unauthorized socket accepted'));
    });
    socket.on('error', () => undefined);
  });
}

try {
  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  const page = await fetch(`${origin}/viewer`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal((await fetch(`${origin}/rooms`, { method: 'POST', headers: { Origin: 'https://evil.invalid' } })).status, 403);
  let room;
  if (process.argv.includes('--resume')) {
    room = JSON.parse(await readFile(savedRoom, 'utf8'));
  } else {
    const created = await fetch(`${origin}/rooms`, { method: 'POST' });
    assert.equal(created.status, 201);
    room = await created.json();
  }
  const readPath = `/read?room=${room.id}`;
  const publishPath = `/publish?room=${room.id}`;
  await denied(publishPath, room.readKey, false);
  await denied(readPath, room.writeKey, true);
  const publisher = await connect(publishPath, room.writeKey, false);
  const reader = await connect(readPath, room.readKey, true);
  assert.deepEqual((await reader.next()).events, []);
  assert.deepEqual(await reader.next(), { kind: 'presence', online: true });
  const event = { id: 'gift-test', platform: 'tiktok', type: 'gift', timestamp: Date.now(),
    user: { id: 'viewer', username: 'viewer', displayName: 'ทดสอบชื่อไทย' },
    monetaryEvent: { giftName: 'Rose', quantity: 10 } };
  publisher.socket.send(JSON.stringify({ kind: 'event', event, settings: { secret: 'must-not-cross' } }));
  const message = await reader.next();
  assert.equal(message.event.monetaryEvent.quantity, 10);
  assert.equal(message.settings, undefined);
  assert.equal((await fetch(`${origin}/rooms/${room.id}/reset`, {
    method: 'POST', headers: { Authorization: `Bearer ${room.readKey}` }
  })).status, 403);
  const readerClosed = once(reader.socket, 'close');
  const reset = await fetch(`${origin}/rooms/${room.id}/reset`, {
    method: 'POST', headers: { Authorization: `Bearer ${room.writeKey}` }
  });
  assert.equal(reset.status, 200);
  const replacement = await reset.json();
  assert.equal((await readerClosed)[0], 1008);
  await denied(readPath, room.readKey, true);
  room.readKey = replacement.readKey;
  const replacementReader = await connect(readPath, room.readKey, true);
  assert.equal((await replacementReader.next()).kind, 'snapshot');
  await replacementReader.next();
  const deniedCommand = once(replacementReader.socket, 'close');
  replacementReader.socket.send(JSON.stringify({ kind: 'settings', settings: { secret: true } }));
  assert.equal((await deniedCommand)[0], 1008);
  const finalReader = await connect(readPath, room.readKey, true);
  await finalReader.next();
  await finalReader.next();
  const publisherClosed = once(publisher.socket, 'close');
  publisher.socket.close();
  await publisherClosed;
  assert.equal((await finalReader.next()).kind, 'clear');
  assert.deepEqual(await finalReader.next(), { kind: 'presence', online: false });
  await writeFile(savedRoom, JSON.stringify(room), { mode: 0o600 });
  console.log('PASS: Worker assets, isolated reader/publisher keys, sanitized packets, reset revocation, read-only enforcement and offline clearing');
} finally {
  for (const socket of sockets) {
    socket.terminate();
  }
}
