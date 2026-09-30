import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutosave, openLocalProjects } from '../src/io/local-projects.js';
import {
  migrateProjectJSON,
  validateProjectJSON,
} from '../src/io/project-schema.js';
import {
  overrideImportedApertures,
  resetImportedPrescription,
} from '../src/io/imported-prescription.js';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from '../src/data/defaults.js';
import { defaultSimulationSettings } from '../src/model/simulation-state.js';
import {
  captureMaterialCatalog,
  restoreMaterialCatalog,
  registerAGF,
  resolveMaterial,
} from '../src/core/materials.js';

function legacyProject() {
  const state = createBenchState();
  createBench(state).initializeBenchFromSurfaces(
    DEFAULT_SURFACES,
    DEFAULT_NAME,
    DEFAULT_EPD,
  );
  return {
    format: 'soft-ether-workbench',
    version: 1,
    bench: { components: state.components, lensName: 'Reference achromat' },
    library: {
      imported: [],
      customGlasses: { 'TEST-GLASS': [1, 2, 3, 0.1, 0.2, 0.3] },
    },
    simulation: { values: { sField: '2.5' }, checks: { cbChief: false } },
  };
}

test('v1 migration is pure, idempotent and preserves imported optics/materials/control settings', () => {
  const original = legacyProject(),
    before = structuredClone(original);
  const migrated = migrateProjectJSON(original);
  assert.deepEqual(original, before);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.format, 'tracy-workbench');
  assert.deepEqual(migrated.bench, original.bench);
  assert.deepEqual(migrated.library, original.library);
  assert.deepEqual(migrated.simulation, original.simulation);
  assert.deepEqual(migrateProjectJSON(migrated), migrated);
  assert.deepEqual(
    validateProjectJSON(JSON.parse(JSON.stringify(migrated))),
    migrated,
  );
});

test('projects preserve unfinished detector/source positions without weakening settings validation', () => {
  const project = migrateProjectJSON(legacyProject());
  project.simulation.canonical = defaultSimulationSettings();
  project.simulation.canonical.source.zMm = 100.012345;
  project.simulation.canonical.source.type = 'point';
  project.bench.components.find((c) => c.kind === 'detector').z = -10;
  assert.deepEqual(
    validateProjectJSON(JSON.parse(JSON.stringify(project))),
    project,
  );
  project.simulation.canonical.source.na = 1.1;
  assert.throws(() => validateProjectJSON(project), /NA/);
});

test('override/reset preserves unequal imported clear apertures, aspheres, glass and bench placement through JSON', () => {
  const project = migrateProjectJSON(legacyProject());
  const component = project.bench.components[0];
  component.surfaces[0].sd = 3;
  component.surfaces[1].sd = 5;
  component.surfaces[0].conic = -0.5;
  component.surfaces[0].parm = { 2: 1e-5 };
  component.z = 32;
  component.orientation = -1;
  const original = structuredClone(component);
  overrideImportedApertures(component, 8);
  overrideImportedApertures(component, 6);
  assert.ok(component.surfaces.every((surface) => surface.sd === 3));
  const restored = migrateProjectJSON(JSON.parse(JSON.stringify(project))).bench
    .components[0];
  assert.equal(resetImportedPrescription(restored), true);
  assert.deepEqual(restored.surfaces, original.surfaces);
  assert.deepEqual(restored.params, original.params);
  assert.equal(restored.z, 32);
  assert.equal(restored.orientation, -1);
  assert.equal(restored.apertureOverrideMm, undefined);
  assert.throws(() => overrideImportedApertures(restored, NaN), /finite/);
  assert.throws(() => overrideImportedApertures(restored, 0), /positive/);
});

test('schema rejects corrupt preserved aperture prescriptions before any restoration', () => {
  const project = migrateProjectJSON(legacyProject());
  overrideImportedApertures(project.bench.components[0], 9);
  project.bench.components[0].importedPrescription.surfaces[0].sd = -1;
  assert.throws(() => validateProjectJSON(project), /surface/);
});

