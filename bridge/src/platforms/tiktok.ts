import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { ChatEngine } from '../services/engine.js';
import type { ChatEvent, PlatformState } from '../types/protocol.js';
import type { LiveConnector } from './connector.js';
import { safeMediaUrl } from '../types/media.js';
import { viewerCount } from './youtube-metadata.js';

type TikTokImage = { urlList?: string[] };

type TikTokData = {
  msgId?: string;
  common?: { msgId?: string; createTime?: string };
  comment?: string;
  content?: string;
  repeatCount?: number;
  repeatEnd?: boolean | number;
  giftType?: number;
  giftId?: number | string;
  gift?: { name?: string; type?: number; image?: TikTokImage; icon?: TikTokImage; previewImage?: TikTokImage };
  giftName?: string;
  extendedGiftInfo?: { name?: string; image?: TikTokImage };
  emotes?: { index: number; emote?: { image?: TikTokImage } }[];
  user?: { id?: string; userId?: string; uniqueId?: string; nickname?: string;
    displayId?: string; profilePictureUrl?: string; avatarThumb?: { urlList?: string[] } };
};

export function tiktokErrorDetail(error: unknown): string {
  const wrapped = error as { exception?: unknown } | undefined;
  const cause = wrapped?.exception ?? error;
  const name = (cause as { name?: string; constructor?: { name?: string } } | undefined)?.constructor?.name
    ?? (cause as { name?: string } | undefined)?.name;
  switch (name) {
    case 'UserOfflineError':
      return 'TikTok creator is not currently LIVE';
    case 'InvalidUniqueIdError':
      return 'TikTok username is invalid';
    case 'SignatureRateLimitError':
      return 'TikTok signing service rate limit; waiting to reconnect';
    case 'SignAPIError':
    case 'SignatureMissingTokensError':
    case 'AuthenticatedWebSocketConnectionError':
      return 'TikTok signing service rejected the connection; unofficial connector unavailable';
    case 'ConnectTimeoutError':
      return 'TikTok connection timed out';
    default:
      return 'Unable to connect to TikTok LIVE; creator may be offline or connector blocked';
  }
}

export function normalizeTikTok(type: ChatEvent['type'], data: TikTokData): ChatEvent {
  const text = data.content ?? data.comment ?? (type === 'gift' ? data.gift?.name ?? data.giftName
    ?? data.extendedGiftInfo?.name ?? `Gift ${data.giftId ?? ''}` : type);
  const parts: NonNullable<ChatEvent['messageParts']> = [];
  let offset = 0;
  for (const emote of [...(data.emotes ?? [])].sort((a, b) => a.index - b.index).slice(0, 40)) {
    const url = safeMediaUrl(emote.emote?.image?.urlList?.[0]);
    if (!url || !Number.isInteger(emote.index) || emote.index < offset || emote.index > text.length) {
      continue;
    }
    if (emote.index > offset) {
      parts.push({ type: 'text', text: text.slice(offset, emote.index) });
    }
    parts.push({ type: 'image', url, alt: 'TikTok emote' });
    offset = emote.index;
  }
  if (offset < text.length) {
    parts.push({ type: 'text', text: text.slice(offset) });
  }
  const giftImage = type === 'gift' ? safeMediaUrl(data.gift?.image?.urlList?.[0]
    ?? data.gift?.icon?.urlList?.[0] ?? data.gift?.previewImage?.urlList?.[0]
    ?? data.extendedGiftInfo?.image?.urlList?.[0]) : undefined;
  return {
    id: String(data.common?.msgId ?? data.msgId ?? randomUUID()),
    platform: 'tiktok',
    type,
    timestamp: Date.now(),
    user: {
      id: String(data.user?.id ?? data.user?.userId ?? data.user?.uniqueId ?? ''),
      username: data.user?.uniqueId ?? data.user?.displayId ?? '',
      displayName: data.user?.nickname ?? data.user?.uniqueId ?? 'TikTok viewer',
      avatarUrl: safeMediaUrl(data.user?.profilePictureUrl ?? data.user?.avatarThumb?.urlList?.[0])
    },
    message: text,
    messageParts: parts.length ? parts : undefined,
    media: giftImage ? { imageUrl: giftImage } : undefined,
    monetaryEvent: type === 'gift' ? {
      giftName: data.gift?.name ?? data.giftName ?? data.extendedGiftInfo?.name,
      quantity: data.repeatCount ?? 1
    } : undefined
  };
}

