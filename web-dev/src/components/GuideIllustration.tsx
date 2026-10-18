import { Check, Download, Folder, Gift, Layers3, Monitor, Plus, Smartphone } from 'lucide-react';
import type { Illustration } from '../data/guides';
import type { Language } from '../data/project';

export default function GuideIllustration({
  type,
  language,
}: {
  type: Illustration;
  language: Language;
}) {
  const th = language === 'th';
  const label = {
    download: th ? 'เลือกตัวติดตั้ง .exe' : 'Choose the .exe installer',
    install: th ? 'ตรวจโฟลเดอร์ OBS ก่อนติดตั้ง' : 'Check the OBS folder before installing',
    dock: th ? 'เปิด Dock จากเมนูของ OBS' : 'Open the dock from the OBS menu',
    accounts: th ? 'ใส่ข้อมูลแล้วกดเชื่อม' : 'Enter your stream and connect',
    chat: th ? 'แชทสองแพลตฟอร์มในหน้าต่างเดียว' : 'Two platforms in one timeline',
    overlay: th ? 'เพิ่ม Browser Source แล้ววางลิงก์' : 'Add a Browser Source and paste the link',
    alerts: th ? 'เพิ่ม Source แล้วกด Test' : 'Add the source, then click Test',
    mobile: th ? 'เปิดแชร์เพื่อรับลิงก์ส่วนตัว' : 'Enable sharing to get a private link',
    updates: th ? 'เลือกอัปเดตเมื่อปิด OBS' : 'Choose updates after OBS closes',
  }[type];
  const field = 'rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/70';
  const action =
    'rounded-lg border border-lilac/30 bg-lilac/15 px-3 py-2 text-xs font-medium text-lilac';
  return (
    <figure className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#120d1c]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 text-[10px] text-white/50">
        <span className="flex items-center gap-2">
          <Monitor size={12} />
          {type === 'download'
            ? 'GitHub Releases'
            : type === 'install'
              ? 'Multi Live Chat Setup'
              : 'OBS Studio / Multi Live Chat'}
        </span>
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-white/20" />
          <span className="size-1.5 rounded-full bg-white/20" />
          <span className="size-1.5 rounded-full bg-white/20" />
        </span>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        {type === 'download' && (
          <>
            <p className="text-sm font-semibold">Multi Live Chat 0.3.0</p>
            <p className="text-[10px] text-white/40">Assets</p>
            <div className={`${action} flex items-center gap-2`}>
              <Download size={14} />
              Multi-Live-Chat-Setup.exe
              <Check size={14} className="ml-auto" />
            </div>
          </>
        )}
        {type === 'install' && (
          <>
            <p className="text-sm">
              {th ? 'เลือกโฟลเดอร์ OBS Studio' : 'Select your OBS Studio folder'}
            </p>
            <div className={`${field} flex gap-2`}>
              <Folder size={14} />… / Steam / steamapps / common / OBS Studio
            </div>
            <div className="flex justify-end">
              <span className={action}>Install →</span>
            </div>
          </>
        )}
        {type === 'dock' && (
          <>
            <div className="flex gap-5 text-xs text-white/40">
              <span>File</span>
              <span>View</span>
              <span className="rounded bg-lilac/20 px-2 text-lilac">Docks</span>
            </div>
            <div className="ml-10 max-w-sm rounded-xl border border-lilac/25 bg-[#20172f] p-3">
              <p className="mb-3 text-xs text-white/40">Scenes</p>
              <p className="mb-3 text-xs text-white/40">Sources</p>
              <p className="flex items-center gap-2 rounded-lg bg-lilac/15 p-2 text-xs text-lilac">
                <Check size={12} />
                Multi Live Chat by @CrafOps
              </p>
            </div>
          </>
        )}
        {type === 'accounts' && (
          <>
            <p className="flex gap-5 text-xs">
              <span className="text-lilac">Accounts</span>
              <span className="text-white/35">Chat</span>
              <span className="text-white/35">Settings</span>
            </p>
            <p className="text-[10px] text-white/45">
              {th ? 'ลิงก์ YouTube LIVE แบบเต็ม' : 'Full YouTube LIVE URL'}
            </p>
            <div className={`${field} break-all font-mono`}>
              https://www.youtube.com/watch?v=
              <span className="font-semibold text-lilac">FiaU2oMI-Cg</span>
            </div>
            <p className="text-[10px] text-white/45">
              {th
                ? 'ใช้ ID หลัง v= หรือวางทั้งลิงก์ก็ได้'
                : 'Use the ID after v=, or paste the whole link'}
            </p>
            <div className={`${field} font-mono`}>
              YouTube ID: <span className="text-lilac">FiaU2oMI-Cg</span>
            </div>
            <p className="text-[10px] text-white/45">
              {th
                ? 'TikTok username - ตัด @ ด้านหน้าออก'
                : 'TikTok username - remove the leading @'}
            </p>
            <div className={`${field} font-mono`}>
              <span className="text-white/40">@ppekkungz</span> →{' '}
              <span className="text-lilac">ppekkungz</span>
            </div>
            <div className={action}>Save accounts and connect</div>
          </>
        )}
        {type === 'chat' && (
          <>
            <p className="flex items-center gap-2 text-xs text-lilac">
              <Layers3 size={14} />
              Chat
            </p>
            <div className={field}>
              <span className="mr-2 rounded bg-red-400/20 px-2 py-1 text-[9px] text-red-300">
                YouTube
              </span>
              Luna
              <p className="mt-2 text-white/50">
                {th ? 'สวัสดีจาก YouTube 💜' : 'Hello from YouTube 💜'}
              </p>
            </div>
            <div className={field}>
              <span className="mr-2 rounded bg-teal-300/15 px-2 py-1 text-[9px] text-teal-200">
                TikTok
              </span>
              Kai<p className="mt-2 text-white/50">{th ? 'แชทมาแล้ว ✨' : 'Chat is here ✨'}</p>
            </div>
          </>
        )}
        {type === 'overlay' && (
          <>
            <p className="flex items-center gap-2 text-xs">
              <Plus size={14} />
              Sources → Browser
            </p>
            <p className="text-[10px] text-white/45">URL</p>
            <div className={field}>http://127.0.0.1:…/overlay#…</div>
            <div className="grid grid-cols-2 gap-3">
              <div className={field}>Width: 600</div>
              <div className={field}>Height: 900</div>
            </div>
            <div className="flex justify-end">
              <span className={action}>OK</span>
            </div>
          </>
        )}
        {type === 'alerts' && (
          <>
            <p className="flex items-center gap-2 text-xs">
              <Gift size={14} className="text-lilac" />
              TikTok gift & follow alerts
            </p>
            <p className="flex items-center gap-2 text-xs text-white/60">
              <Check size={13} className="text-lilac" />
              Enable animated alerts
            </p>
            <div className={action}>Add / update Alerts source</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/50">Gift sound</span>
              <span className={action}>Test ▶</span>
            </div>
          </>
        )}
        {type === 'mobile' && (
          <>
            <p className="flex items-center gap-2 text-xs">
              <Smartphone size={14} className="text-lilac" />
              Read chat on your phone
            </p>
            <div className={action}>Enable sharing / generate link</div>
            <div className={field}>https://docks.54621325.xyz/viewer#…</div>
            <p className="text-[10px] text-white/40">
              {th ? 'ลิงก์จะปรากฏหลังยินยอมแชร์' : 'Your link appears after accepting sharing'}
            </p>
          </>
        )}
        {type === 'updates' && (
          <>
            <p className="text-xs text-white/50">Settings</p>
            <div className="flex items-center gap-3 rounded-xl border border-lilac/20 bg-lilac/5 p-4">
              <span className="grid size-5 shrink-0 place-items-center rounded bg-lilac text-[#170d2e]">
                <Check size={14} />
              </span>
              <span className="text-xs">Automatically update when OBS closes</span>
            </div>
          </>
        )}
      </div>
      <figcaption className="border-t border-white/8 px-4 py-3 text-[10px] leading-5 text-white/40">
        {th ? 'ภาพประกอบ' : 'Illustration'} • {label}
      </figcaption>
    </figure>
  );
}
