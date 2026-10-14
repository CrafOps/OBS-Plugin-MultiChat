'use strict';

const container = document.getElementById('messages');
const status = document.getElementById('status');
const search = document.getElementById('search');
const platform = document.getElementById('platform');
const autoScroll = document.getElementById('scroll');
const sessionName = 'multilivechat.reader';
let credentials = location.hash.slice(1);
try {
  if (credentials) {
    sessionStorage.setItem(sessionName, credentials);
  } else {
    credentials = sessionStorage.getItem(sessionName) ?? '';
  }
} catch {
  // Private browsing may disable storage; opening the original link still works.
}
history.replaceState(null, '', location.pathname);
const remote = credentials.includes('.');
const rows = new Map();
const combos = new Map();
const pending = [];
let renderFrame;
let retry = 1000;
let revoked = false;

function image(url, alt, className) {
  try {
    if (new URL(url).protocol !== 'https:') {
      return document.createTextNode(alt);
    }
  } catch {
    return document.createTextNode(alt);
  }
  const element = document.createElement('img');
  element.src = url;
  element.alt = alt;
  element.className = className;
  element.referrerPolicy = 'no-referrer';
  element.loading = 'lazy';
  element.onerror = () => element.replaceWith(document.createTextNode(alt));
  return element;
}

function author(event) {
  const user = event.user;
  const handle = user.username && user.username !== user.displayName
    ? ` (${user.username.startsWith('@') ? '' : '@'}${user.username})` : '';
  return `${user.displayName}${handle}`;
}

function filter() {
  const text = search.value.toLocaleLowerCase();
  for (const { element, event } of rows.values()) {
    element.hidden = (platform.value !== 'all' && event.platform !== platform.value)
      || !element.textContent.toLocaleLowerCase().includes(text);
  }
}

function display(event) {
  const id = `${event.platform}:${event.id}`;
  if (rows.has(id)) {
    return;
  }
  const element = document.createElement('article');
  element.className = `message ${event.platform === 'youtube' ? 'youtube' : 'tiktok'} ${event.type === 'gift' ? 'gift' : ''}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = event.user.displayName.slice(0, 1);
  element.append(event.user.avatarUrl ? image(event.user.avatarUrl, '', 'avatar') : avatar);
  const name = document.createElement('div');
  name.className = 'author';
  name.textContent = author(event);
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${event.platform.toUpperCase()} · ${new Date(event.timestamp).toLocaleTimeString()}`;
  const body = document.createElement('div');
  body.className = 'body';
  if (event.messageParts?.length) {
    for (const part of event.messageParts) {
      body.append(part.type === 'image' ? image(part.url, part.alt, 'emoji') : document.createTextNode(part.text));
    }
  } else {
    body.textContent = event.message ?? event.type;
  }
  element.append(name, meta, body);
  if (event.media?.imageUrl) {
    element.append(image(event.media.imageUrl, 'Gift', 'gift-art'));
  }
  if (event.monetaryEvent?.giftName) {
    const quantity = document.createElement('div');
    quantity.textContent = `${event.monetaryEvent.giftName} ×${event.monetaryEvent.quantity ?? 1}`;
    element.append(quantity);
  }
  rows.set(id, { element, event });
  element.dataset.key = id;
  element.dataset.timestamp = String(event.timestamp);
  const later = [...container.children].find(child => Number(child.dataset.timestamp) > event.timestamp);
  container.insertBefore(element, later ?? null);
  while (rows.size > 200) {
    const first = container.firstElementChild;
    rows.delete(first.dataset.key);
    first.remove();
  }
}

function queueEvent(event) {
  pending.push(event);
  if (pending.length > 200) {
    pending.shift();
  }
  if (!renderFrame) {
    renderFrame = requestAnimationFrame(render);
  }
}

function render() {
  renderFrame = undefined;
  pending.splice(0, 20).forEach(display);
  filter();
  if (autoScroll.checked) {
    window.scrollTo(0, document.body.scrollHeight);
  }
  if (pending.length) {
    renderFrame = requestAnimationFrame(render);
  }
}

