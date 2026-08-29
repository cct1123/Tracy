import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  CATALOG_LAST_VERIFIED,
  CATALOG_SOURCES,
  CATALOG_VALIDATION,
  VENDOR_LENS_CATALOG,
  filterCatalog,
  isAllowedCatalogUrl,
} from '../src/catalog/vendor-catalog.js';
import { validateCatalogManifest } from '../src/catalog/schema.js';
import {
  planoConvexParaxialEflMm,
  verifySpecDerivedZmx,
} from '../src/catalog/verification.js';
import { parseZMX } from '../src/io/zmx.js';

test('vendor catalog records have unique identities and allow-listed sources', () => {
  assert.equal(CATALOG_VALIDATION.ok, true);
  assert.equal(CATALOG_VALIDATION.modelCount, 9);
  assert.match(CATALOG_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(
    new Set(VENDOR_LENS_CATALOG.map((entry) => entry.vendorId)),
    new Set(CATALOG_SOURCES.map((source) => source.id)),
  );
  assert.equal(
    new Set(CATALOG_SOURCES.map((source) => source.id)).size,
    CATALOG_SOURCES.length,
  );
  assert.equal(
    new Set(VENDOR_LENS_CATALOG.map((entry) => entry.id)).size,
    VENDOR_LENS_CATALOG.length,
  );
  for (const entry of VENDOR_LENS_CATALOG) {
    assert.equal(isAllowedCatalogUrl(entry.productUrl, { local: false }), true);
    assert.ok(entry.models.length > 0);
    for (const model of entry.models) {
      assert.ok(['ZMX', 'ZAR'].includes(model.format));
      assert.ok(['official', 'spec-derived'].includes(model.fidelity));
      assert.equal(
        model.fidelity,
        model.delivery === 'vendor' ? 'official' : 'spec-derived',
      );
      assert.equal(
        isAllowedCatalogUrl(model.url, { local: model.delivery === 'local' }),
        true,
      );
      assert.equal(
        isAllowedCatalogUrl(model.sourceUrl, { local: false }),
        true,
      );
      assert.match(model.retrievedOn, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(model.sha256, /^[a-f0-9]{64}$/);
      assert.ok(Number.isInteger(model.byteLength) && model.byteLength > 0);
    }
  }
  assert.equal(isAllowedCatalogUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedCatalogUrl('https://example.com/lens.zmx'), false);
  assert.equal(isAllowedCatalogUrl('../private/lens.zmx'), false);
});

test('catalog schema rejects altered integrity metadata', () => {
  const entries = structuredClone(VENDOR_LENS_CATALOG);
  entries[0].models[0].sha256 = 'not-a-digest';
  const result = validateCatalogManifest(
    {
      verifiedOn: CATALOG_LAST_VERIFIED,
      sources: CATALOG_SOURCES,
      entries,
    },
    { isAllowedUrl: isAllowedCatalogUrl },
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.includes('.sha256')));
});

test('catalog search covers vendor, stock number, family, and model format', () => {
  assert.deepEqual(
    filterCatalog(VENDOR_LENS_CATALOG, 'AC254', 'all').map((entry) => entry.id),
    ['thorlabs-ac254-100-a'],
  );
  assert.equal(filterCatalog(VENDOR_LENS_CATALOG, 'plano-convex').length, 4);
  assert.equal(filterCatalog(VENDOR_LENS_CATALOG, 'ZAR').length, 3);
  assert.equal(filterCatalog(VENDOR_LENS_CATALOG, 'spec-derived').length, 3);
  assert.equal(
    filterCatalog(VENDOR_LENS_CATALOG, '', 'edmund-optics').length,
    3,
  );
});

const localModels = [
  ['edmund-49-849.zmx', 1 / 26.25, 5, 'N-BK7', 12.2],
  ['edmund-49-847.zmx', 1 / 19.93, 7, 'N-SF11', 12.2],
  ['edmund-32-972.zmx', 1 / 51.68, 10, 'N-BK7', 24.5],
];

for (const [name, curvature, thickness, glass, semiDiameter] of localModels) {
  test(`local catalog prescription parses: ${name}`, () => {
    const parsed = parseZMX(
      readFileSync(
        new URL(`../src/catalog/models/${name}`, import.meta.url),
        'utf8',
      ),
    );
    assert.equal(parsed.surfaces.length, 3);
    assert.ok(Math.abs(parsed.surfaces[0].curvature - curvature) < 1e-14);
    assert.equal(parsed.surfaces[0].thickness, thickness);
    assert.equal(parsed.surfaces[0].glass, glass);
    assert.equal(parsed.surfaces[0].sd, semiDiameter);
    assert.equal(parsed.surfaces[1].curvature, 0);
    assert.equal(parsed.surfaces[2].curvature, 0);
  });
}

for (const entry of VENDOR_LENS_CATALOG) {
  for (const model of entry.models.filter(
    (candidate) => candidate.delivery === 'local',
  )) {
    test(`local catalog artifact and specification agree: ${entry.sku}`, () => {
      const bytes = readFileSync(
        new URL(`../${model.url.replace(/^\.\//, '')}`, import.meta.url),
      );
      assert.equal(bytes.length, model.byteLength);
      assert.equal(
        createHash('sha256').update(bytes).digest('hex'),
        model.sha256,
      );
      const result = verifySpecDerivedZmx(entry, model, bytes.toString('utf8'));
      assert.deepEqual(result.issues, []);
      assert.equal(result.ok, true);
      assert.ok(
        Math.abs(
          planoConvexParaxialEflMm(model.specification) -
            model.specification.effectiveFocalLengthMm,
        ) <= Math.max(0.05, model.specification.effectiveFocalLengthMm * 0.001),
      );
    });
  }
}
