import { EventEmitter } from 'node:events';
import { eventSchema, type ChatEvent, type Settings } from '../types/protocol.js';

export class ChatEngine extends EventEmitter {
  private seen = new Map<string, number>();
  private users = new Map<string, { start: number; count: number; text: string }>();
  readonly history: ChatEvent[] = [];

  constructor(public settings: Settings, private now = () => Date.now()) {
    super();
  }

  accept(input: unknown): boolean {
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) {
      return false;
    }
    const event = parsed.data;
    const key = `${event.platform}:${event.id}`;
    const now = this.now();
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.set(key, now);
    for (const [id, time] of this.seen) {
      if (time < now - 600000 || this.seen.size > 10000) {
        this.seen.delete(id);
      } else {
        break;
      }
    }
    if (!this.settings.enabledTypes.includes(event.type)) {
      return false;
    }
    const text = event.message?.toLocaleLowerCase() ?? '';
    if (this.settings.blockedWords.some(word => text.includes(word.toLocaleLowerCase()))) {
      return false;
    }
    const userKey = `${event.platform}:${event.user.id}`;
    const previous = this.users.get(userKey);
    const bucket = previous && now - previous.start < 10000
      ? previous
      : { start: now, count: 0, text: '' };
    bucket.count += 1;
    this.users.delete(userKey);
    this.users.set(userKey, bucket);
    while (this.users.size > 5000) {
      this.users.delete(this.users.keys().next().value!);
    }
    if (event.type === 'message' && (bucket.count > 8 || (text !== '' && bucket.text === text))) {
      return false;
    }
    bucket.text = text;
    event.timestamp = Math.min(event.timestamp, now + 5000);
    this.history.push(event);
    this.history.sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    this.trim();
    this.emit('event', event);
    return true;
  }

  trim(): void {
    this.history.splice(0, Math.max(0, this.history.length - this.settings.messageLimit));
  }

  updateYouTubeName(id: string, profile: { displayName?: string; handle?: string }): void {
    if (!profile.displayName && !profile.handle) {
      return;
    }
    const user: { displayName?: string; username?: string } = {};
    if (profile.displayName && !profile.displayName.startsWith('@') && profile.displayName.length <= 256) {
      user.displayName = profile.displayName;
    }
    if (profile.handle?.startsWith('@') && profile.handle.length <= 256) {
      user.username = profile.handle;
    }
    let changed = false;
    for (const event of this.history) {
      if (event.platform === 'youtube' && event.user.id === id) {
        if (user.displayName && event.user.displayName !== user.displayName
            || user.username && event.user.username !== user.username) {
          Object.assign(event.user, user);
          changed = true;
        }
      }
    }
    if (changed) {
      this.emit('profile', { platform: 'youtube', id, user });
    }
  }

  clear(): void {
    this.history.length = 0;
    this.emit('clear');
  }
}
