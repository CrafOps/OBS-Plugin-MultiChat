import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { z } from 'zod';
import { Store } from './storage/store.js';
import { ChatEngine } from './services/engine.js';
import { settingsSchema } from './types/protocol.js';
import { YouTubeConnector } from './platforms/youtube.js';
import { TikTokConnector } from './platforms/tiktok.js';
import { SharingService } from './services/sharing.js';
import { SoundStore } from './services/sounds.js';

const port = z.coerce.number().int().min(1024).max(65535).parse(process.env.BRIDGE_PORT ?? 17865);
const controlToken = process.env.BRIDGE_TOKEN;
if (!controlToken || controlToken.length < 32) {
  throw new Error('BRIDGE_TOKEN must be a random token of at least 32 characters');
}
const store = new Store(process.env.BRIDGE_DATA ?? join(process.env.LOCALAPPDATA ?? '.', 'obs-unified-chat'));
await store.initialize();
const engine = new ChatEngine(await store.settings());
const sharing = new SharingService(store);
const sounds = new SoundStore(join(store.directory, 'sounds'));
const soundNames: Record<string, string> = {};
for (const kind of ['gift', 'follow'] as const) {
  try {
    soundNames[kind] = (await sounds.get(kind))?.name ?? '';
  } catch {
    soundNames[kind] = '';
  }
}
const overlayToken = randomBytes(32).toString('hex');
const origin = `http://127.0.0.1:${port}`;
const app = Fastify({ logger: false, bodyLimit: 16384, requestTimeout: 15000 });
const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
type Role = 'control' | 'overlay' | 'alerts';
const roles = new Map<WebSocket, Role>();
const alive = new Set<WebSocket>();
let closing = false;

function authorized(candidate: string | undefined, expected: string): boolean {
  const actual = Buffer.from(candidate ?? '');
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function overlaySettings() {
  return { overlayLimit: engine.settings.overlayLimit, overlaySeconds: engine.settings.overlaySeconds };
}

function alertSettings() {
  return { alerts: engine.settings.alerts,
    sounds: Object.fromEntries(['gift', 'follow'].map(kind => [kind, soundNames[kind]
      ? `${origin}/sounds/${kind}?token=${overlayToken}` : ''])) };
}

function publishAlert(packet: unknown): void {
  for (const [socket, role] of roles) {
    if (role === 'alerts') {
      send(socket, packet);
    }
  }
}

function send(socket: WebSocket, data: unknown): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  if (socket.bufferedAmount > 1024 * 1024) {
    socket.close(1013, 'Client too slow');
    return;
  }
  socket.send(JSON.stringify(data));
}

function publish(data: unknown, controlsOnly = false): void {
  for (const [socket, role] of roles) {
    if (!controlsOnly || role === 'control') {
      send(socket, data);
    }
  }
}

const changed = () => publish({ kind: 'state', youtube: youtube.state, tiktok: tiktok.state,
  broadcasts: youtube.broadcasts }, true);
const youtube = new YouTubeConnector(store, engine, changed);
const tiktok = new TikTokConnector(engine, changed);
engine.on('event', event => {
  const packet = { kind: 'event', event };
  publish(packet);
  sharing.publish(packet);
});
engine.on('profile', profile => {
  const packet = { kind: 'profile', ...profile };
  publish(packet);
  sharing.publish(packet);
});
engine.on('combo', combo => {
  const packet = { kind: 'combo', ...combo };
  publish(packet);
  sharing.publish(packet);
});
engine.on('alert', event => publishAlert({ kind: 'alert', event }));
engine.on('clear', () => {
  publish({ kind: 'clear' });
  sharing.publish({ kind: 'clear' });
});
sharing.on('state', state => publish({ kind: 'sharing', ...state }, true));
sharing.on('ready', () => {
  for (const event of engine.history.slice(-50)) {
    sharing.publish({ kind: 'event', event });
  }
});
await sharing.initialize(engine.settings.sharingAutoStart);
const comboExpiry = setInterval(() => engine.expireCombos(), 2000);
comboExpiry.unref();

