# TikTok Alerts & mobile chat / แจ้งเตือนและอ่านแชทบนมือถือ

For Multi Live Chat 0.3.0 and later. These features are separate from logging in
to a platform. Mobile sharing starts disabled; ordinary local chat still works
without enabling it.

## ภาษาไทย

### เพิ่ม Alert ลงสตรีม

1. เชื่อม TikTok ใน Accounts และเปิด bridge ตามปกติ
2. ไป **Settings → TikTok gift & follow alerts**
3. เลือกว่าจะเปิด Alert ของขวัญและผู้ติดตามใหม่หรือไม่ ตั้งระยะเวลาแสดง
4. เลือกเสียง **Off / Stream only / Listen only / Stream & listen** และระดับเสียง
5. กด **Add / update Alerts source**
6. ใช้ปุ่ม **Test** ของ Gift และ Follow เพื่อตรวจภาพกับเสียง

ปลั๊กอินเพิ่ม Browser Source ชื่อ **Multi Live Chat · Alerts** ใน Scene ปัจจุบัน
เลื่อนและปรับขนาดได้เหมือน Source ปกติ ภาพใช้พื้นหลังโปร่งใส ตั้งต้น 800×300
และ 30 FPS Source ที่ปลั๊กอินสร้างจะอัปเดต URL ให้เองเมื่อ bridge เริ่มใหม่
ติดตาม Source ด้วย UUID จึงเปลี่ยนชื่อ Source ได้

ต้องให้ Source อยู่ใน Scene ที่ใช้งานและไม่ซ่อนไว้เพื่อออกสตรีม หากต้องใช้หลาย
Scene ให้เพิ่ม Source เดิมแทนการสร้าง Browser Source หลายตัวที่เล่นเสียงซ้ำ
ชื่อเดียวกันแต่เป็น Source ของคุณที่ปลั๊กอินไม่ได้สร้าง จะไม่ถูกเขียนทับ

### เสียง

| ตัวเลือก | ผล |
| --- | --- |
| Off | แสดงภาพอย่างเดียว |
| Stream only | ออกสตรีม/บันทึก แต่ไม่เปิด monitoring ให้ฟังเอง |
| Listen only | ส่งไปอุปกรณ์ monitoring ไม่ส่งออกสตรีมผ่าน Source นี้ |
| Stream & listen | ส่งทั้งสตรีมและอุปกรณ์ monitoring |

เลือกอุปกรณ์ฟังใน **OBS Settings → Audio → Monitoring Device** หาก Desktop
Audio จับอุปกรณ์ monitoring เดียวกันด้วย เสียงอาจถูกจับซ้ำหรือโหมดฟังเองอาจ
เข้าสตรีมผ่าน Desktop Audio ได้ ให้แยกอุปกรณ์หรือปรับการจับ Desktop Audio
ให้ตรงกับผลที่ต้องการ ตรวจด้วยการบันทึกสั้น ๆ ก่อนใช้งานจริง

เสียงของขวัญเริ่มต้นเป็นเสียงทุ้ม ส่วนติดตามเป็นเสียงสองจังหวะ กด **Choose sound**
เพื่อเลือก WAV/MP3 ไม่เกิน 2 MB ไฟล์จะถูกคัดลอกไปข้อมูลแอป กด **Default**
กลับไปใช้เสียงเริ่มต้นโดยไม่ลบไฟล์ต้นฉบับ เสียง custom เล่นไม่เกินเวลาของ Alert
หากอ่านเสียงไม่ได้จะใช้เสียงเริ่มต้นแทน

### คอมโบและคิว

ระหว่างส่งของขวัญต่อเนื่อง แท็บ Chat จะแสดงกล่องเล็กซ้อนมุมรายการ พร้อมชื่อ
ของขวัญและจำนวนที่เพิ่มสด ไม่เพิ่มข้อความซ้ำทุกจังหวะ เมื่อจบคอมโบจะบันทึก
ยอดรวมและเข้าคิว Alert หนึ่งครั้ง GIF ที่แพลตฟอร์มส่งมาจะเล่นตามปกติ รูปนิ่ง
ใช้ slide/fade และเอฟเฟกต์เด้ง หากไม่มีรูปใช้ไอคอนสำรอง

Alert แสดงทีละรายการ คิวจำกัด 30 รายการและข้ามรายการที่เก่าเกิน 60 วินาที
เพื่อไม่ให้ภาพ/เสียงค้างตามหลังไลฟ์นาน ปุ่ม Test เป็นข้อมูลจำลองเฉพาะ Alert
ไม่ส่งเป็นข้อความจริงใน TikTok หรือประวัติแชทมือถือ

### เปิดอ่านแชทบนมือถือ

1. ไป **Settings → Read chat on your phone**
2. กด **Enable sharing / generate link** อ่านรายละเอียดข้อมูลที่จะส่งและกด Yes
3. รอสถานะ Live แล้วสแกน QR หรือกด **Copy private mobile link**
4. เปิดลิงก์บนมือถือ ใช้ได้แม้คนละ Wi-Fi เพราะผ่าน `docks.54621325.xyz`

