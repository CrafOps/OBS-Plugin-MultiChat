# Alerts and mobile sharing — validation status

The implementation targets version 0.3.0. The owner deployed the Cloudflare
Worker at https://docks.54621325.xyz. No production release is authorized.

## Implemented

- Gift/follow animation queue, custom/default sounds and OBS audio routing.
- Live combo indicators, completion-only gift alerts and readable checkboxes.
- Responsive read-only mobile viewer with profiles, emojis and gift images.
- Explicit sharing consent, separate startup opt-in, persistent encrypted keys,
  manual reset, private link/QR, bounded buffering and reconnect handling.
- Cloudflare Worker and hibernating Durable Object relay with capability keys,
  reader/publisher separation, revocation and transient bounded history.
- Bilingual installation and feature instructions in ALERTS_MOBILE.md.

## Verified locally

Bridge build and 27 tests passed. Worker typecheck, dry-run build and relay
protocol checks passed. The deployed host delivered a synthetic chat message and
revoked an existing reader after reset. Headless Chrome checks passed for gift
and follow queuing, distinct default sounds, custom WAV playback, muted audio,
mobile layout at 390px and transparent alert background. Preview images were
visually inspected. OBS 32 API names were checked against official headers.

## Pending

Native DLL compilation and the complete Dock Settings smoke test require the
Windows CI SDK. Browser Source audio routing still needs an actual OBS live
check; browser audio tests do not prove the final stream mix.

The owner explicitly authorized pushing a test branch and opening a Draft PR
for CI only. Do not merge into master or publish a Release under this approval.
