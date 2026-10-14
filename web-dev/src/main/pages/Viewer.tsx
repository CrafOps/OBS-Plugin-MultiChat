import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import { demoMessages, type ChatMessage } from '../../data/chat';
import { useLanguage } from '../../utils/context';
import { ChatCard } from '../../components/Chat';

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

export default function Viewer() {
  const language = useLanguage();
  const [credentials] = useState(() => {
    try {
      return location.hash.slice(1) || sessionStorage.getItem('multichat.dev.reader') || '';
    } catch {
      return location.hash.slice(1);
    }
  });
  const demo = !credentials;
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    demo ? demoMessages(language) : [],
  );
  useEffect(() => {
    if (demo) {
      setMessages(demoMessages(language));
    }
  }, [demo, language]);
  const [status, setStatus] = useState(demo ? 'Demo · sample messages' : 'Connecting…');
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [scroll, setScroll] = useState(true);
  const [combos, setCombos] = useState<Map<string, { event: ChatMessage; expires: number }>>(
    new Map(),
  );
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (demo) {
      return;
    }
    history.replaceState(history.state, '', location.pathname);
    if (!/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(credentials)) {
      setStatus('Invalid private link');
      return;
    }
    try {
      sessionStorage.setItem('multichat.dev.reader', credentials);
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
        if (typeof data !== 'string' || data.length > 65536 || data === 'pong') {
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
            sessionStorage.removeItem('multichat.dev.reader');
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
  useEffect(() => {
    if (scroll) {
      end.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [messages, scroll]);
  const filtered = messages.filter(
    (event) =>
      (platform === 'all' || event.platform === platform) &&
      `${event.user.displayName} ${event.user.username} ${event.message ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[.2em] text-lilac">
            {language === 'th' ? 'อ่านแชทผ่านลิงก์ส่วนตัว' : 'Read chat through your private link'}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {language === 'th' ? 'แชทบนมือถือ' : 'Mobile chat viewer'}
          </h1>
          <p role="status" className="mt-3 text-xs text-white/50">
            {status}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-white/50">
          <LockKeyhole size={12} />
          Read only
        </span>
      </div>
      {demo && (
        <div className="mb-5 rounded-xl border border-lilac/20 bg-lilac/5 p-4 text-xs leading-6 text-white/60">
          {language === 'th'
            ? 'นี่เป็นข้อมูลตัวอย่าง ลิงก์จริงต้องสร้างใน OBS โดยเปิดแชร์ก่อน เว็บ dev ต่อได้เฉพาะ relay ในเครื่องที่พอร์ต 8787'
            : 'This is sample data. Generate a real private link by enabling sharing in OBS. This dev viewer connects only to your local relay on port 8787.'}
        </div>
      )}
      <div className="mb-4 flex gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3">
          <Search size={15} className="text-white/35" />
          <input
            aria-label="Search messages"
            placeholder={language === 'th' ? 'ค้นหาข้อความ…' : 'Search messages…'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full min-w-0 bg-transparent py-3 text-sm outline-none"
          />
        </label>
        <select
          aria-label="Platform filter"
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#17101f] px-3 text-xs"
        >
          <option value="all">All</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
        </select>
      </div>
      <div className="relative">
        <div className="max-h-[65vh] space-y-3 overflow-y-auto rounded-2xl border border-white/8 bg-[#120e19] p-3">
          {filtered.map((message) => (
            <ChatCard key={`${message.platform}:${message.id}`} message={message} />
          ))}
          {!filtered.length && (
            <div className="grid min-h-48 place-items-center text-sm text-white/35">
              {query ? 'No matching messages' : 'Waiting for chat…'}
            </div>
          )}
          <div ref={end} />
        </div>
        {combos.size > 0 && (
          <div className="absolute right-5 bottom-5 max-w-60 space-y-2 rounded-xl border border-amber-200/20 bg-[#2c2134f5] p-3 text-xs text-amber-200">
            {[...combos.values()].slice(-3).map((combo) => (
              <p key={combo.event.id}>
                {combo.event.user.displayName} · {combo.event.monetaryEvent?.giftName} ×
                {combo.event.monetaryEvent?.quantity} <span className="text-white/40">combo</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-[#b7a0ff]"
            checked={scroll}
            onChange={(event) => setScroll(event.target.checked)}
          />
          Auto-scroll
        </label>
        <span>{messages.length} messages</span>
      </div>
      <p className="mt-7 flex items-center justify-center gap-2 text-[10px] text-white/35">
        <ShieldCheck size={12} />
        No posting. No OBS controls. Just your chat.
      </p>
    </div>
  );
}
