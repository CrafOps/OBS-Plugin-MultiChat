type RecordValue = Record<string, unknown>;

export function viewerCount(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return undefined;
  }
  if (typeof value === 'string' && !/^\d+$/.test(value)) {
    return undefined;
  }
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

// Extract only JSON assignments, never execute scripts from the upstream page.
export function pageJson(html: string, name: string): unknown {
  const assignment = new RegExp(`(?:var\\s+)?${name}\\s*=\\s*`).exec(html);
  if (!assignment) {
    return undefined;
  }
  const start = assignment.index + assignment[0].length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        quoted = false;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}' && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, index + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function findRenderer(value: unknown, key: string, budget = { remaining: 20000 }): RecordValue | undefined {
  if (!value || typeof value !== 'object' || --budget.remaining < 0) {
    return undefined;
  }
  const object = value as RecordValue;
  if (object[key] && typeof object[key] === 'object') {
    return object[key] as RecordValue;
  }
  for (const child of Object.values(object)) {
    const found = findRenderer(child, key, budget);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function watchMetadata(html: string): { viewers?: number; title?: string; account?: string } {
  const initial = pageJson(html, 'ytInitialData');
  const renderer = findRenderer(initial, 'videoViewCountRenderer');
  const text = renderer?.viewCount as { simpleText?: string; runs?: { text: string }[] } | undefined;
  const label = text?.simpleText ?? text?.runs?.map(run => run.text).join('') ?? '';
  // A normal video's views are cumulative. Only accept the live renderer's count.
  const digits = label.match(/^([\d, .\u00a0\u202f]+)(?:\s|$)/)?.[1]?.replace(/[, .\u00a0\u202f]/g, '');
  const player = pageJson(html, 'ytInitialPlayerResponse') as { videoDetails?: { title?: string; author?: string } } | undefined;
  const owner = findRenderer(initial, 'videoOwnerRenderer');
  const endpoint = owner?.navigationEndpoint as { browseEndpoint?: { canonicalBaseUrl?: string } } | undefined;
  const handle = endpoint?.browseEndpoint?.canonicalBaseUrl?.match(/^\/(@[^/?#]+)$/)?.[1];
  const account = player?.videoDetails?.author?.slice(0, 256);
  return {
    viewers: renderer?.isLive === true ? viewerCount(renderer.originalViewCount) ?? viewerCount(digits) : undefined,
    title: player?.videoDetails?.title?.slice(0, 256),
    account: account && handle ? `${account} (${handle})` : account
  };
}

export function channelMetadata(html: string): { displayName?: string; handle?: string } {
  const initial = pageJson(html, 'ytInitialData') as {
    metadata?: { channelMetadataRenderer?: RecordValue };
  } | undefined;
  const metadata = initial?.metadata?.channelMetadataRenderer ?? findRenderer(initial, 'channelMetadataRenderer');
  const ownerUrls = metadata?.ownerUrls as unknown[] | undefined;
  const vanity = typeof metadata?.vanityChannelUrl === 'string' ? metadata.vanityChannelUrl
    : ownerUrls?.find((value): value is string => typeof value === 'string' && value.includes('/@')) ?? '';
  // YouTube returns http canonical metadata even though we fetch exclusively via HTTPS.
  const handle = vanity.match(/^https?:\/\/(?:www\.)?youtube\.com\/(@[^/?#]+)(?:[/?#]|$)/)?.[1];
  return {
    displayName: typeof metadata?.title === 'string' ? metadata.title.slice(0, 256) : undefined,
    handle: handle?.slice(0, 256)
  };
}

export async function publicPage(path: string): Promise<string> {
  const signal = AbortSignal.timeout(5000);
  let url = new URL(path, 'https://www.youtube.com/');
  let response: Response | undefined;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (url.protocol !== 'https:' || !['www.youtube.com', 'youtube.com'].includes(url.hostname)
        || url.username || url.password || url.port) {
      throw new Error('Unexpected metadata redirect');
    }
    response = await fetch(url, {
      headers: { 'Accept-Language': 'en-US', 'User-Agent': 'Mozilla/5.0' },
      signal, redirect: 'manual'
    });
    if (response.status < 300 || response.status >= 400) {
      break;
    }
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) {
      throw new Error('Metadata redirect unavailable');
    }
    url = new URL(location, url);
  }
  if (!response?.ok || !response.body) {
    throw new Error('Public metadata unavailable');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.length;
      if (size > 8 * 1024 * 1024) {
        throw new Error('Metadata page too large');
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export class ChannelNames {
  private cache = new Map<string, { value: { displayName?: string; handle?: string }; expires: number }>();
  private pending = new Map<string, Promise<{ displayName?: string; handle?: string }>>();
  private queue: (() => Promise<void>)[] = [];
  private active = 0;

  constructor(private loadPage = publicPage) {}

  cached(id: string): { displayName?: string; handle?: string } {
    const cached = this.cache.get(id);
    return cached && cached.expires > Date.now() ? cached.value : {};
  }

  private drain(): void {
    while (this.active < 2 && this.queue.length) {
      const task = this.queue.shift()!;
      this.active += 1;
      void task().finally(() => {
        this.active -= 1;
        this.drain();
      });
    }
  }

  async get(id: string): Promise<{ displayName?: string; handle?: string }> {
    if (!/^UC[\w-]{22}$/.test(id)) {
      return {};
    }
    const cached = this.cache.get(id);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    const pending = this.pending.get(id);
    if (pending) {
      return pending;
    }
    if (this.pending.size >= 128) {
      return {};
    }
    let resolve!: (value: { displayName?: string; handle?: string }) => void;
    const request = new Promise<{ displayName?: string; handle?: string }>(done => {
      resolve = done;
    });
    this.pending.set(id, request);
    this.queue.push(async () => {
      const value = await this.loadPage(`channel/${id}?hl=en`).then(channelMetadata).catch(() => ({}));
      this.pending.delete(id);
      if (this.cache.size >= 500) {
        this.cache.delete(this.cache.keys().next().value!);
      }
      const successful = 'displayName' in value && value.displayName && !value.displayName.startsWith('@');
      this.cache.set(id, { value, expires: Date.now() + (successful ? 3600000 : 60000) });
      resolve(value);
    });
    this.drain();
    return request;
  }
}
