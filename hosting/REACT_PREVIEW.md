# React website and relay preview

This preview runs in your computer. It does not deploy or replace the live site.

## Run

From the repository root, prepare the website dependencies once:

```powershell
cd web-dev
npm.cmd ci
cd ../hosting
npm.cmd ci
npm.cmd run dev:react
```

Open **http://localhost:8788**. This serves the compiled React site and a local
Durable Object relay together. The Worker uses a separate preview name. Stop it
with Ctrl+C. After editing frontend files, restart this command to rebuild.

For immediate hot reload, continue using `web-dev` and `npm.cmd run dev` on port
5173. The Cloudflare preview is for testing the combined built website and relay.

## Paths

- `/`: project homepage.
- `/docs/installation`: short TH/EN guides.
- `/releases`: official download links and recent GitHub releases.
- `/viewer`: sample chat when no private link is supplied.
- `/viewer#ROOM_ID.READ_KEY`: read-only chat for a local test room.
- `/overlay?demo=1`: transparent overlay sample, with no navbar or footer.
- `/overlay#ROOM_ID.READ_KEY`: transparent chat for the same local test room.
- `/overlay?limit=6#ROOM_ID.READ_KEY`: limit the overlay to 6 cards (1-30).

Use local test rooms only. Do not paste production sharing keys into development
fixtures. The read key is removed from the address bar after opening and stored
only for the tab. Reset revokes existing readers and clears both viewer/overlay.
The overlay is silent; TikTok alert audio still uses the installed OBS plugin.

## Compatibility

`wrangler.jsonc` uses `WEB_FRONTEND=react` for the approved production website.
The ordinary local `dev` command retains the legacy viewer for regression checks. The React preview uses an
ignored generated configuration with `WEB_FRONTEND=react` and separate assets.
Existing publisher/reader endpoints, keys and reset behavior are unchanged.
`/viewer.html` redirects to `/viewer` in the React preview for older direct links.
Production viewer tab storage remains compatible with the original viewer.

Production deployment uses `npm.cmd run deploy`; preview commands remain local.
Website deployment does not merge master or publish an OBS installer.

