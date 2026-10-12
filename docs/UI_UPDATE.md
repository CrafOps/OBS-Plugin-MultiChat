# Native dock UI refresh

The UI remains a native Qt Widgets dock. This update requires rebuilding and
replacing `obs-unified-chat.dll` through the Windows GitHub Actions workflow.
Copying a backend update alone cannot change this UI.

Changes:

- Matte dark palette, restrained lavender controls, softer borders and rounded cards.
- Header with independent YouTube/TikTok connection state; operation feedback in the footer.
- Chat opens by default, with an empty/search state and visible message count.
- Painted chat cards with author initials, platform colors, badges, timestamp,
  wrapped text and gold paid-event highlights. Initials are drawn locally;
  remote avatar downloads are not introduced.
- Read-only sessions hide the reply composer. Account login options and Google
  credentials are collapsed by default.
- Accounts are grouped by platform and scroll when the dock is small.
- Settings have workspace, appearance and overlay groups; file/folder Browse buttons
  replace the need to type runtime paths manually. Forms stack labels above fields.

The delegate escapes user text before placing it in QTextDocument markup. It
paints only visible rows and creates no QWidget per chat message. Event ordering,
search and platform filtering retain the existing bounded item model.

Local validation: diff whitespace checks and source inspection. The native build
toolchain is still unavailable locally, so compilation and actual Qt rendering
must be checked in GitHub Actions and OBS. After building, test narrow/wide docks,
long Thai/English messages, paid events, filtering, font changes, empty states,
and shutdown. A successful backend test suite does not validate the new native UI.
