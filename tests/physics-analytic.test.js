import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpticalEngine } from '../src/core/engine.js';
import {
  snell,
  fresnelUnpolarized,
  sagSD,
  intersect,
} from '../src/core/surfaces.js';
import { sellmeier } from '../src/core/materials.js';
import { orientSurfaceSequence } from '../src/model/components.js';

const wavelength = 0.5875618;
const plane = (z, glass = null, extra = {}) => ({
  z,
  glass,
  curvature: 0,
  conic: 0,
  sd: 100,
  type: 'STANDARD',
  parm: {},
  ...extra,
});
const close = (actual, expected, tol = 2e-10) =>
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${actual} != ${expected} (tol ${tol})`,
  );

test('TEST-020 plane Snell and critical-angle limits obey analytical sine law', () => {
  for (const [n1, n2] of [
    [1, 1.5],
    [1.5, 1],
    [1, 2],
  ]) {
    for (const theta of [0, 0.1, 0.3, 0.65, 0.9, 1.2]) {
      const d = [Math.sin(theta), 0, Math.cos(theta)];
      const out = snell(d, [0, 0, -1], n1, n2);
      const sinT = (n1 / n2) * Math.sin(theta);
      if (sinT > 1) assert.equal(out, null);
      else {
        close(out[0], sinT);
        close(out[2], Math.sqrt(1 - sinT * sinT));
      }
    }
  }
  const critical = Math.asin(1 / 1.5);
  const at = snell(
    [Math.sin(critical), 0, Math.cos(critical)],
    [0, 0, -1],
    1.5,
    1,
  );
  close(at[0], 1);
  close(at[2], 0, 3e-8);
  assert.equal(
    snell(
      [Math.sin(critical + 1e-7), 0, Math.cos(critical + 1e-7)],
      [0, 0, -1],
      1.5,
      1,
    ),
    null,
  );
});

test('TEST-021 tilted parallel plate has analytical displacement, direction, OPL and power', () => {
  const n = sellmeier('N-BK7', wavelength),
    theta = 0.35;
  const refracted = Math.asin(Math.sin(theta) / n),
    thickness = 5;
  const surfaces = [plane(0, 'N-BK7'), plane(thickness), plane(25)];
  const engine = createOpticalEngine({ surfaces, epd: 50 });
  const d = [Math.sin(theta), 0, Math.cos(theta)],
    origin = [0, 0, -20];
  const expectedX = 40 * Math.tan(theta) + thickness * Math.tan(refracted);
  const expectedOPL =
    40 / Math.cos(theta) + (n * thickness) / Math.cos(refracted);
  const fr = fresnelUnpolarized(d, [0, 0, -1], 1, n);
  const seq = engine.traceRay(origin, d, wavelength);
  close(seq.points.at(-1)[0], expectedX);
  close(seq.opl, expectedOPL);
  const traced = engine.traceFresnel3D(origin, d, wavelength, {
    ghosts: false,
  });
  close(traced.primaryHit.p[0], expectedX);
  close(traced.primaryHit.opl, expectedOPL, 3e-8);
  close(traced.primaryHit.power, (1 - fr.R) ** 2);
});

test('TEST-022 thick-lens EFL obeys lensmaker equation and reversal preserves power', () => {
  const n = sellmeier('N-BK7', wavelength),
    thickness = 5,
    r1 = 50,
    r2 = -35;
  const lens = [
    plane(0, 'N-BK7', { curvature: 1 / r1 }),
    plane(thickness, null, { curvature: 1 / r2 }),
  ];
  const expected =
    1 / ((n - 1) * (1 / r1 - 1 / r2 + ((n - 1) * thickness) / (n * r1 * r2)));
  for (const orientation of [1, -1]) {
    const surfaces = [...orientSurfaceSequence(lens, orientation), plane(100)];
    const engine = createOpticalEngine({ surfaces, epd: 24 });
    const matrix = engine.paraxialToSurface(2, wavelength);
    close(-1 / matrix[2], expected);
  }
});

test('TEST-023 paraboloid plus even powers has exact axial intercept and sag derivative', () => {
  const s = plane(3, 'N-BK7', {
    type: 'EVENASPH',
    curvature: 0.025,
    conic: -1,
    parm: { 2: 1e-6, 3: -1e-10 },
  });
  for (const r of [0, 1, 4, 8]) {
    const expectedSag = (0.025 * r * r) / 2 + 1e-6 * r ** 4 - 1e-10 * r ** 6;
    const expectedDerivative = 0.025 * r + 4e-6 * r ** 3 - 6e-10 * r ** 5;
    const sag = sagSD(r, s);
    close(sag.s, expectedSag);
    close(sag.d, expectedDerivative);
    const hit = intersect([0, r, -10], [0, 0, 1], s);
    close(hit[2], 3 + expectedSag);
  }
});

test('TEST-024 finite point free propagation and explicit stop clipping are geometrical', () => {
  const engine = createOpticalEngine({
    surfaces: [plane(0, null, { sd: 2, isStop: true }), plane(30)],
    epd: 20,
  });
  for (const targetX of [0, 1.9, 2.1, 3]) {
    const origin = [0.5, -0.25, -20],
      d = [targetX - 0.5, 0.25, 20];
    const length = Math.hypot(...d),
      unit = d.map((x) => x / length);
    const seq = engine.traceRay(origin, unit, wavelength);
    assert.equal(seq.vignetted, targetX > 2);
    if (!seq.vignetted) {
      close(seq.points.at(-1)[0], 0.5 + 2.5 * (targetX - 0.5));
      close(seq.points.at(-1)[1], 0.375);
      close(seq.opl, 2.5 * length);
    }
  }
});

test('TEST-025 two-slab primary and plate ghost obey closed-form power/OPL', () => {
  const n = sellmeier('N-BK7', wavelength),
    r = ((n - 1) / (n + 1)) ** 2;
  const engine = createOpticalEngine({
    surfaces: [plane(0, 'N-BK7'), plane(5), plane(25)],
    epd: 20,
  });
  const result = engine.traceFresnel3D([0, 0, -20], [0, 0, 1], wavelength, {
    ghosts: true,
    minPower: 1e-10,
    maxBounces: 4,
  });
  close(result.primaryHit.power, (1 - r) ** 2);
  close(result.primaryHit.opl, 40 + 5 * n, 3e-8);
  const ghosts = result.detectorHits
    .filter((h) => h.ghost)
    .sort((a, b) => b.power - a.power);
  close(ghosts[0].power, (1 - r) ** 2 * r ** 2);
  close(ghosts[0].opl, 40 + 15 * n, 3e-8);
  close(ghosts[1].power, (1 - r) ** 2 * r ** 4);
  close(ghosts[1].opl, 40 + 25 * n, 3e-8);
  const double = createOpticalEngine({
    surfaces: [
      plane(0, 'N-BK7'),
      plane(5),
      plane(10, 'N-BK7'),
      plane(15),
      plane(25),
    ],
    epd: 20,
  });
  close(
    double.traceFresnel3D([0, 0, -20], [0, 0, 1], wavelength, { ghosts: false })
      .primaryHit.power,
    (1 - r) ** 4,
  );
});
