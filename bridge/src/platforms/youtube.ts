import { google, youtube_v3 } from 'googleapis';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Credentials } from 'google-auth-library';
import { z } from 'zod';
import type { Store } from '../storage/store.js';
import type { ChatEngine } from '../services/engine.js';
import type { PlatformState, ChatEvent } from '../types/protocol.js';
import { youtubeVideoId } from '../types/youtube-target.js';
import { PublicYouTubeConnector } from './youtube-public.js';
import { ChannelNames, viewerCount } from './youtube-metadata.js';

export function manualLiveChat(video: youtube_v3.Schema$Video | undefined): {
  chatId?: string;
  title?: string;
  detail: string;
} {
  if (!video) {
    return { detail: 'Video not found or not accessible' };
  }
  const live = video.liveStreamingDetails;
  const title = video.snippet?.title ?? undefined;
  if (live?.actualEndTime) {
    return { title, detail: 'Broadcast ended; live chat is closed' };
  }
  if (live?.activeLiveChatId) {
    return { title, chatId: live.activeLiveChatId, detail: 'Reading selected YouTube LIVE chat (read-only)' };
  }
  return { title, detail: 'No active live chat; stream may be scheduled, offline, or chat disabled' };
}

const credentialsSchema = z.object({
  access_token: z.string().nullish(),
  refresh_token: z.string().nullish(),
  expiry_date: z.number().nullish(),
  token_type: z.string().nullish(),
  scope: z.string().optional()
});

export function normalizeYouTube(item: youtube_v3.Schema$LiveChatMessage): ChatEvent | undefined {
  const snippet = item.snippet;
  const author = item.authorDetails;
  if (!item.id || !snippet || !author) {
    return undefined;
  }
  const superchat = snippet.superChatDetails;
  const sticker = snippet.superStickerDetails;
  const type: ChatEvent['type'] = superchat || sticker ? 'superchat'
    : ['newSponsorEvent', 'memberMilestoneChatEvent', 'membershipGiftingEvent', 'giftMembershipReceivedEvent']
      .includes(snippet.type ?? '') ? 'membership'
    : snippet.type === 'textMessageEvent' ? 'message' : 'system';
  const money = superchat ?? sticker;
  return {
    id: item.id,
    platform: 'youtube',
    type,
    timestamp: Date.parse(snippet.publishedAt ?? '') || Date.now(),
    user: {
      id: author.channelId ?? '',
      username: author.displayName ?? '',
      displayName: author.displayName ?? 'YouTube viewer',
      avatarUrl: author.profileImageUrl ?? undefined,
      badges: [author.isChatOwner ? 'Owner' : '', author.isChatModerator ? 'Moderator' : '',
        author.isChatSponsor ? 'Member' : ''].filter(Boolean)
    },
    message: snippet.displayMessage ?? sticker?.superStickerMetadata?.altText ?? snippet.type ?? '',
    monetaryEvent: money ? {
      amount: Number(money.amountMicros ?? 0) / 1000000,
      currency: money.currency ?? undefined,
      quantity: 1
    } : undefined
  };
}

export class YouTubeConnector {
  state: PlatformState = { status: 'disconnected', detail: 'Login required', canReply: false };
  broadcasts: { id: string; title: string; active: boolean }[] = [];
  private auth;
  private api;
  private readApi;
  private publicChat;
  private callback?: Server;
  private callbackTimer?: NodeJS.Timeout;
  private timer?: NodeJS.Timeout;
  private chatId?: string;
  private pageToken?: string;
  private generation = 0;
  private saveQueue = Promise.resolve();
  private failures = 0;
  private discovery = false;
  private lastSend = 0;
  private names = new ChannelNames();

  constructor(private store: Store, private engine: ChatEngine, private changed: () => void) {
    this.auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
    this.api = google.youtube({ version: 'v3', auth: this.auth });
    this.readApi = this.api;
    this.publicChat = new PublicYouTubeConnector(engine, state => this.update(state));
    this.auth.on('tokens', tokens => {
      const merged = { ...this.auth.credentials, ...tokens };
      this.saveQueue = this.saveQueue.then(() => this.store.saveCredentials(merged)).catch(() => {
        this.update({ status: 'error', detail: 'Unable to save credentials securely', canReply: false });
      });
    });
  }

  private update(state: PlatformState): void {
    this.state = state;
    this.changed();
  }

  async restore(): Promise<void> {
    const stored = await this.store.credentials();
    if (stored) {
      this.auth.setCredentials(credentialsSchema.parse(stored));
    }
    await this.discover();
  }

