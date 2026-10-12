import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { settingsSchema, type Settings } from '../types/protocol.js';

// Fixed PowerShell program; secrets are sent over stdin, never command arguments.
async function dpapi(value: string, decrypt: boolean): Promise<string> {
  if (process.platform !== 'win32') {
    throw new Error('Credential persistence requires Windows DPAPI');
  }
  const operation = decrypt ? 'Unprotect' : 'Protect';
  const script = `
Add-Type -AssemblyName System.Security
$inputValue = [Console]::In.ReadToEnd()
$bytes = [Convert]::FromBase64String($inputValue)
$result = [Security.Cryptography.ProtectedData]::${operation}(
    $bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
[Console]::Out.Write([Convert]::ToBase64String($result))
`;
  return new Promise((resolve, reject) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, timeout: 45000 }, (error, stdout) => {
        if (error) {
          reject(new Error('Windows credential encryption failed'));
        } else {
          resolve(stdout.trim());
        }
      });
    child.stdin!.end(value);
  });
}

export class Store {
  constructor(readonly directory: string) {}

  async initialize(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  async settings(): Promise<Settings> {
    try {
      return settingsSchema.parse(JSON.parse(await readFile(join(this.directory, 'settings.json'), 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return settingsSchema.parse({});
      }
      throw new Error('Invalid saved settings; repair settings.json before starting');
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.atomic('settings.json', JSON.stringify(settings, null, 2));
  }

  private async atomic(name: string, value: string): Promise<void> {
    const path = join(this.directory, name);
    await writeFile(`${path}.tmp`, value, { mode: 0o600 });
    await rename(`${path}.tmp`, path);
  }

  async saveCredentials(value: unknown): Promise<void> {
    const encrypted = await dpapi(Buffer.from(JSON.stringify(value)).toString('base64'), false);
    await this.atomic('youtube.dpapi', encrypted);
  }

  async credentials(): Promise<unknown> {
    try {
      const data = await readFile(join(this.directory, 'youtube.dpapi'), 'utf8');
      return JSON.parse(Buffer.from(await dpapi(data, true), 'base64').toString('utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  async clearCredentials(): Promise<void> {
    await rm(join(this.directory, 'youtube.dpapi'), { force: true });
  }
}
