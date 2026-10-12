# Multi Live Chat

**by @CrafOps · Native OBS dock for YouTube & TikTok LIVE**

Read YouTube and TikTok chat together inside OBS, with a local overlay for your stream. Public YouTube chat requires no API key or login.

[Download / ดาวน์โหลด](https://github.com/CrafOps/OBS-Plugin-MultiChat/releases/latest) · [ภาษาไทย](#ภาษาไทย) · [English](#english) · [License](#license--เครดิต)

> **Windows x64 · Release target: OBS 32.2.2 / Qt 6.11.1**
>
> Use the OBS and Qt versions supported by the release you download. The installer checks compatibility before installing.

## ภาษาไทย

### ทำอะไรได้บ้าง

- รวมแชท YouTube และ TikTok ใน Dock เดียว พร้อมค้นหาและกรองตามแพลตฟอร์ม
- อ่านแชท YouTube จาก Live ID หรือ URL โดยไม่ต้องล็อกอินหรือสร้าง API Key
- แสดงจำนวนผู้ชมแยกแพลตฟอร์ม รูปโปรไฟล์ อีโมจิ และภาพของขวัญ เมื่อแพลตฟอร์มส่งข้อมูลมา
- แสดงชื่อ YouTube แบบ `Display name (@handle)` เมื่อดึงข้อมูลชื่อได้
- มี Overlay พื้นหลังโปร่งใสสำหรับ Browser Source
- ดาวน์โหลดอัปเดตเมื่อเปิด OBS และติดตั้งหลังปิด OBS

โหมดอ่านแชทสาธารณะเป็น **แบบอ่านอย่างเดียว** ตัวอ่าน YouTube และ TikTok เป็นการเชื่อมต่อแบบไม่เป็นทางการ จึงอาจมีช่วงที่เชื่อมต่อไม่ได้เมื่อแพลตฟอร์มเปลี่ยนระบบ

### ติดตั้งครั้งแรก

1. ตรวจว่าใช้ **Windows 64-bit** และ OBS รุ่นที่ Release รองรับ
2. เปิด [หน้า Release ล่าสุด](https://github.com/CrafOps/OBS-Plugin-MultiChat/releases/latest)
3. ในส่วน **Assets** ดาวน์โหลด **`Multi-Live-Chat-Setup.exe`**
4. ปิด OBS ให้เรียบร้อย แล้วเปิดตัวติดตั้ง
5. ตรวจโฟลเดอร์ OBS ที่ตัวติดตั้งเลือกให้ หากใช้ OBS จาก Steam ให้เลือกโฟลเดอร์ `OBS Studio` ของ Steam หากตรวจไม่พบ
6. ติดตั้งจนเสร็จ แล้วเปิด OBS
7. ไปที่ **Docks → Multi Live Chat by @CrafOps** แล้วลาก Dock ไปตำแหน่งที่ต้องการ

**ไม่ต้องลง Node.js, Visual Studio หรือเครื่องมือเขียนโค้ดเอง** ตัวติดตั้งรวม runtime ที่จำเป็นและตั้งค่าเริ่มทำงานพร้อม OBS ให้แล้ว

หากติดตั้งหลายสำเนาของ OBS ให้เลือกโฟลเดอร์ของสำเนาที่ใช้งานจริง ตัวติดตั้งยังไม่มีลายเซ็นดิจิทัล หาก Windows แจ้งเตือน ให้ตรวจว่าดาวน์โหลดจาก repo นี้ก่อนดำเนินการต่อ

### เชื่อม YouTube

1. เปิดแท็บ **Accounts**
2. ใส่ Live ID หรือ URL ในช่อง **YouTube LIVE ID or URL** เช่น:

   ```text
   FiaU2oMI-Cg
   https://www.youtube.com/watch?v=FiaU2oMI-Cg
   https://www.youtube.com/live_chat?is_popout=1&v=FiaU2oMI-Cg
   ```

3. กด **Connect sources**
4. เปิดแท็บ **Chat** และเลือก **All** หรือ **YouTube**

ตัวอย่างข้างต้นแสดงรูปแบบที่ใส่ได้ ไม่รับรองว่าไลฟ์ตัวอย่างยังเปิดอยู่ ต้องใช้ไลฟ์ที่กำลังถ่ายทอดและเปิดแชทสาธารณะ ไม่รองรับแชท replay ในโหมดนี้

ไม่ต้องกด Login สำหรับโหมดนี้ หากเคยใส่ API Key ให้ล้างช่อง **Settings → API Key (official reader)** กด **Save settings** แล้วปิด/เปิด OBS ใหม่ ตัวเลือก OAuth/API เป็นโหมดขั้นสูงแยกต่างหาก

### เชื่อม TikTok

1. ใน **Accounts** ใส่ username ของผู้ที่กำลัง LIVE เช่น `creatorname` หรือ `@creatorname`
2. เปิด **Enable TikTok chat (unofficial)**
3. กด **Connect sources** แล้วเปิด **Chat**

หากเว็บแสดงว่ากำลัง LIVE แต่ปลั๊กอินแจ้ง offline อาจเกิดจากตัวเชื่อมต่อ เครือข่าย หรือการจำกัดของ TikTok ได้ ตรวจ username และลอง **Refresh** หรือเชื่อมต่อใหม่ ข้อความ offline ไม่ได้ยืนยันเสมอว่าผู้สร้างปิดไลฟ์แล้ว

### นำแชทขึ้นหน้าสตรีม

1. ไป **Settings → Browser Source overlay** แล้วกด **Copy overlay URL**
2. ใน OBS เพิ่ม **Sources → Browser** และวาง URL ที่คัดลอก
3. ปรับขนาด Browser Source และตั้งจำนวนข้อความ/เวลาแสดงใน Settings

Overlay ใช้บริการบนเครื่องคุณ ต้องเปิด OBS และ bridge ไว้ URL มีสิทธิ์เข้าถึงข้อมูลแชท จึงไม่ควรเผยแพร่ URL นี้ หลัง bridge เริ่มใหม่ URL จะเปลี่ยน ให้คัดลอกไปอัปเดตใน Browser Source อีกครั้ง

### อัปเดตอัตโนมัติ

เปิด **Settings → Automatically update when OBS closes** และกด **Save settings**

1. เมื่อเปิด OBS ตัวอัปเดตจะตรวจ Release ใหม่และดาวน์โหลดรุ่นที่เข้ากันได้
2. ระหว่างใช้งาน ดูสถานะได้ใน Settings
3. ปิด OBS แล้วรอให้ติดตั้งเสร็จก่อนเปิดใหม่
4. เปิด OBS รอบถัดไปเพื่อใช้เวอร์ชันใหม่ ดูเวอร์ชันได้ใต้ชื่อปลั๊กอิน

ระบบตรวจตอนเริ่ม OBS หากมี Release ใหม่หลังเปิด OBS แล้ว จะตรวจในรอบถัดไป โฟลเดอร์แพ็กเกจและโฟลเดอร์ OBS ต้องเขียนไฟล์ได้ หากติดปัญหาให้อ่าน `.update-status.txt` ในโฟลเดอร์ที่ติดตั้ง Multi Live Chat ดูรายละเอียดใน [คู่มืออัปเดต](docs/AUTO_UPDATE.md)

การเปลี่ยนชื่อ repo หรือย้ายองค์กรของ **repo เดิม** รองรับผ่าน repository ID ในตัวอัปเดตรุ่นที่รองรับการย้าย การสร้าง repo ใหม่หรือ Fork ไม่ได้เปลี่ยนปลายทางอัปเดตของผู้ใช้เดิมโดยอัตโนมัติ

### ปัญหาที่พบบ่อย

| อาการ | วิธีตรวจ / แก้ไข |
| --- | --- |
| ไม่พบ Dock | ตรวจว่าติดตั้งลง OBS สำเนาที่ใช้งานและใช้รุ่นที่รองรับ แล้วเปิดเมนู Docks |
| ต้องเปิด Dock ใหม่ทุกครั้ง | ใช้ v0.2.2 ขึ้นไป เปิด Dock หนึ่งครั้ง แล้วปิด OBS ตามปกติเพื่อบันทึกตำแหน่ง |
| เชื่อมแล้วไม่มีข้อความ | ตรวจว่าไลฟ์ยังเปิดอยู่และมีข้อความใหม่ ลองเลือกตัวกรอง All |
| YouTube เห็นแค่ @handle | รอการดึงข้อมูลชื่อ หากแพลตฟอร์มไม่ส่งข้อมูลหรือจำกัดคำขอ จะใช้ชื่อที่ตัวอ่านได้รับ |
| รูป อีโมจิ หรือภาพของขวัญไม่ขึ้น | ตรวจอินเทอร์เน็ต สื่อขึ้นกับข้อมูลและ URL ที่แพลตฟอร์มส่งมา ภาพเคลื่อนไหวไม่ได้มีสำหรับทุกของขวัญ |
| จำนวนผู้ชมเป็นขีด | หมายถึงไม่มีข้อมูลหรือยังไม่เชื่อมต่อ ไม่ใช่ผู้ชมเป็นศูนย์ |
| อัปเดตไม่สำเร็จ | ตรวจสถานะใน Settings / `.update-status.txt` และสิทธิ์เขียนโฟลเดอร์ OBS |
| Setup บอกว่ากำลังอัปเดต | ปิด OBS รอตัวอัปเดตจบ แล้วลอง Setup ใหม่ |

### ถอนการติดตั้ง

ปิด OBS แล้วไป **Windows Settings → Apps → Installed apps → Multi Live Chat → Uninstall** ถอนเฉพาะไฟล์ที่ตัวติดตั้งจัดการ ไม่ลบไดรฟ์หรือข้อมูล OBS ทั้งหมด และเก็บข้อมูลบัญชี/credentials กับ Qt runtime ที่อาจใช้ร่วมกันไว้ การถอนติดตั้งจึงไม่ใช่การล้างข้อมูลบัญชีทั้งหมด

## English

### Features

- A native OBS dock combining YouTube and TikTok LIVE chat, with search and platform filters.
- Public YouTube chat by live video ID or URL, without an API key or login.
- Per-platform viewer counts, profile pictures, emoji and gift images when supplied by the platform.
- YouTube names in `Display name (@handle)` format when channel metadata is available.
- A transparent local Browser Source overlay.
- Updates downloaded at OBS startup and installed after OBS closes.

Public chat mode is **read-only**. Both public readers use unofficial platform integrations; connectivity can change when the platforms change their systems.

### Install

1. Use **Windows x64** and the OBS/Qt versions supported by the release.
2. Open [the latest release](https://github.com/CrafOps/OBS-Plugin-MultiChat/releases/latest).
3. Under **Assets**, download **`Multi-Live-Chat-Setup.exe`**.
4. Close OBS and run Setup.
5. Confirm the OBS installation folder. Select your Steam `OBS Studio` folder manually if it is not detected.
6. Complete installation and open OBS.
7. Open **Docks → Multi Live Chat by @CrafOps** and arrange the dock.

**No separate Node.js or development tools are needed.** Setup bundles the required runtime and enables startup with OBS. Choose the correct OBS copy if you have multiple installations. Setup is currently unsigned; verify that it came from this repository before continuing through a Windows warning.

### Connect YouTube

In **Accounts**, enter a currently live video ID, watch URL, `/live/` URL, `youtu.be` URL or popout chat URL. For example:

```text
VIDEO_ID
https://www.youtube.com/watch?v=VIDEO_ID
https://www.youtube.com/live_chat?is_popout=1&v=VIDEO_ID
```

Click **Connect sources**, then open **Chat** with **All** or **YouTube** selected. Replace `VIDEO_ID` with the actual ID. The stream must be live with public chat enabled; this mode does not read chat replays.

Login and API keys are unnecessary for public mode. If you previously entered a key, clear **Settings → API Key (official reader)**, click **Save settings**, and restart OBS. OAuth/API account options are separate advanced modes.

### Connect TikTok

In **Accounts**, enter a live creator's username with or without `@`. Enable **Enable TikTok chat (unofficial)** and click **Connect sources**.

An offline error can also mean that the connector or network was restricted. Verify the username and try **Refresh** or reconnecting even if the creator is live in your browser.

### Show chat on stream

In **Settings → Browser Source overlay**, click **Copy overlay URL**. Add a **Browser** source in OBS, paste the URL and adjust its dimensions. Configure visible messages and fade duration in Settings.

The overlay runs locally and needs the bridge running. Keep its access URL private. Its capability changes whenever the bridge restarts, so copy the new URL into your Browser Source afterward.

### Automatic updates

Enable **Settings → Automatically update when OBS closes** and save.

1. OBS startup triggers a release check and downloads a newer compatible build.
2. Settings shows download and preparation status.
3. Close OBS and let installation finish before reopening it.
4. The next launch uses the updated build. The version appears beneath the plugin heading.

A release published while OBS is already open is checked on a subsequent startup. Both the package folder and OBS destination must be writable. If updating fails, inspect `.update-status.txt` in the Multi Live Chat installation folder. See [update details](docs/AUTO_UPDATE.md).

Supported updaters follow renames and organization transfers of the **same repository** through its repository ID. A new repository or fork does not automatically become the update source for existing installations.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Dock missing | Confirm the selected OBS installation and supported versions, then check Docks. |
| Dock visibility resets | Use v0.2.2 or later, show the dock once and close OBS normally to save its layout. |
| Connected but no messages | Check that the stream is live, wait for new messages and select All. |
| Only a YouTube handle appears | Metadata may still be loading or unavailable; the reader's original name is the fallback. |
| Media missing | Check network access. Images and animation depend on platform-provided media; not every gift has an animation. |
| Viewer count shows a dash | The count is unavailable or disconnected; it does not mean zero viewers. |
| Update fails | Read Settings / `.update-status.txt` and check folder write permissions. |
| Setup reports an update in progress | Close OBS, wait for the updater to finish and retry Setup. |

### Uninstall

Close OBS, then use **Windows Settings → Apps → Installed apps → Multi Live Chat → Uninstall**. This removes installer-managed application/plugin files, not your drive or the entire OBS installation. Account credentials and shared Qt runtimes are preserved; uninstalling is not a full account-data reset.

## Development

The project contains a C++20/Qt Widgets OBS plugin, a local TypeScript bridge and a Browser Source overlay. Normal installation uses the prebuilt Setup; these tools are only for contributors.

| Folder | Contents |
| --- | --- |
| `native/` | Native dock, media rendering and bridge lifecycle |
| `bridge/` | Platform connectors, local service and tests |
| `overlay/` | Transparent read-only overlay |
| `scripts/` | Build, packaging, installer and updater |
| `docs/` | Technical guides and validation notes |

For a local native build, install Windows C++ build tools, CMake 3.24+, Node.js 22+ and **OBS/Qt SDKs matching the target OBS installation**:

```powershell
./scripts/inspect-environment.ps1
./scripts/build.ps1 -ObsSdkPrefix 'C:/SDK/obs' -QtPrefix 'C:/SDK/Qt/matching/msvc2022_64'
./scripts/package.ps1
```

Local packaging does not bundle Node automatically; release CI separately bundles the runtime and builds Setup. The GitHub Actions workflow compiles and validates release packages before publishing them. See the workflow itself for current versions and checks.

To check the bridge:

```powershell
Set-Location bridge
npm.cmd ci
npm.cmd run build
npm.cmd test
```

Native compilation and automated tests do not guarantee every live stream will connect; real OBS rendering and long-running platform sessions also need testing.

## License / เครดิต

Copyright © 2026 @CrafOps.

This project's original code is licensed under **GPL-3.0-or-later**, with the attribution requirement in [NOTICE](NOTICE), under GPL section 7(b). You may use, modify and fork it. Preserve the original copyright, license notices and **@CrafOps credit** in distributed source and the application's About/credits area; you may add your own credits and identify your modifications. Distribution must also comply with GPL source-code obligations. See [LICENSE](LICENSE).

โค้ดต้นฉบับอนุญาตให้ใช้งาน แก้ไข และ Fork ภายใต้ **GPL-3.0-or-later** พร้อมข้อกำหนดเครดิตใน [NOTICE](NOTICE) ต้องคง copyright, ข้อความ license และเครดิต **@CrafOps** ในซอร์สที่แจกจ่ายและส่วน About/เครดิตของแอป สามารถเพิ่มเครดิตของผู้พัฒนาต่อได้ การแจกจ่ายต้องปฏิบัติตามข้อกำหนดเผยแพร่ซอร์สของ GPL ด้วย

Third-party dependencies retain their own licenses. OBS uses GPL; the optional `tiktok-live-connector` 2.5.0 is AGPL-3.0-only. Its inclusion can impose AGPL obligations on a combined distribution. Upstream TikTok connectivity may use a third-party signing service. Review the included dependency notices when redistributing; the project's license does not override their terms.
