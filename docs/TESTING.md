# Validation

Run `npm.cmd ci`, `npm.cmd run build`, and `npm.cmd test` in `bridge/`. Tests cover deduplication, late ordering, schema failures, text filtering, buffer limits, repeated-message and burst suppression, money/gift normalization, Windows DPAPI persistence, local service startup, HTTP Origin checks, unauthorized control rejection, read-only overlay permissions and graceful shutdown. They do not simulate successful platform authentication.

Before a production release, record OBS/Qt/MSVC versions and run these manual acceptance checks:

1. Build Debug and Release against the installed OBS SDK. Load the DLL in OBS and confirm one dock registration and a clean OBS log.
2. Resize, hide/show and reopen the dock. Verify Thai/English text, search/filter, paid-event highlighting, scroll behavior and bounded message history.
3. Try missing Node, invalid package path, occupied port, bridge crash, and restart. Confirm clear feedback and bounded retries without UI freezes.
4. Authorize YouTube, deny consent, replay or expire a callback, restart OBS, force token expiry, revoke the grant externally and logout. Confirm encrypted storage and sanitized errors.
5. Start a YouTube broadcast, select it manually, receive messages, send a reply, finish the stream and confirm replies become unavailable. Try a broadcast with disabled chat, no active broadcast, permission denial and quota exhaustion.
6. Connect an actual TikTok creator, observe gifts including streak totals, switch username, stop/start LIVE, disconnect the network, and confirm backoff/offline behavior. Verify no UI calls this login and that replies remain unavailable.
7. Add the copied URL as an OBS Browser Source (e.g. 600×900). Confirm transparency, highlights, fade-out, maximum visible items and custom CSS. Recopy the URL after a bridge restart. Confirm overlay cannot access credentials or issue control commands.
8. Close OBS normally and terminate OBS abruptly. Inspect Task Manager for orphaned Node/PowerShell processes. Confirm Job Object assignment and successful teardown. Repeat load/unload and shutdown under both build configurations.
9. Profile OBS CPU/memory while receiving sustained mixed chat traffic and running the overlay. Compare against OBS without the plugin; do not infer low overhead solely from bounded buffers.

Record results and failures in your release notes. Source compilation or a READY health response does not prove DLL or platform compatibility.
