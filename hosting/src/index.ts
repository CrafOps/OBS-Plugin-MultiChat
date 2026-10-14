import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import { eventSchema, type ChatEvent } from './generated/protocol.js';

const packetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('event'), event: eventSchema }),
  z.object({ kind: z.literal('clear') }),
  z.object({ kind: z.literal('profile'), platform: z.literal('youtube'),
    id: z.string().max(256), user: z.object({
      displayName: z.string().max(256).optional(), username: z.string().max(256).optional()
    }) }),
  z.object({ kind: z.literal('combo'), key: z.string().max(512), event: eventSchema, complete: z.boolean() })
]);
type Credentials = { id: string; readHash: string; writeHash: string };
type Attachment = { role: 'reader' | 'publisher'; count: number; start: number };

function randomHex(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
}

async function hash(value: string): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function matches(value: string, expected: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    return false;
  }
  const actual = new TextEncoder().encode(await hash(value));
  return crypto.subtle.timingSafeEqual(actual, new TextEncoder().encode(expected));
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export class ChatRoom extends DurableObject<Env> {
  private credentials?: Credentials;
  // Chat is deliberately transient. Hibernation can discard this bounded cache.
  private history: ChatEvent[] = [];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.credentials = await ctx.storage.get<Credentials>('credentials');
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async provision(id: string): Promise<{ id: string; readKey: string; writeKey: string }> {
    if (this.credentials) {
      throw new Error('Room already exists');
    }
    const readKey = randomHex(32);
    const writeKey = randomHex(32);
    const credentials = { id, readHash: await hash(readKey), writeHash: await hash(writeKey) };
    await this.ctx.storage.put('credentials', credentials);
    this.credentials = credentials;
    return { id, readKey, writeKey };
  }

  async reset(supplied: string): Promise<Response> {
    const credentials = this.credentials;
    if (!credentials || !await matches(supplied, credentials.writeHash)) {
      return json({ error: 'Not authorized' }, 403);
    }
    const readKey = randomHex(32);
    const replacement = { ...credentials, readHash: await hash(readKey) };
    await this.ctx.storage.put('credentials', replacement);
    this.credentials = replacement;
    for (const socket of this.ctx.getWebSockets('reader')) {
      socket.close(1008, 'Link reset');
    }
    return json({ readKey });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/reset') && request.method === 'POST') {
      return this.reset(request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '');
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return json({ error: 'WebSocket required' }, 426);
    }
    const publisher = url.pathname === '/publish';
    const origin = request.headers.get('Origin');
    if (publisher ? Boolean(origin) : origin !== this.env.PUBLIC_ORIGIN) {
      return json({ error: 'Origin rejected' }, 403);
    }
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') ?? '').split(',').map(value => value.trim());
    const credentials = this.credentials;
    const expected = publisher ? credentials?.writeHash : credentials?.readHash;
    if (!expected || protocols[0] !== 'chat' || protocols.length !== 2
        || !await matches(protocols[1]!, expected)
        || expected !== (publisher ? this.credentials?.writeHash : this.credentials?.readHash)) {
      return json({ error: 'Not authorized' }, 403);
    }
    const sockets = this.ctx.getWebSockets(publisher ? 'publisher' : 'reader')
      .filter(socket => socket.readyState === WebSocket.OPEN);
    if (sockets.length >= (publisher ? 1 : 16)) {
      return json({ error: 'Room connection limit' }, 429);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const role = publisher ? 'publisher' : 'reader';
    this.ctx.acceptWebSocket(server!, [role]);
    server!.serializeAttachment({ role, count: 0, start: Date.now() } satisfies Attachment);
    if (publisher) {
      this.broadcast({ kind: 'presence', online: true });
    } else {
      server!.send(JSON.stringify({ kind: 'snapshot', events: this.history }));
      server!.send(JSON.stringify({ kind: 'presence', online: this.publisherOnline() }));
    }
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'chat' } });
  }

  webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): void {
    const attachment = socket.deserializeAttachment() as Attachment;
    if (attachment.role !== 'publisher' || typeof raw !== 'string' || new TextEncoder().encode(raw).length > 32768) {
      socket.close(1008, 'Read only or invalid packet');
      return;
    }
    const now = Date.now();
    if (now - attachment.start >= 1000) {
      attachment.start = now;
      attachment.count = 0;
    }
    attachment.count += 1;
    socket.serializeAttachment(attachment);
    if (attachment.count > 100) {
      socket.close(1008, 'Rate limit');
      return;
    }
    try {
      const packet = packetSchema.parse(JSON.parse(raw));
      if (packet.kind === 'event') {
        this.history.push(packet.event);
        this.history.splice(0, Math.max(0, this.history.length - 100));
      } else if (packet.kind === 'clear') {
        this.history.length = 0;
      } else if (packet.kind === 'profile') {
        for (const event of this.history) {
          if (event.platform === packet.platform && event.user.id === packet.id) {
            Object.assign(event.user, packet.user);
          }
        }
      }
      this.broadcast(packet);
    } catch {
      socket.close(1008, 'Invalid packet');
    }
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    socket.close(code === 1005 || code === 1006 || code === 1015 ? 1000 : code, reason);
    if ((socket.deserializeAttachment() as Attachment).role === 'publisher' && !this.publisherOnline()) {
      this.history.length = 0;
      this.broadcast({ kind: 'clear' });
      this.broadcast({ kind: 'presence', online: false });
    }
  }

  webSocketError(socket: WebSocket): void {
    socket.close(1011, 'Connection error');
  }

  private broadcast(packet: unknown): void {
    const text = JSON.stringify(packet);
    for (const socket of this.ctx.getWebSockets('reader')) {
      if (socket.readyState !== WebSocket.OPEN) {
        continue;
      }
      try {
        socket.send(text);
      } catch {
        socket.close(1011, 'Reader unavailable');
      }
    }
  }

  private publisherOnline(): boolean {
    return this.ctx.getWebSockets('publisher').some(socket => socket.readyState === WebSocket.OPEN);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.has('Origin') && request.headers.get('Origin') !== env.PUBLIC_ORIGIN) {
      return json({ error: 'Origin rejected' }, 403);
    }
    try {
      if (url.pathname === '/health') {
        return json({ status: 'ok', service: 'multi-live-chat', origin: env.PUBLIC_ORIGIN });
      }
      if (url.pathname === '/rooms' && request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
        const limited = await env.ROOM_LIMITER.limit({ key: ip });
        if (!limited.success) {
          return json({ error: 'Room creation limit' }, 429);
        }
        const id = randomHex(16);
        return json(await env.CHAT_ROOMS.getByName(id).provision(id), 201);
      }
      const reset = url.pathname.match(/^\/rooms\/([a-f0-9]{32})\/reset$/);
      const id = reset?.[1] ?? url.searchParams.get('room');
      if (reset || url.pathname === '/read' || url.pathname === '/publish') {
        if (!id || !/^[a-f0-9]{32}$/.test(id)) {
          return json({ error: 'Invalid room' }, 400);
        }
        return env.CHAT_ROOMS.getByName(id).fetch(request);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ error: 'Method not allowed' }, 405);
      }
      if (String(env.WEB_FRONTEND) === 'react') {
        const pages = ['/', '/viewer', '/overlay', '/docs', '/releases'];
        const isPage = pages.includes(url.pathname)
          || /^\/docs\/[a-z-]+$/.test(url.pathname);
        const isAsset = /^\/assets\/[a-zA-Z0-9._-]+$/.test(url.pathname);
        if (url.pathname === '/viewer.html') {
          return Response.redirect(new URL('/viewer', url).href, 307);
        }
        if (!isPage && !isAsset) {
          return json({ error: 'Not found' }, 404);
        }
        if (isPage) {
          url.pathname = '/index.html';
        }
        const asset = await env.ASSETS.fetch(new Request(url, request));
        const result = new Response(asset.body, asset);
        // Private links may enter the SPA from any route. Do not inject analytics
        // scripts that could observe URL fragments before the reader clears them.
        result.headers.set('Cache-Control', isAsset ? 'public, max-age=31536000, immutable' : 'no-store, no-transform');
        result.headers.set('Referrer-Policy', 'no-referrer');
        result.headers.set('X-Content-Type-Options', 'nosniff');
        result.headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self' https://api.github.com; img-src https:; frame-ancestors 'none'; base-uri 'none'");
        return result;
      }
      if (url.pathname === '/' || url.pathname === '/viewer') {
        url.pathname = '/viewer.html';
      }
      if (!['/viewer.html', '/viewer.js', '/viewer.css'].includes(url.pathname)) {
        return json({ error: 'Not found' }, 404);
      }
      const asset = await env.ASSETS.fetch(new Request(url, request));
      // Retain content types and status from the static asset binding.
      const result = new Response(asset.body, asset);
      result.headers.set('Cache-Control', 'no-store');
      result.headers.set('Referrer-Policy', 'no-referrer');
      result.headers.set('X-Content-Type-Options', 'nosniff');
      result.headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src https:; frame-ancestors 'none'; base-uri 'none'");
      return result;
    } catch {
      return json({ error: 'Service temporarily unavailable' }, 503);
    }
  }
} satisfies ExportedHandler<Env>;
