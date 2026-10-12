import { EventEmitter } from 'node:events';
import { LiveChat, type ChatItem } from 'youtube-chat-next';
import type { ChatEngine } from '../services/engine.js';
import type { ChatEvent, PlatformState } from '../types/protocol.js';
import { safeMediaUrl } from '../types/media.js';

export function normalizePublicYouTube(item: ChatItem): ChatEvent {
  const text = item.message.map(part => 'text' in part ? part.text : part.emojiText || part.alt).join('');
  const paid = item.superchat?.amount;
  const parts: NonNullable<ChatEvent['messageParts']> = item.message.map(part => {
    if ('text' in part) {
      return { type: 'text', text: part.text };
    }
    const url = safeMediaUrl(part.url);
    const alt = part.emojiText || part.alt;
    return url ? { type: 'image', url, alt } : { type: 'text', text: alt };
  });
  if (paid) {
    parts.push({ type: 'text', text: `${text ? ' · ' : ''}${paid}` });
  }
  const sticker = safeMediaUrl(item.superchat?.sticker?.url);
  return {
    id: item.id,
    platform: 'youtube',
    type: item.superchat ? 'superchat' : 'message',
    timestamp: item.timestamp.getTime(),
    user: {
      id: item.author.channelId,
      username: item.author.name,
      displayName: item.author.name,
      avatarUrl: safeMediaUrl(item.author.thumbnail?.url),
      badges: [item.isOwner ? 'Owner' : '', item.isModerator ? 'Moderator' : '',
        item.isMembership ? 'Member' : '', item.isVerified ? 'Verified' : ''].filter(Boolean)
    },
    // The library supplies a formatted purchase string; do not guess currency or amount.
    message: paid ? `${text}${text ? ' · ' : ''}${paid}` : text,
    messageParts: parts.slice(0, 128),
    media: sticker ? { imageUrl: sticker } : undefined
  };
}

export type PublicChatClient = EventEmitter & {
  start(): Promise<boolean>;
  stop(): void;
};

export class PublicYouTubeConnector {
  private client?: PublicChatClient;
  private generation = 0;
  private timer?: NodeJS.Timeout;
  private failures = 0;

  constructor(private engine: ChatEngine, private changed: (state: PlatformState) => void,
    private factory = (videoId: string): PublicChatClient =>
      new LiveChat({ liveId: videoId }, 2000, 'live') as unknown as PublicChatClient) {}

  async connect(videoId: string): Promise<void> {
    this.stop();
    const generation = this.generation;
    const client = this.factory(videoId);
    this.client = client;
    let lastError = '';
    this.changed({ status: 'connecting', detail: 'Opening public YouTube LIVE chat (unofficial, no API key)',
      title: videoId, canReply: false });
    client.on('chat', (item: ChatItem) => {
      if (generation !== this.generation) {
        return;
      }
      try {
        this.engine.accept(normalizePublicYouTube(item));
        this.failures = 0;
        this.changed({ status: 'connected', detail: 'Receiving public YouTube chat (read-only, no API key)',
          title: videoId, canReply: false });
      } catch {
        // Unknown upstream event shapes must not crash the bridge.
      }
    });
    client.on('error', (error: unknown) => {
      if (generation !== this.generation) {
        return;
      }
      const name = (error as { constructor?: { name?: string } })?.constructor?.name;
      lastError = name === 'NotLiveError' ? 'No public active chat found for this video'
        : name === 'RateLimitError' ? 'YouTube rate limited this connection; waiting to reconnect'
        : name === 'ScrapeError' ? 'Public chat initialization unavailable; check that this video is currently LIVE with chat enabled'
        : 'Public YouTube chat could not be read; network restriction or web reader unavailable';
      this.changed({ status: 'error', detail: lastError, title: videoId, canReply: false });
    });
    client.on('end', () => {
      if (generation === this.generation) {
        this.changed({ status: lastError ? 'error' : 'offline',
          detail: lastError || 'Public YouTube chat ended', title: videoId, canReply: false });
        this.retry(videoId, generation);
      }
    });
    try {
      const started = await client.start();
      if (generation !== this.generation) {
        client.stop();
        return;
      }
      if (started) {
        this.changed({ status: 'connected', detail: 'Connected to public YouTube chat (read-only, no API key)',
          title: videoId, canReply: false });
      } else {
        this.retry(videoId, generation);
      }
    } catch {
      if (generation === this.generation) {
        this.changed({ status: 'error', detail: 'Public YouTube chat reader failed to start',
          title: videoId, canReply: false });
        this.retry(videoId, generation);
      }
    }
  }

  private retry(videoId: string, generation: number): void {
    if (this.timer || generation !== this.generation || !this.engine.settings.autoReconnect) {
      return;
    }
    const delay = Math.min(120000, 10000 * 2 ** Math.min(this.failures++, 4));
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.connect(videoId);
    }, delay);
  }

  stop(): void {
    this.generation += 1;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.client?.stop();
    this.client?.removeAllListeners();
    this.client?.on('error', () => undefined);
    this.client = undefined;
  }
}