app.addHook('onRequest', async (request, reply) => {
  if (request.headers.host !== `127.0.0.1:${port}`
      || request.headers.origin && request.headers.origin !== origin) {
    return reply.code(403).send({ error: 'Local origin required' });
  }
  reply.header('Cache-Control', 'no-store');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Referrer-Policy', 'no-referrer');
});
app.get('/health', async () => ({ protocol: 1, status: 'ok' }));
const overlayDirectory = fileURLToPath(new URL('../../overlay/', import.meta.url));
for (const [route, filename, contentType] of [
  ['/overlay', 'index.html', 'text/html; charset=utf-8'],
  ['/overlay.js', 'overlay.js', 'application/javascript; charset=utf-8'],
  ['/overlay.css', 'overlay.css', 'text/css; charset=utf-8'],
  ['/viewer', 'viewer.html', 'text/html; charset=utf-8'],
  ['/viewer.js', 'viewer.js', 'application/javascript; charset=utf-8'],
  ['/viewer.css', 'viewer.css', 'text/css; charset=utf-8'],
  ['/alerts', 'alerts.html', 'text/html; charset=utf-8'],
  ['/alerts.js', 'alerts.js', 'application/javascript; charset=utf-8'],
  ['/alerts.css', 'alerts.css', 'text/css; charset=utf-8'],
  ['/alert-queue.mjs', 'alert-queue.mjs', 'application/javascript; charset=utf-8']
] as const) {
  app.get(route, async (_request, reply) => {
    reply.header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src https:; frame-ancestors 'none'");
    return reply.type(contentType).send(await readFile(join(overlayDirectory, filename), 'utf8'));
  });
}
app.get<{ Params: { kind: string }; Querystring: { token?: string } }>('/sounds/:kind', async (request, reply) => {
  if (!['gift', 'follow'].includes(request.params.kind) || !authorized(request.query.token, overlayToken)) {
    return reply.code(403).send({ error: 'Not authorized' });
  }
  const sound = await sounds.get(request.params.kind as 'gift' | 'follow');
  return sound ? reply.type(sound.mime).send(sound.bytes) : reply.code(404).send({ error: 'Default sound' });
});

const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sharing'), requestId: z.string().max(64),
    action: z.enum(['start', 'stop', 'reset']), consent: z.boolean().default(false) }),
  z.object({ kind: z.literal('sound'), requestId: z.string().max(64),
    action: z.enum(['load', 'clear']), type: z.enum(['gift', 'follow']), path: z.string().max(4096).default('') }),
  z.object({ kind: z.literal('testAlert'), requestId: z.string().max(64), type: z.enum(['gift', 'follow']) }),
  z.object({ kind: z.literal('login'), requestId: z.string().max(64) }),
  z.object({ kind: z.literal('logout'), requestId: z.string().max(64) }),
  z.object({ kind: z.literal('refresh'), requestId: z.string().max(64) }),
  z.object({ kind: z.literal('clear'), requestId: z.string().max(64) }),
  z.object({ kind: z.literal('settings'), requestId: z.string().max(64), settings: settingsSchema }),
  z.object({ kind: z.literal('reply'), requestId: z.string().max(64), message: z.string().trim().min(1).max(200) })
]);
let commands = Promise.resolve();
wss.on('connection', (socket: WebSocket, _request: unknown, role: Role) => {
  roles.set(socket, role);
  alive.add(socket);
  socket.on('pong', () => alive.add(socket));
  socket.on('close', () => {
    roles.delete(socket);
    alive.delete(socket);
  });
  socket.on('error', () => socket.close());
  send(socket, { kind: 'snapshot', events: engine.history,
    combos: [...engine.combos].map(([key, value]) => ({ key, event: value.event, complete: false })),
    settings: role === 'control' ? engine.settings : role === 'alerts' ? alertSettings() : overlaySettings() });
  if (role === 'control') {
    send(socket, { kind: 'state', youtube: youtube.state, tiktok: tiktok.state,
      broadcasts: youtube.broadcasts, overlayUrl: `${origin}/overlay#${overlayToken}`,
      viewerUrl: `${origin}/viewer#${overlayToken}`, alertsUrl: `${origin}/alerts#${overlayToken}` });
    send(socket, { kind: 'sharing', ...sharing.state });
    send(socket, { kind: 'sounds', names: soundNames });
  }
  let windowStart = Date.now();
  let count = 0;
  socket.on('message', raw => {
    if (role !== 'control') {
      socket.close(1008, 'Read-only overlay');
      return;
    }
    if (Date.now() - windowStart > 10000) {
      windowStart = Date.now();
      count = 0;
    }
    if (++count > 20) {
      socket.close(1008, 'Command rate limit');
      return;
    }
    let command: z.infer<typeof commandSchema>;
    try {
      command = commandSchema.parse(JSON.parse(raw.toString()));
    } catch (error) {
      const detail = error instanceof z.ZodError
        ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).slice(0, 3).join('; ')
        : 'Malformed JSON command';
      send(socket, { kind: 'result', ok: false, error: `Invalid command: ${detail}` });
      return;
    }
    commands = commands.then(async () => {
      if (closing || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        let url: string | undefined;
        switch (command.kind) {
          case 'sharing':
            if (command.action === 'start') {
              await sharing.start(command.consent);
            } else if (command.action === 'reset') {
              await sharing.reset();
            } else {
              sharing.stop();
              engine.settings.sharingAutoStart = false;
              await store.saveSettings(engine.settings);
              publish({ kind: 'settings', settings: engine.settings }, true);
            }
            break;
          case 'sound':
            if (command.action === 'load') {
              await sounds.import(command.type, command.path);
            } else {
              await sounds.clear(command.type);
            }
            soundNames[command.type] = (await sounds.get(command.type))?.name ?? '';
            publish({ kind: 'sounds', names: soundNames }, true);
            publishAlert({ kind: 'settings', settings: alertSettings() });
            break;
          case 'testAlert':
            publishAlert({ kind: 'alert', test: true, event: {
              id: randomBytes(8).toString('hex'), platform: 'tiktok', type: command.type,
              timestamp: Date.now(), user: { id: 'test', username: 'crafops', displayName: 'CrafOps · Test' },
              monetaryEvent: command.type === 'gift' ? { giftName: 'Rose', quantity: 10 } : undefined
            } });
            break;
          case 'login':
            url = await youtube.login();
            break;
          case 'logout':
            await youtube.logout();
            break;
          case 'refresh':
            await youtube.discover();
            await tiktok.connect(engine.settings.tiktokUsername);
            break;
          case 'clear':
            engine.clear();
            break;
          case 'reply':
            await youtube.send(command.message);
            break;
          case 'settings':
            if (command.settings.sharingAutoStart && !sharing.state.consented) {
              throw new Error('Enable mobile sharing with consent first');
            }
            const previous = engine.settings;
            await store.saveSettings(command.settings);
            engine.settings = command.settings;
            engine.trim();
            for (const [client, clientRole] of roles) {
              send(client, { kind: 'settings', settings: clientRole === 'control' ? engine.settings
                : clientRole === 'alerts' ? alertSettings() : overlaySettings() });
            }
            if (previous.youtubeLiveUrl !== engine.settings.youtubeLiveUrl
                || previous.youtubeBroadcastId !== engine.settings.youtubeBroadcastId
                || previous.autoDetect !== engine.settings.autoDetect
                || previous.autoReconnect !== engine.settings.autoReconnect) {
              await youtube.discover();
            }
            if (previous.tiktokUsername !== engine.settings.tiktokUsername
                || previous.tiktokEnabled !== engine.settings.tiktokEnabled
                || previous.autoReconnect !== engine.settings.autoReconnect) {
              await tiktok.connect(engine.settings.tiktokUsername);
            }
            break;
        }
        send(socket, { kind: 'result', requestId: command.requestId, ok: true, url });
      } catch (error) {
        // External error objects can contain request headers and tokens; never serialize them.
        const detail = command.kind === 'sharing'
          ? 'Sharing request failed. Check internet access and consent; your link was not automatically reset.'
          : command.kind === 'sound' ? 'Choose a readable WAV or MP3 sound no larger than 2 MB.'
          : command.kind === 'login' && !process.env.YOUTUBE_CLIENT_ID
          ? 'Configure Google Desktop OAuth client credentials first'
          : 'Operation failed. Check account permissions, active stream, and local configuration.';
        send(socket, { kind: 'result', requestId: command.requestId, ok: false, error: detail });
      }
    });
  });
});

