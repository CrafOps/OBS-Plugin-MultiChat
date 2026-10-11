# Account setup

## YouTube

1. Create/select a Google Cloud project and enable YouTube Data API v3.
2. Configure the OAuth consent screen. While your app is in testing, add your channel's Google account as a test user. Google testing grants may expire, requiring authorization again; a distributed release may require Google's verification process.
3. Create an OAuth client with application type **Desktop app**. Copy its client ID and client secret into the dock Settings. These identify a public desktop client; do not use a web-server client or embed credentials in source code.
4. Restart the bridge to apply changes, then click Login with YouTube. The app requests the documented `https://www.googleapis.com/auth/youtube.force-ssl` scope for live chat reads and authorized replies.
5. Allow the ephemeral `http://127.0.0.1:<port>/callback` redirect. Google supports loopback redirects for Desktop app clients. State is single-use and expires after five minutes. S256 PKCE is sent with the code exchange.
6. Active broadcasts are preferred. If none is active, the most recent returned broadcast is displayed without enabling its chat. Manual selection is available in Accounts and applies when you save accounts. Discovery currently covers up to 50 returned recent broadcasts, not the full history.

The authenticated channel must have live streaming enabled and the selected broadcast must have live chat enabled. Completed streams do not provide an active reply target. Automatic credential refresh uses googleapis; refresh tokens are encrypted for the current Windows user with DPAPI. OAuth/API errors are sanitized before being sent to the UI.

Polling honors YouTube's returned `pollingIntervalMillis`. This implementation uses documented REST `list`, not `streamList`; streaming transport is a future optimization. Quota/permission errors stop automatic polling and require action; repeated quota failures must not be retried aggressively. Auto discovery checks offline channels once per minute and also consumes API quota; disable it when unused.

## TikTok

No developer credentials are required for the optional unofficial username connector. Enable it deliberately in Accounts, enter a username without `@`, save, and refresh. Only public LIVE events supported by the upstream connector can arrive. Creator offline, geographic restrictions, signing limits, upstream changes, and TikTok enforcement may prevent connection.

TikTok Login Kit offers authorized identity scopes, not a general public entitlement to LIVE chat reading or sending. Login Kit is therefore not implemented: it would not unlock the requested LIVE features with the available documented scopes. There is no password capture, cookie import, CAPTCHA bypass, or account automation. The `LiveConnector` boundary allows a future authorized official implementation to replace the username connector. Replies remain disabled.

Gift streaks emit only their final total for streakable gifts. Gift counts are not converted to money. Names depend on upstream metadata. TikTok availability and legal appropriateness cannot be established by offline automated tests.
