import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';

await mkdir(new URL('./public/', import.meta.url), { recursive: true });
await mkdir(new URL('./react-public/', import.meta.url), { recursive: true });
for (const name of ['viewer.html', 'viewer.js', 'viewer.css']) {
  await copyFile(new URL(`../overlay/${name}`, import.meta.url), new URL(`./public/${name}`, import.meta.url));
}
await mkdir(new URL('./src/generated/', import.meta.url), { recursive: true });
for (const name of ['protocol.ts', 'media.ts', 'youtube-target.ts']) {
  await copyFile(new URL(`../bridge/src/types/${name}`, import.meta.url), new URL(`./src/generated/${name}`, import.meta.url));
}
const configuration = JSON.parse(await readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8'));
delete configuration.routes;
configuration.vars.PUBLIC_ORIGIN = 'http://localhost:8787';
configuration.vars.WEB_FRONTEND = 'legacy';
configuration.assets.directory = './public';
await writeFile(new URL('./wrangler.local.jsonc', import.meta.url), JSON.stringify(configuration, null, 2));

