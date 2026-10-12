# Local validation record

## Public YouTube reader without supplied keys

Added `youtube-chat-next` 3.1.0 with a pinned dependency and updated lockfile.
Its public reader connected using the `@LofiGirl` handle, selected video
`1-LpQekNa9g`, and received chat messages without user API credentials.
The supplied video `vf8alkN0zXw` returned an ended-event reason from YouTube's
public watch-page player response. No login, password, account cookies or CAPTCHA
bypass was used. Public reader tests cover text/emoji/badges, formatted paid
amounts, read-only status, switching, shutdown and stale event suppression.

## TikTok connection / popout input fix

The bridge builds and all twelve automated tests pass. Input tests now cover
@handle normalization, field-specific validation feedback, and popout URLs.
A bounded public LIVE probe against `thanaphat_316` connected successfully and
received message and gift events with optional gift catalog fetching disabled.
No passwords or user session cookies were supplied. The probe was stopped after
approximately 25 seconds. This is connector/backend validation, not native Dock
rendering validation. See BACKEND_UPDATE.md for installing this backend-only patch.

## YouTube read-only LIVE ID addition

The updated bridge builds and all ten tests pass. Four additional tests cover
YouTube ID/URL parsing, malformed/foreign URL rejection, completed/scheduled video
handling, and blocking replies even when a selected chat and apparent reply
permission exist. Manual selection uses API-key authentication without OAuth.
No real Google API-key request or LIVE chat has been tested. The user supplied a
successful first GitHub build screenshot, but a new native build is required for
the read-only fields added afterward.

Validated in the supplied Windows workspace on 2026-10-12 (Asia/Bangkok).

- Node.js: v22.23.3; npm: 10.9.9.
- `npm install`: dependencies installed and a lockfile generated; external registry access needed the sandbox network override. Subsequent reproducible builds use `npm ci`.
- `npm run build`: strict TypeScript compilation passed.
- `npm test`: all six tests passed, no skips. The server smoke test needed loopback access outside the network-restricted sandbox.
- DPAPI test encrypted and recovered a test credential under the Windows user and confirmed plaintext was absent from the ciphertext file.
- Server smoke test checked HTTP health, foreign-Origin rejection, overlay CSP, unauthenticated control rejection, authenticated native control and overlay, limited overlay settings, failed unauthorized reply, overlay command rejection, and graceful process exit.
- TikTok runtime package loaded and its EventEmitter and disconnect methods were confirmed without connecting to a creator. Tests include the installed package's v3 event field shape.
- Environment inspection found no CMake or MSVC compiler on PATH. No Qt SDK or Visual Studio installer was found in conventional-path checks.
- Registry inspection found OBS installed through Steam at `C:/Program Files (x86)/Steam/steamapps/common/OBS Studio`. Its executable reports **OBS 32.2.2**, and its bundled Qt DLLs report **6.11.1.0**. No Qt6WebSockets.dll was present in that runtime folder. Native builds should target this installation with matching SDKs and supply its matching Qt WebSockets runtime.
- Native DLL build, OBS load, Qt rendering, YouTube consent/API calls and TikTok LIVE connectivity: **not tested**.

These results validate the local bridge and source checks only. They do not establish production readiness or an installable binary.

## GitHub Actions addition

- Added `windows-build.yml` and `scripts/build-ci.ps1` for remote Windows builds targeting OBS 32.2.2 / Qt 6.11.1.
- Workflow YAML parsed without duplicate keys or syntax errors; checked manual Release default, read-only repository permission, matching OBS checkout tag, and artifact failure behavior.
- All PowerShell scripts and inline workflow run blocks passed PowerShell AST syntax parsing.
- CI preserves OBS dependency prefixes needed by installed SDK exports, checks Qt version, and stages the WebSockets runtime separately from OBS's existing Qt modules.
- No Git remote is configured, so no Actions run, native cloud compilation, or downloadable artifact has been verified. Existing bridge test results are unchanged by this workflow-only addition.

Integrated no-key YouTubeConnector/ChatEngine probe: 62 normalized messages from 1-LpQekNa9g in 15 seconds with no API key or OAuth credentials. Strict build and all fourteen tests passed.
