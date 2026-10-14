import { Download, ExternalLink, Package } from 'lucide-react';
import { Button } from '../../components/Button';
import { download, repository } from '../../data/project';
import { useLanguage } from '../../utils/context';
import { useReleases } from '../../utils/hooks/useReleases';

export default function Releases() {
  const language = useLanguage();
  const th = language === 'th';
  const { releases, loading, unavailable } = useReleases();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-lilac">
        {th ? 'ดาวน์โหลดและประวัติรุ่น' : 'Downloads and releases'}
      </p>
      <h1 className="text-balance text-3xl font-semibold leading-snug sm:text-4xl">
        {th ? 'ติดตั้ง Multi Live Chat' : 'Install Multi Live Chat'}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
        {th
          ? 'ดาวน์โหลดตัวติดตั้งสำหรับ Windows ปิด OBS ก่อนติดตั้ง แล้วใช้โฟลเดอร์เดิมหากต้องการอัปเดต'
          : 'Download the Windows installer and close OBS before installing. Use your existing package folder when upgrading.'}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button href={download}>
          <Download size={16} />
          {th ? 'ดาวน์โหลดรุ่นล่าสุด' : 'Download latest release'}
        </Button>
        <Button href="/docs/installation" secondary>
          {th ? 'ดูวิธีติดตั้ง' : 'Installation guide'}
        </Button>
      </div>
      <p className="mt-4 text-xs text-white/40">Windows x64 • OBS 32.2.2</p>
      <div className="mt-12 space-y-5">
        {loading && (
          <p role="status" className="text-sm text-white/50">
            {th ? 'กำลังโหลดรายการรุ่น…' : 'Loading releases…'}
          </p>
        )}
        {unavailable && (
          <p role="status" className="rounded-xl border border-white/10 p-4 text-sm text-white/60">
            {th
              ? 'โหลดข้อมูลล่าสุดไม่ได้ คุณยังดาวน์โหลดได้จากปุ่มด้านบน'
              : 'The latest release details are unavailable. The download button above still works.'}
          </p>
        )}
        {releases.map((release, index) => {
          const selectedSection =
            typeof release.body === 'string'
              ? release.body.split(th ? /### ภาษาไทย/ : /### English/)[1]?.split(/\n### /)[0]
              : undefined;
          const bullets =
            selectedSection
              ?.split('\n')
              .filter((line) => line.startsWith('- '))
              .slice(0, 8) ?? [];
          const date = new Date(release.published_at);
          return (
            <article
              key={release.tag_name}
              className="rounded-2xl border border-white/10 bg-white/3 p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <Package size={17} className="text-lilac" />
                    {release.name}
                  </h2>
                  <p className="mt-2 text-xs text-white/40">
                    {release.tag_name}
                    {Number.isFinite(date.getTime())
                      ? ` • ${date.toLocaleDateString(th ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' })}`
                      : ''}
                  </p>
                </div>
                {index === 0 && (
                  <span className="rounded-full bg-lilac/10 px-3 py-1 text-xs text-lilac">
                    {th ? 'ล่าสุด' : 'Latest'}
                  </span>
                )}
              </div>
              {bullets.length > 0 && (
                <ul className="mt-5 space-y-2 text-sm leading-7 text-white/60">
                  {bullets.map((line) => (
                    <li key={line}>• {line.slice(2).replaceAll('**', '').replaceAll('`', '')}</li>
                  ))}
                </ul>
              )}
              <a
                className="mt-5 inline-flex items-center gap-2 text-xs text-lilac"
                href={`${repository}/releases/tag/${encodeURIComponent(release.tag_name)}`}
                target="_blank"
                rel="noreferrer"
              >
                {th ? 'ดูรายละเอียดใน GitHub' : 'View release on GitHub'}
                <ExternalLink size={12} />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
