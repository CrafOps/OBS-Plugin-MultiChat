# Profiles, image emojis and gifts

The status indicators are now single-line colored platform names. Hover for
connection details; narrow docks no longer wrap "connected" onto another line.

YouTube message parts retain emoji image URLs, author profile URLs and paid
stickers. TikTok retains author avatar thumbnails, inline emotes and available
gift images. The native delegate renders these alongside safe text. Plain
Unicode emojis continue to use the system font fallback.

The loader downloads HTTPS assets only from platform CDN domains, with no user
cookies, no redirects and no embedded HTML. Four requests may be active; the
queue is bounded to 64, each response to 2 MB, static cache to 16 MB/256 entries,
and animated assets to eight. Static image decoding runs in worker threads.
Animated GIF/WebP is played with QMovie when the codec supports it. Hidden or
offscreen assets pause; animated redraws are throttled to at most 12.5 per second.
Failed profiles keep initials. Some gifts supply only a static icon; this update
does not fabricate GIFs or play full-screen video gift effects.

## Install the new Release artifact

Close OBS. Update both the native DLL and the package's `bridge` and `overlay`
folders. From artifact `bin/64bit`, copy **Qt6Concurrent.dll** (and WebSockets if
missing) into OBS's `bin/64bit`. Also merge the artifact's `imageformats` and `tls`
subfolders into that OBS directory, keeping all copied codecs from the same Qt
6.11.1 build. Do not replace OBS's Qt6Core/Gui/Widgets/Network with another version.
No API keys or OAuth are required for the public chat reader.

Tests: strict bridge build and seventeen Node tests pass, including media URL
validation and profile/emote/gift normalization. The CI now also compiles/runs a
native check for URL restrictions, GIF decoding and wrapped-card sizing before
packaging. Native image rendering and animations still require testing in OBS
after that build. Verify real profile URLs, custom emojis, gifts, narrow docks,
scrolling, image failures and OBS shutdown.
