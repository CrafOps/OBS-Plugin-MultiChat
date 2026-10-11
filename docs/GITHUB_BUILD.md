# Build บน GitHub โดยไม่ลงเครื่องมือ C++ บนเครื่องคุณ

ไฟล์ `.github/workflows/windows-build.yml` ให้ GitHub build บน Windows runner แล้วแนบแพ็กเกจไว้ให้ดาวน์โหลด เครื่องคุณไม่ต้องติดตั้ง Visual Studio, CMake หรือ Qt SDK แต่ยังต้องมี OBS และ Node.js 22+ สำหรับใช้งานจริง

## วิธีเริ่ม

1. สร้าง repository บน GitHub หรือใช้ repository ที่คุณมีอยู่
2. อัปโหลดไฟล์โปรเจกต์ทั้งหมดตามโครงสร้างเดิม รวม `.github/workflows/windows-build.yml`, `native/`, `scripts/`, `bridge/package-lock.json`, `bridge/src/`, `overlay/`, `docs/` และ README อย่าอัปโหลด `node_modules/`, `build/`, `.ci/`, `.env` หรือข้อมูลบัญชี
3. ให้ workflow อยู่บน default branch เช่น `main` จากนั้นเปิดแท็บ **Actions** หาก GitHub ขอเปิดใช้งาน Actions ให้เปิดก่อน
4. เลือก **Build Windows plugin** → **Run workflow** เลือก **Release** ส่วน `include_tiktok` ให้เปิดไว้ถ้าต้องการ TikTok แล้วกด Run workflow
5. เมื่อการรันสำเร็จ เปิดหน้าการรัน แล้วดาวน์โหลด artifact ชื่อ `obs-unified-chat-obs32.2.2-qt6.11.1-windows-x64-Release` จากส่วน **Artifacts** ไฟล์ดาวน์โหลดเป็น ZIP

Workflow จะรันอัตโนมัติเมื่อ push เข้า `main`/`master` และเมื่อมี pull request ด้วย ไม่ต้องตั้ง Google OAuth secrets บน GitHub; ใส่ข้อมูล OAuth ใน Dock หลังติดตั้งเท่านั้น

## แพ็กเกจที่ดาวน์โหลด

```text
obs-plugins/64bit/obs-unified-chat.dll
data/obs-plugins/obs-unified-chat/
bin/64bit/Qt6WebSockets.dll
bridge/dist/
bridge/node_modules/
overlay/
docs/
licenses/
README.md
build-info.json
```

1. แตก ZIP ไว้ในโฟลเดอร์ถาวร เช่น `C:/Tools/obs-unified-chat`
2. ปิด OBS ก่อนคัดลอกไฟล์
3. คัดลอก `.dll` จาก `obs-plugins/64bit` ไปยังโฟลเดอร์ชื่อเดียวกันใน OBS
4. คัดลอกโฟลเดอร์ข้อมูลปลั๊กอินจาก `data/obs-plugins/obs-unified-chat` ไปยังตำแหน่งเดียวกันใน OBS
5. คัดลอก **เฉพาะ** `Qt6WebSockets.dll` จาก `bin/64bit` ไปยัง `bin/64bit` ของ OBS เมื่อยังไม่มี DLL นี้ ถ้ามีอยู่แล้ว ให้ตรวจว่าเวอร์ชันตรงกับ Qt ของ OBS ก่อน ห้ามนำ QtCore/QtGui/QtWidgets เวอร์ชันอื่นมาทับของ OBS
6. เปิด OBS → Docks → Unified Live Chat ตั้ง **Package folder** เป็นโฟลเดอร์ที่แตก ZIP และ **Node executable** เป็น `C:/Program Files/nodejs/node.exe` จากนั้น Save และ Start bridge
7. ตั้งค่า YouTube OAuth และ TikTok ตาม ACCOUNTS.md แล้วทดสอบกับไลฟ์จริง

OBS ที่ตรวจพบในเครื่องนี้อยู่ที่ `C:/Program Files (x86)/Steam/steamapps/common/OBS Studio` และรายงานเวอร์ชัน OBS **32.2.2 / Qt 6.11.1** แพ็กเกจนี้ตั้งเป้าเฉพาะเวอร์ชันดังกล่าว หาก Steam อัปเดต OBS/Qt ให้ตรวจเวอร์ชันใหม่ก่อนใช้แพ็กเกจเดิม

## สิ่งที่ workflow ทำ

- ติดตั้ง Node ใน runner, build TypeScript และรันทดสอบ bridge รวม DPAPI และ WebSocket
- Checkout tag OBS `32.2.2` จาก repository ทางการ แล้วใช้ preset ของ OBS ดาวน์โหลด dependencies พร้อมตรวจ SHA256 ตาม manifest ของ release
- Build เฉพาะ libobs และ obs-frontend-api เพื่อสร้าง SDK สำหรับปลั๊กอิน
- ตรวจ Qt runtime ว่าเป็น `6.11.1` ถ้าไม่ตรงจะหยุดโดยไม่สร้าง artifact
- ถ้า SDK ของ OBS ไม่มี WebSockets จะ build โมดูลจาก tag `v6.11.1` ใน repository ทางการของ Qt
- Build DLL และแนบ backend, runtime WebSockets, เอกสาร และข้อมูล build

อ้างอิง: [OBS release preset](https://github.com/obsproject/obs-studio/blob/32.2.2/CMakePresets.json), [OBS dependency verification](https://github.com/obsproject/obs-studio/blob/32.2.2/cmake/common/buildspec_common.cmake), [Qt WebSockets source](https://github.com/qt/qtwebsockets)

## ถ้า build ไม่ผ่าน

ดู step สีแดงใน Actions และดาวน์โหลด `windows-build-diagnostics` ถ้ามี ระบบจะไม่แนบแพ็กเกจเมื่อ build/test/ตรวจเวอร์ชันไม่ผ่าน สาเหตุอาจเป็น dependency ดาวน์โหลดไม่ได้, compiler บน runner เปลี่ยน, SDK ไม่ตรง หรือข้อผิดพลาด C++ ที่ยังไม่เคยคอมไพล์จริง

**สถานะปัจจุบัน:** เพิ่ม workflow และตรวจ syntax ในเครื่องแล้ว แต่ยังไม่มี repository remote ให้สั่งรัน GitHub Actions และยังไม่ได้ยืนยันว่าการ build บน runner ผ่าน การ build สำเร็จในอนาคตก็ยังต้องทดสอบ DLL loading, UI และ LIVE จริงตาม TESTING.md ค่า `testedInObs` ใน `build-info.json` จึงยังเป็น `false`

Debug artifact ใช้สำหรับ developer เท่านั้นและต้องใช้ Debug Qt runtime ที่ตรงกัน อย่านำ Debug DLL ไปติดตั้งกับ OBS Release ปกติ เลือก Release สำหรับการใช้งานทั่วไป

แพ็กเกจใช้ Node runtime ที่ติดตั้งแยก ส่วนตัวเชื่อมต่อ TikTok เป็น optional และไม่เป็นทางการ การรวมมันไว้ในแพ็กเกจไม่ได้ยืนยันว่า TikTok LIVE จะเชื่อมต่อได้ทุกครั้ง