  async login(): Promise<string> {
    if (!process.env.YOUTUBE_CLIENT_ID) {
      throw new Error('Set YOUTUBE_CLIENT_ID to a Google Desktop app client ID');
    }
    this.closeCallback();
    const state = randomBytes(32).toString('hex');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    let redirect = '';
    let consumed = false;
    this.callback = createServer(async (request, response) => {
      const url = new URL(request.url ?? '/', redirect);
      const received = url.searchParams.get('state') ?? '';
      const validState = Buffer.byteLength(received) === Buffer.byteLength(state)
        && timingSafeEqual(Buffer.from(received), Buffer.from(state));
      if (url.pathname !== '/callback' || consumed || !validState) {
        response.writeHead(400).end('Invalid authorization callback');
        return;
      }
      consumed = true;
      try {
        const code = url.searchParams.get('code');
        if (!code || url.searchParams.has('error')) {
          throw new Error('Authorization denied');
        }
        const result = await this.auth.getToken({ code, codeVerifier: verifier, redirect_uri: redirect });
        this.auth.setCredentials(result.tokens);
        await this.saveQueue;
        await this.store.saveCredentials(result.tokens);
        response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
          .end('YouTube connected. Close this tab and return to OBS.');
        await this.discover();
      } catch {
        if (!response.writableEnded) {
          response.writeHead(400).end('Authorization failed. Return to OBS and try again.');
        }
        this.update({ status: 'error', detail: 'YouTube authorization failed', canReply: false });
      } finally {
        this.closeCallback();
      }
    });
    await new Promise<void>((resolve, reject) => {
      this.callback!.once('error', reject);
      this.callback!.listen(0, '127.0.0.1', resolve);
    });
    redirect = `http://127.0.0.1:${(this.callback.address() as AddressInfo).port}/callback`;
    this.callbackTimer = setTimeout(() => this.closeCallback(), 300000);
    return this.auth.generateAuthUrl({
      redirect_uri: redirect,
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256' as never
    });
  }

  async discover(): Promise<void> {
    if (this.discovery) {
      // Cancel any older selection before retrying the newly saved target.
      this.stopPolling();
      this.timer = setTimeout(() => void this.discover(), 250);
      return;
    }
    const target = this.engine.settings.youtubeLiveUrl;
    const authenticated = Boolean(this.auth.credentials.access_token || this.auth.credentials.refresh_token);
    const key = process.env.YOUTUBE_API_KEY?.trim();
    if (target && !key) {
      this.discovery = true;
      this.stopPolling();
      this.broadcasts = [];
      try {
        await this.publicChat.connect(youtubeVideoId(target)!);
      } finally {
        this.discovery = false;
      }
      return;
    }
    if (!authenticated && !(target && key)) {
      this.stopPolling();
      this.update({ status: 'disconnected', canReply: false,
        detail: target ? 'Configure YouTube API Key in Settings, then restart OBS' : 'Login required or enter a LIVE ID and API key' });
      return;
    }
    this.discovery = true;
    this.stopPolling();
    const generation = this.generation;
    this.update({ status: 'connecting', detail: 'Discovering broadcasts', canReply: false });
    try {
      if (target) {
        this.readApi = key ? google.youtube({ version: 'v3', auth: key }) : this.api;
        const result = await this.readApi.videos.list({
          id: [youtubeVideoId(target)!],
          part: ['snippet', 'liveStreamingDetails']
        });
        if (generation !== this.generation) {
          return;
        }
        const selected = manualLiveChat(result.data.items?.[0]);
        this.chatId = selected.chatId;
        this.broadcasts = [];
        this.failures = 0;
        this.update({ status: this.chatId ? 'connected' : 'offline',
            title: selected.title, detail: selected.detail, canReply: false,
            account: result.data.items?.[0]?.snippet?.channelTitle ?? undefined,
            viewers: this.chatId ? viewerCount(result.data.items?.[0]?.liveStreamingDetails?.concurrentViewers) : undefined });
        if (this.chatId) {
          void this.poll(generation);
        } else if (this.engine.settings.autoDetect) {
          this.timer = setTimeout(() => void this.discover(), 60000);
        }
        return;
      }
      this.readApi = this.api;
      const channel = await this.api.channels.list({ part: ['snippet'], mine: true });
      const account = channel.data.items?.[0]?.snippet?.title ?? 'YouTube';
      const active = await this.api.liveBroadcasts.list({ part: ['snippet', 'status'], broadcastStatus: 'active', maxResults: 50 });
      const recent = await this.api.liveBroadcasts.list({ part: ['snippet', 'status'], mine: true, maxResults: 50 });
      if (generation !== this.generation) {
        return;
      }
      const items = [...(active.data.items ?? []), ...(recent.data.items ?? [])];
      const unique = [...new Map(items.map(item => [item.id, item])).values()];
      unique.sort((a, b) => Date.parse(b.snippet?.publishedAt ?? '') - Date.parse(a.snippet?.publishedAt ?? ''));
      this.broadcasts = unique.filter(item => item.id).map(item => ({
        id: item.id!,
        title: item.snippet?.title ?? item.id!,
        active: item.status?.lifeCycleStatus === 'live'
      }));
      const manual = this.engine.settings.youtubeBroadcastId;
      const selected = manual ? unique.find(item => item.id === manual)
        : unique.find(item => item.status?.lifeCycleStatus === 'live') ?? unique[0];
      this.chatId = selected?.status?.lifeCycleStatus === 'live'
        ? selected.snippet?.liveChatId ?? undefined : undefined;
      this.failures = 0;
      this.update({ status: this.chatId ? 'connected' : 'offline', account,
        title: selected?.snippet?.title ?? undefined,
        detail: this.chatId ? 'Receiving live chat' : 'No active chat; latest broadcast shown',
        canReply: Boolean(this.chatId) });
      if (this.chatId) {
        void this.poll(generation);
      } else if (this.engine.settings.autoDetect) {
        this.timer = setTimeout(() => void this.discover(), 60000);
      }
    } catch (error) {
      if (generation === this.generation) {
        this.handleError(error, () => void this.discover());
      }
    } finally {
      this.discovery = false;
    }
  }

