import test from 'node:test';
import assert from 'node:assert/strict';
import { createFresnel } from '../src/core/fresnel.js';
import { orientSurfaceSequence } from '../src/model/components.js';

const wl = 0.55;
const plane = (z, sd = 100, glass = null, extra = {}) => ({
  z,
  sd,
  glass,
  curvature: 0,
  conic: 0,
  ...extra,
});
const model = (surfaces) => ({
  epd: 20,
  surfaces,
  customGlasses: {
    CONSTANT_1_5: {
      coefficients: [1.25, 0, 0, 0, 0, 0],
      provenance: {
        kind: 'analytic-fixture',
        source: 'n²=2.25',
        verified: true,
      },
      wavelengthRangeUm: [0.1, 10],
    },
  },
});
const engine = (surfaces) => createFresnel(model(surfaces));
const close = (a, b, tol = 1e-11) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const powerSum = (r) =>
  r.detectorHits.reduce((s, h) => s + h.power, 0) +
  r.escaped +
  r.blockedPower +
  r.discardedPower +
  r.unresolvedPower;

function checkRegions(result) {
  for (const interaction of result.interactions) {
    assert.equal(interaction.n1, interaction.regionBefore === 'air' ? 1 : 1.5);
    assert.equal(interaction.n2, interaction.regionAfter === 'air' ? 1 : 1.5);
    close(interaction.R + interaction.T, 1);
  }
  for (const segment of result.segments) {
    assert.equal(segment.n, segment.regionId === 'air' ? 1 : 1.5);
    close(
      segment.oplEnd - segment.oplStart,
      segment.n * Math.hypot(...segment.b.map((v, j) => v - segment.a[j])),
    );
  }
  close(powerSum(result), 1);
}

test('unequal apertures: bypassing front and hitting back rejects an invented glass medium', () => {
  const r = engine([
    plane(0, 1, 'CONSTANT_1_5'),
    plane(10, 3),
    plane(20),
  ]).traceFresnel3D([2, 0, -10], [0, 0, 1], wl);
  assert.equal(r.primaryHit, null);
  assert.equal(r.valid, false);
  assert.equal(r.interactions.length, 0);
  assert.equal(r.topologyErrors[0].code, 'medium-region-mismatch');
  assert.equal(r.topologyErrors[0].actualRegionId, 'air');
  assert.equal(r.topologyErrors[0].surfaceIndex, 1);
  close(r.unresolvedPower, 1);
  checkRegions(r);
});

test('unequal apertures: entering front and missing back cannot transport glass to an air detector', () => {
  const r = engine([
    plane(0, 3, 'CONSTANT_1_5'),
    plane(10, 1),
    plane(20),
  ]).traceFresnel3D([2, 0, -10], [0, 0, 1], wl, { ghosts: false });
  assert.equal(r.primaryHit, null);
  assert.equal(r.valid, false);
  assert.equal(r.topologyErrors[0].surfaceIndex, 2);
  assert.equal(r.topologyErrors[0].expectedRegionId, 'air');
  close(r.unresolvedPower, 0.96);
  checkRegions(r);
});

test('bypassing both finite faces remains in exterior air', () => {
  const r = engine([
    plane(0, 1, 'CONSTANT_1_5'),
    plane(10, 1),
    plane(20),
  ]).traceFresnel3D([2, 0, -10], [0, 0, 1], wl);
  assert.equal(r.valid, true);
  assert.equal(r.interactions.length, 0);
  assert.equal(r.primaryHit.regionId, 'air');
  close(r.primaryHit.power, 1);
  close(r.primaryHit.opl, 30);
  checkRegions(r);
});

test('backwards ghosts and multiple internal reflections retain the occupied glass region', () => {
  const r = engine([
    plane(0, 100, 'CONSTANT_1_5'),
    plane(10),
    plane(20),
  ]).traceFresnel3D([0, 0, -10], [0, 0, 1], wl, {
    maxBounces: 6,
    minPower: 1e-10,
  });
  assert.equal(r.valid, true);
  const ghosts = r.detectorHits.filter((h) => h.ghost);
  assert.ok(ghosts.length >= 3);
  close(r.primaryHit.opl, 35);
  close(r.primaryHit.power, 0.96 ** 2);
  const firstGhost = ghosts.sort((a, b) => a.opl - b.opl)[0];
  close(firstGhost.opl, 65);
  close(firstGhost.power, 0.96 ** 2 * 0.04 ** 2);
  const backwards = r.interactions.filter((i) => i.incomingDirection[2] < 0);
  assert.ok(backwards.length >= 3);
  assert.ok(
    backwards.every((i) => i.surfaceIndex === 0 && i.n1 === 1.5 && i.n2 === 1),
  );
  checkRegions(r);
});

