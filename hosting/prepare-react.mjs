import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../web-dev/', import.meta.url));
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: directory,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});
if (build.status !== 0) {
  throw new Error('React website build failed');
}
await mkdir(new URL('./react-public/', import.meta.url), { recursive: true });
await cp(new URL('../web-dev/dist/', import.meta.url), new URL('./react-public/', import.meta.url), { recursive: true });
if (!process.argv.includes('--production')) {
  const configuration = JSON.parse(await readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8'));
  delete configuration.routes;
  configuration.name = 'multi-live-chat-react-preview';
  configuration.vars.PUBLIC_ORIGIN = 'http://localhost:8788';
  configuration.vars.WEB_FRONTEND = 'react';
  configuration.assets.directory = './react-public';
  configuration.dev = { port: 8788 };
  await writeFile(new URL('./wrangler.react.local.jsonc', import.meta.url), JSON.stringify(configuration, null, 2));
}

