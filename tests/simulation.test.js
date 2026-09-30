import test from 'node:test';
import assert from 'node:assert/strict';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { createSimulationState } from '../src/model/simulation-state.js';
import { simulate, focusScan } from '../src/core/simulate.js';
import { createOpticalEngine } from '../src/core/engine.js';
import { generateSourceSamples } from '../src/core/sources.js';
import { analyzeSpot, analyzeRelativeOPL } from '../src/analysis/metrics.js';
import { createSimulationRunner } from '../src/core/worker-client.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from '../src/data/defaults.js';

function setup() {
  const model = createBenchState();
  createBench(model).initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
  );
  return createSimulationState(model);
}
function near(a, b, tol = 1e-12) {
  assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);
}
function physical(r) {
  return {
    traced: r.traced,
    vignetted: r.vignetted,
    throughput: r.throughput,
    bundleSurvival: r.bundleSurvival,
    rms: r.rms,
    centroid: r.centroid,
    opl: r.relativeOPL?.opdRms,
    wavelengths: r.perWavelength,
  };
}

for (const engine of ['sequential', 'fresnel'])
  for (const source of ['collimated', 'point'])
    test(`chief, ghost display and visible count never change ${engine}/${source} physical metrics`, () => {
      const state = setup();
      state.engine.type = engine;
      state.source.type = source;
      state.source.na = 0.2;
      const first = simulate(state);
      assert.equal(first.status, 'ok');
      state.display.showChief = false;
      state.display.count = 2;
      const second = simulate(state);
      assert.deepEqual(physical(second), physical(first));
      state.engine.ghosts = true;
      state.display.showGhosts = true;
      const third = simulate(state);
      assert.deepEqual(physical(third), physical(first));
      assert.equal(first.traced, 3 * 49);
      assert.ok(second.paths.every((g) => g.paths.length <= 2));
    });

test('ghost cutoff cannot vignette a weak but positive primary transmission', () => {
  const state = setup();
  state.components = [];
  state.surfaces = Array.from({ length: 851 }, (_, i) => ({
    z: i,
    curvature: 0,
    conic: 0,
    sd: 10,
    type: 'STANDARD',
    glass: i < 850 && i % 2 === 0 ? 'N-BK7' : 'air',
    componentKind: i === 850 ? 'detector' : 'imported',
  }));
  state.source.illumination = 'fixed-disk';
  state.source.diameterMm = 2;
  state.spectrum = [state.spectrum[1]];
  state.sampling.count = 1;
  state.engine.type = 'fresnel';
  state.engine.ghosts = false;
  state.engine.minPower = 0;
  const unpruned = simulate(state);
  assert.equal(unpruned.status, 'ok');
  assert.equal(unpruned.bundleSurvival, 1);
  assert.ok(unpruned.throughput > 0 && unpruned.throughput < 1e-15);
  state.engine.minPower = 0.003;
  const cutoff = simulate(state);
  assert.equal(cutoff.status, 'ok');
  assert.equal(cutoff.bundleSurvival, 1);
  assert.equal(cutoff.vignetted, 0);
  assert.equal(cutoff.throughput, unpruned.throughput);
});

test('zero-weight, reference and zero-power samples never acquire fallback weight', () => {
  const hits = [
    { p: [-1, 0, 0], power: 1 },
    { p: [1, 0, 0], power: 1 },
    { p: [100, 0, 0], power: 1, chief: true },
    { p: [100, 0, 0], power: 0 },
  ];
  near(analyzeSpot(hits).rms, 1);
  assert.equal(analyzeSpot([{ p: [0, 0, 0], power: 0 }]).rms, null);
  const points = hits.map((p, i) => ({
    ...p,
    uv: [0, i / 4],
    rho: i / 4,
    opl: i,
    wl: 0.55,
  }));
  assert.equal(analyzeRelativeOPL(points).points, 2);
});

