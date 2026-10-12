# อัปเดต backend สำหรับ TikTok และ YouTube popout

แพตช์นี้ใช้กับแพ็กเกจที่มีช่อง YouTube LIVE ID/URL แล้ว ไม่ต้องเปลี่ยน DLL หรือ node_modules

1. ปิด OBS
2. แตก `tiktok-popout-backend.zip`
3. คัดลอกโฟลเดอร์ `bridge/dist` จาก ZIP ไปทับ `bridge/dist` ใน **Package folder** ที่ตั้งไว้ใน Dock เช่น `C:/Tools/obs-unified-chat/bridge/dist` อย่านำไปวางในโฟลเดอร์ OBS plugins
4. เปิด OBS ใหม่ ไป Accounts ใส่ TikTok username แล้วกด **Save accounts and connect** รองรับชื่อที่มีหรือไม่มี `@`
5. ดูสถานะ TikTok แล้วเปิดแท็บ Chat และเลือกตัวกรอง All หรือ TikTok

แก้การตรวจชื่อ TikTok ที่มี `@`, แสดง validation error พร้อมชื่อช่องที่ผิด และปิดการดึง gift catalog เพิ่มเติมก่อนเชื่อมต่อ Chat/Gift events ยังรับได้จากข้อมูลในแต่ละ event

ทดสอบกับ `thanaphat_316` โดยใช้ connector ที่แก้แล้ว: เชื่อมต่อสำเร็จและได้รับทั้ง message กับ gift ในการทดสอบเครือข่ายประมาณ 25 วินาที การทดสอบจบตามเวลาที่กำหนด ไม่ใช่เพราะไลฟ์จบ การเชื่อมต่อจากเครื่อง/เครือข่ายอื่นหรือในอนาคตยังขึ้นกับ TikTok และ signing service

YouTube รองรับการวาง `https://www.youtube.com/live_chat?is_popout=1&v=vf8alkN0zXw` และจะดึง video ID จาก `v` ให้อัตโนมัติ **ยังต้องใช้ YouTube API Key เพื่อรวมข้อความใน timeline** แพตช์นี้ไม่ได้ scrape หน้า popout และไม่ได้ฝังหน้าเว็บ YouTube แทน native dock

ถ้าต้องการดูแค่หน้าเว็บ popout เปิด URL ในเบราว์เซอร์ได้โดยไม่ใช้ API Key แต่ข้อความในหน้าเว็บจะไม่ถูกรวมเข้า timeline ของปลั๊กอิน
