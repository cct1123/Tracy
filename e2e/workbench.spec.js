import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const pageErrors = new WeakMap();
const outboundRequests = new WeakMap();

test.beforeEach(async ({ page, context, baseURL }) => {
  const errors = [],
    outbound = [];
  pageErrors.set(page, errors);
  outboundRequests.set(page, outbound);
  page.on('pageerror', (error) => errors.push(error.message));
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
  await expect(page.locator('html')).toHaveAttribute(
    'data-persistence-ready',
    'true',
  );
  await computed(page);
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page), 'No uncaught application errors').toEqual([]);
  expect(
    outboundRequests.get(page),
    'Workbench requests stay on its local origin',
  ).toEqual([]);
});

async function computed(page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-simulation-status',
    'ok',
  );
  await expect(page.locator('#traceState')).toContainText('worker complete');
}
async function menu(page, name) {
  const group = page.locator('.toolbar-group').filter({
    has: page.locator('summary', { hasText: new RegExp(`^${name}$`) }),
  });
  if (!(await group.evaluate((node) => node.open)))
    await group.locator('summary').click();
  await expect(group).toHaveAttribute('open', '');
  await expect(page.locator('.toolbar-group[open]')).toHaveCount(1);
}
async function edit(page, selector, value) {
  await page.locator(selector).fill(String(value));
  await page.locator(selector).press('Tab');
}
async function openSource(page) {
  await menu(page, 'Source');
  await page.locator('[data-pop="sourcePop"]').click();
}
async function showAnalysis(page) {
  await menu(page, 'Analysis');
  await page.locator('#uxAnalysis').click();
}
async function saveJSON(page) {
  await menu(page, 'Project');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#uxProjectSave').click();
  const download = await downloadPromise;
  const path = await download.path();
  return { path, project: JSON.parse(await readFile(path, 'utf8')) };
}
async function addComponent(page, template = 'pcx', z = 50, keyboard = false) {
  await page.locator('#catalogTab').click();
  await page.locator('#insertionZ').fill(String(z));
  const button = page.locator(`button[data-template="${template}"]`);
  if (keyboard) {
    await button.focus();
    await button.press('Enter');
  } else await button.click();
  await computed(page);
}

// These are end-user actions; assertions inspect rendered results or portable JSON,
// never a production global exposing the application's private session objects.
test('startup, source and engine controls keep statistical metrics separate from display', async ({
  page,
}) => {
  await expect(page).toHaveTitle(/Tracy/);
  await expect(page.locator('#benchList .bench-item')).toHaveCount(3);
  await expect(page.locator('#mRms')).not.toHaveText('—');
  await expect(page.locator('#modelAssumptions')).toContainText(
    'zero statistical weight',
  );
  const initial = await page
    .locator('#mRms, #mPower, #mTraced')
    .allTextContents();
  await openSource(page);
  await page
    .locator('label.ck')
    .filter({ has: page.locator('#cbChief') })
    .click();
  await expect(page.locator('#cbChief')).not.toBeChecked();
  await computed(page);
  expect(
    await page.locator('#mRms, #mPower, #mTraced').allTextContents(),
  ).toEqual(initial);
  await page.keyboard.press('Escape');
  await menu(page, 'Trace');
  await edit(page, '#displayRays', 3);
  await computed(page);
  expect(
    await page.locator('#mRms, #mPower, #mTraced').allTextContents(),
  ).toEqual(initial);
  await page.locator('#uxEngine').selectOption('sequential');
  await computed(page);
  await expect(page.locator('#mPower')).toHaveText('100.0%');
  await page.locator('#uxEngine').selectOption('fresnel');
  await computed(page);
  await expect(page.locator('#modelAssumptions')).toContainText('Fresnel');
  await expect(page.locator('#mPower')).not.toHaveText('100.0%');
  // The default high-NA source contains glass-edge paths with undefined sidewalls
  // in Fresnel mode. Sequential mode has explicit clipping and is a valid fixture
  // for this source-control test; topology rejection has its own browser regression.
  await page.locator('#uxEngine').selectOption('sequential');
  await computed(page);
  await openSource(page);
  await page.locator('label[for="stPt"]').click();
  await expect(page.locator('#stPt')).toBeChecked();
  await computed(page);
  await expect(page.locator('#hudTxt')).toContainText('point');
  await expect(page.locator('#powerBreakdown')).not.toContainText(
    'Not defined',
  );
  await menu(page, 'Source');
  await page.locator('#pointDistribution').selectOption('uniform-angular');
  await computed(page);
  await expect(page.locator('#modelAssumptions')).toContainText(
    'uniform-angular',
  );
  await page.locator('[data-pop="wavePop"]').click();
  await page
    .locator('label.ck')
    .filter({ has: page.locator('#cbF') })
    .click();
  await edit(page, '#weightF', 2);
  await computed(page);
  await expect(page.locator('#spectralResults tbody tr')).toHaveCount(2);
  await expect(page.locator('#spectralResults')).toContainText('66.67%');
  await expect(page.locator('#spectralResults')).toContainText('33.33%');
});

