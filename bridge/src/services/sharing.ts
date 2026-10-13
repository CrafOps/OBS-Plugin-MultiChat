import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { z } from 'zod';
import QRCode from 'qrcode';
import { relayPacketSchema } from '../types/relay.js';

export const sharingOrigin = 'https://docks.54621325.xyz';
const keysSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{32}$/),
  readKey: z.string().regex(/^[a-f0-9]{64}$/),
  writeKey: z.string().regex(/^[a-f0-9]{64}$/)
});
const savedSchema = keysSchema.extend({ consentVersion: z.literal(1) });
type Saved = z.infer<typeof savedSchema>;
type Storage = { loadSharing(): Promise<unknown>; saveSharing(value: unknown): Promise<void> };
export type SharingState = {
  status: 'off' | 'connecting' | 'live' | 'retrying' | 'error';
  detail: string;
  consented: boolean;
  link?: string;
  qr?: string;
};

export class SharingService extends EventEmitter {
  state: SharingState = { status: 'off', detail: 'Mobile sharing is off', consented: false };
  private saved?: Saved;
  private socket?: WebSocket;
  private heartbeat?: NodeJS.Timeout;
  private reconnect?: NodeJS.Timeout;
  private enabled = false;
  private generation = 0;
  private failures = 0;
  private qr?: string;
  private pending: string[] = [];
  private flushTimer?: NodeJS.Timeout;
  private windowStart = 0;
  private windowCount = 0;

  constructor(private store: Storage, private origin = sharingOrigin) {
    super();
    const url = new URL(origin);
    if (origin !== sharingOrigin && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new Error('Unsupported sharing host');
    }
  }

  async initialize(autoStart: boolean): Promise<void> {
    try {
      const value = await this.store.loadSharing();
      if (value !== undefined) {
        this.saved = savedSchema.parse(value);
        await this.updateLink();
      }
      this.update('off', 'Mobile sharing is off');
      if (autoStart && this.saved) {
        await this.start(false);
      }
    } catch {
      this.update('error', 'Saved sharing keys could not be opened; they were not reset');
    }
  }

  private async json(path: string, options: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.origin}${path}`, { ...options,
      redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok || !response.body) {
      throw new Error('Sharing server request failed');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        size += value.length;
        if (size > 4096) {
          throw new Error('Sharing response exceeded its size limit');
        }
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  async start(consent: boolean): Promise<void> {
    const generation = this.generation;
    if (this.state.status === 'error' && !this.saved) {
      throw new Error('Repair saved sharing keys first');
    }
    if (!this.saved) {
      if (!consent) {
        throw new Error('Explicit sharing consent is required');
      }
      const keys = keysSchema.parse(await this.json('/rooms', { method: 'POST' }));
      const saved: Saved = { ...keys, consentVersion: 1 };
      await this.store.saveSharing(saved);
      this.saved = saved;
      await this.updateLink();
    }
    if (this.enabled) {
      return;
    }
    if (generation !== this.generation) {
      return;
    }
    this.enabled = true;
    this.failures = 0;
    this.connect();
  }

  stop(): void {
    this.enabled = false;
    this.generation += 1;
    clearTimeout(this.reconnect);
    clearInterval(this.heartbeat);
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    this.pending.length = 0;
    this.socket?.terminate();
    this.socket = undefined;
    this.update('off', 'Mobile sharing is off');
  }

  async reset(): Promise<void> {
    if (!this.saved) {
      throw new Error('Enable sharing before resetting a link');
    }
    const result = z.object({ readKey: keysSchema.shape.readKey }).parse(await this.json(`/rooms/${this.saved.id}/reset`, {
      method: 'POST', headers: { Authorization: `Bearer ${this.saved.writeKey}` }
    }));
    const replacement = { ...this.saved, readKey: result.readKey };
    await this.store.saveSharing(replacement);
    this.saved = replacement;
    await this.updateLink();
    this.update(this.state.status, 'Link reset; previous links no longer work');
  }

  publish(packet: unknown): void {
    if (!this.enabled || this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    const parsed = relayPacketSchema.safeParse(packet);
    if (!parsed.success) {
      return;
    }
    const data = JSON.stringify(parsed.data);
    if (Buffer.byteLength(data) > 32768) {
      return;
    }
    this.pending.push(data);
    if (this.pending.length > 100) {
      this.pending.shift();
    }
    this.flush();
  }

  private flush(): void {
    if (this.socket?.readyState !== WebSocket.OPEN || !this.enabled) {
      this.pending.length = 0;
      return;
    }
    if (this.socket.bufferedAmount > 128 * 1024) {
      this.socket.terminate();
      this.pending.length = 0;
      return;
    }
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.windowCount = 0;
    }
    while (this.pending.length && this.windowCount < 50) {
      this.socket.send(this.pending.shift()!);
      this.windowCount += 1;
    }
    if (this.pending.length && !this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = undefined;
        this.flush();
      }, Math.max(10, 1000 - (now - this.windowStart)));
      this.flushTimer.unref();
    }
  }

  private async updateLink(): Promise<void> {
    if (!this.saved) {
      return;
    }
    const link = `${this.origin}/viewer#${this.saved.id}.${this.saved.readKey}`;
    this.qr = await QRCode.toDataURL(link, { width: 256, margin: 2, errorCorrectionLevel: 'M' });
  }

  private update(status: SharingState['status'], detail: string): void {
    this.state = { status, detail, consented: Boolean(this.saved), qr: this.qr,
      link: this.saved ? `${this.origin}/viewer#${this.saved.id}.${this.saved.readKey}` : undefined };
    this.emit('state', this.state);
  }

  private connect(): void {
    if (!this.enabled || !this.saved) {
      return;
    }
    const generation = ++this.generation;
    this.update('connecting', 'Connecting to mobile sharing server…');
    const socket = new WebSocket(`${this.origin.replace(/^http/, 'ws')}/publish?room=${this.saved.id}`,
      ['chat', this.saved.writeKey], { handshakeTimeout: 10000, maxPayload: 1024 });
    this.socket = socket;
    let pong = true;
    socket.on('open', () => {
      if (generation !== this.generation) {
        socket.terminate();
        return;
      }
      this.failures = 0;
      this.windowStart = Date.now();
      this.windowCount = 0;
      this.update('live', 'Mobile sharing is live · read only');
      this.emit('ready');
      this.heartbeat = setInterval(() => {
        if (!pong) {
          socket.terminate();
          return;
        }
        pong = false;
        socket.send('ping');
      }, 30000);
      this.heartbeat.unref();
    });
    socket.on('message', raw => {
      if (raw.toString() === 'pong') {
        pong = true;
      }
      // Remote data can never become a local OBS control command.
    });
    socket.on('unexpected-response', (request, response) => {
      response.resume();
      request.destroy();
      socket.terminate();
    });
    socket.on('error', () => undefined);
    socket.on('close', () => {
      if (generation !== this.generation || !this.enabled) {
        return;
      }
      clearInterval(this.heartbeat);
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
      this.pending.length = 0;
      this.update('retrying', 'Sharing disconnected; reconnecting without changing the link…');
      const delay = Math.min(30000, 1000 * 2 ** Math.min(this.failures++, 5));
      this.reconnect = setTimeout(() => this.connect(), delay);
      this.reconnect.unref();
    });
  }
}