test('spectral normalization and pure result use supplied source power', () => {
  const s = setup();
  s.spectrum[0].sourceWeight = 2;
  s.spectrum[1].sourceWeight = 1;
  s.spectrum[2].sourceWeight = 0;
  const original = structuredClone(s),
    r = simulate(s);
  assert.deepEqual(s, original);
  near(r.wavelengths[0].normalizedWeight, 2 / 3);
  near(r.wavelengths[1].normalizedWeight, 1 / 3);
  near(
    r.throughput,
    r.perWavelength.reduce(
      (sum, w) => sum + w.normalizedWeight * w.throughput,
      0,
    ),
  );
  s.spectrum.forEach((w) => (w.sourceWeight = 0));
  assert.equal(simulate(s).status, 'blocked');
});

test('unknown materials block strict results and visibly mark exploratory results', () => {
  const s = setup();
  s.surfaces[0].glass = 'UNRESOLVED';
  assert.equal(simulate(s).status, 'blocked');
  s.engine.materialMode = 'exploratory';
  const r = simulate(s);
  assert.equal(r.status, 'ok');
  assert.ok(r.warnings.some((w) => w.includes('n=1.52')));
  assert.equal(r.materials.approximate, true);
});

test('blocked simulations retain an empty canonical relative OPL result', () => {
  for (const invalidate of [
    (s) => (s.sampling.count = 0),
    (s) => (s.surfaces.at(-1).z = -10),
    (s) => (s.surfaces[0].glass = 'UNRESOLVED'),
  ]) {
    const state = setup();
    invalidate(state);
    const result = simulate(state);
    assert.equal(result.status, 'blocked');
    assert.deepEqual(result.relativeOPL, analyzeRelativeOPL([]));
    assert.equal(result.aberration, result.relativeOPL);
    assert.equal(result.wavefront.status, 'unavailable');
    assert.equal(result.rms, null);
  }
});

test('uniform solid-angle point quadrature has correct mean cosine and normalized weights', () => {
  const s = setup();
  s.source.type = 'point';
  s.source.na = 0.8;
  s.sampling.count = 1001;
  const m = {
    surfaces: s.surfaces,
    components: s.components,
    epd: s.epdMm,
    importMeta: s.importMeta,
  };
  const rays = generateSourceSamples(m, createOpticalEngine(m), s, 0.55);
  near(
    rays.samples.reduce((v, r) => v + r.sampleWeight * r.D[2], 0),
    (1 + Math.cos(Math.asin(0.8))) / 2,
  );
  near(
    rays.samples.reduce((v, r) => v + r.sampleWeight, 0),
    1,
  );
  assert.equal(rays.reference.sampleWeight, 0);
});

test('fixed source disk reports reduced collection when stop shrinks; targeted pupil does not claim total power', () => {
  const s = setup();
  s.surfaces = [
    {
      z: 0,
      curvature: 0,
      sd: 5,
      glass: null,
      isStop: true,
      componentKind: 'aperture',
    },
    { z: 10, curvature: 0, sd: 20, glass: null, componentKind: 'detector' },
  ];
  s.components = [];
  s.sampling.count = 1001;
  s.source.illumination = 'fixed-disk';
  s.source.diameterMm = 10;
  const a = simulate(s);
  near(a.sourceCollection, 1);
  s.surfaces[0].sd = 2.5;
  const b = simulate(s);
  near(b.sourceCollection, 0.25, 1 / 1001);
  s.source.illumination = 'entrance-pupil';
  assert.equal(simulate(s).sourceCollection, null);
  s.source.illumination = 'fixed-disk';
  s.sampling.pattern = 'ring';
  assert.equal(simulate(s).sourceCollection, null);
});

test('custom and Gaussian weighting are independent from optical power', () => {
  const s = setup();
  s.sampling.count = 3;
  s.sampling.customWeights = [1, 0, 3];
  let r = simulate(s);
  assert.equal(r.status, 'ok');
  near(r.hits[0].sampleWeight, 0.25);
  near(r.hits[2].sampleWeight, 0.75);
  s.sampling.customWeights = null;
  s.source.gaussianSigma = 0.8;
  r = simulate(s);
  assert.equal(r.status, 'ok');
  assert.ok(r.hits[0].sampleWeight > r.hits[2].sampleWeight);
});

