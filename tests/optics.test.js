import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { createOpticalEngine } from '../src/core/engine.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_EPD,
  DEFAULT_NAME,
} from '../src/data/defaults.js';
import {
  componentLocalSurfaces,
  orientSurfaceSequence,
} from '../src/model/components.js';
import {
  snell,
  fresnelUnpolarized,
  intersect,
  apertureOutside,
  sagSD,
} from '../src/core/surfaces.js';
import { sellmeier } from '../src/core/materials.js';
import { analyzeSpot, analyzeAberration } from '../src/analysis/metrics.js';

function setup() {
  const state = createBenchState(),
    bench = createBench(state);
  bench.initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
    state.importMeta,
  );
  return { state, bench, optics: createOpticalEngine(state) };
}
function near(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}`,
  );
}

// Execute only the original numerical sections, without DOM, renderer, or network.
const reference = readFileSync(
  new URL('../references/tracy-prototype.html', import.meta.url),
  'utf8',
);
const original = reference.slice(
  reference.indexOf('const GLASS_DB'),
  reference.indexOf('// §7  THREE.JS'),
);
const baseline = vm.createContext({});
vm.runInContext(
  original +
    ';this.api={makeCollimated,makePointSource,traceRay,traceFresnel3D,entrancePupil};',
  baseline,
);

for (const source of ['collimated', 'point']) {
  for (const wavelength of [0.4861327, 0.5875618, 0.6562725]) {
    test(`prototype parity: ${source}, ${wavelength} µm, both engines`, () => {
      const { optics } = setup();
      const args =
        source === 'collimated'
          ? [2, -1, 25, wavelength, true, 'pupil3d']
          : [1, -2, -40, 3, -4, 0.3, 25, wavelength, true, 'pupil3d'];
      const name =
        source === 'collimated' ? 'makeCollimated' : 'makePointSource';
      const rays = optics[name](...args),
        expected = baseline.api[name](...args);
      assert.deepEqual(
        JSON.parse(JSON.stringify(rays)),
        JSON.parse(JSON.stringify(expected)),
      );
      for (const ray of rays) {
        for (const trace of ['traceRay', 'traceFresnel3D']) {
          assert.deepEqual(
            JSON.parse(JSON.stringify(optics[trace](ray.O, ray.D, wavelength))),
            JSON.parse(
              JSON.stringify(baseline.api[trace](ray.O, ray.D, wavelength)),
            ),
          );
        }
      }
    });
  }
}

test('independent workbench instances do not share surfaces or libraries', () => {
  const a = setup(),
    b = setup();
  a.bench.createLibraryComponent('pcx', 60);
  a.state.componentLibrary[0].params.R1 = 99;
  assert.equal(b.state.components.length, 2);
  assert.equal(b.state.componentLibrary[0].params.R1, 50);
  a.state.surfaces[0].parm[2] = 9;
  assert.notEqual(b.state.surfaces[0].parm[2], 9);
});
test('Snell law and unpolarized Fresnel conserve power at an air/glass interface', () => {
  const angle = Math.PI / 6,
    D = [Math.sin(angle), 0, Math.cos(angle)],
    N = [0, 0, -1];
  near(snell(D, N, 1, 1.5)[0], Math.sin(angle) / 1.5);
  const f = fresnelUnpolarized([0, 0, 1], N, 1, 1.5);
  near(f.R, 0.04);
  near(f.R + f.T, 1);
  assert.equal(
    snell([Math.sin(Math.PI / 3), 0, Math.cos(Math.PI / 3)], N, 1.5, 1),
    null,
  );
});
test('plane intersection, sphere sag, and aperture boundary', () => {
  const plane = { z: 10, curvature: 0, conic: 0, sd: 5 };
  assert.deepEqual(intersect([0, 0, 0], [0, 0, 1], plane), [0, 0, 10]);
  assert.equal(intersect([0, 0, 0], [0, 0, -1], plane), null);
  assert.equal(apertureOutside([5, 0, 10], plane), false);
  assert.equal(apertureOutside([5.001, 0, 10], plane), true);
  near(sagSD(3, { curvature: 1 / 5, conic: 0 }).s, 1);
});
test('BK7 dispersion and wavelength convention', () => {
  near(sellmeier('N-BK7', 0.5875618), 1.5168000345, 1e-9);
  assert.ok(sellmeier('N-BK7', 0.4861327) > sellmeier('N-BK7', 0.6562725));
});
test('dense bundles retain exact count and optional chief ray', () => {
  const { optics } = setup();
  const a = optics.makePointSource(
    0,
    0,
    -40,
    0,
    0,
    0.7,
    5001,
    0.5875618,
    false,
    'pupil3d',
  );
  assert.equal(a.length, 5001);
  assert.ok(a.every((r) => r.D.every(Number.isFinite)));
  assert.equal(
    optics.makeCollimated(0, 0, 9, 0.5875618, true, 'pupil3d').length,
    10,
  );
});
test('reversing a component twice preserves prescription and material sequence', () => {
  const { state, bench } = setup();
  const c = bench.createLibraryComponent('ach', 80),
    original = componentLocalSurfaces(c);
  const twice = orientSurfaceSequence(orientSurfaceSequence(original, -1), -1);
  for (let i = 0; i < original.length; i++) {
    near(twice[i].z, original[i].z);
    near(twice[i].curvature, original[i].curvature);
    assert.equal(twice[i].glass, original[i].glass);
  }
  assert.ok(state.components.find((c) => c.kind === 'detector').z >= 86.5 + 5);
});
test('ghost cutoff does not change primary detector throughput', () => {
  const { optics } = setup();
  const a = optics.traceFresnel3D([0, 0, -30], [0, 0, 1], 0.5875618, {
    ghosts: false,
  });
  const b = optics.traceFresnel3D([0, 0, -30], [0, 0, 1], 0.5875618, {
    ghosts: true,
    minPower: 0.5,
  });
  near(a.primaryHit.power, b.primaryHit.power);
  assert.ok(a.primaryHit.power > 0 && a.primaryHit.power < 1);
});
test('spot and OPD analysis return explicit empty and finite results', () => {
  assert.equal(analyzeSpot([]).rms, null);
  assert.equal(analyzeAberration([]).points, 0);
  const m = analyzeSpot([
    { p: [-1, 0, 0], power: 1 },
    { p: [1, 0, 0], power: 1 },
  ]);
  near(m.rms, 1);
  near(m.mx, 0);
});
