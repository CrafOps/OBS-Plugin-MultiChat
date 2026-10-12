import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelMetadata, pageJson, viewerCount, watchMetadata } from '../platforms/youtube-metadata.js';

test('live viewers are distinct from cumulative video views and handle unknown values', () => {
  const page = (isLive: boolean, count: string) => `var ytInitialData = ${JSON.stringify({
    contents: { videoViewCountRenderer: { isLive, viewCount: { simpleText: count } } }
  })}; var ytInitialPlayerResponse = {"videoDetails":{"title":"LIVE","author":"Channel"}};`;
  assert.deepEqual(watchMetadata(page(true, '1,234 watching now')), {
    viewers: 1234, title: 'LIVE', account: 'Channel'
  });
  assert.equal(watchMetadata(page(false, '1,234 views')).viewers, undefined);
  assert.equal(watchMetadata(page(true, '1.2K watching')).viewers, undefined);
  assert.equal(watchMetadata('consent page').viewers, undefined);
  assert.equal(viewerCount('0'), 0);
  assert.equal(viewerCount('-5'), undefined);
  assert.equal(viewerCount('99999999999999999999'), undefined);
  assert.equal(viewerCount(null), undefined);
});

test('channel name and handle preserve Unicode and escaped braces without executing page code', () => {
  const html = `var ytInitialData = ${JSON.stringify({ metadata: { channelMetadataRenderer: {
    title: 'PPekKunGz Channel ไทย "}\\', vanityChannelUrl: 'http://www.youtube.com/@ppekkungzchannel'
  } } })}; alert('untrusted');`;
  assert.deepEqual(channelMetadata(html), {
    displayName: 'PPekKunGz Channel ไทย "}\\', handle: '@ppekkungzchannel'
  });
  assert.equal(pageJson('var ytInitialData = {broken};', 'ytInitialData'), undefined);
});
