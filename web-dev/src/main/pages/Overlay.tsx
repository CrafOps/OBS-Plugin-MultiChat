import { useEffect } from 'react';
import { ChatCard } from '../../components/Chat';
import { useLanguage } from '../../utils/context';
import { useChatReader } from '../../utils/hooks/useChatReader';

export default function Overlay() {
  const language = useLanguage();
  const sample = new URLSearchParams(location.search).get('demo') === '1';
  const { messages, status } = useChatReader(language, sample);
  const parameters = new URLSearchParams(location.search);
  const requestedLimit = Number(parameters.get('limit') ?? 8);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(30, requestedLimit)) : 8;

  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = 'transparent';
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  return (
    <div data-overlay className="mx-auto max-w-3xl space-y-3 bg-transparent p-3">
      {sample && (
        <p className="rounded-lg bg-black/70 px-3 py-2 text-xs text-white/70">
          {language === 'th' ? 'ตัวอย่าง overlay' : 'Overlay demo'}
        </p>
      )}
      {messages.slice(-limit).map((message) => (
        <ChatCard key={`${message.platform}:${message.id}`} message={message} />
      ))}
      {!messages.length && (
        <p
          role="status"
          className="inline-block rounded-lg bg-black/70 px-3 py-2 text-xs text-white/60"
        >
          {status}
        </p>
      )}
    </div>
  );
}
