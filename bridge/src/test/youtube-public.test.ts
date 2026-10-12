import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PublicYouTubeConnector, normalizePublicYouTube } from '../platforms/youtube-public.js';
import { ChatEngine } from '../services/engine.js';
import { settingsSchema, type PlatformState } from '../types/protocol.js';
import type { ChatItem } from 'youtube-chat-next';
import { ChannelNames } from '../platforms/youtube-metadata.js';

const item: ChatItem = {
  id: 'public-message', author: { name: 'ผู้ชม', channelId: 'channel' },
  message: [{ text: 'สวัสดี' }, { url: 'https://example.com/emoji.png', alt: 'smile',
    emojiText: ':smile:', isCustomEmoji: true }],
  isMembership: true, isOwner: false, isModerator: true, isVerified: false,
  timestamp: new Date()
};

test('normalizes public text, emoji, badges and paid display without guessing currency', () => {
  const normalized = normalizePublicYouTube(item);
  assert.equal(normalized.message, 'สวัสดี:smile:');
  assert.equal(normalized.type, 'message');
  assert.deepEqual(normalized.user.badges, ['Moderator', 'Member']);
  const paid = normalizePublicYouTube({ ...item, superchat: { amount: '฿100.00', color: '#000' } });
  assert.equal(paid.type, 'superchat');
  assert.match(paid.message!, /฿100.00/);
  assert.equal(paid.monetaryEvent, undefined);
});

test('shows chat immediately and patches existing handle-only messages after name lookup', async () => {
  class FakeClient extends EventEmitter {
    async start(): Promise<boolean> {
      return true;
    }
    stop(): void {
    }
  }
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const names = new ChannelNames(async () => {
    await gate;
    return 'var ytInitialData = {"metadata":{"channelMetadataRenderer":{"title":"PPekKunGz Channel","vanityChannelUrl":"http://www.youtube.com/@ppekkungzchannel"}}};';
  });
  const engine = new ChatEngine(settingsSchema.parse({ autoReconnect: false }));
  const client = new FakeClient();
  const connector = new PublicYouTubeConnector(engine, () => undefined, () => client, async () => '', names);
  await connector.connect('vf8alkN0zXw');
  const author = { name: '@ppekkungzchannel', channelId: 'UCvrYlgqNVrv-zEYXIElfZ2g' };
  let updates = 0;
  engine.on('profile', () => {
    updates += 1;
  });
  client.emit('chat', { ...item, author });
  assert.equal(engine.history.length, 1);
  assert.equal(engine.history[0]!.user.displayName, '@ppekkungzchannel');
  release();
  await names.get(author.channelId);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(engine.history[0]!.user.displayName, 'PPekKunGz Channel');
  assert.equal(engine.history[0]!.user.username, '@ppekkungzchannel');
  assert.equal(updates, 1);
  client.emit('chat', { ...item, author, id: 'cached-author', message: [{ text: 'Second message' }] });
  assert.equal(engine.history[1]!.user.displayName, 'PPekKunGz Channel');
  connector.stop();
});

test('public reader receives events and suppresses stale events after switching and stopping', async () => {
  class FakeClient extends EventEmitter {
    async start(): Promise<boolean> {
      return true;
    }
    stop(): void {
      this.emit('end');
    }
  }
  const clients: FakeClient[] = [];
  const engine = new ChatEngine(settingsSchema.parse({ autoReconnect: false }));
  const states: PlatformState[] = [];
  const connector = new PublicYouTubeConnector(engine, state => states.push(state), () => {
    const client = new FakeClient();
    clients.push(client);
    return client;
  }, async () => '');
  await connector.connect('vf8alkN0zXw');
  clients[0]!.emit('chat', item);
  assert.equal(engine.history.length, 1);
  await connector.connect('FiaU2oMI-Cg');
  clients[0]!.emit('chat', { ...item, id: 'stale' });
  assert.equal(engine.history.length, 1);
  connector.stop();
  clients[1]!.emit('chat', { ...item, id: 'after-stop' });
  clients[1]!.emit('error', new Error('private header'));
  assert.equal(engine.history.length, 1);
  assert.ok(states.every(state => state.canReply === false));
});
