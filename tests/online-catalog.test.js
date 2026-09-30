import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONLINE_CATALOG_SOURCES,
  catalogSearchUrl,
  vendorImportAttribution,
  validateVendorModelFile,
  MAX_VENDOR_MODEL_BYTES,
} from '../src/catalog/online-catalog.js';

test('online catalog sends arbitrary terms to actual supplier search routes', () => {
  for (const source of ONLINE_CATALOG_SOURCES) {
    for (const query of [
      'AC254-075-A',
      '#49-999',
      'aspheric lens 25 mm',
      'λ 1550 nm & f/2 + Ø12.7',
    ]) {
      const url = new URL(catalogSearchUrl(source.id, ` ${query} `));
      assert.equal(url.origin, new URL(source.searchUrl).origin);
      assert.equal(url.searchParams.get(source.queryParameter), query);
      assert.equal([...url.searchParams].length, 1);
    }
  }
  assert.throws(() => catalogSearchUrl('unknown', 'lens'), /Choose/);
  assert.throws(() => catalogSearchUrl('thorlabs', '   '), /Enter/);
  assert.throws(() => catalogSearchUrl('thorlabs', 'a'.repeat(301)), /300/);
});

test('vendor attribution retains official URL and explicit user-supplied uncertainty', () => {
  assert.deepEqual(
    vendorImportAttribution(
      'https://www.thorlabs.com/item/AC254-075-A',
      ' AC254-075-A ',
    ),
    {
      vendor: 'Thorlabs',
      productUrl: 'https://www.thorlabs.com/item/AC254-075-A',
      sku: 'AC254-075-A',
      attribution: 'user-provided',
      catalogFidelity: 'unverified-download',
    },
  );
  assert.equal(
    vendorImportAttribution('https://www.edmundoptics.com/p/lens/10321/')
      .vendor,
    'Edmund Optics',
  );
  for (const url of [
    'javascript:alert(1)',
    'http://www.thorlabs.com/item/lens',
    'https://www.thorlabs.com.evil.example/lens',
    'https://www.thorlabs.com@evil.example/lens',
    'https://user@www.thorlabs.com/lens',
    'https://www.thorlabs.com:8443/lens',
    'not a URL',
  ])
    assert.throws(() => vendorImportAttribution(url), /URL/);
  assert.throws(
    () =>
      vendorImportAttribution('https://www.thorlabs.com/lens', 'x'.repeat(129)),
    /128/,
  );
});

test('downloaded model validation rejects unsupported, empty and oversized files', () => {
  for (const name of ['lens.ZMX', 'lens.ZAR'])
    assert.doesNotThrow(() => validateVendorModelFile({ name, size: 100 }));
  for (const file of [
    null,
    { name: 'lens.zmf', size: 100 },
    { name: 'lens.zmx', size: 0 },
    { name: 'lens.zmx', size: MAX_VENDOR_MODEL_BYTES + 1 },
  ])
    assert.throws(() => validateVendorModelFile(file));
});