test('focus scan returns a tested minimum, preserves input and rejects interval before optics', () => {
  const s = setup(),
    original = structuredClone(s);
  const fromMm = s.surfaces.at(-2).z + 5;
  const scan = focusScan(s, { fromMm, toMm: fromMm + 60, steps: 13 });
  assert.deepEqual(s, original);
  assert.equal(scan.points.length, 13);
  assert.equal(scan.best.rmsMm, Math.min(...scan.points.map((p) => p.rmsMm)));
  assert.throws(() => focusScan(s, { fromMm: -1, toMm: 20 }), /after/);
});

test('worker cancellation terminates old calculation and rejects late results', async () => {
  const workers = [];
  const runner = createSimulationRunner(() => {
    const w = {
      terminate() {
        this.terminated = true;
      },
      postMessage(m) {
        this.message = m;
      },
    };
    workers.push(w);
    return w;
  });
  const a = runner.run({ a: 1 });
  const first = workers[0];
  const b = runner.run({ a: 2 });
  assert.equal(first.terminated, true);
  assert.equal(await a, null);
  first.onmessage({ data: { id: first.message.id, result: 'stale' } });
  workers[1].onmessage({
    data: { id: workers[1].message.id, result: 'current' },
  });
  assert.equal(await b, 'current');
});

test('canonical input rejects unsupported geometry, malformed collections and missing detector', () => {
  const s = setup();
  for (const mutate of [
    (x) => {
      x.surfaces[0].type = 'TOROIDAL';
    },
    (x) => {
      x.surfaces[0].conic = NaN;
    },
    (x) => {
      x.surfaces.pop();
    },
    (x) => {
      x.surfaces = {};
    },
    (x) => {
      x.spectrum = {};
    },
  ]) {
    const bad = structuredClone(s);
    mutate(bad);
    assert.equal(simulate(bad).status, 'blocked');
  }
});

test('large finite relative weights normalize without overflow', () => {
  const s = setup();
  s.sampling.count = 3;
  s.sampling.customWeights = [1e308, 1e308, 1e308];
  s.spectrum.forEach((w) => (w.sourceWeight = 1e308));
  const r = simulate(s);
  assert.equal(r.status, 'ok');
  near(r.throughput, 1);
  assert.ok(r.rms > 0);
});

test('point sources inside a curved glass volume are rejected consistently', () => {
  const s = setup();
  s.surfaces = [
    { z: 0, curvature: -0.02, sd: 12, glass: 'N-BK7' },
    { z: 5, curvature: 0, sd: 12, glass: null },
    { z: 50, curvature: 0, sd: 20, glass: null, componentKind: 'detector' },
  ];
  Object.assign(s.source, { type: 'point', xMm: 8, zMm: -0.1, na: 0.01 });
  for (const engine of ['sequential', 'fresnel']) {
    s.engine.type = engine;
    assert.equal(simulate(s).status, 'blocked');
  }
});

test('zero-weight undefined display paths do not invalidate supported emitted power', () => {
  const s = setup();
  s.surfaces = [
    { z: 0, curvature: 0, sd: 1, glass: 'N-BK7' },
    { z: 5, curvature: 0, sd: 3, glass: null },
    { z: 50, curvature: 0, sd: 20, glass: null, componentKind: 'detector' },
  ];
  s.components = [];
  s.source.illumination = 'fixed-disk';
  s.source.diameterMm = 4;
  s.engine.type = 'fresnel';
  s.sampling.count = 3;
  s.sampling.customWeights = [1, 0, 0];
  const r = simulate(s);
  assert.equal(r.status, 'ok');
  assert.ok(r.throughput > 0.8);
  assert.ok(r.warnings.length > 0);
});

test('synchronous worker message failures terminate the worker', async () => {
  const worker = {
    terminate() {
      this.terminated = true;
    },
    postMessage() {
      throw new Error('DataCloneError');
    },
  };
  const runner = createSimulationRunner(() => worker);
  await assert.rejects(runner.run({}), /DataCloneError/);
  assert.equal(worker.terminated, true);
});
