import { test, expect } from '@playwright/test';

async function computed(page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-simulation-status',
    'ok',
  );
  await expect(page.locator('#traceState')).toContainText('worker complete');
}
async function edit(page, selector, value) {
  await page.locator(selector).fill(String(value));
  await page.locator(selector).press('Tab');
  await computed(page);
}
function numbers(text) {
  const match = text.match(/RMS ([\d.e+-]+) · PV ([\d.e+-]+)/);
  return match ? match.slice(1).map(Number) : [];
}
test('monochromatic WFE retains defocus, converts units and restores plot conventions', async ({
  page,
  context,
  baseURL,
}) => {
  const errors = [],
    outbound = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      url.origin !== new URL(baseURL).origin
    ) {
      outbound.push(url.href);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  await page.goto('/');
  await computed(page);
  await expect(page.locator('#aberrPanel')).toHaveAttribute(
    'data-status',
    'ok',
  );
  await expect(page.locator('#pupilTitle')).toHaveText(
    'Pupil · Wavefront error',
  );
  await expect(page.locator('#pupilDefinition')).toContainText(
    'defocus retained',
  );
  const nm = numbers(await page.locator('#aberrMetric').textContent());
  expect(nm).toHaveLength(2);
  const spot = await page.locator('#mRms').textContent();
  await page.locator('#wavefrontUnits').selectOption('waves');
  const focusedText = await page.locator('#aberrMetric').textContent();
  const waves = numbers(focusedText);
  expect((waves[0] * 587.5618) / nm[0]).toBeCloseTo(1, 3);
  expect((waves[1] * 587.5618) / nm[1]).toBeCloseTo(1, 3);
  await expect(page.locator('#mRms')).toHaveText(spot);
  await page.locator('#benchList .detector').click();
  await edit(page, '#prop-z', 32.5);
  const defocused = await page.locator('#aberrMetric').textContent();
  expect(defocused).not.toEqual(focusedText);
  await expect(page.locator('#wavefrontReference')).toContainText('32.5000');
  await expect(page.locator('#wavefrontReference')).toContainText(
    'Exit pupil z',
  );
  await page.locator('#wavefrontRemoveTilt').check();
  await computed(page);
  await expect(page.locator('#pupilDefinition')).toContainText(
    'tilt removed; defocus retained',
  );
  await page.locator('#wavefrontWavelength').selectOption('F');
  await computed(page);
  await expect(page.locator('#aberrPanel')).toHaveAttribute(
    'data-status',
    'unavailable',
  );
  await expect(page.locator('#pupilStatus')).toContainText(
    'Enable the selected wavefront wavelength',
  );
  await page
    .locator('.toolbar-group')
    .filter({ has: page.locator('summary', { hasText: /^Source$/ }) })
    .locator('summary')
    .click();
  await page.locator('[data-pop="wavePop"]').click();
  await page
    .locator('label.ck')
    .filter({ has: page.locator('#cbF') })
    .click();
  await computed(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pupilStatus')).toContainText('486.13 nm');
  await expect(page.locator('#projectSaveState')).toHaveAttribute(
    'data-state',
    'saved',
  );
  await page.reload();
  await computed(page);
  await expect(page.locator('#wavefrontWavelength')).toHaveValue('F');
  await expect(page.locator('#wavefrontUnits')).toHaveValue('waves');
  await expect(page.locator('#wavefrontRemoveTilt')).toBeChecked();
  await page.locator('#pupilMetric').selectOption('relative-opl');
  await expect(page.locator('#pupilTitle')).toHaveText('Pupil · Relative OPL');
  await expect(page.locator('#pupilDefinition')).toContainText(
    'not wavefront error',
  );
  await expect(page.locator('#wavefrontRemoveTilt')).toBeDisabled();
  await page.locator('#pupilMetric').selectOption('wavefront');
  await expect(page.locator('#aberrPanel')).toHaveAttribute(
    'data-status',
    'ok',
  );
  expect(errors).toEqual([]);
  expect(outbound).toEqual([]);
});
