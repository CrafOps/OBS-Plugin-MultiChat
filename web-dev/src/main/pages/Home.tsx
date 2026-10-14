import { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronRight,
  Command,
  Download,
  ExternalLink,
  Gift,
  GitFork,
  Layers3,
  Menu,
  MessageCircle,
  Monitor,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { download, repository } from '../../data/project';
import { ProjectContext, useLanguage } from '../../utils/context';
import { usePageMotion } from '../../utils/hooks/usePageMotion';
import { Button } from '../../components/Button';
import Eyebrow from '../../components/Eyebrow';
import { DemoChat } from '../../components/Chat';

export default function Home() {
  const language = useLanguage();
  const th = language === 'th';
  const root = usePageMotion(language);
  const info = useContext(ProjectContext);
  const features = [
    {
      icon: MessageCircle,
      title: th ? 'อ่านแชทในหน้าต่างเดียว' : 'Combined chat',
      description: th
        ? 'รวม YouTube และ TikTok พร้อมชื่อ รูปโปรไฟล์ และอีโมจิ ไม่ต้องสลับหน้าต่าง'
        : 'Read YouTube and TikTok messages together, with names, profile pictures and emoji.',
      tag: 'UNIFIED CHAT',
    },
    {
      icon: Gift,
      title: th ? 'แจ้งเตือนของขวัญ' : 'Gift and follow alerts',
      description: th
        ? 'แสดงของขวัญและผู้ติดตามใหม่ พร้อมภาพ เสียง และจำนวนคอมโบ'
        : 'Show TikTok gifts and new followers with animations, sounds and live combo counts.',
      tag: 'TIKTOK ALERTS',
    },
    {
      icon: Smartphone,
      title: th ? 'อ่านแชทบนมือถือ' : 'Mobile chat viewer',
      description: th
        ? 'เปิดแชร์เมื่อคุณต้องการ สแกน QR แล้วอ่านแชทบนมือถือ แม้คนละเครือข่าย'
        : 'Enable sharing in OBS, then scan the QR code to read chat on your phone.',
      tag: 'MOBILE VIEWER',
    },
    {
      icon: AudioLines,
      title: th ? 'เลือกเสียงแจ้งเตือน' : 'Custom alert sounds',
      description: th
        ? 'เลือกเสียง WAV/MP3 ปรับระดับเสียง และเลือกให้ออกสตรีมหรือฟังเอง'
        : 'Choose a WAV or MP3 file, adjust the volume and decide where the sound plays.',
      tag: 'AUDIO CONTROL',
    },
    {
      icon: Monitor,
      title: th ? 'แสดงแชทบนสตรีม' : 'Chat overlay',
      description: th
        ? 'เพิ่มแชทเป็น Browser Source ใน OBS แล้วปรับสีและตำแหน่งได้ตามต้องการ'
        : 'Add chat to your OBS scene with a transparent Browser Source and customizable styling.',
      tag: 'STREAM OVERLAY',
    },
    {
      icon: ShieldCheck,
      title: th ? 'เปิดและหยุดแชร์ได้เอง' : 'Private sharing links',
      description: th
        ? 'การแชร์เริ่มเมื่อคุณเปิดใช้ หยุดแชร์หรือเปลี่ยนลิงก์ใหม่ได้ใน Settings'
        : 'Sharing is off until you enable it. Stop sharing or reset the private link from Settings.',
      tag: 'OPT-IN BY DESIGN',
    },
  ];
  return (
    <div ref={root}>
      <section className="relative isolate overflow-hidden border-b border-white/5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_45%,#59279632,transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(#ffffff03_1px,transparent_1px),linear-gradient(90deg,#ffffff03_1px,transparent_1px)] bg-size-[64px_64px] [mask-image:linear-gradient(black,transparent)]"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:min-h-[720px] lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-28">
          <div>
            <a
              data-hero
              href={`${repository}/releases/latest`}
              target="_blank"
              rel="noreferrer"
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-lilac/20 bg-lilac/5 px-3 py-1.5 text-[11px] text-lilac"
            >
              <span className="size-1.5 rounded-full bg-lilac" />
              {info.version ?? 'Multi Live Chat 0.3.0'}
              <ChevronRight size={12} />
            </a>
            <h1
              data-hero
              className={`text-balance font-semibold ${th ? 'text-[clamp(2.25rem,5vw,4rem)] leading-[1.3] tracking-normal' : 'text-[clamp(2rem,4.6vw,3.8rem)] leading-[1.08] tracking-[-.04em]'}`}
            >
              <span className="block">{th ? 'รวมแชทไลฟ์' : 'YouTube + TikTok'}</span>
              <span className="block bg-linear-to-r from-white via-[#d5c3ff] to-[#9462e3] bg-clip-text text-transparent">
                {th ? 'ไว้ใน OBS' : 'One OBS dock.'}
              </span>
            </h1>
            <p data-hero className="mt-7 max-w-md text-base leading-7 text-[#aba3bb]">
              {th
                ? 'อ่านแชท YouTube และ TikTok ในหน้าต่างเดียว พร้อมแจ้งเตือนของขวัญและแชร์แชทไปมือถือ'
                : 'Read YouTube and TikTok chat in one window. Add gift alerts to your stream and read chat on your phone.'}
            </p>
            <div data-hero className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
              <Button href={download}>
                <Download size={16} />
                {th ? 'ดาวน์โหลดสำหรับ Windows' : 'Download for Windows'}
              </Button>
              <Button href="#playground" secondary>
                <Radio size={16} />
                {th ? 'ดูตัวอย่างการใช้งาน' : 'Try the demo'}
              </Button>
            </div>
            <p
              data-hero
              className="mt-5 flex flex-wrap items-center gap-4 text-[10px] text-white/40"
            >
              <span>WINDOWS X64</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>OBS 32.2.2</span>
              <span className="size-1 rounded-full bg-white/20" />
              <span>OPEN SOURCE</span>
            </p>
          </div>
          <div data-hero className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 -z-10 rounded-full bg-purple-600/10 blur-3xl" />
            <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#14101ddd] shadow-[0_24px_100px_#0008] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <Layers3 size={14} className="text-lilac" /> Multi Live Chat
                </span>
                <span className="text-[9px] tracking-widest text-white/35">BY @CRAFOPS</span>
              </div>
              <div className="flex gap-5 px-5 pt-4 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-red-400" /> YouTube{' '}
                  <span className="text-white/35">connected</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-teal-300" /> TikTok{' '}
                  <span className="text-white/35">connected</span>
                </span>
              </div>
              <div className="flex gap-5 border-b border-white/8 px-5 pt-5 text-[11px] text-white/40">
                <span className="pb-3">Accounts</span>
                <span className="border-b-2 border-lilac pb-3 text-white">Chat</span>
                <span className="pb-3">Settings</span>
              </div>
              <DemoChat compact />
              <div className="flex justify-between border-t border-white/8 px-5 py-3 text-[9px] text-white/35">
                <span className="flex items-center gap-1.5">
                  <Check size={10} className="text-lilac" /> Auto-scroll
                </span>
                <span>{th ? 'ตัวอย่างแชท ไม่ใช่ไลฟ์จริง' : 'Sample chat, not a live stream'}</span>
              </div>
            </div>
            <div className="relative mt-4 flex items-center sm:absolute sm:-right-5 sm:-bottom-5 sm:mt-0 gap-3 rounded-xl border border-lilac/30 bg-[#28183eeF] p-4 shadow-xl backdrop-blur-xl">
              <div className="grid size-9 place-items-center rounded-lg bg-lilac/15">
                <Gift size={19} className="text-lilac" />
              </div>
              <div>
                <p className="text-xs font-semibold">{th ? 'แจ้งเตือนของขวัญ' : 'Gift alert'}</p>
                <p className="mt-1 text-[10px] text-lilac">
                  {th ? 'Mika ส่ง Rose ×10' : 'Mika sent Rose ×10'}
                </p>
              </div>
              <Sparkles size={15} className="ml-3 text-lilac" />
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 pb-8 text-[10px] uppercase tracking-[.2em] text-white/30">
          <span>YouTube + TikTok / OBS plugin</span>
          <a href="#flow" className="flex items-center gap-2">
            {th ? 'ดูวิธีใช้งาน' : 'See how it works'} <ArrowDown size={13} />
          </a>
        </div>
      </section>

      <section
        data-pipeline
        id="flow"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 lg:py-32"
      >
        <div data-reveal className="grid gap-6 md:grid-cols-2">
          <div>
            <Eyebrow>{th ? '01 / การเชื่อมต่อ' : '01 / Connections'}</Eyebrow>
            <h2 className="text-3xl text-balance font-semibold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
              {th ? 'เชื่อมสองแพลตฟอร์ม' : 'Connect both platforms.'}
              <br />
              <span className="text-white/35">{th ? 'อ่านแชทใน OBS' : 'Read chat in OBS.'}</span>
            </h2>
          </div>
          <p className="max-w-md self-end text-sm leading-7 text-white/50">
            {th
              ? 'เชื่อม YouTube LIVE และ TikTok แล้วอ่านข้อความใน Dock ของ OBS เพิ่มแชทลงสตรีมหรือเปิดอ่านบนมือถือได้'
              : 'Connect your YouTube LIVE and TikTok accounts, then read their messages in OBS. You can also add a stream overlay or share a mobile viewing link.'}
          </p>
        </div>
        <div className="relative mt-16 grid items-center gap-8 rounded-3xl border border-white/8 bg-white/2 p-5 sm:p-8 lg:grid-cols-[1fr_2fr_1fr] lg:p-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/5 px-5 py-4 text-sm">
              <Radio size={18} className="text-red-400" />
              YouTube LIVE
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-teal-300/20 bg-teal-300/5 px-5 py-4 text-sm">
              <AudioLines size={18} className="text-teal-300" />
              TikTok LIVE
            </div>
          </div>
          <div className="relative flex items-center justify-center gap-4">
            <div
              data-trace
              className="hidden h-px flex-1 origin-left bg-linear-to-r from-lilac/10 to-lilac lg:block"
            />
            <div
              data-hub
              className="relative grid size-28 shrink-0 place-items-center rounded-3xl border border-lilac/40 bg-lilac/10 shadow-[0_0_60px_#a678ff20]"
            >
              <Layers3 size={38} className="text-lilac" />
              <span className="absolute -bottom-7 text-[9px] uppercase tracking-[.2em] text-lilac">
                Multi Live Chat
              </span>
            </div>
            <div
              data-trace
              className="hidden h-px flex-1 origin-left bg-linear-to-r from-lilac to-lilac/10 lg:block"
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-5 py-4 text-sm">
              <Monitor size={18} className="text-lilac" />
              OBS Studio
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 px-5 py-4 text-sm">
              <Smartphone size={18} className="text-lilac" />
              {th ? 'อ่านแชทบนมือถือ' : 'Mobile viewer'}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/5 bg-[#100b18]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div data-reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>{th ? '02 / ฟีเจอร์' : '02 / Features'}</Eyebrow>
              <h2 className="text-3xl text-balance font-semibold tracking-normal sm:text-4xl lg:text-5xl">
                {th ? 'แชทและแจ้งเตือนในที่เดียว' : 'Chat, alerts and overlays.'}
              </h2>
            </div>
            <span className="text-xs text-white/35">
              {th ? 'ใช้งานจาก Dock ของ OBS' : 'Available in your OBS dock.'}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description, tag }) => (
              <article
                data-reveal
                key={tag}
                className="group rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-white/0 p-5 sm:p-7 transition duration-300 hover:border-lilac/30 hover:bg-white/5"
              >
                <div className="mb-6 flex items-center justify-between">
                  <Icon size={25} strokeWidth={1.5} className="text-lilac" />
                  <span className="text-[8px] tracking-[.15em] text-white/30">{tag}</span>
                </div>
                <h3 className="mb-3 text-lg font-semibold tracking-normal">{title}</h3>
                <p className="text-sm leading-6 text-white/45">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="playground"
        className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 lg:grid-cols-[.8fr_1.2fr] lg:py-32"
      >
        <div data-reveal>
          <Eyebrow>{th ? '03 / ทดลองใช้งาน' : '03 / Demo'}</Eyebrow>
          <h2 className="text-3xl text-balance font-semibold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
            {th ? 'ลองแชทและแจ้งเตือน' : 'Try chat and alerts.'}
            <br />
            <span className="text-white/35">
              {th ? 'ด้วยข้อมูลตัวอย่าง' : 'Using sample messages.'}
            </span>
          </h2>
          <p className="mt-6 text-sm leading-7 text-white/50">
            {th
              ? 'ทดลองเพิ่มแชท ของขวัญ และผู้ติดตาม ข้อมูลทั้งหมดเป็นตัวอย่าง ไม่ส่งข้อความไปยังแพลตฟอร์มจริง'
              : 'Use the buttons to add a sample message, gift or follow alert. These examples do not send anything to YouTube or TikTok.'}
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-lilac">
            <Command size={15} />{' '}
            {th ? 'กดปุ่มด้านล่างเพื่อทดลอง' : 'Use the demo controls to try it.'}
          </div>
        </div>
        <DemoChat interactive />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24">
        <div
          data-reveal
          className="rounded-3xl border border-lilac/15 bg-[radial-gradient(ellipse_at_top_right,#6531aa25,transparent_65%)] p-8 sm:p-12"
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Eyebrow>{th ? '04 / ติดตั้ง' : '04 / Installation'}</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                {th ? 'ดาวน์โหลด ติดตั้ง แล้วเชื่อมแชท' : 'Install and connect your chat.'}
              </h2>
            </div>
            <Button href="/docs/installation" secondary>
              <BookOpen size={15} />
              {th ? 'คู่มือติดตั้ง' : 'Installation guide'}
            </Button>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {[
              [
                Download,
                th ? 'ดาวน์โหลด' : 'Download',
                th
                  ? 'ใช้ตัวติดตั้งสำหรับ Windows ได้เลย'
                  : 'Download the Windows installer. No extra tools needed.',
              ],
              [
                Monitor,
                th ? 'ติดตั้งแล้วเปิด Dock' : 'Install & open the dock',
                th
                  ? 'ปิด OBS ติดตั้ง แล้วเลือก Multi Live Chat ใน Docks'
                  : 'Close OBS, install, then find Multi Live Chat in Docks.',
              ],
              [
                Zap,
                th ? 'เชื่อมแชท' : 'Connect your platforms',
                th
                  ? 'ใส่ YouTube LIVE และ TikTok username ของคุณ'
                  : 'Add your YouTube LIVE and TikTok username.',
              ],
            ].map(([Icon, title, description], index) => {
              const StepIcon = Icon as typeof Download;
              return (
                <div key={index}>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="text-[10px] text-lilac">0{index + 1}</span>
                    <span className="h-px flex-1 bg-white/10" />
                    <StepIcon size={17} className="text-white/40" />
                  </div>
                  <h3 className="mb-2 text-sm font-semibold">{title as string}</h3>
                  <p className="text-xs leading-6 text-white/45">{description as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24 md:grid-cols-2">
        <div data-reveal>
          <Eyebrow>{th ? '05 / คำถามที่พบบ่อย' : '05 / FAQ'}</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-normal">
            {th ? 'คำถามที่พบบ่อย' : 'Frequently asked questions'}
          </h2>
          <Link
            to="/docs/security"
            className="mt-6 inline-flex items-center gap-2 text-sm text-lilac"
          >
            {th ? 'อ่านคู่มือทั้งหมด' : 'Explore the documentation'}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="space-y-3">
          {[
            [
              th ? 'เริ่มอ่านแชท YouTube ยังไง?' : 'How do I connect YouTube?',
              th
                ? 'ใส่ ID หรือลิงก์ไลฟ์ใน Accounts แล้วกดเชื่อม จากนั้นเปิด Chat'
                : 'Paste a LIVE video ID or link in Accounts, connect, then open Chat.',
            ],
            [
              th ? 'มือถือควบคุม OBS ได้ไหม?' : 'Can my phone control OBS?',
              th
                ? 'ไม่ได้ Viewer อ่านอย่างเดียว และต้องเปิดแชร์ใน OBS ก่อน'
                : 'No. The viewer is read-only, and sharing must be enabled in OBS first.',
            ],
            [
              th ? 'TikTok เป็นระบบทางการไหม?' : 'Is the TikTok connector official?',
              th
                ? 'เป็น unofficial connector การเปลี่ยนแปลงของ TikTok อาจกระทบการเชื่อมต่อ'
                : 'It is an unofficial connector. TikTok changes can affect availability.',
            ],
            [
              th ? 'Fork และแก้ไขได้ไหม?' : 'Can I fork and modify it?',
              th
                ? 'ได้ ตาม GPL-3.0-or-later และต้องเก็บเครดิตเดิม ดู LICENSE และ NOTICE ใน repo'
                : 'Yes, under GPL-3.0-or-later. Preserve the original attribution; see LICENSE and NOTICE.',
            ],
          ].map(([question, answer]) => (
            <details
              key={question}
              className="group rounded-xl border border-white/8 bg-white/2 px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {question}
                <ChevronRight
                  size={15}
                  className="shrink-0 text-lilac transition group-open:rotate-90"
                />
              </summary>
              <p className="mt-4 text-sm leading-7 text-white/50">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-white/8 px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="mb-5 text-[10px] uppercase tracking-[.2em] text-lilac">
          {th ? 'โครงการโอเพนซอร์ส โดย @CrafOps' : 'Open source by @CrafOps'}
        </p>
        <h2 className="text-3xl text-balance font-semibold tracking-normal">
          {th ? 'เริ่มใช้งาน Multi Live Chat' : 'Get Multi Live Chat for OBS'}
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={download}>
            <Download size={16} />
            {th ? 'ดาวน์โหลด Multi Live Chat' : 'Get Multi Live Chat'}
          </Button>
          <Button href={repository} secondary>
            <Star size={15} /> {th ? 'ให้ดาวใน GitHub' : 'Star on GitHub'}{' '}
            {info.stars !== undefined && <span className="text-lilac">· {info.stars}</span>}
          </Button>
        </div>
        <p className="mt-5 text-xs text-white/35">
          {th
            ? 'ชอบโปรเจกต์นี้? กด Star ใน GitHub เพื่อสนับสนุนการพัฒนา'
            : 'Like the project? Star it on GitHub to support its development.'}
        </p>
      </section>
    </div>
  );
}