  private async poll(generation: number): Promise<void> {
    if (!this.chatId || generation !== this.generation) {
      return;
    }
    try {
      const result = await this.readApi.liveChatMessages.list({
        liveChatId: this.chatId,
        part: ['snippet', 'authorDetails'],
        pageToken: this.pageToken,
        maxResults: 200
      });
      if (generation !== this.generation) {
        return;
      }
      for (const item of result.data.items ?? []) {
        const event = normalizeYouTube(item);
        if (event) {
          const cached = this.names.cached(event.user.id);
          event.user.displayName = cached.displayName ?? event.user.displayName;
          event.user.username = cached.handle ?? event.user.username;
          this.engine.accept(event);
          void this.names.get(event.user.id).then(profile => {
            if (generation === this.generation) {
              this.engine.updateYouTubeName(event.user.id, profile);
            }
          }).catch(() => undefined);
        }
      }
      this.pageToken = result.data.nextPageToken ?? undefined;
      this.failures = 0;
      if (result.data.offlineAt) {
        this.stopPolling();
        this.update({ ...this.state, status: 'offline', detail: 'Broadcast ended', canReply: false });
        if (this.engine.settings.autoDetect) {
          this.timer = setTimeout(() => void this.discover(), 60000);
        }
        return;
      }
      const readOnly = Boolean(this.engine.settings.youtubeLiveUrl);
      this.update({ ...this.state, status: 'connected',
        detail: readOnly ? 'Reading selected YouTube LIVE chat (read-only)' : 'Receiving live chat',
        canReply: !readOnly });
      this.timer = setTimeout(() => void this.poll(generation), Math.max(1000, result.data.pollingIntervalMillis ?? 5000));
    } catch (error) {
      if (generation === this.generation) {
        this.handleError(error, () => void this.poll(generation));
      }
    }
  }

  private handleError(error: unknown, retry: () => void): void {
    const data = error as { response?: { status?: number; data?: { error?: { errors?: { reason?: string }[] } } } };
    const reason = data.response?.data?.error?.errors?.[0]?.reason;
    const fatal = data.response?.status === 401 || data.response?.status === 403
      || reason === 'liveChatEnded' || reason === 'liveChatNotFound';
    const detail = reason === 'quotaExceeded' ? 'YouTube quota exhausted; retry after quota reset'
      : fatal ? 'Chat unavailable or permission denied; refresh or login again' : 'YouTube temporarily unavailable';
    this.update({ ...this.state, status: 'error', detail, canReply: false });
    if (!fatal && this.engine.settings.autoReconnect) {
      this.timer = setTimeout(retry, Math.min(60000, 2000 * 2 ** Math.min(this.failures++, 5)));
    }
  }

  async send(message: string): Promise<void> {
    if (this.engine.settings.youtubeLiveUrl || !this.chatId || !this.state.canReply) {
      throw new Error('No authorized active YouTube chat');
    }
    if (Date.now() - this.lastSend < 2000) {
      throw new Error('Wait two seconds between replies');
    }
    this.lastSend = Date.now();
    await this.api.liveChatMessages.insert({ part: ['snippet'], requestBody: {
      snippet: { liveChatId: this.chatId, type: 'textMessageEvent', textMessageDetails: { messageText: message } }
    } });
  }

  private stopPolling(): void {
    this.publicChat.stop();
    this.generation += 1;
    clearTimeout(this.timer);
    this.chatId = undefined;
    this.pageToken = undefined;
  }

  private closeCallback(): void {
    clearTimeout(this.callbackTimer);
    this.callback?.close();
    this.callback = undefined;
  }

  async logout(): Promise<void> {
    this.stop();
    const credentials: Credentials = this.auth.credentials;
    this.auth.setCredentials({});
    await this.saveQueue;
    await this.store.clearCredentials();
    this.update({ status: 'disconnected', detail: 'Logged out', canReply: false });
    if (credentials.access_token) {
      await this.auth.revokeToken(credentials.access_token).catch(() => undefined);
    }
  }

  stop(): void {
    this.stopPolling();
    this.closeCallback();
  }
}