test('catalog click/keyboard insertion, editable properties, movement and deletion', async ({
  page,
}) => {
  await addComponent(page, 'pcx', 50, true);
  await expect(page.locator('#insTitle')).toHaveText('Plano-convex');
  await expect(page.locator('#prop-z')).toHaveValue('50.00');
  await edit(page, '#prop-name', 'E2E singlet');
  await edit(page, '#prop-R1', 75);
  await computed(page);
  await expect(page.locator('#prop-R1')).toHaveValue('75');
  await page.locator('#benchTab').click();
  await expect(page.locator('#benchList .bench-item')).toHaveCount(4);
  await page.getByRole('button', { name: /E2E singlet.*50.0 mm/ }).click();
  await page.keyboard.press('ArrowRight');
  await computed(page);
  await expect(page.locator('#prop-z')).toHaveValue('50.10');
  await page.locator('[data-action="delete"]').click();
  await computed(page);
  await expect(page.locator('#benchList .bench-item')).toHaveCount(3);
  await expect(page.locator('#benchList')).not.toContainText('E2E singlet');
  await addComponent(page, 'stop', 45);
  await expect(page.locator('#insTitle')).toHaveText('Aperture stop');
});

test('drag a catalog lens to the optical bench', async ({ page }) => {
  await page.locator('#catalogTab').click();
  await page
    .locator('button[data-template="pcx"]')
    .dragTo(page.locator('#c'), { targetPosition: { x: 300, y: 120 } });
  await computed(page);
  await expect(page.locator('#insTitle')).toHaveText('Plano-convex');
  await expect(page.locator('#benchList .bench-item')).toHaveCount(4);
});

