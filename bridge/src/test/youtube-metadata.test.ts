import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelNames, channelMetadata, pageJson, viewerCount, watchMetadata } from '../platforms/youtube-metadata.js';

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

test('queues concurrent authors instead of discarding everyone after the first two', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let calls = 0;
  let active = 0;
  let maximum = 0;
  const names = new ChannelNames(async path => {
    calls += 1;
    active += 1;
    maximum = Math.max(maximum, active);
    await gate;
    active -= 1;
    const id = path.split('/')[1]!.split('?')[0]!;
    return `var ytInitialData = ${JSON.stringify({ metadata: { channelMetadataRenderer: {
      title: `Channel ${id}`, ownerUrls: [`https://www.youtube.com/@${id}`]
    } } })};`;
  });
  const ids = Array.from({ length: 5 }, (_, index) => `UC${String(index).padStart(22, '0')}`);
  const requests = ids.map(id => names.get(id));
  const duplicate = names.get(ids[0]!);
  assert.equal(calls, 2);
  release();
  const results = await Promise.all([...requests, duplicate]);
  assert.equal(calls, 5);
  assert.equal(maximum, 2);
  assert.ok(results.every(result => result.displayName?.startsWith('Channel UC') && result.handle?.startsWith('@UC')));
  assert.equal(names.cached(ids[4]!).displayName, `Channel ${ids[4]}`);
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
