import type { Language } from './project';

export type Illustration =
  | 'download'
  | 'install'
  | 'dock'
  | 'accounts'
  | 'chat'
  | 'overlay'
  | 'alerts'
  | 'mobile'
  | 'updates';
export type GuideStep = { title: string; description: string; illustration?: Illustration };
export type GuideContent = { title: string; summary: string; steps: GuideStep[]; tip?: string };
export type Guide = { slug: string; content: Record<Language, GuideContent> };

export const guides: Guide[] = [
  {
    slug: 'installation',
    content: {
      en: {
        title: 'Install in 3 steps',
        summary: 'Windows x64 • OBS 32.2.2. Everything you need is in the installer.',
        steps: [
          {
            title: 'Download the installer',
            description: 'Click Download for Windows. Save Multi-Live-Chat-Setup.exe.',
            illustration: 'download',
          },
          {
            title: 'Close OBS and install',
            description:
              'Run the installer. Check the OBS Studio folder, then finish setup. Steam users should select their Steam OBS Studio folder.',
            illustration: 'install',
          },
          {
            title: 'Open your chat dock',
            description:
              'Start OBS and choose Docks → Multi Live Chat by @CrafOps. Drag the dock to your preferred position.',
            illustration: 'dock',
          },
        ],
        tip: 'Upgrading? Install into the same package folder you used before.',
      },
      th: {
        title: 'ติดตั้งใน 3 ขั้นตอน',
        summary: 'Windows x64 • OBS 32.2.2 ตัวติดตั้งมีสิ่งที่ต้องใช้ให้ครบแล้ว',
        steps: [
          {
            title: 'ดาวน์โหลดตัวติดตั้ง',
            description: 'กดดาวน์โหลดสำหรับ Windows แล้วบันทึกไฟล์ Multi-Live-Chat-Setup.exe',
            illustration: 'download',
          },
          {
            title: 'ปิด OBS แล้วติดตั้ง',
            description:
              'เปิดตัวติดตั้ง ตรวจโฟลเดอร์ OBS Studio ให้ถูก แล้วติดตั้งจนเสร็จ หากใช้ Steam ให้เลือกโฟลเดอร์ OBS Studio ของ Steam',
            illustration: 'install',
          },
          {
            title: 'เปิด Dock แชท',
            description:
              'เปิด OBS แล้วเลือก Docks → Multi Live Chat by @CrafOps ลาก Dock ไปตำแหน่งที่ต้องการ',
            illustration: 'dock',
          },
        ],
        tip: 'อัปเกรดรุ่นเดิม? เลือกโฟลเดอร์แพ็กเกจที่เคยติดตั้งไว้',
      },
    },
  },
  {
    slug: 'accounts',
    content: {
      en: {
        title: 'Connect YouTube & TikTok',
        summary: 'Open Accounts and enter the live stream you want to follow.',
        steps: [
          {
            title: 'Add your YouTube LIVE',
            description:
              'Copy the link from your YouTube LIVE. You can paste the whole link, or use only the video ID after v= as shown below.',
            illustration: 'accounts',
          },
          {
            title: 'Add your TikTok creator',
            description:
              'Find the username on the creator profile. For @ppekkungz, enter ppekkungz without @. Enable the TikTok connector and make sure the creator is live.',
          },
          {
            title: 'Connect and open Chat',
            description:
              'Click Save accounts and connect. Wait for the connected status, then open Chat.',
            illustration: 'chat',
          },
        ],
        tip: 'If no messages arrive, check the stream and try Save accounts and connect again.',
      },
      th: {
        title: 'เชื่อม YouTube และ TikTok',
        summary: 'เปิด Accounts แล้วใส่ไลฟ์ที่ต้องการอ่านแชท',
        steps: [
          {
            title: 'ใส่ YouTube LIVE',
            description:
              'คัดลอกลิงก์จากหน้า YouTube LIVE วางได้ทั้งลิงก์ หรือใช้เฉพาะ ID ที่อยู่หลัง v= ตามตัวอย่างด้านล่าง',
            illustration: 'accounts',
          },
          {
            title: 'ใส่ผู้ไลฟ์ TikTok',
            description:
              'ดู username จากหน้าโปรไฟล์ เช่น @ppekkungz ให้ใส่ ppekkungz โดยตัด @ ออก เปิดตัวเชื่อม TikTok และตรวจว่าบัญชีนั้นกำลังไลฟ์อยู่',
          },
          {
            title: 'เชื่อมแล้วเปิด Chat',
            description: 'กด Save accounts and connect รอสถานะ connected แล้วเปิดแท็บ Chat',
            illustration: 'chat',
          },
        ],
        tip: 'แชทยังไม่มา? ตรวจว่าไลฟ์ยังเปิดอยู่ แล้วกดเชื่อมอีกครั้ง',
      },
    },
  },
  {
    slug: 'chat',
    content: {
      en: {
        title: 'Read and filter chat',
        summary: 'Both platforms appear in the same timeline.',
        steps: [
          {
            title: 'Read the conversation',
            description: 'Open Chat to see names, profiles, messages and gifts.',
            illustration: 'chat',
          },
          {
            title: 'Find a message',
            description: 'Use Search messages or select a platform to narrow the timeline.',
          },
          {
            title: 'Keep up with the stream',
            description:
              'Enable Auto-scroll to follow new messages. Disable it while reading older messages.',
          },
        ],
      },
      th: {
        title: 'อ่านและกรองแชท',
        summary: 'แชทสองแพลตฟอร์มอยู่ในรายการเดียวกัน',
        steps: [
          {
            title: 'อ่านบทสนทนา',
            description: 'เปิด Chat เพื่อดูชื่อ โปรไฟล์ ข้อความ และของขวัญ',
            illustration: 'chat',
          },
          {
            title: 'หาข้อความที่ต้องการ',
            description: 'ใช้ Search messages หรือเลือกแพลตฟอร์มเพื่อกรองรายการ',
          },
          {
            title: 'ตามแชทใหม่',
            description: 'เปิด Auto-scroll เพื่อเลื่อนตามข้อความใหม่ ปิดเมื่อต้องการอ่านแชทเก่า',
          },
        ],
      },
    },
  },
  {
    slug: 'overlay',
    content: {
      en: {
        title: 'Put chat on your stream',
        summary: 'Add a transparent chat overlay to your OBS scene.',
        steps: [
          {
            title: 'Copy the overlay link',
            description: 'Open Settings and copy the local Browser Source overlay URL.',
          },
          {
            title: 'Add a Browser Source',
            description:
              'In OBS Sources, click + → Browser. Paste the copied URL and adjust its width and height.',
            illustration: 'overlay',
          },
          {
            title: 'Position your chat',
            description:
              'Drag the source into place. The included theme is ready to use. Clear old Custom CSS if it overrides the theme.',
          },
        ],
        tip: 'After a bridge restart, copy the current chat overlay URL again if the old source stops showing messages.',
      },
      th: {
        title: 'เพิ่มแชทลงสตรีม',
        summary: 'วางแชทพื้นหลังโปร่งใสใน Scene ของ OBS',
        steps: [
          {
            title: 'คัดลอกลิงก์ overlay',
            description: 'เปิด Settings แล้วคัดลอก local Browser Source overlay URL',
          },
          {
            title: 'เพิ่ม Browser Source',
            description: 'ที่ Sources ใน OBS กด + → Browser วาง URL แล้วปรับความกว้างและความสูง',
            illustration: 'overlay',
          },
          {
            title: 'จัดตำแหน่งแชท',
            description:
              'ลาก Source ไปตำแหน่งที่ต้องการ มีธีมพร้อมใช้แล้ว หากมี Custom CSS เก่าทับอยู่ ให้ล้างก่อน',
          },
        ],
        tip: 'หากเปิด bridge ใหม่แล้วแชทไม่แสดง ให้คัดลอก URL overlay ปัจจุบันไปใส่อีกครั้ง',
      },
    },
  },
  {
    slug: 'alerts',
    content: {
      en: {
        title: 'Gift & follow alerts',
        summary: 'Celebrate TikTok gifts and new followers on your stream.',
        steps: [
          {
            title: 'Choose your alerts',
            description:
              'In Settings → TikTok gift & follow alerts, enable gifts or follows and set the duration.',
            illustration: 'alerts',
          },
          {
            title: 'Add the alert source',
            description:
              'Click Add / update Alerts source. Keep this source visible in the scene you use.',
          },
          {
            title: 'Choose sound and test',
            description:
              'Pick Off, Stream only, Listen only or Stream & listen. Choose a WAV/MP3 sound if you want, then click Test.',
          },
        ],
        tip: 'Record a short clip to check stream audio. Gift combos finish before their alert joins the queue.',
      },
      th: {
        title: 'แจ้งเตือนของขวัญและผู้ติดตาม',
        summary: 'แสดงของขวัญและผู้ติดตาม TikTok บนสตรีม',
        steps: [
          {
            title: 'เลือกสิ่งที่จะแจ้งเตือน',
            description:
              'เปิด Settings → TikTok gift & follow alerts แล้วเลือกของขวัญ ผู้ติดตาม และระยะเวลาแสดง',
            illustration: 'alerts',
          },
          {
            title: 'เพิ่ม Source แจ้งเตือน',
            description:
              'กด Add / update Alerts source และเปิดให้ Source นี้มองเห็นใน Scene ที่ใช้งาน',
          },
          {
            title: 'เลือกเสียงแล้วทดสอบ',
            description:
              'เลือกปิดเสียง ออกสตรีม ฟังเอง หรือทั้งสองฝั่ง เปลี่ยนเป็น WAV/MP3 ของคุณได้ แล้วกด Test',
          },
        ],
        tip: 'ลองอัดคลิปสั้นเพื่อเช็กเสียงออกสตรีม ของขวัญคอมโบจะเข้าคิวแจ้งเตือนเมื่อจบชุด',
      },
    },
  },
  {
    slug: 'mobile',
    content: {
      en: {
        title: 'Read chat on your phone',
        summary: 'Share a private, read-only link when you need it.',
        steps: [
          {
            title: 'Enable sharing',
            description:
              'Open Settings → Read chat on your phone. Click Enable sharing / generate link and accept the sharing request.',
            illustration: 'mobile',
          },
          {
            title: 'Open the private link',
            description:
              'Scan the QR code or copy the link to your phone. It works across networks while OBS and sharing are running.',
          },
          {
            title: 'Stop or reset',
            description:
              'Use Stop sharing to pause. Reset link invalidates the previous link. Enable automatic sharing only if you want it at startup.',
          },
        ],
        tip: 'Anyone with the private link can read the shared chat. The phone cannot post messages or control OBS.',
      },
      th: {
        title: 'อ่านแชทบนมือถือ',
        summary: 'เปิดแชร์เมื่อจำเป็นด้วยลิงก์ส่วนตัวที่อ่านได้อย่างเดียว',
        steps: [
          {
            title: 'เปิดแชร์แชท',
            description:
              'เปิด Settings → Read chat on your phone กด Enable sharing / generate link แล้วตอบรับคำขอแชร์',
            illustration: 'mobile',
          },
          {
            title: 'เปิดลิงก์บนมือถือ',
            description:
              'สแกน QR หรือส่งลิงก์ไปมือถือ อ่านได้แม้คนละเครือข่ายเมื่อ OBS และการแชร์กำลังทำงาน',
          },
          {
            title: 'หยุดหรือเปลี่ยนลิงก์',
            description:
              'กด Stop sharing เพื่อพัก กด Reset link เพื่อยกเลิกลิงก์เก่า เปิดแชร์อัตโนมัติเฉพาะเมื่อต้องการให้เริ่มพร้อม OBS',
          },
        ],
        tip: 'ผู้ที่มีลิงก์อ่านแชทที่แชร์ได้ มือถือส่งข้อความหรือควบคุม OBS ไม่ได้',
      },
    },
  },
  {
    slug: 'updates',
    content: {
      en: {
        title: 'Updates & uninstall',
        summary: 'Keep the plugin current without copying files yourself.',
        steps: [
          {
            title: 'Enable automatic updates',
            description: 'In Settings, enable Automatically update when OBS closes.',
            illustration: 'updates',
          },
          {
            title: 'Close OBS to apply',
            description:
              'Updates are checked when OBS starts. If an update is ready, close OBS and wait before opening it again.',
          },
          {
            title: 'Uninstall when needed',
            description:
              'Use Windows Installed apps to uninstall Multi Live Chat. The uninstaller removes the plugin installation, not unrelated files on your disk.',
          },
        ],
        tip: 'Testing a development build? Disable automatic updates so a release does not replace your test files.',
      },
      th: {
        title: 'อัปเดตและถอนติดตั้ง',
        summary: 'อัปเดตปลั๊กอินโดยไม่ต้องคัดลอกไฟล์เอง',
        steps: [
          {
            title: 'เปิดอัปเดตอัตโนมัติ',
            description: 'ใน Settings เปิด Automatically update when OBS closes',
            illustration: 'updates',
          },
          {
            title: 'ปิด OBS เพื่อติดตั้ง',
            description:
              'ระบบตรวจตอนเปิด OBS หากมีอัปเดตพร้อม ให้ปิด OBS แล้วรอสักครู่ก่อนเปิดใหม่',
          },
          {
            title: 'ถอนติดตั้งเมื่อต้องการ',
            description:
              'ไปที่ Installed apps ใน Windows แล้วถอน Multi Live Chat ตัวถอนติดตั้งลบชุดปลั๊กอิน ไม่ลบไฟล์อื่นในดิสก์',
          },
        ],
        tip: 'กำลังทดสอบรุ่น dev? ปิดอัปเดตอัตโนมัติเพื่อไม่ให้ Release ทับไฟล์ทดสอบ',
      },
    },
  },
  {
    slug: 'troubleshooting',
    content: {
      en: {
        title: 'Quick fixes',
        summary: 'Start with these checks if something is missing.',
        steps: [
          {
            title: 'The dock is missing',
            description:
              'Check Docks → Multi Live Chat. Restart OBS after installing and confirm you selected the correct OBS folder.',
          },
          {
            title: 'Chat is not arriving',
            description:
              'Check that the creator is live, verify the LIVE link or username, then reconnect in Accounts.',
          },
          {
            title: 'Overlay or audio is missing',
            description:
              'Refresh the Browser Source and check its URL. For alerts, keep the source visible and check its audio mode and OBS mixer.',
          },
          {
            title: 'Phone cannot connect',
            description:
              'Keep OBS and sharing running. Ask for a new link if the owner used Reset link.',
          },
        ],
        tip: 'Still stuck? Open a GitHub issue with your OBS version and what you tried. Do not include private sharing links.',
      },
      th: {
        title: 'แก้ปัญหาแบบเร็ว',
        summary: 'ลองตรวจตามนี้เมื่อมีสิ่งที่ไม่แสดง',
        steps: [
          {
            title: 'ไม่เห็น Dock',
            description:
              'ตรวจ Docks → Multi Live Chat เปิด OBS ใหม่หลังติดตั้ง และตรวจว่าเลือกโฟลเดอร์ OBS ถูกตัว',
          },
          {
            title: 'แชทไม่มา',
            description:
              'ตรวจว่าบัญชีนั้นกำลังไลฟ์ ลิงก์หรือ username ถูกต้อง แล้วเชื่อมใหม่ใน Accounts',
          },
          {
            title: 'ไม่เห็น overlay หรือไม่ได้ยินเสียง',
            description:
              'Refresh Browser Source และตรวจ URL ส่วน Alert ให้เปิด Source ไว้ ตรวจโหมดเสียงและ mixer ของ OBS',
          },
          {
            title: 'มือถือเชื่อมไม่ได้',
            description: 'เปิด OBS และการแชร์ไว้ หากเจ้าของกด Reset link ให้ขอลิงก์ใหม่',
          },
        ],
        tip: 'ยังติดปัญหา? เปิด issue ใน GitHub พร้อมรุ่น OBS และสิ่งที่ลองแล้ว อย่าแนบลิงก์แชร์ส่วนตัว',
      },
    },
  },
];
