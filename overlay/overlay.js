'use strict';

const container = document.getElementById('messages');
const token = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
let settings = { overlayLimit: 8, overlaySeconds: 25 };
let socket;
let retry = 1000;
const seen = new Set();
const timers = new Map();

function remove(element) {
  clearTimeout(timers.get(element));
  timers.delete(element);
  element.remove();
}

function clear() {
  for (const element of [...container.children]) {
    remove(element);
  }
}

function display(event) {
  const key = `${event.platform}:${event.id}`;
  if (seen.has(key) || Date.now() - event.timestamp > settings.overlaySeconds * 1000) {
    return;
  }
  seen.add(key);
  if (seen.size > 2000) {
    seen.delete(seen.values().next().value);
  }
  const element = document.createElement('article');
  const platform = event.platform === 'youtube' ? 'youtube' : 'tiktok';
  const type = ['gift', 'superchat', 'membership'].includes(event.type) ? event.type : 'message';
  element.className = `message ${platform} ${type}`;
  const author = document.createElement('span');
  author.className = 'author';
  author.textContent = `${platform === 'youtube' ? 'YouTube' : 'TikTok'} · ${event.user.displayName}`;
  const body = document.createElement('span');
  body.textContent = event.message ?? '';
  element.append(author, body);
  if (event.monetaryEvent) {
    const money = document.createElement('div');
    const value = event.monetaryEvent;
    money.textContent = value.giftName ? `${value.giftName} ×${value.quantity ?? 1}`
      : `${value.amount ?? ''} ${value.currency ?? ''}`;
    element.append(money);
  }
  element.dataset.timestamp = String(event.timestamp);
  const later = [...container.children].find(child => Number(child.dataset.timestamp) > event.timestamp);
  container.insertBefore(element, later ?? null);
  while (container.children.length > settings.overlayLimit) {
    remove(container.firstElementChild);
  }
  if (element.isConnected) {
    const lifetime = Math.max(0, settings.overlaySeconds * 1000 - (Date.now() - event.timestamp));
    timers.set(element, setTimeout(() => {
      element.classList.add('leaving');
      timers.set(element, setTimeout(() => remove(element), 400));
    }, lifetime));
  }
}

function connect() {
  if (!token) {
    return;
  }
  socket = new WebSocket(`ws://${location.host}/events?token=${encodeURIComponent(token)}`);
  socket.onopen = () => {
    retry = 1000;
  };
  socket.onmessage = ({ data }) => {
    try {
      const message = JSON.parse(data);
      if (message.kind === 'snapshot') {
        settings = message.settings;
        message.events.forEach(display);
      } else if (message.kind === 'event') {
        display(message.event);
      } else if (message.kind === 'settings') {
        settings = message.settings;
      } else if (message.kind === 'clear') {
        clear();
      }
    } catch {
      // Ignore malformed packets without disrupting the Browser Source.
    }
  };
  socket.onclose = () => {
    setTimeout(connect, retry);
    retry = Math.min(30000, retry * 2);
  };
}

connect();
