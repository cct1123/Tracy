import test from 'node:test';
import assert from 'node:assert/strict';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { componentLength } from '../src/model/components.js';
import { createSimulationState } from '../src/model/simulation-state.js';
import { focusScan, simulate } from '../src/core/simulate.js';

function setup() {
  const state = createBenchState(),
    bench = createBench(state);
  const lens = bench.createLibraryComponent('pcx', 0);
  const detector = state.components.find((c) => c.kind === 'detector');
  return { state, bench, lens, detector };
}

test('a detector 0.01 mm behind the final lens stays there on rebuild', () => {
  const { state, bench, lens, detector } = setup();
  detector.z = componentLength(lens) + 0.01;
  const expected = detector.z;
  bench.syncSurfacesFromComponents();
  assert.equal(detector.z, expected);
  assert.equal(state.surfaces.at(-1).z, expected);
});

test('invalid detector positions are repaired just after the optic, independent of grid', () => {
  const { bench, lens, detector } = setup();
  lens.z = 0.023456;
  const last = lens.z + componentLength(lens);
  detector.z = last;
  bench.ensureDetectorAfterOptics();
  assert.ok(detector.z > last && detector.z < last + 0.001);
  const clamped = bench.clampDraggedZ(detector, -10);
  assert.ok(clamped > last && clamped < last + 0.001);
});

test('fine moves and typed coordinates are not re-snapped to the base grid', () => {
  const { bench, lens } = setup();
  assert.equal(bench.clampDraggedZ(lens, 0.01, 0.01), 0.01);
  assert.equal(bench.clampDraggedZ(lens, 0.012345, 0), 0.012345);
});

test('adding beyond the detector retains working space without relocating a valid close detector', () => {
  const { state, bench, lens, detector } = setup();
  detector.z = componentLength(lens) + 0.01;
  bench.createLibraryComponent('stop', -10);
  assert.equal(detector.z, componentLength(lens) + 0.01);
  const next = bench.createLibraryComponent('pcx', 50);
  assert.equal(detector.z, 50 + componentLength(next) + 30);
  next.z = bench.clampDraggedZ(next, 50.01, 0);
  bench.syncSurfacesFromComponents();
  assert.equal(next.z, 50.01);
  assert.equal(state.surfaces.at(-1).z, detector.z);
});

test('a lens can approach the detector without the lens-to-lens spacer', () => {
  const { bench, lens, detector } = setup();
  detector.z = componentLength(lens) + 0.02;
  lens.z = bench.clampDraggedZ(lens, 0.019, 0);
  assert.equal(lens.z, 0.019);
  const expected = detector.z;
  bench.syncSurfacesFromComponents();
  assert.equal(detector.z, expected);
});

test('grid rounding cannot put lenses inside their neighbor clearance', () => {
  const { bench, lens } = setup();
  const next = bench.createLibraryComponent('pcx', 10);
  next.z = componentLength(lens) + 0.8 + 0.05321;
  lens.z = bench.clampDraggedZ(lens, 5);
  assert.ok(lens.z + componentLength(lens) + 0.8 <= next.z);
});

test('imported detector at z=0 retains a short image distance', () => {
  const state = createBenchState(),
    bench = createBench(state);
  const surface = {
    type: 'STANDARD',
    curvature: 0,
    conic: 0,
    parm: {},
    glass: 'AIR',
    sd: 1,
  };
  bench.initializeBenchFromSurfaces(
    [
      { ...surface, z: -0.1 },
      { ...surface, z: 0 },
    ],
    'Short image distance',
    2,
  );
  assert.equal(state.surfaces.at(-1).z, 0);
});

test('an empty bench does not impose an origin-based detector clearance', () => {
  const { state, bench, detector } = setup();
  state.components = [detector];
  detector.z = bench.clampDraggedZ(detector, -1, 0);
  bench.syncSurfacesFromComponents();
  assert.equal(detector.z, -1);
});

test('a short-focus singlet traces and scans within 5 mm of its exit vertex', () => {
  const { state, bench, lens, detector } = setup();
  Object.assign(lens.params, { R1: 1, t: 0.3, diameter: 0.5 });
  state.benchEpd = 0.4;
  detector.z = 0.301;
  bench.syncSurfacesFromComponents();
  const snapshot = createSimulationState(state);
  for (const engine of ['sequential', 'fresnel']) {
    snapshot.engine.type = engine;
    const result = simulate(snapshot);
    assert.equal(result.status, 'ok');
    assert.ok(Math.abs(result.bundleSurvival - 1) < 1e-12);
    const scan = focusScan(snapshot, { fromMm: 0.301, toMm: 3, steps: 11 });
    assert.ok(scan.best.zMm > 0.301 && scan.best.zMm < 3);
    assert.ok(scan.best.rmsMm < scan.points[0].rmsMm);
    assert.equal(detector.z, 0.301, 'Scanning must not move the bench');
  }
});
