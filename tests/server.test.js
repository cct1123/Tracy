import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/serve.mjs';

test('static server serves modules but never repository metadata or private files', async (t) => {
  const server = createStaticServer(
    fileURLToPath(new URL('..', import.meta.url)),
  );
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  const module = await fetch(base + '/src/main.js');
  assert.match(module.headers.get('content-type'), /javascript/);
  const catalogModel = await fetch(
    base + '/src/catalog/models/edmund-49-849.zmx',
  );
  assert.equal(catalogModel.status, 200);
  assert.match(catalogModel.headers.get('content-type'), /text\/plain/);
  assert.match(await catalogModel.text(), /Edmund Optics #49-849/);
  for (const path of [
    '/.git/config',
    '/.env',
    '/references/tracy-prototype.html',
    '/src/../../package.json',
    '/src/%5c..%5cpackage.json',
    '/%E0%A4%A',
  ]) {
    assert.ok([400, 404].includes((await fetch(base + path)).status), path);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
