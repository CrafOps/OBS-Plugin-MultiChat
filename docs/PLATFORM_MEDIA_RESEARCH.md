# Research: YouTube member emojis and TikTok gift images

Checked 18 October 2026 against this repository's adapters, the installed `tiktok-live-connector` 2.5.0 / `tiktok-live-proto` 0.2.4 type declarations, and upstream documentation. This note records the available data paths; it does not change application code.

## YouTube channel-member emojis

- **The no-key/public mode receives channel custom emoji names from the public chat reader.** `youtube-chat-next` represents chat messages as text and emoji items. Emoji items include `url`, `alt`, `emojiText`, and `isCustomEmoji`. The current normalizer renders custom emoji as `:name:` text, while regular emoji can still use the supplied image URL. This avoids a missing-image icon and keeps the custom emoji name visible. The exact name depends on what YouTube and the parser provide. [youtube-chat-next item types](https://github.com/LucasSantana-Dev/youtube-chat-next#types)
- **The official YouTube Data API does not provide custom-emoji image URLs in its live-chat message schema.** It exposes `snippet.displayMessage` as a string and `textMessageDetails.messageText` as text. This project's API adapter reads `displayMessage`, so it cannot recreate a custom emoji image from that response. Google also explicitly says the Super Sticker image URL is unavailable through the API, despite exposing sticker identifiers and alt text. [LiveChatMessages resource](https://developers.google.com/youtube/v3/live/docs/liveChatMessages)
- **Practical answer:** use the no-key public reader for channel-member emoji names. They display as `:name:` in chat. The official API route does not provide the custom emoji URL or name as a separate image part.

## TikTok gift PNG/GIF

- **The connector's decoded event schema includes inline gift images.** The installed `tiktok-live-proto` v3 declaration describes `WebcastGiftMessage.gift` as a `Gift`, whose `image`, `icon`, and `previewImage` fields are `ImageModel`s. `ImageModel` contains `urlList` and an `isAnimated` flag. The current adapter already checks `data.gift.image.urlList[0]`, then `icon` and `previewImage`, so it matches these inline image fields even though `enableExtendedGiftInfo` is false. [TikTok-Live-Connector source and types](https://github.com/zerodytrash/TikTok-Live-Connector) [installed tiktok-live-proto 0.2.4 types](https://www.npmjs.com/package/tiktok-live-proto/v/0.2.4)
- **`enableExtendedGiftInfo` is optional enrichment, not the only possible image source.** The connector README says it fetches the room gift catalog and adds `extendedGiftInfo` with name, cost, and image data. This project turns that fetch off to avoid adding a catalog request to connection startup; an inline `gift.image` may still be present in an event. A real LIVE event is needed to confirm the fields returned for a particular gift. [Connector option](https://github.com/zerodytrash/TikTok-Live-Connector#params-and-options) [Gift event](https://github.com/zerodytrash/TikTok-Live-Connector#gift)
- **An image URL does not guarantee an animated gift.** The upstream schema exposes `isAnimated`, but the adapter currently discards that flag and keeps only the first URL. A static PNG remains static. A supplied GIF/WebP can animate if the image decoder supports its format; this project's Qt renderer supports GIF/WebP when the corresponding Qt codec is installed. The gift icon/image is not the same thing as TikTok's full-screen gift effect.
- **Good next improvement:** preserve `isAnimated` and inspect candidate URLs or response image format rather than assuming the first URL is best. Keep the GIF optional: when TikTok gives only PNG, show that icon; when it gives an animated supported asset, let the existing renderer play it. If missing gifts are reported, capture a real decoded event first; the current adapter unit fixture only proves the synthetic shape used in that test.

## Relevant local code

- `bridge/src/platforms/youtube-public.ts`: public emoji URL normalization.
- `bridge/src/platforms/youtube.ts`: official API `displayMessage` normalization.
- `bridge/src/platforms/tiktok.ts`: inline gift image URL selection and disabled catalog enrichment.
- `bridge/src/test/media.test.ts`: synthetic TikTok and YouTube media fixtures.
- `native/src/dock/chat-delegate.cpp` and `docs/MEDIA_UPDATE.md`: image rendering and Qt animation behavior.

This is a code/schema comparison, not a live-platform capture. No actual member emoji or TikTok gift event was observed during this research.

