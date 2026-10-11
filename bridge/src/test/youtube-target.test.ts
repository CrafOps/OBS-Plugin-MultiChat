import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeVideoId } from '../types/youtube-target.js';
import { settingsSchema } from '../types/protocol.js';
import { manualLiveChat, YouTubeConnector } from '../platforms/youtube.js';
import { ChatEngine } from '../services/engine.js';
import { Store } from '../storage/store.js';

test('accepts video IDs and YouTube watch, live and short URLs', () => {
  for (const input of [
    'FiaU2oMI-Cg',
    ' https://www.youtube.com/watch?v=FiaU2oMI-Cg&feature=share ',
    'https://youtu.be/FiaU2oMI-Cg?si=test',
    'https://youtube.com/live/FiaU2oMI-Cg',
    'https://m.youtube.com/watch?v=FiaU2oMI-Cg'
  ]) {
    assert.equal(youtubeVideoId(input), 'FiaU2oMI-Cg');
  }
});

test('rejects lookalike hosts, unsafe URLs and malformed IDs', () => {
  for (const input of [
    'invalid',
    'https://youtube.com.evil.invalid/watch?v=FiaU2oMI-Cg',
    'https://evil.invalid/watch?v=FiaU2oMI-Cg',
    'https://user:password@youtube.com/watch?v=FiaU2oMI-Cg',
    'javascript:alert(1)',
    'https://youtube.com/watch?v=too-short'
  ]) {
    assert.equal(youtubeVideoId(input), undefined);
    assert.equal(settingsSchema.safeParse({ youtubeLiveUrl: input }).success, false);
  }
  assert.equal(settingsSchema.parse({}).youtubeLiveUrl, '');
});

test('only selects active chat and never falls back from a completed video', () => {
  assert.equal(manualLiveChat({ snippet: { title: 'Live' },
    liveStreamingDetails: { activeLiveChatId: 'chat' } }).chatId, 'chat');
  const ended = manualLiveChat({ snippet: { title: 'Ended' },
    liveStreamingDetails: { activeLiveChatId: 'stale', actualEndTime: '2026-10-12T00:00:00Z' } });
  assert.equal(ended.chatId, undefined);
  assert.match(ended.detail, /ended/);
  assert.equal(manualLiveChat({ liveStreamingDetails: { scheduledStartTime: '2026-10-13T00:00:00Z' } }).chatId, undefined);
  assert.equal(manualLiveChat(undefined).chatId, undefined);
});

test('manual LIVE mode rejects replies even when connector state claims permission', async () => {
  const engine = new ChatEngine(settingsSchema.parse({ youtubeLiveUrl: 'FiaU2oMI-Cg' }));
  const connector = new YouTubeConnector(new Store('.'), engine, () => undefined);
  connector.state = { status: 'connected', detail: '', canReply: true };
  Reflect.set(connector, 'chatId', 'selected-live-chat');
  await assert.rejects(connector.send('hello'), /No authorized active YouTube chat/);
  connector.stop();
});
