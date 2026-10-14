import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, Info, Search } from 'lucide-react';
import { guides } from '../../data/guides';
import { download, repository } from '../../data/project';
import { useLanguage } from '../../utils/context';
import { Button } from '../../components/Button';
import GuideIllustration from '../../components/GuideIllustration';

export default function Docs() {
  const language = useLanguage();
  const navigate = useNavigate();
  const th = language === 'th';
  const { slug = 'installation' } = useParams();
  const aliases: Record<string, string> = {
    youtube: 'accounts',
    'alerts-mobile': 'alerts',
    media: 'chat',
    security: 'mobile',
    testing: 'troubleshooting',
  };
  const currentSlug = aliases[slug] ?? slug;
  const index = guides.findIndex((guide) => guide.slug === currentSlug);
  const guide = guides[index];
  const [query, setQuery] = useState('');
  const filtered = guides.filter((item) =>
    item.content[language].title.toLowerCase().includes(query.toLowerCase()),
  );
  if (!guide) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24">
        <h1 className="mb-6 text-3xl">{th ? 'ไม่พบคู่มือ' : 'Guide not found'}</h1>
        <Button href="/docs/installation">
          {th ? 'กลับไปคู่มือติดตั้ง' : 'Open installation guide'}
        </Button>
      </div>
    );
  }
  const content = guide.content[language];
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-14">
      <aside className="self-start lg:sticky lg:top-28">
        <label className="mb-5 block lg:hidden">
          <span className="mb-2 block text-xs text-white/55">
            {th ? 'เลือกคู่มือ' : 'Choose a guide'}
          </span>
          <select
            aria-label={th ? 'เลือกคู่มือ' : 'Choose a guide'}
            value={currentSlug}
            onChange={(event) => navigate('/docs/' + event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/15 bg-[#17101f] px-3 text-sm"
          >
            {guides.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.content[language].title}
              </option>
            ))}
          </select>
        </label>
        <Link to="/" className="mb-4 flex items-center lg:mb-7 gap-2 text-xs text-white/45">
          <ArrowLeft size={12} />
          {th ? 'กลับหน้าแรก' : 'Back to overview'}
        </Link>
        <p className="mb-3 text-xs lg:mb-5 font-semibold uppercase tracking-[.2em] text-lilac">
          {th ? 'คู่มือใช้งาน' : 'User guide'} • {language.toUpperCase()}
        </p>
        <label className="mb-5 hidden items-center lg:flex gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2.5">
          <Search size={14} className="shrink-0 text-white/35" />
          <input
            aria-label={th ? 'ค้นหาคู่มือ' : 'Search guides'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={th ? 'ค้นหาหัวข้อ…' : 'Find a topic…'}
            className="w-full min-w-0 bg-transparent text-xs outline-none"
          />
        </label>
        <nav
          aria-label={th ? 'หัวข้อคู่มือ' : 'Guide topics'}
          className="hidden flex-col gap-1 lg:flex"
        >
          {filtered.map((item) => (
            <Link
              key={item.slug}
              to={`/docs/${item.slug}`}
              aria-current={item.slug === currentSlug ? 'page' : undefined}
              className={`rounded-lg border px-3 py-3 text-xs transition ${item.slug === currentSlug ? 'border-lilac/20 bg-lilac/10 text-lilac' : 'border-transparent text-white/55 hover:bg-white/4 hover:text-white'}`}
            >
              {item.content[language].title}
            </Link>
          ))}
        </nav>
        {!filtered.length && (
          <p className="text-xs text-white/40">{th ? 'ไม่พบหัวข้อ' : 'No topics found'}</p>
        )}
        <a
          href={download}
          className="mt-7 hidden items-center lg:flex gap-2 rounded-xl border border-lilac/20 bg-lilac/5 p-4 text-xs text-lilac"
        >
          <Download size={14} />
          {th ? 'ดาวน์โหลดสำหรับ Windows' : 'Download for Windows'}
        </a>
      </aside>
      <article className="min-w-0">
        <p className="mb-4 text-[10px] uppercase tracking-widest text-lilac">
          {th ? 'เริ่มใช้งานได้เลย' : 'Get up and running'}
        </p>
        <h1 className="text-3xl text-balance font-semibold leading-snug sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-4 mb-9 text-sm leading-7 text-white/55">{content.summary}</p>
        <div className="space-y-5">
          {content.steps.map((step, stepIndex) => (
            <section
              key={step.title}
              className="rounded-2xl border border-white/8 bg-white/2 p-5 sm:p-6"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-lilac/10 text-xs font-semibold text-lilac">
                  {stepIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold">{step.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">{step.description}</p>
                </div>
              </div>
              {step.illustration && (
                <GuideIllustration type={step.illustration} language={language} />
              )}
            </section>
          ))}
        </div>
        {content.tip && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-lilac/15 bg-lilac/5 p-5">
            <Info size={16} className="mt-1 shrink-0 text-lilac" />
            <p className="text-xs leading-7 text-white/60">{content.tip}</p>
          </div>
        )}
        <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6">
          {index > 0 ? (
            <Link
              className="text-xs text-white/50 hover:text-lilac"
              to={`/docs/${guides[index - 1].slug}`}
            >
              ← {guides[index - 1].content[language].title}
            </Link>
          ) : (
            <span />
          )}
          {index < guides.length - 1 && (
            <Link
              className="flex items-center gap-2 text-xs text-lilac"
              to={`/docs/${guides[index + 1].slug}`}
            >
              {guides[index + 1].content[language].title}
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
        <p className="mt-8 text-xs text-white/35">
          {th ? 'ต้องการความช่วยเหลือเพิ่มเติม?' : 'Need more help?'}{' '}
          <a href={`${repository}/issues`} target="_blank" rel="noreferrer" className="text-lilac">
            {th ? 'แจ้งปัญหาใน GitHub ↗' : 'Report an issue on GitHub ↗'}
          </a>
        </p>
      </article>
    </div>
  );
}