test('interior ray initialization and TIR preserve n=1.5 across repeated reflections', () => {
  const angle = Math.PI / 3;
  const r = engine([
    plane(0, 1000, 'CONSTANT_1_5'),
    plane(10, 1000),
    plane(20, 1000),
  ]).traceFresnel3D([0, 0, 5], [Math.sin(angle), 0, Math.cos(angle)], wl, {
    maxBounces: 4,
    ghosts: false,
  });
  assert.equal(r.valid, true);
  assert.equal(r.primaryHit, null);
  assert.equal(r.interactions.length, 5);
  assert.ok(r.interactions.every((i) => i.tir && i.n1 === 1.5 && i.n2 === 1));
  assert.ok(r.segments.every((s) => s.n === 1.5));
  close(r.discardedPower, 1);
  checkRegions(r);
});

test('backwards launch through a plate validates physical region independent of D.z', () => {
  // The detector is intentionally behind the launch and is never hit.
  const r = engine([
    plane(0, 100, 'CONSTANT_1_5'),
    plane(10),
    plane(30),
  ]).traceFresnel3D([0, 0, 20], [0, 0, -1], wl, { ghosts: false });
  assert.equal(r.valid, true);
  assert.deepEqual(
    r.interactions.map((i) => [i.surfaceIndex, i.n1, i.n2]),
    [
      [1, 1, 1.5],
      [0, 1.5, 1],
    ],
  );
  close(r.escaped, 0.96 ** 2);
  checkRegions(r);
});

test('reversed curved assembly keeps boundary adjacency and correct region indices', () => {
  const lens = [
    plane(0, 5, 'CONSTANT_1_5', { curvature: 1 / 50 }),
    plane(5, 5),
  ];
  for (const orientation of [1, -1]) {
    const surfaces = [...orientSurfaceSequence(lens, orientation), plane(80)];
    const r = engine(surfaces).traceFresnel3D([1, 0, -10], [0, 0, 1], wl, {
      ghosts: false,
    });
    assert.equal(r.valid, true);
    assert.ok(r.primaryHit);
    assert.deepEqual(
      r.interactions.map((i) => [i.n1, i.n2]),
      [
        [1, 1.5],
        [1.5, 1],
      ],
    );
    assert.ok(r.primaryHit.direction[0] < 0);
    checkRegions(r);
  }
});

test('same-index disconnected glass regions are distinct and cannot repair a missed boundary', () => {
  const r = engine([
    plane(0, 3, 'CONSTANT_1_5'),
    plane(5, 1),
    plane(10, 3, 'CONSTANT_1_5'),
    plane(15, 3),
    plane(30),
  ]).traceFresnel3D([2, 0, -10], [0, 0, 1], wl, { ghosts: false });
  assert.equal(r.valid, false);
  assert.equal(r.topologyErrors[0].surfaceIndex, 2);
  assert.equal(r.topologyErrors[0].actualRegionId, 'region:0:CONSTANT_1_5');
  assert.equal(
    r.topologyErrors[0].destinationRegionId,
    'region:2:CONSTANT_1_5',
  );
  assert.equal(r.primaryHit, null);
  checkRegions(r);
});

test('undefined initial side geometry is reported and ordinary stop obstruction is separate', () => {
  const ambiguous = engine([
    plane(0, 1, 'CONSTANT_1_5'),
    plane(10, 3),
    plane(20),
  ]).traceFresnel3D([2, 0, 5], [0, 0, 1], wl);
  assert.equal(ambiguous.valid, false);
  assert.equal(ambiguous.topologyErrors[0].code, 'undefined-initial-region');
  checkRegions(ambiguous);
  const stop = engine([
    plane(0, 1, null, { isStop: true }),
    plane(10),
  ]).traceFresnel3D([2, 0, -10], [0, 0, 1], wl);
  assert.equal(stop.valid, true);
  close(stop.blockedPower, 1);
  close(stop.unresolvedPower, 0);
  checkRegions(stop);
});

test('an unresolved ghost side exit does not invalidate a consistently traced primary', () => {
  const r = engine([
    plane(0, 10, 'CONSTANT_1_5'),
    plane(10, 10),
    plane(30),
  ]).traceFresnel3D([0, 0, -1], [Math.sin(0.5), 0, Math.cos(0.5)], wl, {
    maxBounces: 4,
    minPower: 1e-8,
  });
  assert.ok(r.primaryHit);
  assert.equal(r.primaryValid, true);
  assert.equal(r.ghostsValid, false);
  assert.ok(r.topologyErrors.every((error) => error.ghost));
  checkRegions(r);
});
