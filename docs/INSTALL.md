# Windows build and installation

For a build without local development tools, use [GitHub Actions](GITHUB_BUILD.md).
Download the Release artifact after a successful run, keep its bridge and overlay
in a permanent folder, and install its DLL/data and matching Qt WebSockets runtime
as described in that guide. No cloud run has been verified yet.

## Match the OBS ABI first

Run `scripts/inspect-environment.ps1`. It checks the default location and uninstall registry, including Steam installations. For an unregistered portable copy, inspect `obs64.exe` and the Qt6 DLL version properties in its `bin/64bit` folder and pass its path explicitly to the build script. Record the exact OBS release and Qt version. This repository requires OBS 30 or later because `obs_frontend_add_dock_by_id` and `obs_frontend_remove_dock` were introduced in OBS 30.

The inspected machine has OBS **32.2.2** under `C:/Program Files (x86)/Steam/steamapps/common/OBS Studio` and Qt **6.11.1**. Its runtime lacks Qt6WebSockets.dll. Use corresponding SDKs, and deploy that matching runtime module; no version substitute has been validated.

Install Visual Studio 2022 with Desktop development with C++, CMake, and the compatible MSVC Qt SDK including Widgets, Network, and WebSockets. Obtain the exact OBS source release and its documented dependencies. Configure/build/install the OBS SDK with frontend API exports enabled into your SDK prefix. The native CMake project expects the official `OBS::libobs` and `OBS::obs-frontend-api` imported targets. Compiler/runtime and Qt ABI must match OBS, not merely share a major version.

Run `scripts/build.ps1` with those prefixes. Pass `-ObsExecutable` when installed elsewhere. The script detects the executable version but cannot prove that supplied SDKs match it. If Qt WebSockets is not shipped by your OBS installation, supply the DLL from that exact Qt build alongside your plugin in the OBS binary directory, following Qt's deployment rules. Do not overwrite OBS's own Qt DLLs with another version.

## Stage and install

Run `scripts/package.ps1` after a successful Release build. Review third-party license requirements before distributing the staged package. Keep the staged package in a permanent local folder, for example `C:/Tools/obs-unified-chat`. Node.js 22+ must be installed separately.

Close OBS. Copy staged `obs-plugins/64bit/obs-unified-chat.dll` into the OBS installation's `obs-plugins/64bit` directory. Copy staged `data/obs-plugins/obs-unified-chat` into the corresponding OBS data directory. Administrator permission may be needed for Program Files. This project does not modify your OBS installation automatically.

Launch OBS, open the dock, and set Package folder to the permanent staged folder. Set Node executable to your installed `node.exe`. Save settings and click Start bridge. Configure OAuth as described in ACCOUNTS.md, then restart OBS or the bridge when OAuth client parameters change.

Check Help → Log Files → View Current Log for `[unified-chat]`. A load message alone does not prove real chat connectivity; run TESTING.md.

## Uninstall

Close OBS. Remove only `obs-unified-chat.dll` and `data/obs-plugins/obs-unified-chat` from the OBS install. Remove the standalone staged package folder when no longer needed. For a complete reset, remove `%LOCALAPPDATA%/obs-unified-chat` (including encrypted credentials) and the `HKEY_CURRENT_USER/Software/OBSUnifiedChat/NativeDock` settings key. Logout before removal if you want to revoke the Google grant. Do not delete unrelated OBS files or Qt runtime libraries shared by other plugins.
