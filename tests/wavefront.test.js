import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWavefront } from '../src/analysis/wavefront.js';
import { createOpticalEngine } from '../src/core/engine.js';
import { simulate } from '../src/core/simulate.js';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import {
  createSimulationState,
  validateSimulationState,
} from '../src/model/simulation-state.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from '../src/data/defaults.js';

const near = (actual, expected, tolerance = 1e-7) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} vs ${expected} (tolerance ${tolerance})`,
  );

function state() {
  const bench = createBenchState();
  createBench(bench).initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
  );
  const s = createSimulationState(bench);
  s.sampling.count = 201;
  s.spectrum.forEach((w) => (w.enabled = w.key === 'd'));
  return s;
}

// Analytic ideal converging spherical wave: its phase plus remaining distance
// to (0,0,100) is constant. No Tracy tracing/surface formula enters this oracle.
function idealSphere(detectorZ = 100, pupilRadius = 1, tiltNm = [0, 0]) {
  const referenceHit = {
      p: [0, 0, detectorZ],
      direction: [0, 0, 1],
      opl: detectorZ,
      chief: true,
    },
    hits = [];
  for (let i = 0; i < 401; i++) {
    const r = Math.sqrt((i + 0.5) / 401),
      angle = i * Math.PI * (3 - Math.sqrt(5)),
      uv = [r * Math.cos(angle), r * Math.sin(angle)],
      x = uv[0] * pupilRadius,
      y = uv[1] * pupilRadius,
      distance = Math.hypot(x, y, 100),
      direction = [-x / distance, -y / distance, 100 / distance],
      t = detectorZ / direction[2];
    hits.push({
      p: [x + t * direction[0], y + t * direction[1], detectorZ],
      direction,
      opl: t,
      incidentPhaseMm:
        100 - distance - (tiltNm[0] * uv[0] + tiltNm[1] * uv[1]) / 1e6,
      uv,
      sampleWeight: 1 / 401,
      chief: false,
    });
  }
  const options = {
    referenceHit,
    wavelengthKey: 'd',
    wavelengthUm: 0.5875618,
    exitPupilZMm: 0,
  };
  return { hits, options };
}

test('ideal converging sphere has zero WFE at focus, with explicit nm/waves convention', () => {
  const { hits, options } = idealSphere();
  const result = analyzeWavefront(hits, options);
  assert.equal(result.status, 'ok');
  near(result.rmsNm, 0);
  near(result.pvNm, 0);
  assert.equal(result.pistonRemoved, true);
  assert.equal(result.tiltRemoved, false);
  assert.equal(result.defocusRemoved, false);
  assert.deepEqual(result.reference.centerMm, [0, 0, 100]);
  near(result.reference.radiusMm, 100);
});

test('detector motion retains signed defocus and matches the paraxial disk RMS limit', () => {
  const results = [99, 101].map((z) => {
    const { hits, options } = idealSphere(z);
    return analyzeWavefront(hits, options);
  });
  const expectedNm = 1e6 / (4 * Math.sqrt(3) * 100 ** 2);
  for (const result of results) {
    assert.equal(result.status, 'ok');
    assert.ok(Math.abs(result.rmsNm / expectedNm - 1) < 0.011);
    near(result.rmsWaves, result.rmsNm / 587.5618);
    near(result.pvWaves, result.pvNm / 587.5618);
  }
  assert.ok(results[0].points.at(-1).rawWfeNm < 0);
  assert.ok(results[1].points.at(-1).rawWfeNm > 0);
});

test('optional pupil tilt fit removes only piston/linear tilt and retains defocus', () => {
  const perfect = idealSphere(100, 1, [130, -65]);
  const retained = analyzeWavefront(perfect.hits, perfect.options),
    removed = analyzeWavefront(perfect.hits, {
      ...perfect.options,
      removeTilt: true,
    });
  assert.ok(retained.rmsNm > 50);
  near(removed.rmsNm, 0);
  near(removed.tiltUNm, 130);
  near(removed.tiltVNm, -65);
  const defocused = idealSphere(101, 1, [130, -65]);
  const result = analyzeWavefront(defocused.hits, {
    ...defocused.options,
    removeTilt: true,
  });
  assert.ok(result.rmsNm > 14);
  assert.equal(result.defocusRemoved, false);
});

test('WFE ignores intensity weights and zero-weight chief, but rejects a missing reference', () => {
  const { hits, options } = idealSphere(101);
  const base = analyzeWavefront(hits, options);
  const changed = hits.map((h, i) => ({
    ...h,
    sampleWeight: (i + 1) / 100,
    power: 0.1,
    spectralWeight: 0.01,
  }));
  changed.push({ ...options.referenceHit, sampleWeight: 0, uv: [0, 0] });
  const result = analyzeWavefront(changed, options);
  near(result.rmsNm, base.rmsNm);
  near(result.pvNm, base.pvNm);
  assert.equal(result.points.length, hits.length);
  assert.match(
    analyzeWavefront(hits, { ...options, referenceHit: null }).reason,
    /chief/,
  );
});

test('virtual pupil sphere chooses the forward intersection; singular/non-crossing cases are unavailable', () => {
  const { hits, options } = idealSphere();
  const virtual = analyzeWavefront(hits, { ...options, exitPupilZMm: 120 });
  assert.equal(virtual.status, 'ok');
  near(virtual.rmsNm, 0);
  assert.match(
    analyzeWavefront(hits, { ...options, exitPupilZMm: 100 }).reason,
    /singular/,
  );
  const bad = hits.map((h) => ({
    ...h,
    p: [1000, 0, 100],
    direction: [0, 0, 1],
  }));
  assert.match(analyzeWavefront(bad, options).reason, /does not cross/);
});

for (const engine of ['sequential', 'fresnel']) {
  test(`${engine}: selected-wavelength WFE includes incident off-axis phase and ignores launch-plane shifts`, () => {
    const s = state();
    s.engine.type = engine;
    s.source.fieldXDeg = 1.5;
    s.source.fieldYDeg = -0.7;
    const a = simulate(s);
    assert.equal(a.wavefront.status, 'ok');
    assert.ok(a.hits.some((h) => Math.abs(h.incidentPhaseMm) > 0.01));
    s.source.zMm -= 15;
    s.display.showChief = false;
    s.display.count = 0;
    const b = simulate(s);
    assert.equal(b.wavefront.status, 'ok');
    near(b.wavefront.rmsNm, a.wavefront.rmsNm, 2e-5);
    near(b.wavefront.pvNm, a.wavefront.pvNm, 2e-5);
    assert.equal(b.wavefront.points.length, a.wavefront.points.length);
    assert.ok(b.wavefront.points.length > 190);
    for (let i = 0; i < a.wavefront.points.length; i++)
      near(b.wavefront.points[i].wfeNm, a.wavefront.points[i].wfeNm, 2e-5);
    const noPhase = analyzeWavefront(
      a.hits.map((h) => ({ ...h, incidentPhaseMm: 0 })),
      {
        referenceHit: a.referenceHits[0],
        wavelengthUm: 0.5875618,
        exitPupilZMm: a.wavefront.reference.exitPupilZMm,
      },
    );
    assert.ok(noPhase.rmsNm > 5 * a.wavefront.rmsNm);
  });
}

test('sequential and Fresnel WFE agree despite different delivered-power distributions', () => {
  const s = state();
  s.source.fieldXDeg = 1;
  s.source.gaussianSigma = 0.4;
  const a = simulate(s);
  s.engine.type = 'fresnel';
  s.spectrum.forEach((w) => (w.sourceWeight = 7));
  const b = simulate(s);
  assert.equal(a.wavefront.status, 'ok');
  assert.equal(b.wavefront.status, 'ok');
  near(a.wavefront.rmsNm, b.wavefront.rmsNm, 2e-5);
  near(a.wavefront.pvNm, b.wavefront.pvNm, 2e-5);
  assert.ok(b.throughput < a.throughput);
});

test('inactive wavelength, afocal pupil and malformed wavefront settings are explicit', () => {
  const s = state();
  s.analysis.wavefrontWavelengthKey = 'F';
  assert.match(simulate(s).wavefront.reason, /Enable the selected/);
  s.analysis.wavefrontWavelengthKey = 'd';
  s.surfaces = [
    { z: 0, curvature: 0, sd: 20, glass: null, isStop: true },
    { z: 100, curvature: 0, sd: 20, glass: null, componentKind: 'detector' },
  ];
  const result = simulate(s);
  assert.equal(result.status, 'ok');
  assert.equal(result.wavefront.status, 'unavailable');
  assert.match(result.wavefront.reason, /Afocal/);
  s.analysis.wavefrontUnits = 'um';
  assert.match(validateSimulationState(s).join(' '), /Wavefront units/);
});

test('exit pupil images an explicit stop and flags an infinite pupil', () => {
  const model = {
    epd: 2,
    components: [],
    surfaces: [
      { z: 0, curvature: 0, sd: 1, glass: null, isStop: true },
      { z: 10, curvature: 0.1, sd: 5, glass: 'N-BK7' },
      { z: 12, curvature: 0, sd: 5, glass: null },
      { z: 40, curvature: 0, sd: 10, glass: null, componentKind: 'detector' },
    ],
  };
  const pupil = createOpticalEngine(model).exitPupil(0.5875618);
  assert.equal(pupil.finite, true);
  assert.equal(pupil.stopIndex, 0);
  assert.ok(pupil.z < 0);
  assert.equal(pupil.afocal, false);
  model.customGlasses = { 'CONSTANT-1.5': [1.25, 0, 0, 0, 0, 0] };
  model.surfaces[1].glass = 'CONSTANT-1.5';
  model.surfaces[1].curvature = 0.2;
  const infinite = createOpticalEngine(model).exitPupil(0.5875618);
  assert.equal(infinite.finite, false);
  assert.match(infinite.reason, /infinity/);
});
