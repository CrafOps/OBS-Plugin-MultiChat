# Multi Live Chat by @CrafOps

The dock shows current viewers for each platform. YouTube public page metadata refreshes every 30 seconds; TikTok uses live room statistics (`total`, not cumulative `totalUser`). A dash means unavailable or disconnected, not zero. Counts may differ briefly from the platform's own interface.

YouTube chat names use public channel metadata to show `Display name (@handle)` in the native dock and overlay. Chat appears immediately; completed lookups update existing messages in both views. Lookups are cached, queued for up to 128 distinct authors, limited to two concurrent requests and have a five-second timeout. YouTube redirects are followed only within HTTPS YouTube hosts. Unavailable names retry on a later message after a short cache period. If YouTube restricts metadata or the queue is full, chat still appears with the name supplied by the chat reader. This applies to public read-only and optional API/OAuth modes. No API key or login is required in public mode.

## Install this version once

The easiest method is **Multi-Live-Chat-Setup.exe** from the latest Release. Close OBS, run Setup, confirm the detected OBS installation folder, and install. Setup bundles a portable Node runtime and configures Package folder, Node executable, Start with OBS and automatic updates. No separate Node installation or manual copying is required. Setup supports OBS 32.2.2 / Qt 6.11.1 and checks both versions before installing. OBS settings, platform accounts and chat credentials are preserved. If Windows protects the OBS installation, run Setup as administrator under the same Windows account; future background updates still require write access.

To uninstall, close OBS and use Windows Installed apps → Multi Live Chat. Shared Qt runtimes and account credentials are preserved. Setup files are currently unsigned.

The ZIP method below remains available for manual installation:

1. Close OBS and download the ZIP from this repository's latest GitHub Release.
2. Extract into a permanent folder where your Windows account can write. Keep the complete package, including `build-info.json` and `scripts/auto-update.ps1`.
3. Copy `obs-plugins` and `bin` from the package into the OBS installation as for earlier versions. These folders contain the plugin and its additional Qt runtimes only.
4. Open OBS. In Multi Live Chat Settings, choose that extracted folder as **Package folder**. Leave **Automatically update when OBS closes** enabled and save. Restart OBS once if you changed the folder.

On each OBS startup the detached Windows helper checks GitHub Releases, downloads a newer compatible package, verifies its SHA-256 checksum, and waits for OBS to close. It installs the new plugin, bridge, overlay and supplied runtimes so the next normal OBS launch uses the new build. You do not need to build or copy subsequent versions manually. Updates are not installed into a running OBS process. Wait for the helper to finish after closing OBS before opening it again; Settings displays download/preparation status while OBS is open.

The extracted package and OBS destination folders must be writable by your Windows account. A protected Program Files installation may require an administrator to grant access or perform the update. The helper does not silently elevate privileges. Network failures, incompatible OBS/Qt versions and permissions problems leave a status message in `.update-status.txt` in the package folder. Ordinary chat remains available if an update check fails.

The updater accepts Release builds for Windows x64 only, requires exact OBS and Qt version matches, validates archive paths and limits, refuses linked destination paths, and replaces only the plugin's known DLLs within OBS. Existing files are backed up and restored if installation fails. GitHub Releases and HTTPS are the trust source; the checksum detects corruption, not a compromised release publisher. Keep the package folder under your own account's control. Settings and credentials are stored separately and are preserved.

The build workflow publishes permanent ZIP and update-manifest assets only after bridge tests, native compilation and native UI/media checks pass on pushes to master. Debug builds and pull requests do not publish automatic updates. Actual OBS rendering and long-running live connections still need user validation.

## Repository renames and organization transfers

Install the migration-ready release before renaming or transferring this repository. Allow the current updater to download it at OBS startup, close OBS to apply it, and reopen OBS. The installed `build-info.json` reports `updaterSupportsRepositoryMoves: true` once ready.

The new updater pins repository ID `1414781362`, resolves its current owner/name through GitHub, and validates Release asset links against that resolved name. If the ID endpoint is unavailable, the original name endpoint and GitHub redirects are used, with the same required ID check. A different repository reusing the old name is rejected. Release manifests also carry the repository ID. Installer website links follow the build's current repository name.

Renaming or transferring the same repository preserves this identity. Keep the repository public for anonymous update downloads and allow the build workflow to publish Releases under the new organization's Actions policy. Creating a new repository or a fork creates a different identity and requires an intentional update-source migration. Already installed versions that predate this support must upgrade before the move; after the move those older versions may need the new Setup once.
