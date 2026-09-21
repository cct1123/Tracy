import { chromium } from '@playwright/test';
import { createStaticServer } from './serve.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { createOpticalEngine } from '../src/core/engine.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from '../src/data/defaults.js';

const baselineRevision = 'a5c94516578c8edf44743048e677f424e81d0b85';
if (
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !==
    baselineRevision ||
  execFileSync('git', ['diff', '--name-only', '--', 'src', 'index.html'], {
    encoding: 'utf8',
  }).trim()
)
  throw new Error(
    'Baseline capture requires a clean baseline revision. Current results use scripts/benchmark.mjs and Playwright; do not overwrite historical evidence.',
  );

await mkdir('outputs/screenshots', { recursive: true });
const model = createBenchState();
createBench(model).initializeBenchFromSurfaces(
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
);
const optics = createOpticalEngine(model);
const timings = [];
for (const count of [49, 1201, 5001]) {
  for (const engine of ['sequential', 'fresnel']) {
    const runs = [];
    for (let run = 0; run < 7; run++) {
      const t = performance.now();
      for (const wl of [0.4861327, 0.5875618, 0.6562725]) {
        const rays = optics.makeCollimated(0, 0, count, wl, false, 'pupil3d');
        for (const ray of rays) {
          if (engine === 'sequential') optics.traceRay(ray.O, ray.D, wl);
          else optics.traceFresnel3D(ray.O, ray.D, wl, { ghosts: false });
        }
      }
      if (run > 1) runs.push(performance.now() - t);
    }
    runs.sort((a, b) => a - b);
    timings.push({
      countPerWavelength: count,
      engine,
      medianMs: runs[2],
      runsMs: runs,
    });
  }
}
await writeFile(
  'outputs/baseline-benchmark.json',
  JSON.stringify(
    {
      revision: 'a5c9451',
      node: process.version,
      scope:
        '3 wavelengths; source generation plus primary tracing, no rendering or metrics',
      timings,
    },
    null,
    2,
  ),
);
const server = createStaticServer(process.cwd());
await new Promise((resolve) => server.listen(5190, '127.0.0.1', resolve));
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto('http://127.0.0.1:5190');
  await page.waitForSelector('html[data-app-ready="true"]');
  await page.screenshot({
    path: 'outputs/screenshots/before-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'outputs/screenshots/before-mobile.png',
    fullPage: true,
  });
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify(timings));
