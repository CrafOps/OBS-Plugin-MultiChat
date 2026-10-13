'use strict';

const container = document.getElementById('messages');
const token = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
let settings = { overlayLimit: 8, overlaySeconds: 25 };
let socket;
let retry = 1000;
const seen = new Set();
const timers = new Map();

function mediaImage(url, alt, className) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return document.createTextNode(alt);
    }
  } catch {
    return document.createTextNode(alt);
  }
  const image = document.createElement('img');
  image.src = url;
  image.alt = alt;
  image.className = className;
  image.referrerPolicy = 'no-referrer';
  image.onerror = () => image.replaceWith(document.createTextNode(alt));
  return image;
}

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
  const handle = event.user.username && event.user.username !== event.user.displayName
    ? ` (${event.user.username.startsWith('@') ? '' : '@'}${event.user.username})` : '';
  author.textContent = `${event.user.displayName}${handle}`;
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = `${platform.toUpperCase()} · ${new Date(event.timestamp).toLocaleTimeString()}`;
  if (event.user.avatarUrl) {
    element.append(mediaImage(event.user.avatarUrl, '', 'avatar'));
  } else {
    const avatar = document.createElement('span');
    avatar.className = 'avatar initials';
    avatar.textContent = event.user.displayName.slice(0, 1);
    element.append(avatar);
  }
  const body = document.createElement('span');
  if (event.messageParts?.length) {
    for (const part of event.messageParts) {
      body.append(part.type === 'image' ? mediaImage(part.url, part.alt, 'emoji') : document.createTextNode(part.text));
    }
  } else {
    body.textContent = event.message ?? '';
  }
  element.append(author, meta, body);
  if (event.media?.imageUrl) {
    element.append(mediaImage(event.media.imageUrl, 'Gift', 'gift-art'));
  }
  if (event.monetaryEvent) {
    const money = document.createElement('div');
    const value = event.monetaryEvent;
    money.textContent = value.giftName ? `${value.giftName} ×${value.quantity ?? 1}`
      : `${value.amount ?? ''} ${value.currency ?? ''}`;
    element.append(money);
  }
  element.dataset.timestamp = String(event.timestamp);
  element.dataset.platform = platform;
  element.dataset.userId = event.user.id;
  element.dataset.displayName = event.user.displayName;
  element.dataset.username = event.user.username;
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
      } else if (message.kind === 'profile') {
        for (const element of container.children) {
          if (element.dataset.platform !== message.platform || element.dataset.userId !== message.id) {
            continue;
          }
          element.dataset.displayName = message.user.displayName ?? element.dataset.displayName;
          element.dataset.username = message.user.username ?? element.dataset.username;
          const author = element.querySelector('.author');
          const name = element.dataset.displayName;
          const username = element.dataset.username;
          const handle = username && username !== name ? ` (${username.startsWith('@') ? '' : '@'}${username})` : '';
          author.textContent = `${name}${handle}`;
        }
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
