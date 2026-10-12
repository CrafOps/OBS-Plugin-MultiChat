# YouTube แบบไม่ใส่ API Key

โหมดใหม่ใช้ `youtube-chat-next` 3.1.0 อ่านข้อมูลแชตสาธารณะที่เว็บ YouTube ใช้ ไม่มีการล็อกอิน, OAuth, Google Cloud project หรือ API Key ที่ผู้ใช้ต้องสร้าง/กรอก ไม่มีการส่งข้อความ และไม่มีการนำ session cookie ของบัญชีผู้ใช้มาใช้

เป็นตัวอ่านแบบ **ไม่เป็นทางการ** ที่ใช้ web endpoints ของ YouTube ไม่ใช่ YouTube Data API มีความเสี่ยงหยุดทำงานเมื่อรูปแบบหน้าเว็บเปลี่ยน หรือถูกจำกัดเครือข่าย จึงไม่รับประกันการเชื่อมต่อทุกไลฟ์

## ติดตั้งแพ็กเกจอัปเดต

1. ปิด OBS
2. แตก `youtube-no-key-backend.zip`
3. คัดลอกโฟลเดอร์ `bridge` ใน ZIP ไปทับ `bridge` ใน **Package folder** ที่ Dock ตั้งไว้ ต้องคัดลอก `node_modules` ด้วย เพราะเวอร์ชันนี้เพิ่มไลบรารีใหม่
4. เปิด OBS ใน Settings ล้างช่อง **YouTube API Key** ถ้าเคยใส่ไว้ แล้ว Save และปิด/เปิด OBS อีกครั้ง
5. ไป Accounts ใส่ Live ID หรือ URL ในช่อง YouTube LIVE ID/URL แล้วกด **Save accounts and connect**
6. เปิด Chat เลือก All เพื่อดูรวมกับ TikTok

รองรับ ID, watch URL, `/live/` URL, `youtu.be` และ popout URL เช่น `https://www.youtube.com/live_chat?is_popout=1&v=VIDEO_ID` ต้องเป็นไลฟ์ที่กำลังถ่ายทอดและมีแชตสาธารณะ ไม่ใช่ replay

DLL รุ่นก่อนอาจยังมีข้อความใต้ช่องว่าต้องใช้ API Key แต่ backend ที่อัปเดตแล้วไม่ต้องใช้ Key เมื่อช่อง Key ว่าง หากต้องการเปลี่ยนข้อความใน UI ด้วย ให้ build DLL จากซอร์สใหม่ผ่าน GitHub Actions

ทดสอบเครือข่ายจริงกับไลฟ์ที่ channel handle `@LofiGirl` เลือกอยู่: ตัวอ่านเริ่มได้และได้รับข้อความแชตโดยไม่ส่ง API Key/OAuth ที่ผู้ใช้สร้าง ID `vf8alkN0zXw` ที่ผู้ใช้ให้มาได้สถานะหน้าเว็บว่าไลฟ์จบแล้วในการทดสอบ จึงไม่ใช้เป็นหลักฐานว่า reader ใช้งานไม่ได้กับไลฟ์ที่กำลังถ่ายทอด

ดูต้นทาง: https://github.com/LucasSantana-Dev/youtube-chat-next
