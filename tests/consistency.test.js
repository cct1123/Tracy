import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { createOpticalEngine } from '../src/core/engine.js';
import { GLASS_DB, sellmeier } from '../src/core/materials.js';
import { parseZMX } from '../src/io/zmx.js';
import { validateProjectJSON } from '../src/io/project-schema.js';
import { installImports } from '../src/ui/imports.js';

const wl = 0.5875618;
const example = readFileSync(
  new URL('../examples/plano-convex.zmx', import.meta.url),
  'utf8',
);
const plane = (z, sd = 10, extra = {}) => ({
  z,
  sd,
  type: 'STANDARD',
  curvature: 0,
  conic: 0,
  parm: {},
  glass: null,
  ...extra,
});
function near(actual, expected, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );
}
function importWorkbench(t) {
  const previous = globalThis.document;
  const nodes = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!nodes.has(id))
        nodes.set(id, { value: '', innerHTML: '', textContent: '' });
      return nodes.get(id);
    },
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  });
  const state = createBenchState(),
    bench = createBench(state),
    ui = { renderLibrary() {} };
  installImports({ state, bench, ui });
  return { state, bench, ui, nodes, optics: createOpticalEngine(state) };
}

test('imported STOP and bench apertures block the same rays in both engines', () => {
  for (const componentKind of ['imported', 'aperture', undefined]) {
    const state = createBenchState();
    state.surfaces = [plane(0, 1, { isStop: true, componentKind }), plane(10)];
    const optics = createOpticalEngine(state);
    for (const x of [0, 1, 1.001, 5]) {
      const sequential = optics.traceRay([x, 0, -10], [0, 0, 1], wl);
      const fresnel = optics.traceFresnel3D([x, 0, -10], [0, 0, 1], wl);
      assert.equal(sequential.vignetted, x > 1);
      assert.equal(!!fresnel.primaryHit, !sequential.vignetted);
    }
    // An ordinary finite optic remains bypassable in the Fresnel engine.
    state.surfaces[0] = plane(0, 1, { componentKind: 'imported' });
    assert.ok(optics.traceFresnel3D([5, 0, -10], [0, 0, 1], wl).primaryHit);
  }
});

test('long Fresnel paths reach the detector independently of the ghost budget', () => {
  const n = sellmeier('N-BK7', wl);
  const transmission = 1 - ((n - 1) / (n + 1)) ** 2;
  for (const count of [96, 97, 161]) {
    const state = createBenchState();
    state.surfaces = Array.from({ length: count }, (_, i) =>
      plane(i, 10, {
        glass: i < count - 1 && i % 2 === 0 ? 'N-BK7' : null,
        componentKind: i === count - 1 ? 'detector' : 'imported',
      }),
    );
    const optics = createOpticalEngine(state);
    const seq = optics.traceRay([0, 0, -10], [0, 0, 1], wl);
    assert.equal(seq.vignetted, false);
    for (const ghosts of [false, true]) {
      const result = optics.traceFresnel3D([0, 0, -10], [0, 0, 1], wl, {
        ghosts,
        minPower: 1e-8,
      });
      assert.deepEqual(result.primaryHit?.p, seq.points.at(-1));
      near(result.primaryHit.power, transmission ** (count - 1), 1e-12);
      assert.equal(result.segments.filter((s) => !s.ghost).length, count);
      const ghostSteps = result.segments.filter((s) => s.ghost).length;
      assert.ok(ghosts ? ghostSteps > 0 && ghostSteps <= 96 : ghostSteps === 0);
    }
  }
});

