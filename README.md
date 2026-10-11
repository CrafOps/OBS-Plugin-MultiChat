# OBS Unified Live Chat

A native Windows x64 OBS dock written in C++20 and Qt Widgets, backed by a local TypeScript process. The dock uses the OBS Frontend API; the transparent overlay is the only Browser Source component. No hosted application backend is required.

**Development build, not a verified production release.** The bridge compiles locally and all ten automated tests pass. The detected Steam installation is OBS 32.2.2 with Qt 6.11.1. The updated DLL has not been compiled locally because this workspace has no detected OBS SDK, Qt SDK, CMake, or C++ compiler. Real YouTube/TikTok stream tests require accounts and live streams. See [feature status](docs/STATUS.md) for specific omissions and [validation record](docs/VALIDATION.md) for actual results.

## Layout

- `native/`: OBS plugin, Qt dock, bridge lifecycle and authenticated control socket.
- `bridge/`: Fastify loopback service, YouTube OAuth/API, optional TikTok connector, event engine and tests.
- `overlay/`: transparent, text-safe, read-only Browser Source UI.
- `scripts/`: environment inspection, Windows build and packaging.
- `docs/`: installation, account setup, security boundaries and test checklist.

## Build

Prefer building on GitHub if you do not want C++ tools installed locally: follow
[the GitHub Actions guide (ภาษาไทย)](docs/GITHUB_BUILD.md). The workflow targets
the detected OBS 32.2.2 / Qt 6.11.1 installation and uploads a package only after
bridge tests, SDK/version checks, and native compilation succeed. It has not yet
been executed on GitHub; this repository currently has no remote configured.

Requires Windows x64, OBS 30+, Visual Studio 2022 C++ tools, CMake 3.24+, Node.js 22+, and **the OBS SDK and Qt 6 SDK matching the installed OBS build**. Node 22 is selected because the optional connector's current dependency tree requires it. Do not substitute a random Qt version.

```powershell
./scripts/inspect-environment.ps1
./scripts/build.ps1 -ObsSdkPrefix 'C:/SDK/obs' -QtPrefix 'C:/SDK/Qt/matching/msvc2022_64'
./scripts/package.ps1
```

Use `-Configuration Debug` for debugging. The package script refuses to package without a compiled DLL. Its `-WithoutTikTok` switch omits the optional AGPL connector. It stages dependencies without bundling a Node runtime. Install Node separately.

The OBS SDK prefix must export `libobsConfig.cmake`, `obs-frontend-apiConfig.cmake`, and their imported `OBS::` targets. Build/install these from the matching OBS source release if your SDK does not provide them. See [installation](docs/INSTALL.md).

## Local bridge checks

```powershell
Set-Location bridge
npm.cmd ci
npm.cmd run build
npm.cmd test
```

For a manual development launch, supply `BRIDGE_TOKEN`, an unpredictable token of at least 32 characters; see `bridge/.env.example`. The native plugin generates a fresh token automatically. Environment example files are not loaded automatically.

## Connect

For read-only YouTube without OAuth login, put a **YouTube Data API key** in
Settings, save and restart OBS. Enter a LIVE video ID or URL in Accounts and
save accounts. This mode selects only that video and disables sending. It still
requires a Google Cloud project with YouTube Data API v3 enabled; see
[account setup](docs/ACCOUNTS.md). Rebuild the DLL to obtain the newly added field.

1. Install the DLL and plugin data after building. Open OBS → Docks → Unified Live Chat.
2. In Settings, set the package folder containing `bridge/` and `overlay/`, and the Node executable. Save and start the bridge.
3. Register a Google **Desktop app** OAuth client, enable YouTube Data API v3, and configure its client ID/secret in Settings. Restart the bridge after changing OAuth client configuration.
4. Click Login with YouTube. Authorization opens in the system browser and returns to an ephemeral loopback callback protected by state and PKCE.
5. For TikTok, enter a creator username and explicitly enable the unofficial connector. This is not account authentication. No TikTok replies are supported.
6. Copy the Browser Source URL from Settings. It includes an event-only capability in its fragment and changes when the bridge restarts; recopy it after restart.

See [account setup](docs/ACCOUNTS.md), [testing](docs/TESTING.md), and [security](docs/SECURITY.md).

## Dependencies and distribution

OBS is GPL software; the pinned optional `tiktok-live-connector` 2.5.0 is AGPL-3.0-only. Its upstream implementation may use a third-party signing service and depends on undocumented TikTok behavior. Local operation is not a promise that TikTok connectivity will remain available or that all upstream signing requests avoid hosted services. Review upstream terms, licenses, and your use case before distribution. The connector is disabled by default and can be omitted.

API references used for implementation:

- [OBS Frontend API](https://docs.obsproject.com/reference-frontend-api)
- [Google desktop OAuth with PKCE](https://developers.google.com/identity/protocols/oauth2/native-app)
- [YouTube live chat list](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list)
- [YouTube authorized chat insert](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/insert)
- [TikTok Login Kit overview](https://developers.tiktok.com/doc/login-kit-overview/)
- [TikTok connector source](https://github.com/zerodytrash/TikTok-Live-Connector)