test('strict unknown material blocking and persistent exploratory warning survive reload', async ({
  page,
}) => {
  await addComponent(page, 'pcx', 50);
  await edit(page, '#prop-glass', 'E2E-UNRESOLVED');
  await expect(page.locator('html')).toHaveAttribute(
    'data-simulation-status',
    'blocked',
  );
  await expect(page.locator('#fidelityBanner')).toContainText(
    'Unresolved material',
  );
  await expect(page.locator('#mRms')).toHaveText('—');
  await menu(page, 'Trace');
  await page.locator('#materialMode').selectOption('exploratory');
  await computed(page);
  await expect(page.locator('#fidelityBanner')).toContainText('n=1.52');
  await expect(page.locator('#fidelityBanner')).toContainText('unverified');
  await expect(page.locator('#projectSaveState')).toHaveAttribute(
    'data-state',
    'saved',
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute(
    'data-persistence-ready',
    'true',
  );
  await computed(page);
  await expect(page.locator('#fidelityBanner')).toContainText('n=1.52');
  await menu(page, 'Trace');
  await expect(page.locator('#materialMode')).toHaveValue('exploratory');
});

test('focus scan, explicit detector move, A/B snapshots and plot controls', async ({
  page,
}) => {
  await menu(page, 'Trace');
  await page.locator('#uxRays').selectOption('25');
  await computed(page);
  await showAnalysis(page);
  await page.locator('#comparisonTools > summary').click();
  await page.locator('#captureA').click();
  await expect(page.locator('#snapshotAState')).toContainText('A saved');
  await page.locator('#focusTools > summary').click();
  await edit(page, '#focusFrom', 30);
  await edit(page, '#focusTo', 45);
  await edit(page, '#focusSteps', 7);
  await page.locator('#runFocusScan').click();
  await expect(page.locator('#focusBest')).toContainText('Lowest tested RMS');
  await expect(page.locator('#focusData tbody tr')).toHaveCount(7);
  await expect(page.locator('#focusSettings')).toContainText('25 samples/λ');
  await page.locator('#moveBest').click();
  await computed(page);
  await page.locator('#captureB').click();
  await expect(page.locator('#comparisonTable')).toContainText(
    'Detector z (mm)',
  );
  await expect(page.locator('#comparisonTable tbody tr')).toHaveCount(6);
  const row = page
    .locator('#comparisonTable tbody tr')
    .filter({ hasText: 'Detector z (mm)' });
  expect(await row.locator('td').nth(1).textContent()).not.toEqual(
    await row.locator('td').nth(2).textContent(),
  );
  await page
    .getByText('Plot scales & Relative OPL definition', { exact: true })
    .click();
  await page.locator('#plotScaleMode').selectOption('shared');
  await expect(page.locator('#plotScaleMode')).toHaveValue('shared');
  await page.locator('#previousOverlay').check();
  await expect(page.locator('#relativeDefinition')).toContainText(
    'not reference-sphere',
  );
});

test('ZMX import preserves individual apertures, explicit override resets to prescription', async ({
  page,
}) => {
  await page
    .locator('#fileIn')
    .setInputFiles(resolve('examples/plano-convex.zmx'));
  await expect(page.locator('#parseWarn')).toContainText(
    'Added to Component Library',
  );
  await addComponent(page, 'imported-1', 60);
  await expect(page.locator('#insKind')).toContainText('imported');
  await expect(page.locator('#insBody')).toContainText(
    'Individual prescription apertures retained',
  );
  await edit(page, '#prop-apertureOverrideMm', 6);
  await expect(page.locator('html')).toHaveAttribute(
    'data-simulation-status',
    'blocked',
  );
  await expect(page.locator('#fidelityBanner')).toContainText(
    'undefined primary medium',
  );
  await expect(page.locator('#insBody')).toContainText(
    'Modified clear apertures',
  );
  const altered = (await saveJSON(page)).project.bench.components.find(
    (c) => c.template === 'imported-1',
  );
  expect(altered.surfaces.every((s) => s.sd === 3)).toBe(true);
  // Close the project menu before interacting with properties.
  await page.locator('#projectGroup > summary').click();
  await page.locator('[data-action="reset-prescription"]').click();
  await computed(page);
  await expect(page.locator('#insBody')).toContainText(
    'Individual prescription apertures retained',
  );
  const restored = (await saveJSON(page)).project.bench.components.find(
    (c) => c.template === 'imported-1',
  );
  expect(restored.surfaces.map((s) => s.sd)).toEqual([12.7, 12.7]);
});

test('named local project, dirty state, autosave recovery and JSON round trip', async ({
  page,
}) => {
  await addComponent(page, 'pcx', 50);
  await edit(page, '#prop-name', 'Recovery lens');
  await computed(page);
  await menu(page, 'Project');
  await edit(page, '#projectName', 'Browser regression project');
  await page.locator('#uxLocalSave').click();
  await expect(page.locator('#localProjectList')).toContainText(
    'Browser regression project',
  );
  await expect(page.locator('#projectSaveState')).toHaveAttribute(
    'data-state',
    'saved',
  );
  const exported = await saveJSON(page);
  expect(exported.project.version).toBe(2);
  expect(exported.project.project.name).toBe('Browser regression project');
  await page.reload();
  await computed(page);
  await expect(page.locator('html')).toHaveAttribute(
    'data-persistence-ready',
    'true',
  );
  await expect(page.locator('#benchList')).toContainText('Recovery lens');
  await menu(page, 'Project');
  await expect(page.locator('#projectName')).toHaveValue(
    'Browser regression project',
  );
  await page.locator('#projectGroup > summary').click();
  await page.getByRole('button', { name: /Recovery lens/ }).click();
  await page.locator('#prop-name').fill('Temporary mutation');
  await expect(page.locator('#projectSaveState')).toHaveAttribute(
    'data-state',
    'dirty',
  );
  await page.locator('#prop-name').press('Tab');
  await page.locator('#projectFileIn').setInputFiles(exported.path);
  await computed(page);
  await expect(page.locator('#benchList')).toContainText('Recovery lens');
  await expect(page.locator('#benchList')).not.toContainText(
    'Temporary mutation',
  );
  const roundtrip = (await saveJSON(page)).project;
  expect(roundtrip.bench.components).toEqual(exported.project.bench.components);
  expect(roundtrip.simulation.canonical).toEqual(
    exported.project.simulation.canonical,
  );
});

test('responsive toolbar, keyboard tabs, theme switch and final screenshots', async ({
  page,
}) => {
  await menu(page, 'View');
  await page.locator('#uxTheme').click();
  await computed(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day');
  await page
    .locator('.toolbar-group')
    .filter({ has: page.getByText('View', { exact: true }) })
    .locator('summary')
    .click();
  await mkdir(resolve('outputs/screenshots'), { recursive: true });
  await page.screenshot({
    path: 'outputs/screenshots/after-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#app')).toHaveClass(/left-collapsed/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const name of ['Project', 'Source', 'Trace', 'Analysis', 'View']) {
    await menu(page, name);
    const menuBounds = await page
      .locator('.toolbar-group[open] .toolbar-menu')
      .boundingBox();
    expect(menuBounds.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(390);
  }
  await page.locator('#uxTheme').click();
  await computed(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  await page.locator('#uxLeft').click();
  await page.locator('#benchTab').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#catalogTab')).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.locator('#insertionZ').fill('50');
  await page.locator('button[data-template="pcx"]').focus();
  await page.keyboard.press('Enter');
  await computed(page);
  await expect(page.locator('#insTitle')).toHaveText('Plano-convex');
  await expect(page.locator('#app')).toHaveClass(/left-collapsed/);
  await page.locator('#insClose').click();
  await expect(page.locator('#app')).toHaveClass(/right-collapsed/);
  await page.screenshot({
    path: 'outputs/screenshots/after-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('opening a named project restores its saved bench independently of the current copy', async ({
  page,
}) => {
  await page.locator('#benchList .bench-item').nth(1).click();
  await edit(page, '#prop-name', 'Saved A lens');
  await computed(page);
  await menu(page, 'Project');
  await edit(page, '#projectName', 'Named A');
  await page.locator('#uxLocalSave').click();
  await expect(page.locator('#localProjectList')).toContainText('Named A');
  await page.locator('#uxNewProject').click();
  await edit(page, '#projectName', 'Named B');
  await page.locator('#projectGroup > summary').click();
  await edit(page, '#prop-name', 'Saved B lens');
  await computed(page);
  await menu(page, 'Project');
  await page.locator('#uxLocalSave').click();
  await expect(page.locator('#localProjectList')).toContainText('Named B');
  await page.locator('#localProjectList').selectOption({ label: 'Named A' });
  await page.locator('#uxLocalLoad').click();
  await computed(page);
  await expect(page.locator('#projectName')).toHaveValue('Named A');
  await expect(page.locator('#benchList')).toContainText('Saved A lens');
  await expect(page.locator('#benchList')).not.toContainText('Saved B lens');
});
