export class AlertQueue {
  constructor(limit = 30, maxAge = 60000) {
    this.limit = limit;
    this.maxAge = maxAge;
    this.pending = [];
    this.seen = new Map();
  }

  add(event, now = Date.now(), test = false) {
    if (event?.platform !== 'tiktok' || !['gift', 'follow'].includes(event.type)
        || !event.user || !Number.isFinite(event.timestamp)
        || (!test && now - event.timestamp > this.maxAge)) {
      return false;
    }
    const id = `${event.platform}:${event.id}`;
    if (this.seen.has(id)) {
      return false;
    }
    this.seen.set(id, now);
    for (const [key, time] of this.seen) {
      if (this.seen.size > 500 || now - time > 600000) {
        this.seen.delete(key);
      } else {
        break;
      }
    }
    this.pending.push(test ? { ...event, _test: true } : event);
    if (this.pending.length > this.limit) {
      this.pending.shift();
    }
    return true;
  }

  next(now = Date.now()) {
    while (this.pending.length) {
      const event = this.pending.shift();
      if (event._test || now - event.timestamp <= this.maxAge) {
        return event;
      }
    }
    return undefined;
  }

  clear() {
    this.pending.length = 0;
  }
}
