import { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import {
  AudioLines,
  Check,
  Gift,
  Heart,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { demoMessages, type ChatMessage } from '../data/chat';
import { useLanguage } from '../utils/context';

function safeImage(value: string | undefined) {
  try {
    return value && new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

export function ChatCard({
  message,
  compact = false,
}: {
  message: ChatMessage;
  compact?: boolean;
}) {
  const picture = safeImage(message.user.avatarUrl);
  const gift = message.monetaryEvent;
  const artwork = safeImage(message.media?.imageUrl);
  return (
    <article
      className={`flex gap-3 rounded-xl border ${gift ? 'border-amber-300/15 bg-amber-300/4' : 'border-white/6 bg-white/3'} ${compact ? 'p-3' : 'p-4'}`}
    >
      <div
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 font-semibold ${compact ? 'size-8 text-[11px]' : 'size-10 text-sm'} ${message.platform === 'youtube' ? 'bg-purple-400/15 text-purple-200' : 'bg-teal-300/10 text-teal-200'}`}
      >
        {picture ? (
          <img
            src={picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
            onError={(event) => (event.currentTarget.style.display = 'none')}
          />
        ) : (
          message.user.displayName.slice(0, 1)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 leading-relaxed">
          <strong className={`wrap-anywhere ${compact ? 'text-xs' : 'text-sm'}`}>
            {message.user.displayName}
          </strong>
          <span className="text-[10px] wrap-anywhere text-white/35">
            {message.user.username
              ? `(${message.user.username.startsWith('@') ? '' : '@'}${message.user.username})`
              : ''}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${message.platform === 'youtube' ? 'bg-red-400/15 text-red-300' : 'bg-teal-300/10 text-teal-200'}`}
          >
            {message.platform === 'youtube' ? 'YouTube' : 'TikTok'}
          </span>
          <time className="text-[10px] text-white/30">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
        <p
          className={`mt-2 whitespace-pre-wrap wrap-anywhere leading-relaxed text-white/70 ${compact ? 'text-xs' : 'text-sm'}`}
        >
          {message.messageParts?.length
            ? message.messageParts.map((part, index) =>
                part.type === 'image' && safeImage(part.url) ? (
                  <img
                    key={index}
                    src={part.url}
                    alt={part.alt ?? 'Emoji'}
                    referrerPolicy="no-referrer"
                    className="inline size-5 align-middle"
                  />
                ) : (
                  <span key={index}>{part.text ?? part.alt ?? ''}</span>
                ),
              )
            : message.message}
        </p>
        {gift && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-200">
            {artwork ? (
              <img
                src={artwork}
                alt="Gift"
                referrerPolicy="no-referrer"
                className="size-8 object-contain"
              />
            ) : (
              <Gift size={14} />
            )}
            {gift.giftName
              ? `${gift.giftName} ×${gift.quantity ?? 1}`
              : `${gift.amount ?? ''} ${gift.currency ?? ''}`}
          </div>
        )}
      </div>
    </article>
  );
}

export function DemoChat({
  compact = false,
  interactive = false,
}: {
  compact?: boolean;
  interactive?: boolean;
}) {
  const language = useLanguage();
  const [messages, setMessages] = useState(() => demoMessages(language));
  useEffect(() => setMessages(demoMessages(language)), [language]);
  const [alert, setAlert] = useState<'gift' | 'follow' | null>(null);
  const [sound, setSound] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const alertCard = useRef<HTMLDivElement>(null);
  const context = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (!alert || !alertCard.current) {
      return;
    }
    const animation = animate(alertCard.current, {
      opacity: [0, 1],
      y: [8, 0],
      duration: 350,
      ease: 'out(3)',
    });
    const timer = setTimeout(() => {
      if (alertCard.current) {
        animate(alertCard.current, {
          opacity: [1, 0],
          duration: 450,
          onComplete: () => setAlert(null),
        });
      }
    }, 2500);
    return () => {
      clearTimeout(timer);
      animation.cancel();
    };
  }, [alert]);
  async function add(kind: 'message' | 'gift' | 'follow') {
    const event: ChatMessage = {
      id: crypto.randomUUID(),
      platform: kind === 'message' ? 'youtube' : 'tiktok',
      type: kind,
      timestamp: Date.now(),
      user: {
        id: 'demo',
        displayName: kind === 'message' ? 'You' : 'Mika',
        username: kind === 'message' ? 'yourchannel' : 'mikastreams',
      },
      message:
        kind === 'message'
          ? language === 'th'
            ? 'สวัสดีทุกคน 💜'
            : 'Hello everyone 💜'
          : kind === 'gift'
            ? language === 'th'
              ? 'ส่งของขวัญให้กำลังใจ'
              : 'Thanks for the stream!'
            : language === 'th'
              ? 'เริ่มติดตามแล้ว'
              : 'Started following!',
      monetaryEvent: kind === 'gift' ? { giftName: 'Rose', quantity: 10 } : undefined,
    };
    setMessages((previous) => [...previous, event].slice(-4));
    if (kind !== 'message') {
      setAlert(kind);
    }
    if (sound && kind !== 'message') {
      try {
        context.current ??= new AudioContext();
        await context.current.resume();
        const frequencies = kind === 'gift' ? [783.99, 987.77, 1174.66] : [659.25, 880];
        for (let index = 0; index < frequencies.length; index += 1) {
          const oscillator = context.current.createOscillator();
          const gain = context.current.createGain();
          const time = context.current.currentTime + index * 0.1;
          oscillator.frequency.value = frequencies[index];
          gain.gain.setValueAtTime(0.001, time);
          gain.gain.exponentialRampToValueAtTime(0.08, time + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
          oscillator.connect(gain);
          gain.connect(context.current.destination);
          oscillator.start(time);
          oscillator.stop(time + 0.5);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      } catch {
        setSound(false);
      }
    }
  }
  return (
    <div
      ref={panel}
      className={
        interactive
          ? 'relative overflow-hidden rounded-2xl border border-white/10 bg-white/3 p-5 sm:p-6'
          : 'space-y-2 p-4'
      }
    >
      {interactive && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs text-white/60">
            <span className="size-1.5 rounded-full bg-lilac" />
            {language === 'th' ? 'ตัวอย่างแชทและแจ้งเตือน' : 'Chat and alert demo'}
          </span>
          <label className="flex items-center gap-2 text-xs text-white/45">
            <input
              type="checkbox"
              checked={sound}
              onChange={(event) => setSound(event.target.checked)}
              className="size-4 accent-[#b7a0ff]"
            />
            <AudioLines size={12} />
            {language === 'th' ? 'เปิดเสียง' : 'Enable sound'}
          </label>
        </div>
      )}
      <div className="space-y-2">
        {messages.map((message) => (
          <ChatCard key={message.id} message={message} compact={compact} />
        ))}
      </div>
      {interactive && (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ['message', MessageCircle, language === 'th' ? 'เพิ่มข้อความ' : 'Add message'],
              ['gift', Gift, language === 'th' ? 'ส่งของขวัญ' : 'Send gift'],
              ['follow', Heart, language === 'th' ? 'ติดตาม' : 'Follow'],
            ].map(([kind, Icon, label]) => {
              const ActionIcon = Icon as typeof Gift;
              return (
                <button
                  key={kind as string}
                  onClick={() => void add(kind as 'message' | 'gift' | 'follow')}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:border-lilac/35 hover:bg-lilac/10"
                >
                  <ActionIcon size={13} />
                  {label as string}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-white/30">
            {language === 'th'
              ? 'ข้อมูลตัวอย่าง เปิดเสียงแล้วกดปุ่มเพื่อทดลองเสียงแจ้งเตือน'
              : 'Sample events only. Enable sound and click a button to test the notification.'}
          </p>
        </>
      )}
      {alert && (
        <div
          ref={alertCard}
          role="status"
          className="absolute right-4 bottom-24 left-4 flex items-center gap-3 rounded-xl border border-lilac/40 bg-[#2a1b41f5] p-4 shadow-2xl backdrop-blur-xl"
        >
          <Sparkles size={24} className="text-lilac" />
          <div>
            <p className="text-xs font-semibold">
              {alert === 'gift'
                ? language === 'th'
                  ? 'Mika ส่ง Rose ×10'
                  : 'Mika sent Rose ×10'
                : language === 'th'
                  ? 'Mika เริ่มติดตามแล้ว'
                  : 'Mika started following'}
            </p>
            <p className="mt-1 text-[10px] text-white/50">
              {language === 'th' ? 'ตัวอย่างแจ้งเตือนบนสตรีม' : 'Sample stream alert'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
