import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export type SoundKind = 'gift' | 'follow';

export class SoundStore {
  constructor(private directory: string) {}

  async import(kind: SoundKind, path: string): Promise<void> {
    const metadata = await stat(path);
    if (!metadata.isFile() || metadata.size < 12 || metadata.size > 2 * 1024 * 1024) {
      throw new Error('Choose a WAV or MP3 file no larger than 2 MB');
    }
    const bytes = await readFile(path);
    if (bytes.length > 2 * 1024 * 1024) {
      throw new Error('Sound file changed while importing');
    }
    const wav = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
    const mp3 = bytes.toString('ascii', 0, 3) === 'ID3' || bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
    if (!wav && !mp3) {
      throw new Error('Unsupported sound format; choose WAV or MP3');
    }
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, `${kind}.tmp`), bytes, { mode: 0o600 });
    await rename(join(this.directory, `${kind}.tmp`), join(this.directory, `${kind}.audio`));
    await writeFile(join(this.directory, `${kind}.json`), JSON.stringify({
      name: basename(path).slice(0, 256), mime: wav ? 'audio/wav' : 'audio/mpeg'
    }), { mode: 0o600 });
  }

  async clear(kind: SoundKind): Promise<void> {
    await rm(join(this.directory, `${kind}.audio`), { force: true });
    await rm(join(this.directory, `${kind}.json`), { force: true });
  }

  async get(kind: SoundKind): Promise<{ bytes: Buffer; mime: string; name: string } | undefined> {
    try {
      const metadata = JSON.parse(await readFile(join(this.directory, `${kind}.json`), 'utf8'));
      const file = join(this.directory, `${kind}.audio`);
      if ((await stat(file)).size > 2 * 1024 * 1024
          || !['audio/wav', 'audio/mpeg'].includes(metadata.mime)) {
        return undefined;
      }
      return { bytes: await readFile(file), mime: metadata.mime, name: String(metadata.name).slice(0, 256) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw new Error('Saved alert sound could not be read');
    }
  }
}
