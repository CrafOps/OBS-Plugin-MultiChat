import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsSchema } from '../types/protocol.js';
import { tiktokErrorDetail } from '../platforms/tiktok.js';

test('TikTok accepts pasted @handle and normalizes persisted usernames', () => {
  for (const username of ['@caothulienquan.official', ' caothulienquan.official ', ' @caothulienquan.official ']) {
    const settings = settingsSchema.parse({ tiktokUsername: username, tiktokEnabled: true });
    assert.equal(settings.tiktokUsername, 'caothulienquan.official');
    assert.equal(settings.tiktokEnabled, true);
  }
  assert.equal(settingsSchema.safeParse({ tiktokUsername: '@@invalid' }).success, false);
  assert.equal(settingsSchema.safeParse({ tiktokUsername: 'invalid handle' }).success, false);
});

test('TikTok reports offline and signing failures without exposing upstream secrets', () => {
  class UserOfflineError extends Error {}
  class SignAPIError extends Error {}
  const offline = new UserOfflineError('private request data');
  assert.match(tiktokErrorDetail(offline), /not currently LIVE/);
  assert.match(tiktokErrorDetail({ exception: new SignAPIError('private token') }), /signing service/);
  assert.equal(tiktokErrorDetail(new Error('sensitive token')).includes('sensitive'), false);
});
