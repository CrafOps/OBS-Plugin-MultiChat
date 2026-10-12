import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeMediaUrl } from '../types/media.js';
import { normalizeTikTok } from '../platforms/tiktok.js';
import { normalizePublicYouTube } from '../platforms/youtube-public.js';
import { eventSchema } from '../types/protocol.js';

test('media only permits HTTPS platform CDN hosts without credentials or alternate ports', () => {
  assert.ok(safeMediaUrl('https://yt3.ggpht.com/avatar.png'));
  assert.ok(safeMediaUrl('https://p16-webcast.tiktokcdn.com/gift.gif'));
  for (const url of ['http://yt3.ggpht.com/a.png', 'https://127.0.0.1/a.png',
    'https://tiktokcdn.com.evil.invalid/a.png', 'https://user:pass@yt3.ggpht.com/a.png',
    'https://yt3.ggpht.com:8443/a.png', 'file:///C:/private']) {
    assert.equal(safeMediaUrl(url), undefined);
  }
});

test('TikTok preserves profile, inline emote and gift image without requiring catalog lookup', () => {
  const event = normalizeTikTok('gift', { common: { msgId: 'media-gift' }, gift: {
    name: 'Rose', image: { urlList: ['https://p16-webcast.tiktokcdn.com/gift.gif'] }
  }, user: { id: '42', nickname: 'Viewer', avatarThumb: { urlList: ['https://p16.tiktokcdn.com/profile.jpg'] } } });
  assert.equal(event.media?.imageUrl, 'https://p16-webcast.tiktokcdn.com/gift.gif');
  assert.equal(event.user.avatarUrl, 'https://p16.tiktokcdn.com/profile.jpg');
  assert.equal(eventSchema.safeParse(event).success, true);
  const emote = normalizeTikTok('message', { msgId: 'emote', content: 'Hi there', emotes: [{
    index: 3, emote: { image: { urlList: ['https://p16-webcast.tiktokcdn.com/emote.png'] } }
  }] });
  assert.deepEqual(emote.messageParts?.map(part => part.type), ['text', 'image', 'text']);
  assert.equal(emote.messageParts?.filter(part => part.type === 'text').map(part => part.text).join(''), 'Hi there');
});

test('YouTube preserves image emojis, profile and sticker, with safe text fallback', () => {
  const event = normalizePublicYouTube({
    id: 'youtube-media', author: { name: 'Viewer', channelId: 'channel',
      thumbnail: { url: 'https://yt3.ggpht.com/profile.png', alt: '' } },
    message: [{ text: 'Hi ' }, { url: 'https://www.youtube.com/s/emoji.png', alt: ':smile:',
      emojiText: ':smile:', isCustomEmoji: true }],
    superchat: { amount: '$5', color: '#000', sticker: { url: 'https://yt3.ggpht.com/sticker.gif', alt: '' } },
    isMembership: false, isVerified: false, isModerator: false, isOwner: false, timestamp: new Date()
  });
  assert.equal(event.messageParts?.[1]?.type, 'image');
  assert.equal(event.media?.imageUrl, 'https://yt3.ggpht.com/sticker.gif');
  assert.equal(eventSchema.safeParse(event).success, true);
  assert.equal(eventSchema.safeParse({ ...event, media: { imageUrl: 'https://localhost/private' } }).success, false);
});
