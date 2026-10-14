import { AlertQueue } from './alert-queue.mjs';

const token = location.hash.slice(1);
history.replaceState(null, '', location.pathname);
const card = document.getElementById('alert');
const queue = new AlertQueue();
let options = { enabled: true, gifts: true, follows: true, seconds: 5, volume: 60, audio: 'stream' };
let soundUrls = {};
let audioContext;
let master;
let retry = 1000;
let active = false;
let timer;
let revision = 0;
const buffers = new Map();
const playing = new Set();

function image(url, alt) {
  try {
    if (new URL(url).protocol !== 'https:') {
      return document.createTextNode(alt);
    }
  } catch {
    return document.createTextNode(alt);
  }
  const element = document.createElement('img');
  element.referrerPolicy = 'no-referrer';
  element.src = url;
  element.alt = alt;
  element.onerror = () => element.replaceWith(document.createTextNode(alt));
  return element;
}

function stopAudio() {
  revision += 1;
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      // A source may already have reached the end of its buffer.
    }
  }
  playing.clear();
  if (audioContext?.state === 'running') {
    void audioContext.suspend();
  }
}

function track(source) {
  playing.add(source);
  source.onended = () => {
    playing.delete(source);
    if (!playing.size && audioContext?.state === 'running') {
      void audioContext.suspend();
    }
  };
}

async function playSound(kind) {
  if (options.audio === 'off' || options.volume === 0) {
    return;
  }
  const current = revision;
  try {
    audioContext ??= new AudioContext();
    if (!master) {
      master = audioContext.createGain();
      master.connect(audioContext.destination);
    }
    await audioContext.resume();
    master.gain.value = options.volume / 100;
    const url = soundUrls[kind];
    if (url) {
      let buffer = buffers.get(url);
      if (!buffer) {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
          throw new Error('Custom sound unavailable');
        }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 2 * 1024 * 1024) {
          throw new Error('Sound too large');
        }
        buffer = await audioContext.decodeAudioData(bytes);
        buffers.set(url, buffer);
      }
      if (current !== revision || options.audio === 'off') {
        return;
      }
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
      track(source);
      source.start(0, 0, Math.min(buffer.duration, options.seconds));
      return;
    }
    if (current !== revision) {
      return;
    }
    defaultTone(kind);
  } catch {
    if (current === revision && audioContext?.state === 'running' && options.audio !== 'off') {
      defaultTone(kind);
    }
  }
}

function defaultTone(kind) {
  const start = audioContext.currentTime;
  // Soft ascending chimes, with a short attack and a clean bell-like decay.
  const frequencies = kind === 'gift' ? [783.99, 987.77, 1174.66] : [659.25, 880];
  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const time = start + index * (kind === 'gift' ? .09 : .14);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(.001, time);
    gain.gain.exponentialRampToValueAtTime(.16, time + .012);
    gain.gain.exponentialRampToValueAtTime(.001, time + .48);
    oscillator.connect(gain);
    gain.connect(master);
    track(oscillator);
    oscillator.start(time);
    oscillator.stop(time + .5);
  });
}

function clear() {
  clearTimeout(timer);
  queue.clear();
  card.hidden = true;
  active = false;
  stopAudio();
}

function next() {
  if (active) {
    return;
  }
  let event = queue.next();
  while (event && !event._test && (!options.enabled || (event.type === 'gift' ? !options.gifts : !options.follows))) {
    event = queue.next();
  }
  if (!event) {
    return;
  }
  active = true;
  stopAudio();
  card.hidden = false;
  card.className = event.type;
  card.style.setProperty('--seconds', `${options.seconds}s`);
  document.getElementById('kind').textContent = event.type === 'gift' ? 'TikTok · Gift' : 'TikTok · New follower';
  document.getElementById('name').textContent = event.user.displayName;
  document.getElementById('avatar').replaceChildren(event.user.avatarUrl ? image(event.user.avatarUrl, '') : '');
  const gift = event.monetaryEvent;
  document.getElementById('description').textContent = event.type === 'gift'
    ? `${gift?.giftName ?? 'Gift'} ×${gift?.quantity ?? 1}` : 'Thanks for following!';
  document.getElementById('art').replaceChildren(event.media?.imageUrl
    ? image(event.media.imageUrl, '🎁') : document.createTextNode(event.type === 'gift' ? '🎁' : '💚'));
  // Restart the entry/progress animation for each queued alert.
  for (const element of [card, ...card.querySelectorAll('.progress'), document.getElementById('art')]) {
    for (const animation of element.getAnimations()) {
      animation.cancel();
      animation.play();
    }
  }
  void playSound(event.type);
  timer = setTimeout(() => {
    card.classList.add('leaving');
    stopAudio();
    const exitRevision = revision;
    const finish = () => {
      if (exitRevision !== revision || !active) {
        return;
      }
      clearTimeout(timer);
      card.hidden = true;
      active = false;
      next();
    };
    const animation = card.getAnimations().find(item => item.animationName === 'leave');
    if (animation) {
      void animation.finished.then(() => {
        if (card.classList.contains('leaving') && !card.hidden) {
          finish();
        }
      }).catch(() => {});
    }
    timer = setTimeout(finish, 750);
  }, options.seconds * 1000);
}

function configure(settings) {
  options = { ...options, ...settings.alerts };
  soundUrls = settings.sounds ?? {};
  buffers.clear();
  if (master) {
    master.gain.value = options.volume / 100;
  }
  if (!options.enabled) {
    clear();
  } else if (options.audio === 'off') {
    stopAudio();
  }
}

function connect() {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return;
  }
  const socket = new WebSocket(`ws://${location.host}/events?mode=alerts&token=${encodeURIComponent(token)}`);
  socket.onopen = () => {
    retry = 1000;
  };
  socket.onmessage = ({ data }) => {
    try {
      const packet = JSON.parse(data);
      if (packet.kind === 'snapshot' || packet.kind === 'settings') {
        configure(packet.settings);
      } else if (packet.kind === 'alert') {
        if (queue.add(packet.event, Date.now(), packet.test)) {
          next();
        }
      } else if (packet.kind === 'clear') {
        clear();
      }
    } catch {
      // Ignore malformed packets; no HTML from chat is executed.
    }
  };
  socket.onclose = () => {
    clear();
    setTimeout(connect, retry);
    retry = Math.min(30000, retry * 2);
  };
}

connect();
