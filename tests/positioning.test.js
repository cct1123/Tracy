import test from 'node:test';
import assert from 'node:assert/strict';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { componentLength } from '../src/model/components.js';
import {
  createSimulationState,
  validateSimulationState,
} from '../src/model/simulation-state.js';
import { focusScan, simulate } from '../src/core/simulate.js';
import { createOpticalEngine } from '../src/core/engine.js';
import { generateSourceSamples } from '../src/core/sources.js';

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

test('detector crosses optics without relocation and remains the identified detector', () => {
  const { state, bench, lens, detector } = setup();
  for (const z of [-10, 0, 2, 4, 40]) {
    detector.z = bench.snapZ(z, 0);
    bench.syncSurfacesFromComponents();
    assert.equal(detector.z, z);
    assert.equal(lens.z, 0);
    assert.equal(state.surfaces.at(-1).componentId, detector.id);
    assert.equal(state.surfaces.at(-1).z, z);
    const snapshot = createSimulationState(state);
    assert.deepEqual(validateSimulationState(snapshot), []);
    for (const engine of ['sequential', 'fresnel']) {
      snapshot.engine.type = engine;
      const result = simulate(snapshot);
      assert.equal(result.status, z <= 4 ? 'blocked' : 'ok');
      if (z <= 4)
        assert.match(result.errors.join(' '), /detector after the optics/);
    }
  }
});

test('lenses cross neighbors and reorder while overlap stays editable with blocked results', () => {
  const { state, bench, lens, detector } = setup();
  const next = bench.createLibraryComponent('pcx', 20);
  detector.z = 60;
  for (const z of [10, 3, -10]) {
    next.z = z;
    bench.syncSurfacesFromComponents();
    assert.equal(next.z, z);
    assert.equal(lens.z, 0);
    assert.equal(detector.z, 60);
    assert.equal(state.surfaces[0].componentId, z < 0 ? next.id : lens.id);
    const snapshot = createSimulationState(state);
    for (const engine of ['sequential', 'fresnel']) {
      snapshot.engine.type = engine;
      const result = simulate(snapshot);
      assert.equal(result.status, z === 3 ? 'blocked' : 'ok');
      if (z === 3) assert.match(result.errors.join(' '), /overlap/);
    }
  }
});

test('fine coordinates and insertion never move neighboring objects', () => {
  const { state, bench, lens, detector } = setup();
  assert.equal(bench.snapZ(0.01, 0.01), 0.01);
  assert.equal(bench.snapZ(0.012345, 0), 0.012345);
  const detectorZ = detector.z;
  const overlap = bench.createLibraryComponent('pcx', 2);
  const beyond = bench.createLibraryComponent('pcx', 80);
  bench.syncSurfacesFromComponents();
  assert.equal(overlap.z, 2);
  assert.equal(beyond.z, 80);
  assert.equal(lens.z, 0);
  assert.equal(detector.z, detectorZ);
  assert.equal(state.components.length, 4);
  assert.equal(bench.createLibraryComponent('det', -50).id, detector.id);
  assert.equal(detector.z, -50);
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

test('an empty bench preserves its detector position', () => {
  const { state, bench, detector } = setup();
  state.components = [detector];
  detector.z = -1;
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

test('point and collimated sources can retain crossed coordinates and resume tracing', () => {
  const { state, bench } = setup();
  bench.syncSurfacesFromComponents();
  for (const type of ['point', 'collimated']) {
    const snapshot = createSimulationState(state, {
      source: { type, zMm: 40 },
    });
    assert.deepEqual(validateSimulationState(snapshot), []);
    assert.equal(simulate(snapshot).status, 'blocked');
    assert.equal(snapshot.source.zMm, 40);
    snapshot.source.zMm = -40;
    assert.equal(simulate(snapshot).status, 'ok');
  }
});

test('both collimated sampling modes use the selected launch plane', () => {
  const { state, bench } = setup();
  bench.syncSurfacesFromComponents();
  const optics = createOpticalEngine(state);
  for (const illumination of ['entrance-pupil', 'fixed-disk']) {
    const snapshot = createSimulationState(state, {
      source: { illumination, zMm: -60.012345 },
    });
    const { samples, reference } = generateSourceSamples(
      state,
      optics,
      snapshot,
      0.5875618,
    );
    assert.ok([...samples, reference].every((ray) => ray.O[2] === -60.012345));
  }
});

test('moving a collimated launch in air preserves hits and adds the analytic optical path', () => {
  const { state, bench } = setup();
  state.benchEpd = 4;
  bench.syncSurfacesFromComponents();
  const snapshot = createSimulationState(state, {
    source: { zMm: -40, fieldXDeg: 1, diameterMm: 4 },
  });
  for (const engine of ['sequential', 'fresnel']) {
    for (const illumination of ['entrance-pupil', 'fixed-disk']) {
      snapshot.engine.type = engine;
      snapshot.source.illumination = illumination;
      snapshot.source.zMm = -40;
      const a = simulate(snapshot);
      snapshot.source.zMm = -60;
      const b = simulate(snapshot);
      assert.equal(a.status, 'ok');
      assert.equal(b.status, 'ok');
      assert.equal(a.hits.length, b.hits.length);
      assert.ok(a.hits.length > 0);
      for (let i = 0; i < a.hits.length; i++) {
        assert.ok(
          Math.hypot(...a.hits[i].p.map((v, axis) => v - b.hits[i].p[axis])) <
            1e-8,
        );
        assert.ok(
          Math.abs(
            b.hits[i].opl - a.hits[i].opl - 20 / Math.cos(Math.PI / 180),
          ) < 1e-8,
        );
      }
    }
  }
});

test('collimated launch inside curved glass is blocked in both engines', () => {
  const { state, bench, lens } = setup();
  Object.assign(lens.params, { R1: -50, t: 5, diameter: 24 });
  bench.syncSurfacesFromComponents();
  const snapshot = createSimulationState(state, { source: { zMm: -0.1 } });
  for (const engine of ['sequential', 'fresnel']) {
    snapshot.engine.type = engine;
    const result = simulate(snapshot);
    assert.equal(result.status, 'blocked');
    assert.match(result.errors.join(' '), /exterior air/);
  }
});
