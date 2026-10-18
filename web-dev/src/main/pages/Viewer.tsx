import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, Search, ShieldCheck } from 'lucide-react';
import { demoMessages, type ChatMessage } from '../../data/chat';
import { useLanguage } from '../../utils/context';
import { ChatCard } from '../../components/Chat';

import { useChatReader } from '../../utils/hooks/useChatReader';

export default function Viewer() {
  const language = useLanguage();
  const { messages, status, combos, demo } = useChatReader(language);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [scroll, setScroll] = useState(true);
  const end = useRef<HTMLDivElement>(null);
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
            ? 'นี่เป็นข้อมูลตัวอย่าง หากต้องการอ่านแชทจริง ให้เปิดแชร์ใน OBS แล้วใช้ลิงก์ส่วนตัวที่ได้รับ'
            : 'These are sample messages. To read real chat, enable sharing in OBS and use your private viewing link.'}
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
