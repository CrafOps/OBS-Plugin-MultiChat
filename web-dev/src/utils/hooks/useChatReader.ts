import { useEffect, useState } from 'react';
import { demoMessages, type ChatMessage } from '../../data/chat';
import type { Language } from '../../data/project';

const sessionName = import.meta.env.DEV ? 'multichat.dev.reader' : 'multilivechat.reader';

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const event = value as ChatMessage;
  return (
    typeof event.id === 'string' &&
    ['youtube', 'tiktok'].includes(event.platform) &&
    typeof event.timestamp === 'number' &&
    Number.isFinite(event.timestamp) &&
    !!event.user &&
    typeof event.user.id === 'string' &&
    typeof event.user.displayName === 'string' &&
    typeof event.user.username === 'string' &&
    (event.message === undefined ||
      (typeof event.message === 'string' && event.message.length <= 4000)) &&
    (event.messageParts === undefined ||
      (Array.isArray(event.messageParts) &&
        event.messageParts.length <= 128 &&
        event.messageParts.every(
          (part) =>
            !!part &&
            typeof part === 'object' &&
            (part.type === 'text'
              ? typeof part.text === 'string'
              : part.type === 'image' &&
                typeof part.url === 'string' &&
                typeof part.alt === 'string'),
        ))) &&
    (event.media === undefined || (!!event.media && typeof event.media.imageUrl === 'string')) &&
    (event.monetaryEvent === undefined ||
      (!!event.monetaryEvent &&
        typeof event.monetaryEvent === 'object' &&
        (event.monetaryEvent.giftName === undefined ||
          typeof event.monetaryEvent.giftName === 'string') &&
        (event.monetaryEvent.quantity === undefined ||
          (typeof event.monetaryEvent.quantity === 'number' &&
            Number.isFinite(event.monetaryEvent.quantity))) &&
        (event.monetaryEvent.amount === undefined ||
          (typeof event.monetaryEvent.amount === 'number' &&
            Number.isFinite(event.monetaryEvent.amount))) &&
        (event.monetaryEvent.currency === undefined ||
          typeof event.monetaryEvent.currency === 'string')))
  );
}

export function useChatReader(language: Language, allowDemo = true) {
  const [credentials] = useState(() => {
    if (new URLSearchParams(location.search).get('demo') === '1') {
      return '';
    }
    try {
      return location.hash.slice(1) || sessionStorage.getItem(sessionName) || '';
    } catch {
      return location.hash.slice(1);
    }
  });
  const demo = !credentials && allowDemo;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    demo ? demoMessages(language) : [],
  );
  useEffect(() => {
    if (demo) {
      setMessages(demoMessages(language));
    }
  }, [demo, language]);
  const [status, setStatus] = useState(demo ? 'Demo · sample messages' : 'Connecting…');
  const [combos, setCombos] = useState<Map<string, { event: ChatMessage; expires: number }>>(
    new Map(),
  );
  useEffect(() => {
    if (!credentials) {
      setStatus(demo ? 'Demo · sample messages' : 'Private link required');
      return;
    }
    history.replaceState(history.state, '', location.pathname);
    if (!/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(credentials)) {
      setStatus('Invalid private link');
      return;
    }
    try {
      sessionStorage.setItem(sessionName, credentials);
    } catch {
      // Keys remain in memory if tab storage is unavailable.
    }
    const [room, key] = credentials.split('.');
    let socket: WebSocket;
    let stopped = false;
    let retry = 1000;
    let reconnect: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    function connect() {
      socket = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/read?room=${room}`,
        ['chat', key],
      );
      socket.onopen = () => {
        retry = 1000;
        setStatus('Connected · waiting for owner');
        heartbeat = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 30000);
      };
      socket.onmessage = ({ data }) => {
        if (typeof data !== 'string' || data.length > 4 * 1024 * 1024 || data === 'pong') {
          return;
        }
        try {
          const packet = JSON.parse(data);
          if (packet.kind === 'snapshot' && Array.isArray(packet.events)) {
            setMessages(packet.events.filter(isMessage).slice(-200));
          } else if (packet.kind === 'event' && isMessage(packet.event)) {
            setMessages((previous) => {
              if (
                previous.some(
                  (event) =>
                    event.platform === packet.event.platform && event.id === packet.event.id,
                )
              ) {
                return previous;
              }
              return [...previous, packet.event]
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-200);
            });
          } else if (packet.kind === 'clear') {
            setMessages([]);
            setCombos(new Map());
          } else if (packet.kind === 'presence') {
            setStatus(packet.online ? 'LIVE · read only' : 'Owner offline');
          } else if (
            packet.kind === 'combo' &&
            typeof packet.key === 'string' &&
            isMessage(packet.event)
          ) {
            setCombos((previous) => {
              const next = new Map(previous);
              if (packet.complete) {
                next.delete(packet.key);
              } else {
                next.set(packet.key, { event: packet.event, expires: Date.now() + 15000 });
                if (next.size > 8) {
                  next.delete(next.keys().next().value!);
                }
              }
              return next;
            });
          } else if (packet.kind === 'profile' && typeof packet.user?.displayName === 'string') {
            setMessages((previous) =>
              previous.map((event) =>
                event.platform === packet.platform && event.user.id === packet.id
                  ? {
                      ...event,
                      user: {
                        ...event.user,
                        displayName: packet.user.displayName,
                        username:
                          typeof packet.user.username === 'string'
                            ? packet.user.username
                            : event.user.username,
                      },
                    }
                  : event,
              ),
            );
          }
        } catch {
          // Invalid data cannot trigger controls or HTML execution.
        }
      };
      socket.onclose = (event) => {
        clearInterval(heartbeat);
        if (stopped) {
          return;
        }
        if (event.code === 1008) {
          stopped = true;
          setStatus('Link unavailable · ask the owner for a new link');
          setMessages([]);
          setCombos(new Map());
          try {
            sessionStorage.removeItem(sessionName);
          } catch {
            // Revocation is enforced by the server.
          }
          return;
        }
        setStatus('Relay unavailable · reconnecting');
        reconnect = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 30000);
      };
    }
    connect();
    const expiry = setInterval(() => {
      setCombos((previous) => {
        if (![...previous.values()].some((combo) => combo.expires < Date.now())) {
          return previous;
        }
        return new Map([...previous].filter(([, combo]) => combo.expires >= Date.now()));
      });
    }, 2000);
    return () => {
      stopped = true;
      clearTimeout(reconnect);
      clearInterval(heartbeat);
      clearInterval(expiry);
      socket?.close();
    };
  }, [credentials, demo]);

  return { messages, status, combos, demo };
}
