import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

async function start(page) {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute(
    'data-persistence-ready',
    'true',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-simulation-status',
    'ok',
  );
  await page.locator('#catalogTab').click();
}

async function exportProject(page) {
  const group = page
    .locator('.toolbar-group')
    .filter({ has: page.locator('summary', { hasText: /^Project$/ }) });
  await group.locator('summary').click();
  const downloaded = page.waitForEvent('download');
  await page.locator('#uxProjectSave').click();
  return JSON.parse(await readFile(await (await downloaded).path(), 'utf8'));
}

test('online catalog submits arbitrary queries only when requested and preserves local filtering', async ({
  page,
  context,
  baseURL,
}) => {
  const outbound = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(baseURL).origin &&
      ['http:', 'https:'].includes(url.protocol)
    ) {
      outbound.push(url.href);
      return route.fulfill({
        contentType: 'text/html',
        body: '<title>Supplier search test double</title>',
      });
    }
    return route.continue();
  });
  await start(page);
  expect(outbound).toEqual([]);
  await expect(page.locator('[data-catalog-id]')).toHaveCount(0);
  for (const [vendor, query, host, key] of [
    ['thorlabs', 'AC254-075-A', 'www.thorlabs.com', 'q'],
    [
      'edmund-optics',
      'aspheric 25 mm & 1550 nm',
      'www.edmundoptics.com',
      'criteria',
    ],
  ]) {
    await page.locator('#onlineCatalogVendor').selectOption(vendor);
    await page.locator('#onlineCatalogQuery').fill(query);
    const previousCount = outbound.length;
    const popupPromise = context.waitForEvent('page');
    await page.locator('#onlineCatalogForm button').click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await expect.poll(() => outbound.length).toBe(previousCount + 1);
    const url = new URL(outbound.at(-1));
    expect(url.hostname).toBe(host);
    expect(url.searchParams.get(key)).toBe(query);
    expect([...url.searchParams]).toHaveLength(1);
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
  }
  await page.locator('#libSearch').fill('plano-convex');
  await expect(page.locator('[data-template="pcx"]')).toBeVisible();
  await expect(page.locator('#onlineCatalogQuery')).toHaveValue(
    'aspheric 25 mm & 1550 nm',
  );
});

for (const format of ['ZMX', 'ZAR']) {
  test(`vendor ${format} import validates attribution and preserves provenance through reload`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await start(page);
    await page.locator('#catalogImportDetails summary').click();
    await page
      .locator('#catalogProductUrl')
      .fill('https://www.thorlabs.com.evil.example/item/lens');
    await page.locator('#catalogStockNumber').fill('CUSTOM-NEW-SKU');
    const model = await readFile(resolve('examples/plano-convex.zmx'));
    let bytes = model;
    if (format === 'ZAR') {
      bytes = Buffer.alloc(0x14c + model.length);
      bytes[0] = 0xea;
      bytes.writeUInt32LE(model.length, 0x0c);
      bytes.write('lens.zmx', 0x20);
      model.copy(bytes, 0x14c);
    }
    await page.locator('#catalogModelFile').setInputFiles({
      name: `lens.${format}`,
      mimeType: 'application/octet-stream',
      buffer: bytes,
    });
    await page.locator('#catalogImportForm button').click();
    await expect(page.locator('#catalogImportStatus')).toContainText(
      'Use an HTTPS product URL',
    );
    await expect(page.locator('[data-template^="imported-"]')).toHaveCount(0);
    await page
      .locator('#catalogProductUrl')
      .fill('https://www.thorlabs.com/item/CUSTOM-NEW-SKU');
    await page.locator('#catalogImportForm button').click();
    await expect(page.locator('#catalogImportStatus')).toContainText(
      'added locally',
    );
    await expect(page.locator('[data-template^="imported-"]')).toHaveCount(1);
    const exported = await exportProject(page);
    const imported = exported.library.imported[0];
    expect(imported.importMeta).toMatchObject({
      vendor: 'Thorlabs',
      sku: 'CUSTOM-NEW-SKU',
      productUrl: 'https://www.thorlabs.com/item/CUSTOM-NEW-SKU',
      attribution: 'user-provided',
      catalogFidelity: 'unverified-download',
      downloadedFile: `lens.${format}`,
      downloadedFileSha256: createHash('sha256').update(bytes).digest('hex'),
      downloadedFileBytes: bytes.length,
    });
    if (format === 'ZAR') expect(imported.importMeta.archive).toBe('lens.ZAR');
    await expect(page.locator('#projectSaveState')).toHaveAttribute(
      'data-state',
      'saved',
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute(
      'data-persistence-ready',
      'true',
    );
    const recovered = await exportProject(page);
    expect(recovered.library.imported[0].importMeta).toEqual(
      imported.importMeta,
    );
    expect(errors).toEqual([]);
  });
}