for (const declaration of ['ENPD 10', 'PUPD 0 10']) {
  test(`${declaration} survives library placement and project serialization`, (t) => {
    const { state, bench, ui, optics } = importWorkbench(t);
    const lens = ui.loadZMX(
      example.replace('ENPD 10', declaration),
      'example.zmx',
    );
    assert.ok(lens);
    bench.createLibraryComponent(lens.id, 0);
    bench.syncSurfacesFromComponents();
    const check = () => {
      near(optics.entrancePupil(wl).diameter, 10);
      assert.match(optics.entrancePupil(wl).apertureMeta.enpdSource, /^ZMX/);
      const rays = optics.makeCollimated(0, 0, 3, wl, true, 'meridional');
      assert.equal(rays.length, 4);
      rays.forEach((r) => near(r.O[1], r.normalizedPupil[1] * 5));
      assert.ok(rays.every((r) => r.rayAimed));
    };
    check();
    const saved = validateProjectJSON(
      JSON.parse(
        JSON.stringify({
          format: 'soft-ether-workbench',
          version: 1,
          bench: { components: state.components },
          library: { imported: [lens] },
        }),
      ),
    );
    state.components = saved.bench.components;
    bench.syncSurfacesFromComponents();
    check();
  });
}

test('legacy bench ENPD controls aiming even when the physical stop is larger', () => {
  const state = createBenchState(),
    parsed = parseZMX(example);
  state.surfaces = parsed.surfaces;
  state.benchEpd = parsed.epd;
  state.importMeta = { ...state.importMeta, enpdSource: parsed.enpdSource };
  const optics = createOpticalEngine(state);
  near(optics.entrancePupil(wl).diameter, 10);
  for (const ray of optics.makeCollimated(0, 0, 3, wl, false, 'meridional'))
    near(ray.O[1], ray.normalizedPupil[1] * 5);
});

test('imported pupil footprint survives upstream optics, reversal and stop overrides', (t) => {
  const { state, bench, ui, optics } = importWorkbench(t);
  const lens = ui.loadZMX(example, 'example.zmx');
  const imported = bench.createLibraryComponent(lens.id, 0);
  const upstream = bench.createLibraryComponent('pcx', -40);
  upstream.params.R1 = 100;
  bench.syncSurfacesFromComponents();
  const n = sellmeier('N-BK7', wl);
  const expectedA = 1 - ((n - 1) / 100) * (4 / n + 36);
  near(optics.entrancePupil(wl).diameter, 10 / expectedA);
  const checkStop = (radius) => {
    const pupil = optics.entrancePupil(wl);
    for (const ray of optics.makeCollimated(1, -1, 9, wl, true, 'pupil3d')) {
      const hit = optics.traceToSurfaceIndex(ray.O, ray.D, wl, pupil.stopIndex);
      assert.ok(hit);
      near(hit.hit[0], ray.normalizedPupil[0] * radius);
      near(hit.hit[1], ray.normalizedPupil[1] * radius);
    }
  };
  checkStop(5);
  imported.orientation = -1;
  bench.syncSurfacesFromComponents();
  checkStop(5);
  const stop = bench.createLibraryComponent('stop', 20);
  stop.params.diameter = 6;
  bench.syncSurfacesFromComponents();
  assert.equal(optics.entrancePupil(wl).stopKind, 'bench stop');
  checkStop(3);
  state.components = state.components.filter(
    (c) => c.id !== stop.id && c.id !== upstream.id,
  );
  bench.syncSurfacesFromComponents();
  near(optics.entrancePupil(wl).diameter, 10);
  checkStop(5);
});

test('an imported ENPD without an explicit stop sets the collimated beam diameter', (t) => {
  const { bench, ui, optics } = importWorkbench(t);
  const lens = ui.loadZMX(example.replace('  STOP', ''), 'example.zmx');
  bench.createLibraryComponent(lens.id, 0);
  bench.syncSurfacesFromComponents();
  near(optics.entrancePupil(wl).diameter, 10);
  const rays = optics.makeCollimated(0, 0, 3, wl, false, 'meridional');
  near(rays.at(-1).O[1] - rays[0].O[1], 10, 2e-7);
});

