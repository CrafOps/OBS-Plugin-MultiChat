# Local validation record

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
