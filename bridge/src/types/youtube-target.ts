const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function youtubeVideoId(input: string): string | undefined {
  const value = input.trim();
  if (videoIdPattern.test(value)) {
    return value;
  }
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }
    const host = url.hostname.toLowerCase();
    let candidate: string | null | undefined;
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      candidate = url.pathname.split('/')[1];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      candidate = ['/watch', '/live_chat', '/live_chat_replay'].includes(url.pathname) ? url.searchParams.get('v')
        : /^\/(live|embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[2];
    }
    return candidate && videoIdPattern.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}