test('an internal imported stop maps ENPD through its original front optics', (t) => {
  const { bench, ui, optics } = importWorkbench(t);
  const text = example
    .replace('  STOP', '')
    .replace('SURF 2', 'SURF 2\n  STOP');
  const lens = ui.loadZMX(text, 'internal-stop.zmx');
  const component = bench.createLibraryComponent(lens.id, 0);
  bench.syncSurfacesFromComponents();
  const n = sellmeier('N-BK7', wl);
  const stopRadius = 5 * (1 - ((n - 1) / 50) * (4 / n));
  near(optics.entrancePupil(wl).diameter, 10);
  for (const orientation of [1, -1]) {
    component.orientation = orientation;
    bench.syncSurfacesFromComponents();
    for (const ray of optics.makeCollimated(0, 0, 3, wl, false, 'meridional')) {
      const hit = optics.traceToSurfaceIndex(
        ray.O,
        ray.D,
        wl,
        optics.stopSurfaceIndex().index,
      );
      near(hit.hit[1], ray.normalizedPupil[1] * stopRadius);
    }
  }
  near(optics.entrancePupil(wl).diameter, 2 * stopRadius);
});

test('unsupported surface types fail before library mutation', (t) => {
  const { state, ui, nodes } = importWorkbench(t);
  const before = structuredClone(state);
  for (const type of ['TOROIDAL', 'COORDBRK', 'BICONICX']) {
    const text = example.replace('  CURV 0.02', `  TYPE ${type}\n  CURV 0.02`);
    assert.throws(
      () => parseZMX(text),
      /Unsupported surface type .* at surface 1/,
    );
    assert.equal(ui.loadZMX(text, 'unsupported.zmx'), null);
    assert.match(nodes.get('parseWarn').innerHTML, /Unsupported surface type/);
    assert.deepEqual(state, before);
    const parsed = parseZMX(example);
    parsed.surfaces[0].type = type;
    assert.throws(
      () => ui.addParsedLensToLibrary(parsed, 'unsupported.zmx'),
      /Unsupported surface type/,
    );
    assert.deepEqual(state, before);
  }
  assert.throws(
    () => parseZMX(example + '\nTYPE TOROIDAL'),
    /Unsupported surface type/,
  );
});

test('supported surface imports also pass project validation', (t) => {
  const { state, ui } = importWorkbench(t);
  for (const type of ['STANDARD', 'EVENASPH', 'standard', 'evenasph']) {
    const lens = ui.loadZMX(
      example.replace('  CURV 0.02', `  TYPE ${type}\n  CURV 0.02`),
      'supported.zmx',
    );
    assert.ok(lens);
    assert.equal(lens.surfaces[0].type, type.toUpperCase());
  }
  assert.doesNotThrow(() =>
    validateProjectJSON(
      JSON.parse(
        JSON.stringify({
          format: 'soft-ether-workbench',
          version: 1,
          bench: { components: [] },
          library: {
            imported: state.componentLibrary.filter(
              (c) => c.kind === 'imported',
            ),
          },
        }),
      ),
    ),
  );
});

test('an unsupported ZAR does not register its embedded glasses', async (t) => {
  const { state, ui, nodes } = importWorkbench(t);
  const before = structuredClone(state),
    glasses = structuredClone(GLASS_DB);
  const member = (name, text) => {
    const bytes = new TextEncoder().encode(text),
      result = new Uint8Array(0x14c + bytes.length);
    result[0] = 0xea;
    new DataView(result.buffer).setUint32(0x0c, bytes.length, true);
    result.set(new TextEncoder().encode(name), 0x20);
    result.set(bytes, 0x14c);
    return result;
  };
  const parts = [
    member('test.agf', 'NM N-BK7 2\nCD 1 0.01 2 0.02 3 100'),
    member(
      'unsupported.zmx',
      example.replace('  CURV 0.02', '  TYPE TOROIDAL\n  CURV 0.02'),
    ),
  ];
  const archive = new Uint8Array(parts[0].length + parts[1].length);
  archive.set(parts[0]);
  archive.set(parts[1], parts[0].length);
  t.mock.method(console, 'error', () => {});
  await ui.loadLensFile({
    name: 'unsupported.zar',
    arrayBuffer: async () => archive.buffer,
  });
  assert.match(nodes.get('parseWarn').innerHTML, /Unsupported surface type/);
  assert.deepEqual(state, before);
  assert.deepEqual(GLASS_DB, glasses);
});