app.server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', origin);
  const role: Role | undefined = url.pathname === '/control' ? 'control'
    : url.pathname === '/events' ? url.searchParams.get('mode') === 'alerts' ? 'alerts' : 'overlay' : undefined;
  const token = role === 'control' ? request.headers.authorization?.replace(/^Bearer /, '') : url.searchParams.get('token') ?? undefined;
  const validOrigin = role !== 'control' ? request.headers.origin === origin : !request.headers.origin;
  if (!role || !validOrigin || request.headers.host !== `127.0.0.1:${port}`
      || !authorized(token, role === 'control' ? controlToken : overlayToken) || roles.size >= 16) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request, role));
});

const heartbeat = setInterval(() => {
  for (const socket of roles.keys()) {
    if (!alive.delete(socket)) {
      socket.terminate();
    } else {
      socket.ping();
    }
  }
}, 30000);

async function shutdown(): Promise<void> {
  if (closing) {
    return;
  }
  closing = true;
  process.stdin.destroy();
  clearInterval(heartbeat);
  clearInterval(parentWatch);
  clearInterval(comboExpiry);
  sharing.stop();
  youtube.stop();
  tiktok.stop();
  for (const socket of roles.keys()) {
    socket.terminate();
  }
  wss.close();
  await app.close();
}
const parentPid = process.env.BRIDGE_PARENT_PID ? Number(process.env.BRIDGE_PARENT_PID) : undefined;
const parentWatch = setInterval(() => {
  if (parentPid) {
    try {
      process.kill(parentPid, 0);
    } catch {
      void shutdown();
    }
  }
}, 2000);
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
process.stdin.setEncoding('utf8');
process.stdin.on('data', data => {
  if (String(data).trim() === 'shutdown') {
    void shutdown();
  }
});
process.stdin.on('end', () => {
  if (parentPid) {
    void shutdown();
  }
});
await app.listen({ host: '127.0.0.1', port });
process.stdout.write('READY\n');
void youtube.restore().catch(() => {
  youtube.state = { status: 'error', detail: 'Credential restoration failed; login again', canReply: false };
  changed();
});
void tiktok.connect(engine.settings.tiktokUsername);
