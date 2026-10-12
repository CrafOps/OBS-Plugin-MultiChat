import { EventEmitter } from 'node:events';
import { LiveChat, type ChatItem } from 'youtube-chat-next';
import type { ChatEngine } from '../services/engine.js';
import type { ChatEvent, PlatformState } from '../types/protocol.js';
import { safeMediaUrl } from '../types/media.js';
import { ChannelNames, publicPage, watchMetadata } from './youtube-metadata.js';

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
  private metadataTimer?: NodeJS.Timeout;
  private metadata: ReturnType<typeof watchMetadata> = {};
  private names: ChannelNames;
  private metadataActive = false;

  constructor(private engine: ChatEngine, private changed: (state: PlatformState) => void,
    private factory = (videoId: string): PublicChatClient =>
      new LiveChat({ liveId: videoId }, 2000, 'live') as unknown as PublicChatClient,
    private loadMetadata = publicPage,
    channelNames = new ChannelNames()) {
    this.names = channelNames;
  }

  private report(state: PlatformState): void {
    this.changed({ ...state, ...(state.status === 'connected' ? this.metadata : {}) });
  }

  private async refreshMetadata(videoId: string, generation: number): Promise<void> {
    try {
      const metadata = watchMetadata(await this.loadMetadata(`watch?v=${videoId}&hl=en`));
      if (generation !== this.generation || !this.metadataActive) {
        return;
      }
      this.metadata = metadata;
      this.report({ status: 'connected', detail: 'Public YouTube chat · viewers refresh every 30 seconds',
        title: videoId, canReply: false });
    } catch {
      if (generation === this.generation && this.metadataActive) {
        this.metadata.viewers = undefined;
        this.report({ status: 'connected', detail: 'Public chat connected · viewer count unavailable',
          title: videoId, canReply: false });
      }
    }
    if (generation === this.generation && this.metadataActive) {
      this.metadataTimer = setTimeout(() => void this.refreshMetadata(videoId, generation), 30000);
      this.metadataTimer.unref();
    }
  }

  private async acceptNamed(item: ChatItem, generation: number): Promise<void> {
    const name = await this.names.get(item.author.channelId);
    if (generation !== this.generation) {
      return;
    }
    this.engine.updateYouTubeName(item.author.channelId, name);
  }

  async connect(videoId: string): Promise<void> {
    this.stop();
    const generation = this.generation;
    const client = this.factory(videoId);
    this.client = client;
    let lastError = '';
    this.report({ status: 'connecting', detail: 'Opening public YouTube LIVE chat (unofficial, no API key)',
      title: videoId, canReply: false });
    client.on('chat', (item: ChatItem) => {
      if (generation !== this.generation) {
        return;
      }
      try {
        const event = normalizePublicYouTube(item);
        const cached = this.names.cached(item.author.channelId);
        event.user.displayName = cached.displayName ?? event.user.displayName;
        event.user.username = cached.handle ?? event.user.username;
        this.engine.accept(event);
        if (/^UC[\w-]{22}$/.test(item.author.channelId)) {
          void this.acceptNamed(item, generation).catch(() => undefined);
        }
        this.failures = 0;
        this.report({ status: 'connected', detail: 'Receiving public YouTube chat (read-only, no API key)',
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
      this.metadataActive = false;
      clearTimeout(this.metadataTimer);
      lastError = name === 'NotLiveError' ? 'No public active chat found for this video'
        : name === 'RateLimitError' ? 'YouTube rate limited this connection; waiting to reconnect'
        : name === 'ScrapeError' ? 'Public chat initialization unavailable; check that this video is currently LIVE with chat enabled'
        : 'Public YouTube chat could not be read; network restriction or web reader unavailable';
      this.report({ status: 'error', detail: lastError, title: videoId, canReply: false });
    });
    client.on('end', () => {
      if (generation === this.generation) {
        clearTimeout(this.metadataTimer);
        this.metadataActive = false;
        this.report({ status: lastError ? 'error' : 'offline',
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
        this.metadataActive = true;
        this.report({ status: 'connected', detail: 'Connected to public YouTube chat (read-only, no API key)',
          title: videoId, canReply: false });
        void this.refreshMetadata(videoId, generation);
      } else {
        this.retry(videoId, generation);
      }
    } catch {
      if (generation === this.generation) {
        this.report({ status: 'error', detail: 'Public YouTube chat reader failed to start',
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
    clearTimeout(this.metadataTimer);
    this.metadata = {};
    this.metadataActive = false;
    this.timer = undefined;
    this.client?.stop();
    this.client?.removeAllListeners();
    this.client?.on('error', () => undefined);
    this.client = undefined;
  }
}
