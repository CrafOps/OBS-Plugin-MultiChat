import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChatEngine } from '../services/engine.js';
import { settingsSchema } from '../types/protocol.js';
import { normalizeYouTube } from '../platforms/youtube.js';
import { normalizeTikTok } from '../platforms/tiktok.js';
import { Store } from '../storage/store.js';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';

function event(id: string, timestamp = 1000) {
  return { id, timestamp, platform: 'youtube', type: 'message',
    user: { id, username: 'viewer', displayName: 'ผู้ชม' }, message: `Hello ${id}` };
}

test('deduplicates per platform and orders late events', () => {
  const engine = new ChatEngine(settingsSchema.parse({}), () => 5000);
  assert.equal(engine.accept(event('a', 3000)), true);
  assert.equal(engine.accept(event('a', 3000)), false);
  assert.equal(engine.accept(event('b', 1000)), true);
  assert.equal(engine.accept({ ...event('a', 2000), platform: 'tiktok' }), true);
  assert.deepEqual(engine.history.map(item => item.timestamp), [1000, 2000, 3000]);
});

test('validates, filters and bounds history', () => {
  const engine = new ChatEngine(settingsSchema.parse({ messageLimit: 50, blockedWords: ['spam'] }), () => 5000);
  assert.equal(engine.accept({ ...event('bad'), message: 'SPAM' }), false);
  assert.equal(engine.accept({ ...event('invalid'), timestamp: NaN }), false);
  for (let index = 0; index < 100; index += 1) {
    engine.accept(event(String(index), index));
  }
  assert.equal(engine.history.length, 50);
  assert.equal(engine.history[0]?.id, '50');
});

test('suppresses repeated text and per-user bursts', () => {
  const engine = new ChatEngine(settingsSchema.parse({}), () => 5000);
  const base = event('first');
  assert.equal(engine.accept(base), true);
  assert.equal(engine.accept({ ...base, id: 'second' }), false);
  for (let index = 0; index < 12; index += 1) {
    engine.accept({ ...base, id: `burst${index}`, message: `message ${index}` });
  }
  assert.equal(engine.history.length, 7);
});

test('normalizes paid YouTube events and TikTok gift streak totals', () => {
  const youtube = normalizeYouTube({ id: 'paid', authorDetails: { channelId: 'owner', displayName: 'Viewer' },
    snippet: { type: 'superChatEvent', superChatDetails: { amountMicros: '2500000', currency: 'USD' } } });
  assert.equal(youtube?.type, 'superchat');
  assert.equal(youtube?.monetaryEvent?.amount, 2.5);
  const gift = normalizeTikTok('gift', { msgId: 'gift', repeatCount: 5, giftName: 'Rose', user: { uniqueId: 'creator' } });
  assert.equal(gift.monetaryEvent?.quantity, 5);
  assert.equal(gift.user.username, 'creator');
  const current = normalizeTikTok('message', { common: { msgId: 'v3' }, content: 'สวัสดี',
    user: { id: '42', displayId: 'viewer', nickname: 'Viewer' } });
  assert.equal(current.id, 'v3');
  assert.equal(current.message, 'สวัสดี');
  assert.equal(current.user.id, '42');
});

test('DPAPI round trip does not store cleartext refresh tokens', { skip: process.platform !== 'win32' }, async () => {
  const directory = await mkdtemp(join(process.cwd(), '.test-data-'));
  try {
    const store = new Store(directory);
    await store.initialize();
    const credentials = { refresh_token: 'secret-test-token' };
    await store.saveCredentials(credentials);
    assert.deepEqual(await store.credentials(), credentials);
    assert.equal((await readFile(join(directory, 'youtube.dpapi'), 'utf8')).includes('secret-test-token'), false);
    await store.clearCredentials();
    assert.equal(await store.credentials(), undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
