import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseZMX } from '../src/io/zmx.js';
import { parseZAR, decodeZemaxText, zarLzwDecompress } from '../src/io/zar.js';
import { validateProjectJSON } from '../src/io/project-schema.js';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import {
  DEFAULT_EPD,
  DEFAULT_NAME,
  DEFAULT_SURFACES,
} from '../src/data/defaults.js';
import { escapeHTML } from '../src/ui/dom.js';
import { installProjects } from '../src/ui/projects.js';
import { GLASS_DB, BUILTIN_GLASS_DB } from '../src/core/materials.js';

function project() {
  const state = createBenchState(),
    bench = createBench(state);
  bench.initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
  );
  return {
    format: 'soft-ether-workbench',
    version: 1,
    bench: { components: state.components },
    library: { imported: [], customGlasses: {} },
  };
}
test('ZMX fixture preserves physical surfaces, STOP and ENPD', () => {
  const p = parseZMX(
    readFileSync(
      new URL('../examples/plano-convex.zmx', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(p.surfaces.length, 3);
  assert.equal(p.surfaces[0].isStop, true);
  assert.equal(p.epd, 10);
  assert.equal(p.surfaces[1].z, 4);
  assert.equal(p.surfaces[2].z, 99);
});
test('ZMX centimetres scale curvature, thickness and asphere coefficients', () => {
  const p = parseZMX(
    'UNIT CM\nPUPD 0 2.5\nSURF 0\nDISZ 10\nSURF 1\nTYPE EVENASPH\nCURV 0.2\nPARM 2 0.001\nDIAM 1.25\nDISZ 0.4\nSURF 2\nDISZ 0',
  );
  assert.equal(p.epd, 25);
  assert.equal(p.objectDistance, 100);
  assert.equal(p.surfaces[0].curvature, 0.02);
  assert.equal(p.surfaces[1].z, 4);
  assert.equal(p.surfaces[0].parm[2], 0.000001);
});
test('legacy ZAR members and UTF-16 text decode without DOM', () => {
  const text = 'NAME Test\nSURF 1\nDISZ 0',
    bytes = new TextEncoder().encode(text);
  const archive = new Uint8Array(0x14c + bytes.length);
  archive[0] = 0xea;
  new DataView(archive.buffer).setUint32(0x0c, bytes.length, true);
  archive.set(new TextEncoder().encode('test.zmx'), 0x20);
  archive.set(bytes, 0x14c);
  const members = parseZAR(archive.buffer);
  assert.equal(members.length, 1);
  assert.equal(decodeZemaxText(members[0].data), text);
  const utf16 = Uint8Array.from([255, 254, 65, 0, 66, 0]);
  assert.equal(decodeZemaxText(utf16), 'AB');
});
test('ZAR refuses corrupt and truncated archives', () => {
  assert.throws(() => parseZAR(Uint8Array.of(0, 0).buffer), /Unrecognized/);
  assert.throws(() => parseZAR(Uint8Array.of(0xea, 0).buffer), /Truncated/);
  assert.throws(() => zarLzwDecompress(Uint8Array.of(255, 255)), /Invalid/);
});
test('project v1 and JSON round trip remain compatible', () => {
  const p = project();
  assert.deepEqual(validateProjectJSON(JSON.parse(JSON.stringify(p))), p);
});
test('project schema rejects invalid versions, duplicate IDs and bad optics before restore', () => {
  let p = project();
  p.version = 99;
  assert.throws(() => validateProjectJSON(p), /version/);
  p = project();
  p.bench.components[1].id = p.bench.components[0].id;
  assert.throws(() => validateProjectJSON(p), /Duplicate/);
  p = project();
  p.bench.components[0].z = '0';
  assert.throws(() => validateProjectJSON(p), /finite/);
  p = project();
  p.bench.components[0].surfaces[0].curvature = NaN;
  assert.throws(() => validateProjectJSON(p), /surface/);
  p = project();
  p.bench.components[0].kind = 'unknown';
  assert.throws(() => validateProjectJSON(p), /kind/);
  p = project();
  p.library.imported = [{ ...p.bench.components[0], id: 'pcx' }];
  assert.throws(() => validateProjectJSON(p), /reserved/);
});
test('new component IDs cannot collide after project restoration', () => {
  const state = createBenchState(),
    bench = createBench(state);
  state.components = project().bench.components;
  state.componentSequence = 1;
  const added = bench.createLibraryComponent('pcx', 80);
  assert.equal(added.id, 'cmp-3');
  assert.equal(
    new Set(state.components.map((c) => c.id)).size,
    state.components.length,
  );
});
test('imported names and attribute values render as text', () => {
  assert.equal(
    escapeHTML('<img src=x onerror="bad()"> & \'test\''),
    '&lt;img src=x onerror=&quot;bad()&quot;&gt; &amp; &#39;test&#39;',
  );
});

test('project workflow restores bench, controls, view, and overridden glass definitions', (t) => {
  const state = createBenchState(),
    bench = createBench(state);
  bench.initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
  );
  const nodes = new Map();
  const element = (id) => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, {
        value: '0',
        checked: false,
        type: id.startsWith('cb') ? 'checkbox' : 'range',
        classList: {
          contains: (c) => classes.has(c),
          toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
        },
        dispatchEvent: () => {},
        textContent: '',
        innerHTML: '',
      });
    }
    return nodes.get(id);
  };
  const previous = globalThis.document;
  globalThis.document = { getElementById: element };
  const catalog = structuredClone(GLASS_DB);
  t.after(() => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
    for (const key of Object.keys(GLASS_DB)) delete GLASS_DB[key];
    Object.assign(GLASS_DB, catalog);
  });
  const vector = (initial) => ({
    value: initial,
    toArray() {
      return [...this.value];
    },
    fromArray(a) {
      this.value = [...a];
    },
  });
  const view = {
    camera: {
      position: vector([55, 35, -25]),
      fov: 36,
      updateProjectionMatrix() {},
    },
    controls: { target: vector([0, 0, 16]), update() {} },
    buildLens() {},
    buildRays() {},
    fitBench() {},
  };
  const noop = () => {};
  const ui = {
    clone: structuredClone,
    captureState: () => ({
      radios: {},
      checks: { cbGhost: false },
      vals: { sPX: '2' },
    }),
    activeTheme: () => 'night',
    stateControlIds: [],
    SOURCE_ID: '__source__',
    uxHistory: [],
    uxRedo: [],
  };
  for (const key of [
    'applyWorkbenchTheme',
    'updateSourceZRange',
    'refreshSystemInfo',
    'renderLibrary',
    'renderBenchList',
    'renderRuler',
    'updateAnalysisSummary',
    'updateStatusBar',
    'updateUndoButtons',
    'showDockEmpty',
    'benchToast',
  ])
    ui[key] = noop;
  installProjects({ state, bench, view, ui, session: { suspendTrace: false } });
  GLASS_DB['N-BK7'] = [...BUILTIN_GLASS_DB['N-BK7']];
  GLASS_DB['N-BK7'][0] += 0.01;
  GLASS_DB['TEST-CUSTOM'] = [1, 0, 0, 0.01, 0.02, 100];
  const saved = ui.captureProjectJSON();
  assert.deepEqual(saved.library.customGlasses['N-BK7'], GLASS_DB['N-BK7']);
  state.components = [];
  view.camera.position.value = [0, 0, 0];
  delete GLASS_DB['TEST-CUSTOM'];
  ui.applyProjectJSON(JSON.parse(JSON.stringify(saved)), 'test.json');
  assert.deepEqual(state.components, saved.bench.components);
  assert.deepEqual(view.camera.position.value, saved.view.camera.position);
  assert.equal(element('sPX').value, '2');
  assert.equal(element('cbGhost').checked, false);
  assert.deepEqual(
    GLASS_DB['TEST-CUSTOM'],
    saved.library.customGlasses['TEST-CUSTOM'],
  );
  assert.deepEqual(GLASS_DB['N-BK7'], saved.library.customGlasses['N-BK7']);
  const before = structuredClone(state.components),
    bad = structuredClone(saved);
  bad.library.imported = [{ ...bad.bench.components[0], id: 'pcx' }];
  assert.throws(() => ui.applyProjectJSON(bad), /reserved/);
  assert.deepEqual(state.components, before);
});
