const mediaDomains = [
  'ggpht.com', 'googleusercontent.com', 'ytimg.com', 'gstatic.com', 'youtube.com',
  'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'byteoversea.com',
  'ibytedtos.com', 'ibyteimg.com', 'byteimg.com', 'muscdn.com'
];

export function safeMediaUrl(input: unknown): string | undefined {
  if (typeof input !== 'string' || input.length > 4096) {
    return undefined;
  }
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') {
      return undefined;
    }
    const host = url.hostname.toLowerCase();
    return mediaDomains.some(domain => host === domain || host.endsWith(`.${domain}`)) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
