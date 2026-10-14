# Multi Live Chat - website development preview

This is a separate React + TypeScript + Vite website. Tailwind CSS handles the
design; Anime.js handles entrance, scroll and demo animations. It does not change
the deployed Worker, installed OBS plugin or existing mobile links.

## Run in VS Code / เปิดใน VS Code

Open this repository in VS Code, then open a terminal:

```powershell
cd web-dev
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. Save changes in `src/` to see them immediately
through Vite hot reload. Stop the server with Ctrl+C. If port 5173 is already in
use, stop the existing dev server first; this project deliberately uses a fixed
local port. Node.js is needed only on the development machine.

เปิด repo ใน VS Code แล้วรันคำสั่งด้านบน เปิด URL ในเบราว์เซอร์ เมื่อบันทึกไฟล์
เว็บจะอัปเดตทันที กด Ctrl+C เพื่อหยุดเซิร์ฟเวอร์ การรัน dev ไม่ได้ deploy เว็บจริง
และไม่ได้อัปเดตไฟล์ OBS

## Pages

- `/`: project landing page, interactive sample chat/alerts and download links.
- `/docs/installation`: short Thai/English user guides with installation and usage illustrations.
- `/viewer`: read-only mobile viewer preview. Without credentials it shows sample
  data, clearly marked as a demo.

GitHub stars and the latest release name are read from the public GitHub API.
Results are cached locally for 15 minutes. Unavailable statistics show a dash;
the website never invents star counts. The Star button opens the repository;
starring is performed by the user on GitHub.

Sound in the playground is off by default and only plays after an explicit click.
Reduced motion disables scroll effects. Documentation is loaded on demand.

## Optional local relay test

Run the existing Worker in a second terminal from `hosting/` using its documented
local workflow. The Vite `/read` WebSocket proxy targets **127.0.0.1:8787** only.
Create a room in that local Worker and open:

```text
http://127.0.0.1:5173/viewer#ROOM_ID.READ_KEY
```

Use a local test room, not your public sharing key. The viewer removes the key
from the address bar and keeps it in tab session storage; it cannot publish chat,
change OBS settings or reset links. Only heartbeat messages are sent by readers.
The demo does not need the Worker to be running.

## Build / ตรวจ build

```powershell
npm.cmd run build
npm.cmd run preview
```

The output is in `dist/`. **Do not copy it into production yet.** The existing
Worker serves only its current viewer assets. A later reviewed integration must
add landing/docs routes and asset policies while preserving relay endpoints,
private-link behavior and key revocation. No merge or deployment is part of this
preview.

The OBS overlay and alert files remain on the released implementation. They are
not replaced by this development website. OBS auto-update is independent of Vite.

## Credits

Multi Live Chat by @CrafOps. GPL-3.0-or-later; preserve attribution as described in
the repository LICENSE and NOTICE. React, Tailwind CSS, Anime.js and other
dependencies retain their own licenses.

## Source layout

```text
src/
  main/
    app.tsx
    main.tsx
    css.css
    pages/
      Home.tsx
      Docs.tsx
      Viewer.tsx
  components/
    Button.tsx
    Brand.tsx
    Header.tsx
    Footer.tsx
    Eyebrow.tsx
    Chat.tsx
    GuideIllustration.tsx
  utils/
    context.ts
    hooks/
      useProjectInfo.ts
      usePageMotion.ts
  data/
    project.ts
    chat.ts
    guides.ts
```

Website guides are curated in `src/data/guides.ts`, with separate `th` and `en`
content. They do not import the repository's technical Markdown guides.
Illustrations are React/Tailwind diagrams, explicitly labelled as illustrations,
not screenshots. Live viewer/overlay migration remains a later hosting change.
