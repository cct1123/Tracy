import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATALOG_LAST_VERIFIED,
  CATALOG_SOURCES,
  CATALOG_VALIDATION,
  VENDOR_LENS_CATALOG,
} from '../src/catalog/vendor-catalog.js';
import { verifySpecDerivedZmx } from '../src/catalog/verification.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const online = process.argv.includes('--online');
const strictLinks = process.argv.includes('--strict-links');
const MAX_REMOTE_MODEL_BYTES = 20 * 1024 * 1024;
const failures = [];
const warnings = [];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`WARN ${message}`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function checkLocalModel(entry, model) {
  const path = resolve(root, model.url.replace(/^\.\//, ''));
  try {
    const bytes = await readFile(path);
    const actualHash = sha256(bytes);
    if (bytes.length !== model.byteLength)
      fail(
        `${entry.sku} ${model.format} byte length changed (${bytes.length}, expected ${model.byteLength})`,
      );
    else if (actualHash !== model.sha256)
      fail(`${entry.sku} ${model.format} SHA-256 changed (${actualHash})`);
    else pass(`${entry.sku} ${model.format} local artifact integrity`);

    if (model.fidelity === 'spec-derived') {
      const result = verifySpecDerivedZmx(entry, model, bytes.toString('utf8'));
      if (!result.ok) for (const issue of result.issues) fail(issue);
      else
        pass(
          `${entry.sku} prescription and paraxial EFL (${result.paraxialEflMm.toFixed(3)} mm)`,
        );
    }
  } catch (error) {
    fail(`${entry.sku} ${model.format} could not be checked: ${error.message}`);
  }
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: 'follow',
    signal: globalThis.AbortSignal.timeout(30_000),
    headers: {
      'User-Agent': 'Tracy-Catalog-Audit/0.1',
      ...options.headers,
    },
  });
}

async function checkLink(label, url) {
  try {
    let response = await fetchWithTimeout(url, { method: 'HEAD' });
    if (!response.ok) {
      response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
      });
    }
    if ([401, 403, 429].includes(response.status)) {
      await response.body?.cancel();
      const message = `${label} link is automation-blocked (HTTP ${response.status})`;
      if (strictLinks) fail(message);
      else warn(message);
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await response.body?.cancel();
    pass(`${label} link (${response.status})`);
  } catch (error) {
    fail(`${label} link: ${error.message}`);
  }
}

async function checkRemoteModel(entry, model) {
  try {
    const response = await fetchWithTimeout(model.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declaredSize = Number(response.headers.get('content-length'));
    if (declaredSize > MAX_REMOTE_MODEL_BYTES)
      throw new Error(`declared size exceeds ${MAX_REMOTE_MODEL_BYTES} bytes`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_REMOTE_MODEL_BYTES)
      throw new Error(`download exceeds ${MAX_REMOTE_MODEL_BYTES} bytes`);
    const actualHash = sha256(bytes);
    if (bytes.length !== model.byteLength)
      fail(
        `${entry.sku} ${model.format} byte length changed (${bytes.length}, expected ${model.byteLength})`,
      );
    else if (actualHash !== model.sha256)
      fail(`${entry.sku} ${model.format} SHA-256 changed (${actualHash})`);
    else pass(`${entry.sku} ${model.format} official artifact integrity`);
  } catch (error) {
    fail(`${entry.sku} ${model.format} download: ${error.message}`);
  }
}

console.log(
  `Catalog ${CATALOG_LAST_VERIFIED}: ${CATALOG_VALIDATION.sourceCount} vendors, ${CATALOG_VALIDATION.entryCount} lenses, ${CATALOG_VALIDATION.modelCount} models`,
);
pass('manifest schema and official-host allow-list');

for (const entry of VENDOR_LENS_CATALOG)
  for (const model of entry.models)
    if (model.delivery === 'local') await checkLocalModel(entry, model);

if (online) {
  console.log('Checking current official URLs and vendor-hosted artifacts…');
  const links = new Map();
  for (const source of CATALOG_SOURCES)
    for (const [label, url] of [
      [`${source.name} home`, source.homeUrl],
      [`${source.name} catalog`, source.catalogUrl],
      [`${source.name} catalog archive`, source.catalogDownloadUrl],
    ])
      if (url) links.set(url, label);
  for (const entry of VENDOR_LENS_CATALOG)
    links.set(entry.productUrl, `${entry.vendor} ${entry.sku} product`);
  for (const [url, label] of links) await checkLink(label, url);
  for (const entry of VENDOR_LENS_CATALOG)
    for (const model of entry.models)
      if (model.delivery === 'vendor') await checkRemoteModel(entry, model);
} else {
  console.log(
    'SKIP official network checks (run npm run catalog:check:online)',
  );
}

if (failures.length) {
  console.error(`Catalog check failed with ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log(
    warnings.length
      ? `Catalog check passed with ${warnings.length} automation warning(s).`
      : 'Catalog check completed without issues.',
  );
}