export class TikTokConnector implements LiveConnector {
  state: PlatformState = { status: 'disconnected', detail: 'Unofficial username connection; replies unavailable', canReply: false };
  private connection?: import('tiktok-live-connector').TikTokLiveConnection & EventEmitter;
  private timer?: NodeJS.Timeout;
  private generation = 0;
  private failures = 0;

  constructor(private engine: ChatEngine, private changed: () => void) {}

  private update(state: PlatformState): void {
    this.state = state;
    this.changed();
  }

  async connect(username: string): Promise<void> {
    this.stop();
    if (!username || !this.engine.settings.tiktokEnabled) {
      this.update({ status: 'disconnected', detail: 'TikTok connector disabled', canReply: false });
      return;
    }
    const generation = this.generation;
    this.update({ status: 'connecting', detail: 'Checking TikTok LIVE (unofficial)', account: username, canReply: false });
    try {
      const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');
      if (generation !== this.generation) {
        return;
      }
      // The package's typed-emitter default import loses inherited members under NodeNext.
      // Its runtime class extends node:events EventEmitter; preserve that surface explicitly.
      // Optional gift-catalog lookup must not prevent receiving chat. Gift events
      // still include available inline metadata without this extra request.
      const connection = new TikTokLiveConnection(username, { enableExtendedGiftInfo: false }) as
        import('tiktok-live-connector').TikTokLiveConnection & EventEmitter;
      this.connection = connection;
      let currentViewers: number | undefined;
      connection.on(WebcastEvent.ROOM_USER, (data: { total?: string; viewerCount?: number }) => {
        // v3 total is current room audience; totalUser is cumulative and must not be used.
        currentViewers = viewerCount(data.total ?? data.viewerCount);
        if (generation === this.generation && this.state.status === 'connected') {
          this.update({ ...this.state, viewers: currentViewers });
        }
      });
      const eventTypes: [string, ChatEvent['type']][] = [
        [WebcastEvent.CHAT, 'message'], [WebcastEvent.GIFT, 'gift'],
        [WebcastEvent.LIKE, 'like'], [WebcastEvent.FOLLOW, 'follow'], [WebcastEvent.MEMBER, 'join']
      ];
      for (const [name, type] of eventTypes) {
        connection.on(name, (data: TikTokData) => {
          if (generation !== this.generation) {
            return;
          }
          const event = normalizeTikTok(type, data);
          if (type === 'gift' && (data.gift?.type ?? data.giftType) === 1) {
            this.engine.combo(event, Boolean(data.repeatEnd));
            if (!data.repeatEnd) {
              return;
            }
          }
          this.engine.accept(event);
        });
      }
      connection.on(ControlEvent.ERROR, error => {
        if (generation === this.generation) {
          this.update({ ...this.state, status: 'error', detail: tiktokErrorDetail(error), canReply: false });
        }
      });
      connection.on(ControlEvent.DISCONNECTED, () => this.retry(username, generation, 'TikTok disconnected'));
      connection.on(WebcastEvent.STREAM_END, () => this.retry(username, generation, 'TikTok LIVE ended'));
      await connection.connect();
      if (generation !== this.generation) {
        connection.disconnect();
        return;
      }
      this.failures = 0;
      this.update({ status: 'connected', detail: 'Receiving unofficial TikTok LIVE events', account: username,
        viewers: currentViewers, canReply: false });
    } catch (error) {
      this.retry(username, generation, tiktokErrorDetail(error));
    }
  }

  private retry(username: string, generation: number, detail: string): void {
    if (generation !== this.generation || this.timer) {
      return;
    }
    this.update({ status: 'offline', detail, account: username, canReply: false });
    if (this.engine.settings.autoReconnect) {
      const delay = Math.min(120000, 5000 * 2 ** Math.min(this.failures++, 5)) + Math.random() * 1000;
      this.timer = setTimeout(() => {
        this.timer = undefined;
        void this.connect(username);
      }, delay);
    }
  }

  stop(): void {
    this.generation += 1;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = undefined;
  }
}
