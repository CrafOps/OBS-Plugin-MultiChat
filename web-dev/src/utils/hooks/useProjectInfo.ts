import { useEffect, useState } from 'react';

type ProjectInfo = { stars?: number; version?: string; checked: number };

export function useProjectInfo() {
  const [info, setInfo] = useState<ProjectInfo>({ checked: 0 });
  useEffect(() => {
    const controller = new AbortController();
    let cached: ProjectInfo | undefined;
    try {
      cached = JSON.parse(localStorage.getItem('multichat.github.public') ?? 'null') ?? undefined;
      if (cached && typeof cached.checked === 'number') {
        setInfo(cached);
        if (Date.now() - cached.checked < 15 * 60 * 1000) {
          return;
        }
      }
    } catch {
      // Public statistics still work when browser storage is unavailable.
    }
    const base = 'https://api.github.com/repos/CrafOps/OBS-Plugin-MultiChat';
    async function load() {
      const results = await Promise.allSettled([
        fetch(base, { signal: controller.signal }).then(async (response) => {
          if (!response.ok) {
            throw new Error('GitHub unavailable');
          }
          return response.json();
        }),
        fetch(`${base}/releases/latest`, { signal: controller.signal }).then(async (response) => {
          if (!response.ok) {
            throw new Error('Release unavailable');
          }
          return response.json();
        }),
      ]);
      if (controller.signal.aborted) {
        return;
      }
      const next: ProjectInfo = { ...cached, checked: Date.now() };
      const [repo, release] = results;
      if (repo.status === 'fulfilled' && Number.isInteger(repo.value.stargazers_count)) {
        next.stars = repo.value.stargazers_count;
      }
      if (release.status === 'fulfilled' && typeof release.value.name === 'string') {
        next.version = release.value.name;
      }
      setInfo(next);
      try {
        localStorage.setItem('multichat.github.public', JSON.stringify(next));
      } catch {
        // A failed cache write does not block the website.
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  return info;
}