มือถืออ่านได้เท่านั้น ไม่มีสิทธิ์สั่ง OBS เปลี่ยน Settings หรือส่งข้อความ
คีย์เดิมใช้ต่อหลังปิด/เปิด OBS และอัปเดตจนคุณกด **Reset link** เอง การเริ่มแชร์
อัตโนมัติเป็น checkbox แยกและปิดไว้ก่อน ต้องกด Save settings หลังเปลี่ยน
**Stop sharing** หยุดส่งและปิดการเริ่มแชร์อัตโนมัติด้วย

Reset จะทำให้ลิงก์และ QR เก่าใช้ไม่ได้ทันที อย่าเผยแพร่ QR/ลิงก์ส่วนตัว เพราะ
คนที่มีลิงก์อ่านแชทที่แชร์ได้ คีย์เก็บด้วย Windows DPAPI และไม่ส่งคีย์ควบคุม
OBS หรือข้อมูลล็อกอินไปเว็บ ฝั่งโฮสต์เก็บ hash ของคีย์ ไม่เก็บแชทถาวร

เว็บมือถือจำสิทธิ์ไว้ใน session ของแท็บเพื่อรีเฟรชได้ แต่ล้าง session หรือ
เปิดแท็บใหม่โดยไม่มีลิงก์อาจต้องเปิดลิงก์ส่วนตัวอีกครั้ง การเคลียร์ session
ไม่ได้รีเซ็ตคีย์ของคุณ เมื่อ OBS/bridge ปิด หน้าเว็บจะขึ้นออฟไลน์และล้างประวัติ
ชั่วคราว การเชื่อมใหม่อาจแสดงข้อความล่าสุดไม่เกิน 50 ข้อความ

**Local chat reader** ใช้ UI อ่านแชทเดียวกันบนเครื่องที่เปิด OBS แต่ URL
127.0.0.1 ไม่ใช่ลิงก์สำหรับมือถือคนละเครื่อง ส่วน **Local overlay URL**
ยังเป็นแชทโปร่งใสสำหรับ Browser Source แยกจาก Alert

## English

In Settings, configure **TikTok gift & follow alerts**, then click
**Add / update Alerts source**. Position the managed Browser Source
and use the Gift/Follow Test buttons. It refreshes its local URL after bridge
restarts and follows source renames through its UUID. Keep it visible in the
active scene; reuse the same source across scenes to avoid duplicate playback.

Choose Off, Stream only, Listen only or Stream & listen. Listening uses OBS's
Monitoring Device. If Desktop Audio also captures that device, it can duplicate
audio or send monitor-only sound to your stream through a different source.
Check your routing with a short recording. Mixer adjustments are preserved;
saving the plugin's audio preferences explicitly reapplies its selected routing.

Default gift/follow tones differ. Import WAV/MP3 up to 2 MB; files are copied to
app data and resetting to Default leaves your original files intact. Playback
is capped by alert duration. Gift streak progress appears as a small floating
chat indicator; completed totals produce one queued alert. GIFs play when supplied,
still images animate with slide/fade, and missing artwork has an icon fallback.
The bounded queue keeps 30 entries, discards stale entries after 60 seconds and
shows one at a time. Tests do not post to TikTok or the mobile chat history.

For mobile, explicitly enable sharing and accept the disclosure in Settings.
Scan the private QR or copy the link. Phones are read-only, including at the
server authorization layer. Startup sharing is a separate opt-in. Keys persist
until manual Reset; reconnects never rotate them. Stop sharing also turns startup
sharing off. A reset immediately revokes old links and connected readers.

No account credentials, control tokens or OBS settings are forwarded. Windows
DPAPI protects saved desktop keys; the server persists their hashes. Chat is
transient. Links are bearer credentials, so keep them private. The viewer saves
its reading credential in that tab's session only, not a permanent account login.
The relay can resend up to 50 recent messages after reconnecting; high-volume
traffic is bounded and may drop older queued events instead of growing memory.

Use the private mobile link across networks. The separate localhost reader and
transparent chat overlay are for the OBS computer. If sharing is unavailable,
local chat and local alerts remain usable.

## Chat overlay CSS / CSS ของแชทบนสตรีม

The Browser Source chat overlay now includes a lavender bubble theme inspired by
the supplied YouTube chatbox. It supports both platforms, avatars, emoji and gifts
without downloading web fonts. Use the local overlay URL from Settings as usual.
For your own colors, paste `overlay/overlay.css` from the package into the Browser
Source's Custom CSS and change the variables at the top. Clear old Custom CSS to
see the included theme; existing overrides take precedence over the bundled file.

หน้าแชทสำหรับ Browser Source ใช้ธีมกล่องข้อความม่วงอ่อน พร้อมชื่อผู้ส่ง รูปโปรไฟล์
อีโมจิ และของขวัญทั้งสองแพลตฟอร์ม ใช้ URL overlay ใน Settings ได้เลย
ถ้าต้องการปรับสีเอง ให้นำไฟล์ `overlay/overlay.css` ในชุดติดตั้งไปใส่ช่อง Custom CSS
แล้วแก้ตัวแปรด้านบน หากมี CSS เก่าค้างอยู่ ให้ล้างก่อนเพื่อเห็นธีมใหม่

Default gift sound: Sparkle (three ascending chimes).
Default follow sound: Welcome (two soft chimes).
Gift/follow cards fade in and out over 550 ms.
