import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SoundStore } from '../services/sounds.js';
import { Store } from '../storage/store.js';
import { ChatEngine } from '../services/engine.js';
import { settingsSchema } from '../types/protocol.js';

const { AlertQueue } = await import(new URL('../../../overlay/alert-queue.mjs', import.meta.url).href);

test('gift/follow alert queue stays ordered, deduplicated, bounded and does not replay stale events', () => {
  const queue = new AlertQueue(3, 1000);
  const event = (id: string) => ({ id, timestamp: 1000, platform: 'tiktok', type: 'gift',
    user: { id: 'u', username: 'u', displayName: 'User' }, monetaryEvent: { giftName: 'Rose', quantity: 10 } });
  assert.equal(queue.add(event('one'), 1000), true);
  assert.equal(queue.add(event('one'), 1000), false);
  assert.equal(queue.add(event('two'), 1000), true);
  assert.equal(queue.add(event('three'), 1000), true);
  assert.equal(queue.next(1000).id, 'one');
  assert.equal(queue.next(1000).monetaryEvent.quantity, 10);
  assert.equal(queue.next(2500), undefined);
  for (let index = 0; index < 5; index += 1) {
    queue.add(event(`burst-${index}`), 1000);
  }
  assert.equal(queue.pending.length, 3);
  assert.equal(queue.next(1000).id, 'burst-2');
  queue.clear();
  assert.equal(queue.next(1000), undefined);
  assert.equal(queue.add({ ...event('other'), platform: 'youtube' }, 1000), false);
});

test('follow alerts remain available independently of legacy chat filters and are emitted once', () => {
  const engine = new ChatEngine(settingsSchema.parse({ enabledTypes: ['message', 'gift'] }));
  let alerts = 0;
  engine.on('alert', () => alerts += 1);
  const event = { id: 'follow', platform: 'tiktok', type: 'follow', timestamp: Date.now(),
    user: { id: 'u', username: 'u', displayName: 'User' } };
  engine.accept(event);
  engine.accept(event);
  assert.equal(alerts, 1);
  assert.equal(engine.history.length, 0);
});

test('custom sound is copied, rejects non-audio and reset preserves the original file', async () => {
  const directory = await mkdtemp(join(process.cwd(), '.test-data-sounds-'));
  try {
    const source = join(directory, 'original.wav');
    const bytes = Buffer.alloc(44);
    bytes.write('RIFF', 0);
    bytes.write('WAVE', 8);
    await writeFile(source, bytes);
    const sounds = new SoundStore(join(directory, 'sounds'));
    await sounds.import('gift', source);
    assert.deepEqual((await sounds.get('gift'))?.bytes, bytes);
    assert.equal((await sounds.get('gift'))?.mime, 'audio/wav');
    const invalid = join(directory, 'invalid.mp3');
    await writeFile(invalid, '<script>not a sound</script>');
    await assert.rejects(sounds.import('follow', invalid), /Unsupported sound/);
    await sounds.clear('gift');
    assert.equal(await sounds.get('gift'), undefined);
    assert.deepEqual(await readFile(source), bytes);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('mobile sharing keys use separate encrypted storage and persist without a reset',
  { skip: process.platform !== 'win32' }, async () => {
    const directory = await mkdtemp(join(process.cwd(), '.test-data-sharing-'));
    try {
      const store = new Store(directory);
      await store.initialize();
      const value = { id: '1'.repeat(32), readKey: '2'.repeat(64), writeKey: '3'.repeat(64), consentVersion: 1 };
      await store.saveSharing(value);
      const file = await readFile(join(directory, 'sharing.dpapi'), 'utf8');
      assert.equal(file.includes(value.readKey), false);
      assert.equal(file.includes(value.writeKey), false);
      assert.deepEqual(await new Store(directory).loadSharing(), value);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
