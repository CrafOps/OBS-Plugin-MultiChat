# Implementation status

| Area | Source implementation | Validation / limitations |
| --- | --- | --- |
| Native plugin | C++20 module, frontend event registration, Qt Widgets dock, CMake | Not compiled or loaded; matching SDK unavailable |
| Bridge lifecycle | QProcess, authenticated socket, retry, startup timeout, Job Object, parent watch, shutdown | Bridge shutdown tested; native process ownership untested |
| Chat engine | Normalized protocol, ordering, dedupe, filters, burst suppression, bounded buffers | Automated tests |
| YouTube OAuth | System browser, random loopback callback, state, PKCE, DPAPI, token refresh | DPAPI tested; real Google consent/refresh untested |
| YouTube LIVE | Channel, active/latest discovery, manual selection, interval-aware polling, paid/member normalization, reply | Source compiled; real live/API/quota tests outstanding |
| TikTok | Optional username connector, chat/gift/like/follow/join, final gift totals, backoff, account switching | Adapter compiled; no actual LIVE session tested |
| TikTok login / reply | Unavailable | Login Kit does not establish requested LIVE permissions; no undocumented sending used |
| Native UI | Accounts/status, plain timeline, badges/timestamps, paid highlights, platform/search filters, autoscroll, clear, reply state, settings | Source only; no screenshot or interaction validation |
| Overlay | Transparent local page, read-only WebSocket, badges, paid highlights, entry/fade animations, bounded visible items | HTTP/security smoke tests; actual OBS Browser Source untested |
| Packaging | Build/package scripts and instructions | Refuses staging without DLL; no compiled release supplied |
| GitHub Actions | Windows runner, matching OBS source SDK build, Qt version gate, WebSockets runtime, bridge tests and artifacts | Workflow/script syntax checked locally; cloud run not executed |

## Partial or deferred requirements

- Native avatar thumbnails and graphic platform icons are not implemented; the dock shows textual platform labels and user badges. This avoids network image downloads in the first native implementation.
- Only the dark theme is available; theme switching and notification preferences are not implemented.
- Overlay layout/custom CSS are customizable by editing `overlay.css` or using OBS Browser Source custom CSS, not a built-in theme editor.
- The dock provides YouTube-only reply input because TikTok has no supported reply method here; it has no redundant platform reply selector.
- Platform filtering is available in the dock. Persistent engine filters are global by event type and blocked words; there is no per-platform event-type settings panel.
- No React/Vite UI is needed for this Qt Widgets implementation. No embedded browser or browser dock substitutes for the native dock.
- Auto discovery is implemented for YouTube and retry for TikTok; connector reconnect behavior still depends on upstream TikTok availability.
- Broadcast discovery does not paginate beyond the returned 50 recent items.
- Fixed default local port; no port configuration in the dock. Startup reports conflicts.
- Node runtime is a separately installed prerequisite. No signed installer or dependency auto-download is supplied.
- Real OAuth, live stream start/end, TikTok availability, OBS dock rendering, ABI compatibility, DLL loading and crash cleanup require manual testing before a production release.