test('autosave serializes changing snapshots and never clears dirty state for stale completions', async () => {
  let version = 1;
  const writes = [],
    statuses = [];
  let completeFirst;
  const save = createAutosave({
    capture: () => ({ version }),
    delay: 60_000,
    status: (value) => statuses.push(value),
    write: async (snapshot) => {
      writes.push(snapshot);
      if (snapshot.version === 1)
        await new Promise((resolve) => {
          completeFirst = resolve;
        });
    },
  });
  save.changed();
  const running = save.flush();
  await Promise.resolve();
  version = 2;
  save.changed();
  assert.equal(save.dirty, true);
  completeFirst();
  await running;
  assert.deepEqual(writes, [{ version: 1 }, { version: 2 }]);
  assert.equal(save.dirty, false);
  assert.equal(statuses.filter((value) => value === 'saved').length, 1);
  assert.equal(statuses.at(-1), 'saved');
  save.dispose();
});

test('failed autosave retains dirty data and supports retry without another edit', async () => {
  let fail = true;
  const statuses = [];
  const save = createAutosave({
    capture: () => ({ name: 'Not lost' }),
    delay: 60_000,
    status: (value) => statuses.push(value),
    write: async () => {
      if (fail) throw new Error('Quota exceeded');
    },
  });
  save.changed();
  await assert.rejects(save.flush(), /Quota exceeded/);
  assert.equal(save.dirty, true);
  assert.equal(statuses.at(-1), 'error');
  fail = false;
  await save.flush();
  assert.equal(save.dirty, false);
  save.dispose();
});

test('unavailable browser storage is explicit instead of claiming an autosave', async () => {
  await assert.rejects(openLocalProjects(null), /unavailable/);
});

test('invalid canonical source and spectral weights are rejected before project mutation', () => {
  const project = migrateProjectJSON(legacyProject());
  project.simulation.canonical = defaultSimulationSettings();
  assert.equal(validateProjectJSON(project), project);
  project.simulation.canonical.source.na = 1.1;
  assert.throws(() => migrateProjectJSON(project), /Air NA/);
  project.simulation.canonical.source.na = 0.3;
  project.simulation.canonical.spectrum[0].sourceWeight = -2;
  assert.throws(() => migrateProjectJSON(project), /Spectral weights/);
  project.simulation.canonical.spectrum.forEach((w) => {
    w.sourceWeight = 0;
  });
  assert.throws(() => migrateProjectJSON(project), /positive source weight/);
});

test('canonical JSON round trip reconstructs the explicit detector and rejects a missing detector', () => {
  const project = migrateProjectJSON(legacyProject());
  project.simulation.canonical = defaultSimulationSettings();
  const restored = migrateProjectJSON(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(restored, project);
  restored.bench.components = restored.bench.components.filter(
    (component) => component.kind !== 'detector',
  );
  assert.throws(() => migrateProjectJSON(restored), /terminal detector/);
});

test('AGF provenance and wavelength limits survive JSON migration and catalog restoration', (t) => {
  const original = captureMaterialCatalog();
  t.after(() => restoreMaterialCatalog(original));
  registerAGF(
    'NM SAVE-TEST 2 0 1.5 60\nCD 1 0.01 0.2 0.02 0.3 100\nLD 0.4 0.7',
    'saved-agf-test.agf',
  );
  const project = migrateProjectJSON(legacyProject());
  project.library.materialCatalog = captureMaterialCatalog();
  const loaded = migrateProjectJSON(JSON.parse(JSON.stringify(project)));
  restoreMaterialCatalog({});
  restoreMaterialCatalog(loaded.library.materialCatalog);
  const material = resolveMaterial('SAVE-TEST', 0.5);
  assert.equal(material.provenance.source, 'saved-agf-test.agf');
  assert.deepEqual(material.wavelengthRangeUm, [0.4, 0.7]);
  assert.throws(
    () => resolveMaterial('SAVE-TEST', 0.8),
    (error) => error.code === 'wavelength-out-of-range',
  );
  loaded.library.materialCatalog['SAVE-TEST'].wavelengthRangeUm = [-1, 0.7];
  assert.throws(() => validateProjectJSON(loaded), /wavelength range/);
});
