import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, 'src'), resolve(out, 'src'), { recursive: true });
const html = (await readFile(resolve(root, 'index.html'), 'utf8')).replaceAll(
  './node_modules/three/',
  './vendor/three/',
);
await writeFile(resolve(out, 'index.html'), html);
for (const path of [
  'build/three.module.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/lines',
  'LICENSE',
]) {
  const dest = resolve(out, 'vendor/three', path);
  await mkdir(resolve(dest, '..'), { recursive: true });
  await cp(resolve(root, 'node_modules/three', path), dest, {
    recursive: true,
  });
}
console.log(
  'Built static app in dist/ (local Three.js modules; no runtime CDN scripts).',
);
