import { useEffect, useState } from 'react';

export type Release = {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: Array<{ name: string; browser_download_url: string }>;
};

export function useReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    async function load() {
      try {
        const cached = JSON.parse(localStorage.getItem('multichat.releases') ?? 'null');
        if (
          cached &&
          Array.isArray(cached.releases) &&
          cached.releases.every(
            (item: Release) =>
              item && typeof item.tag_name === 'string' && typeof item.name === 'string',
          ) &&
          typeof cached.checked === 'number'
        ) {
          setReleases(cached.releases);
          if (Date.now() - cached.checked < 15 * 60 * 1000) {
            setLoading(false);
            clearTimeout(timer);
            return;
          }
        }
      } catch {
        // The download page also works without local storage.
      }
      try {
        const response = await fetch(
          'https://api.github.com/repos/CrafOps/OBS-Plugin-MultiChat/releases?per_page=10',
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error('Release list unavailable');
        }
        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid release list');
        }
        const items = data
          .filter(
            (item) =>
              !item.draft &&
              !item.prerelease &&
              typeof item.tag_name === 'string' &&
              typeof item.name === 'string' &&
              Array.isArray(item.assets),
          )
          .slice(0, 5) as Release[];
        if (!active) {
          return;
        }
        setReleases(items);
        try {
          localStorage.setItem(
            'multichat.releases',
            JSON.stringify({ checked: Date.now(), releases: items }),
          );
        } catch {
          // A cache write failure does not stop downloads.
        }
      } catch {
        if (active) {
          setUnavailable(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
        clearTimeout(timer);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);
  return { releases, loading, unavailable };
}
