import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { representativeState } from '../scripts/benchmark.mjs';
import { simulate } from '../src/core/simulate.js';

for (const engine of ['sequential', 'fresnel']) {
  test(
    `bounded ${engine} analysis workload with 3,603 physical rays`,
    { timeout: 60000 },
    () => {
      const state = representativeState(
        'default-aspheric-doublet',
        1201,
        engine,
      );
      const start = performance.now();
      const result = simulate(state);
      const elapsedMs = performance.now() - start;
      assert.equal(result.status, 'ok', result.errors.join('; '));
      assert.equal(result.traced, 3603);
      assert.ok(result.detectorHits > 3000);
      assert.ok(Number.isFinite(result.rms));
      assert.equal(result.paths.flatMap((group) => group.paths).length, 0);
      // Deliberately broad CI watchdog, not a promise of interactive latency.
      // Representative local timings are recorded by scripts/benchmark.mjs.
      assert.ok(
        elapsedMs < 30000,
        `3,603 rays took ${elapsedMs.toFixed(0)} ms (30 s watchdog)`,
      );
    },
  );
}
