'use strict';

const container = document.getElementById('messages');
const token = location.hash.slice(1);
const parameters = new URLSearchParams(location.search);
const demoMode = parameters.get('demo') === '1';
const previewCss = parameters.get('css');
history.replaceState(null, '', location.pathname);
let settings = { overlayLimit: 8, overlaySeconds: 25 };
const customStyle = document.createElement('style');
customStyle.id = 'user-overlay-css';
document.head.append(customStyle);
let socket;
let retry = 1000;
const seen = new Set();
const timers = new Map();

function showDemo() {
  document.body.classList.add('demo-mode');
  const now = Date.now();
  const roseGift = demoSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
      + '<path d="M32 37v19M32 48c-8-9-16-5-15 1 5 5 11 4 15-1Zm0-5c8-9 16-5 15 1-5 5-11 4-15-1Z" fill="#42c58a"/>'
      + '<path d="M32 34c-4-4-11-10-7-16 2-3 6-2 7 1 2-5 8-5 10 0 3 7-5 12-10 15Z" fill="#fa527f"/>'
      + '<path d="M31 26c-5-4-4-10 1-10 5 0 6 5 1 8 7-2 10 3 6 7-4 3-8-1-8-5Z" fill="#ff8cab"/>'
      + '<circle cx="32" cy="32" r="29" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="2"/>'
      + '</svg>'
  );
  const examples = [
    {
      id: 'preview-youtube-1',
      platform: 'youtube',
      type: 'message',
      timestamp: now - 18000,
      user: { id: 'preview-1', displayName: 'Ploy', username: 'ployplays' },
      message: 'Welcome to the stream :hellocatmeow:',
      messageParts: [
        { type: 'text', text: 'Welcome to the stream :hellocatmeow:' }
      ]
    },
    {
      id: 'preview-tiktok-1',
      platform: 'tiktok',
      type: 'message',
      timestamp: now - 11000,
      user: { id: 'preview-2', displayName: 'Mika', username: 'mikastreams' },
      message: 'The new chat layout looks great!'
    },
    {
      id: 'preview-tiktok-2',
      platform: 'tiktok',
      type: 'gift',
      timestamp: now - 4000,
      user: { id: 'preview-3', displayName: 'Kai', username: 'kaiplays' },
      message: '',
      media: { imageUrl: roseGift },
      monetaryEvent: { giftName: 'Rose', quantity: 10 }
    }
  ];
  examples.forEach(display);
}

function demoSvg(source) {
  return `data:image/svg+xml,${encodeURIComponent(source)}`;
}

function mediaImage(url, alt, className) {
  try {
    const parsed = new URL(url);
    const isDemoImage = demoMode && url.startsWith('data:image/svg+xml,');
    if (parsed.protocol !== 'https:' && !isDemoImage) {
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

function leave(element) {
  if (!element.isConnected || element.classList.contains('leaving')) {
    return;
  }
  clearTimeout(timers.get(element));
  element.classList.add('leaving');
  const animation = element.getAnimations().find(item => item.animationName === 'exit');
  if (animation) {
    void animation.finished.then(() => remove(element)).catch(() => {});
  }
  timers.set(element, setTimeout(() => remove(element), 750));
}

function setAuthor(element, name, username) {
  const author = element.querySelector('.author');
  const handle = username && username !== name
    ? `(${username.startsWith('@') ? '' : '@'}${username})` : '';
  const displayName = document.createElement('span');
  displayName.className = 'display-name';
  displayName.textContent = name;
  const usernameElement = document.createElement('span');
  usernameElement.className = 'handle';
  usernameElement.textContent = handle;
  author.replaceChildren(displayName, usernameElement);
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
  const meta = document.createElement('span');
  meta.className = 'meta';
  const platformBadge = document.createElement('span');
  platformBadge.className = 'platform-badge';
  platformBadge.textContent = platform === 'youtube' ? 'YouTube' : 'TikTok';
  const time = document.createElement('time');
  time.textContent = new Date(event.timestamp).toLocaleTimeString();
  meta.append(platformBadge, time);
  if (event.user.avatarUrl) {
    element.append(mediaImage(event.user.avatarUrl, '', 'avatar'));
  } else {
    const avatar = document.createElement('span');
    avatar.className = 'avatar initials';
    avatar.textContent = event.user.displayName.slice(0, 1);
    element.append(avatar);
  }
  const body = document.createElement('span');
  body.className = 'message-body';
  if (event.messageParts?.length) {
    for (const part of event.messageParts) {
      body.append(part.type === 'image' ? mediaImage(part.url, part.alt, 'emoji') : document.createTextNode(part.text));
    }
  } else {
    body.textContent = event.message ?? '';
  }
  element.append(author, meta, body);
  setAuthor(element, event.user.displayName, event.user.username);
  const giftDetails = document.createElement('div');
  giftDetails.className = 'gift-details';
  if (event.media?.imageUrl) {
    giftDetails.append(mediaImage(event.media.imageUrl, 'Gift', 'gift-art'));
  }
  if (event.monetaryEvent) {
    const money = document.createElement('div');
    const value = event.monetaryEvent;
    money.textContent = value.giftName ? `${value.giftName} ×${value.quantity ?? 1}`
      : `${value.amount ?? ''} ${value.currency ?? ''}`;
    money.className = 'gift-label';
    giftDetails.append(money);
  }
  if (giftDetails.childNodes.length) {
    element.append(giftDetails);
  }
  element.dataset.timestamp = String(event.timestamp);
  element.dataset.platform = platform;
  element.dataset.userId = event.user.id;
  element.dataset.displayName = event.user.displayName;
  element.dataset.username = event.user.username;
  const later = [...container.children].find(child => Number(child.dataset.timestamp) > event.timestamp);
  container.insertBefore(element, later ?? null);
  const visible = [...container.children].filter(child => !child.classList.contains('leaving'));
  while (visible.length > settings.overlayLimit) {
    leave(visible.shift());
  }
  // Keep exits bounded during a burst while letting normal removals finish.
  while (container.children.length > settings.overlayLimit + 4) {
    remove(container.firstElementChild);
  }
  if (element.isConnected) {
    const lifetime = Math.max(0, settings.overlaySeconds * 1000 - (Date.now() - event.timestamp));
    if (!element.classList.contains('leaving')) {
      timers.set(element, setTimeout(() => leave(element), lifetime));
    }
  }
}

function applySettings(value) {
  settings = value;
  customStyle.textContent = typeof value.overlayCustomCss === 'string'
    ? value.overlayCustomCss.slice(0, 6000)
    : '';
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
        applySettings(message.settings);
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
          const name = element.dataset.displayName;
          const username = element.dataset.username;
          setAuthor(element, name, username);
        }
      } else if (message.kind === 'settings') {
        applySettings(message.settings);
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

if (demoMode) {
  if (previewCss) {
    customStyle.textContent = previewCss.slice(0, 6000);
  }
  showDemo();
}
