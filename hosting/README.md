# Multi Live Chat — Cloudflare hosting

**Target: https://docks.54621325.xyz**

This package runs entirely on **Cloudflare Workers + SQLite Durable Objects**.
The mobile website is served by the same Worker through static assets. It does
not require a VPS, Docker, cloudflared or an always-on owner PC. Static Pages
alone cannot provide the room's live WebSocket relay; using one Worker keeps
both the website and relay on the requested hostname.

## ภาษาไทย: ขึ้นโฮสต์ก่อนเชื่อม OBS

### สิ่งที่ต้องมี

- บัญชี Cloudflare ที่ดูแล zone `54621325.xyz`
- Node.js 22+ สำหรับการ deploy ของเจ้าของโปรเจกต์ครั้งนี้
- แพ็กเกจนี้หรือ workspace ปัจจุบัน โดยยังไม่จำเป็นต้อง push GitHub

เครื่องผู้ใช้ OBS และมือถือไม่ต้องลง Wrangler หรือ cloudflared เครื่องเจ้าของ
ก็ไม่ต้องเปิดไว้หลัง deploy เสร็จ เพราะบริการทำงานบน Cloudflare แล้ว

### วิธี deploy

1. แตก ZIP โดยเก็บโครงสร้างโฟลเดอร์ไว้ครบ แล้วเปิด terminal ใน `hosting/`
2. ติดตั้ง dependency ตาม lockfile และตรวจแพ็กเกจ:

   ```powershell
   npm.cmd ci
   npm.cmd run types
   npm.cmd run check
   npm.cmd run build
   ```

   คำสั่ง build เป็น dry-run ยังไม่เผยแพร่เว็บ

3. ล็อกอิน Cloudflare ผ่าน browser ของเจ้าของบัญชี:

   ```powershell
   npx.cmd wrangler login
   npx.cmd wrangler whoami
   ```

4. เมื่อตรวจบัญชีถูกต้องแล้ว deploy:

   ```powershell
   npm.cmd run deploy
   ```

5. `wrangler.jsonc` ตั้ง Custom Domain เป็น `docks.54621325.xyz` และสร้าง
   binding/migration ของ Durable Objects ให้แล้ว ตรวจผลใน Workers & Pages
6. เปิด `https://docks.54621325.xyz/health` ต้องตอบ status `ok`
7. เปิด `https://docks.54621325.xyz/viewer` จะเห็นหน้าแชทที่ขอลิงก์ส่วนตัว

หากมีหลายบัญชี ให้ระบุ account_id ที่ถูกต้องใน wrangler.jsonc ก่อน deploy
อย่าเผยแพร่ API token หรือคีย์ห้องไว้ในซอร์ส เว็บไม่มีคีย์ของผู้ใช้ฝังมาด้วย
บริการใช้ quota ของบัญชี Cloudflare; เริ่มตรวจการใช้งานก่อนเปิดให้คนจำนวนมาก

**ยังไม่เชื่อมปุ่มแชร์เข้า OBS ในขั้นนี้** จึงไม่มีลิงก์ผู้ใช้จริงจาก Dock จนกว่า
จะทำขั้นถัดไป หน้าเปล่าที่ขอลิงก์ส่วนตัวหลัง deploy เป็นพฤติกรรมที่ถูกต้อง

### หลักการคีย์และสิทธิ์

- เจ้าของ OBS ต้องเลือกเปิดแชร์และยอมรับคำอธิบายข้อมูลที่จะส่งก่อนสร้างห้อง
- แยกคีย์ส่งข้อมูลกับคีย์อ่าน มือถือได้เฉพาะคีย์อ่าน
- คีย์คงเดิมจนกด Reset เอง ข้อมูล hash ของคีย์อยู่ใน Durable Object storage
- Reset แล้วลิงก์เก่าหมดสิทธิ์ทันที รวมถึงมือถือที่เชื่อมอยู่
- ไม่ส่งบัญชี รหัสผ่าน cookies โทเคนควบคุม หรือ OBS Settings ไปหน้าอ่าน
- หยุดแชร์หรือปิด OBS แล้วล้างแชทในหน่วยความจำและแสดงออฟไลน์
- ไม่มีการเก็บข้อความแชทถาวร อาจไม่มีประวัติย้อนหลังหลังห้องพักหรือรีสตาร์ต

## English: deploy

Keep the ZIP folder structure. From `hosting/`, use Node 22+ and run:

```sh
npm ci
npm run types
npm run check
npm run build
npx wrangler login
npx wrangler whoami
npm run deploy
```

`build` is a dry run; `deploy` publishes. Configuration includes the custom domain,
static assets, the `CHAT_ROOMS` SQLite Durable Object migration and a room-creation
rate limiter. No VPS, Tunnel or Git push is needed. If multiple Cloudflare accounts
are available, set the correct account_id. Verify `/health` and `/viewer` afterward.
The owner's Cloudflare account quotas apply; this is not unlimited free hosting.

The Worker compatibility date is pinned to **2026-10-06**, matching the locally
validated runtime. Keep the Worker name, `ChatRoom` class and migration history
stable when updating: replacing the room namespace would invalidate existing links.

## Desktop protocol for the next implementation phase

| Action | Endpoint / format |
| --- | --- |
| Create room after consent | `POST /rooms` → `{ id, readKey, writeKey }` |
| Mobile URL | `/viewer#ROOM_ID.READ_KEY` |
| Publish socket | `/publish?room=ROOM_ID`, subprotocols `chat`, `WRITE_KEY` |
| Read socket | `/read?room=ROOM_ID`, subprotocols `chat`, `READ_KEY` |
| Reset read key | `POST /rooms/ROOM_ID/reset`, `Authorization: Bearer WRITE_KEY` |
| Heartbeat | Text `ping` → automatic `pong` |

Keys are not placed in query strings. The link fragment is removed from the
visible address after the page reads it. Authenticate during the WebSocket
handshake using the subprotocol header; the response selects `chat`. Browser
readers must use the configured same origin; publishers do not send an Origin.
Readers cannot publish packets or send control commands.

Publisher packets are limited to `event`, `profile`, `combo` and `clear`, with
schema validation stripping unrelated data. Per room: one publisher, 16 readers,
a best-effort memory cache of 100 messages, 32 KiB maximum accepted data packet
and 100 accepted publisher packets per second. Creating rooms is limited to
5 requests per minute per IP at Cloudflare's rate limiter. This limiter is not
a strict global quota. Hibernation avoids keeping idle rooms actively executing.
Chat history is never written to durable storage; only key hashes/room identity
and connection metadata persist. No analytics or sound playback is in the viewer.
Images load from HTTPS platform URLs and may contact those image hosts.

## Local validation

From `hosting/`, start `npm run dev`. In a second terminal run:

```sh
node test-relay.mjs
```

After stopping and restarting the dev server, run:

```sh
node test-relay.mjs --resume
```

This verifies assets/security headers, distinct read/write permissions, packet
projection, reset revocation, command rejection, disconnect clearing and persisted
keys across a restart. Test keys are saved only under the ignored `build/` folder.
The local config is generated separately so production origin checks remain strict.

## License and references

Original project code: repository LICENSE and NOTICE, including @CrafOps credit.
Provide a privacy notice before enabling sharing for users. A link grants reading
access to anyone holding it; stop-sharing and Reset must be available in the Dock.

- [Worker static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Durable Object WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Rate limiter](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