function clear() {
  cancelAnimationFrame(renderFrame);
  renderFrame = undefined;
  pending.length = 0;
  rows.clear();
  container.replaceChildren();
  for (const combo of combos.values()) {
    clearTimeout(combo.timeout);
  }
  combos.clear();
  document.getElementById('combos').replaceChildren();
}

function updateCombo(packet) {
  const previous = combos.get(packet.key);
  if (previous) {
    clearTimeout(previous.timeout);
    previous.element.remove();
    combos.delete(packet.key);
  }
  if (packet.complete) {
    return;
  }
  const element = document.createElement('div');
  element.className = 'combo';
  const gift = packet.event.monetaryEvent;
  element.textContent = `${packet.event.user.displayName} · ${gift?.giftName ?? 'Gift'} ×${gift?.quantity ?? 1} · Combo`;
  document.getElementById('combos').append(element);
  const timeout = setTimeout(() => {
    element.remove();
    combos.delete(packet.key);
  }, 15000);
  combos.set(packet.key, { element, timeout });
  while (combos.size > 8) {
    const key = combos.keys().next().value;
    clearTimeout(combos.get(key).timeout);
    combos.get(key).element.remove();
    combos.delete(key);
  }
}

function connect() {
  if (!credentials || revoked) {
    status.textContent = 'Link required · ต้องใช้ลิงก์ส่วนตัว';
    return;
  }
  if (!(remote ? /^[a-f0-9]{32}\.[a-f0-9]{64}$/ : /^[a-f0-9]{64}$/).test(credentials)) {
    status.textContent = 'Invalid link · ลิงก์ไม่ถูกต้อง';
    return;
  }
  status.textContent = 'Connecting…';
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const [id, readKey] = credentials.split('.');
  const path = remote ? `/read?room=${encodeURIComponent(id)}` : `/events?token=${encodeURIComponent(credentials)}`;
  const socket = remote
    ? new WebSocket(`${protocol}//${location.host}${path}`, ['chat', readKey])
    : new WebSocket(`${protocol}//${location.host}${path}`);
  let heartbeat;
  socket.onopen = () => {
    retry = 1000;
    if (remote) {
      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('ping');
        }
      }, 30000);
    } else {
      status.textContent = 'Connected';
    }
  };
  socket.onmessage = ({ data }) => {
    try {
      const packet = JSON.parse(data);
      if (packet.kind === 'snapshot') {
        clear();
        packet.events.forEach(queueEvent);
      } else if (packet.kind === 'event') {
        queueEvent(packet.event);
      } else if (packet.kind === 'combo') {
        updateCombo(packet);
      } else if (packet.kind === 'clear') {
        clear();
      } else if (packet.kind === 'presence') {
        status.textContent = packet.online ? 'LIVE · อ่านอย่างเดียว' : 'Owner offline · เจ้าของออฟไลน์';
      } else if (packet.kind === 'profile') {
        for (const row of rows.values()) {
          if (row.event.platform === packet.platform && row.event.user.id === packet.id) {
            Object.assign(row.event.user, packet.user);
            row.element.querySelector('.author').textContent = author(row.event);
          }
        }
        filter();
      }
    } catch {
      // Malformed packets cannot interrupt the read-only viewer.
    }
  };
  socket.onclose = event => {
    clearInterval(heartbeat);
    if (event.code === 1008) {
      revoked = true;
      try {
        sessionStorage.removeItem(sessionName);
      } catch {
        // The server has already revoked this key regardless of browser storage.
      }
      clear();
      status.textContent = 'Link unavailable · ขอ URL ใหม่จากเจ้าของ';
      return;
    }
    status.textContent = 'Disconnected · reconnecting…';
    setTimeout(connect, retry);
    retry = Math.min(30000, retry * 2);
  };
}

search.addEventListener('input', filter);
platform.addEventListener('change', filter);
connect();
