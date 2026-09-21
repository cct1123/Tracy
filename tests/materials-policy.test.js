import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLASS_DB,
  MATERIAL_METADATA,
  resolveMaterial,
  sellmeier,
  validateMaterials,
  registerAGF,
  captureMaterialCatalog,
  restoreMaterialCatalog,
  MaterialResolutionError,
} from '../src/core/materials.js';
import { createOpticalEngine } from '../src/core/engine.js';

const wl = 0.5875618;
const close = (a, b, tol = 1e-12) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test('strict unknown materials block quantitative tracing; exploratory is explicit and persistent', () => {
  assert.throws(
    () => sellmeier('MISSING-TEST-GLASS', wl),
    MaterialResolutionError,
  );
  const strict = validateMaterials([{ glass: 'MISSING-TEST-GLASS' }], [wl]);
  assert.equal(strict.valid, false);
  assert.equal(strict.errors[0].code, 'unresolved-material');
  const options = { mode: 'exploratory' };
  for (let i = 0; i < 2; i++) {
    const result = validateMaterials(
      [{ glass: 'MISSING-TEST-GLASS' }],
      [wl],
      options,
    );
    assert.equal(result.valid, true);
    assert.equal(result.approximate, true);
    assert.match(result.warnings[0].message, /n=1.52/);
    assert.equal(result.materials[0].provenance.kind, 'exploratory-fallback');
    close(result.materials[0].n, 1.52);
  }
});

test('known dispersion validity is enforced and exploratory extrapolation remains labeled', () => {
  assert.throws(() => sellmeier('N-BK7', 0.2), /outside its recorded/);
  const result = resolveMaterial('N-BK7', 0.3, { mode: 'exploratory' });
  assert.equal(result.approximate, true);
  assert.equal(result.warnings[0].code, 'dispersion-extrapolation');
  assert.equal(resolveMaterial('N-BK7', wl).approximate, false);
  assert.equal(resolveMaterial('UVFS', 3.71).approximate, false);
  assert.throws(() => sellmeier('UVFS', 3.72), /outside its recorded/);
});

test('anisotropic scalar and unaudited catalog models disclose their limitations', () => {
  for (const glass of ['MGF2', 'SAPPHIRE']) {
    const result = resolveMaterial(glass, wl);
    assert.ok(
      result.warnings.some((w) => w.code === 'isotropic-approximation'),
    );
    assert.ok(
      result.warnings.some((w) => w.code === 'unknown-wavelength-validity'),
    );
    assert.equal(result.provenance.verified, false);
    assert.equal(result.approximate, true);
  }
});

test('invalid wavelengths, Sellmeier poles and non-real indices cannot fabricate n=1', () => {
  for (const wavelength of [0, -1, NaN, Infinity])
    assert.throws(() => sellmeier('AIR', wavelength), /finite positive/);
  const customGlasses = {
    POLE: { coefficients: [1, 0, 0, 0.25, 0, 0], wavelengthRangeUm: [0.1, 1] },
    NEGATIVE: [-2, 0, 0, 0, 0, 0],
    ZERO_STRENGTH: [0, 0, 0, 0.25, 0, 0],
    MALFORMED: [1, 2, 3, 4, 5, NaN],
  };
  for (const mode of ['strict', 'exploratory']) {
    assert.throws(
      () => sellmeier('POLE', 0.5, { customGlasses, mode }),
      /pole/,
    );
    assert.throws(
      () => sellmeier('NEGATIVE', 0.5, { customGlasses, mode }),
      /positive real/,
    );
    assert.throws(
      () => sellmeier('MALFORMED', 0.5, { customGlasses, mode }),
      /six finite/,
    );
    close(sellmeier('ZERO_STRENGTH', 0.5, { customGlasses, mode }), 1);
  }
});

test('air aliases and catalog aliases retain explicit units and provenance', () => {
  for (const name of [null, '', ' air ', 'NONE', 'NULL'])
    close(sellmeier(name, wl), 1);
  close(sellmeier('Fused Silica', wl), sellmeier('UVFS', wl));
  const result = resolveMaterial('N-BK7', wl);
  assert.equal(result.wavelengthUm, wl);
  assert.match(result.provenance.source, /schott.com/);
  assert.ok(result.wavelengthRangeUm[0] < wl);
});

test('AGF imports preserve coefficient order, LD range, source and independent project snapshots', (t) => {
  const names = ['TEST_AGF', 'TEST_BAD_AGF'];
  t.after(() => {
    for (const name of names) {
      delete GLASS_DB[name];
      delete MATERIAL_METADATA[name];
    }
  });
  assert.equal(
    registerAGF(
      'NM TEST_AGF 2\nCD 1.25 0 0 0 0 0\nLD 0.4 0.8\nNM TEST_BAD_AGF 2\nCD 1 invalid 2 0.02 3 100 4',
      'test-catalog.agf',
    ),
    1,
  );
  const catalog = captureMaterialCatalog();
  assert.equal(catalog.TEST_AGF.provenance.source, 'test-catalog.agf');
  assert.deepEqual(catalog.TEST_AGF.wavelengthRangeUm, [0.4, 0.8]);
  close(sellmeier('TEST_AGF', wl), 1.5);
  assert.throws(() => sellmeier('TEST_AGF', 0.9), /outside its recorded/);
  assert.throws(
    () => sellmeier('TEST_AGF', wl, { customGlasses: {} }),
    /Unresolved/,
  );
  registerAGF('NM TEST_AGF 2\nCD 3 0 0 0 0 0', 'changed-catalog.agf');
  close(sellmeier('TEST_AGF', wl), 2);
  close(sellmeier('TEST_AGF', wl, { customGlasses: catalog }), 1.5);
  assert.equal(GLASS_DB.TEST_BAD_AGF, undefined);
});

test('material policy and scoped catalog propagate through sequential, Fresnel and pupil tracing', () => {
  const model = {
    materialPolicy: 'exploratory',
    customGlasses: {},
    epd: 2,
    surfaces: [
      { z: 0, sd: 2, glass: 'MISSING-SCOPED' },
      { z: 2, sd: 2, glass: null, isStop: true },
      { z: 10, sd: 10, glass: null },
    ],
  };
  const engine = createOpticalEngine(model);
  assert.equal(engine.traceRay([0, 0, -1], [0, 0, 1], wl).vignetted, false);
  close(engine.traceFresnel3D([0, 0, -1], [0, 0, 1], wl).primaryHit.opl, 12.04);
  assert.ok(Number.isFinite(engine.entrancePupil(wl).diameter));
  model.materialPolicy = 'strict';
  assert.throws(() => engine.traceRay([0, 0, -1], [0, 0, 1], wl), /Unresolved/);
  assert.throws(
    () => engine.traceFresnel3D([0, 0, -1], [0, 0, 1], wl),
    /Unresolved/,
  );
  assert.throws(() => engine.entrancePupil(wl), /Unresolved/);
});

test('default assembly materials match primary manufacturer spectral tables', () => {
  // Tabulated indices rounded to five decimals, so tolerance includes ±5e-6
  // rounding plus wavelength differences of <0.005 nm in the table headings.
  for (const [glass, values] of [
    ['N-PK51', [1.53333, 1.52855, 1.52646]],
    ['S-NPH2', [1.958, 1.92286, 1.90916]],
    ['N-F2', [1.63208, 1.62005, 1.61506]],
  ]) {
    [0.4861327, 0.5875618, 0.6562725].forEach((wavelength, i) =>
      close(sellmeier(glass, wavelength), values[i], 6e-6),
    );
    assert.equal(resolveMaterial(glass, wl).provenance.verified, true);
    assert.equal(resolveMaterial(glass, wl).approximate, false);
  }
});

test('catalog restoration validates before mutation and resets imported state', (t) => {
  const original = captureMaterialCatalog();
  t.after(() => restoreMaterialCatalog(original));
  const catalog = {
    RESTORE_TEST: {
      coefficients: [1.25, 0, 0, 0, 0, 0],
      wavelengthRangeUm: [0.4, 0.8],
      provenance: { kind: 'fixture', source: 'Test fixture', verified: true },
    },
  };
  restoreMaterialCatalog(catalog);
  assert.deepEqual(
    captureMaterialCatalog().RESTORE_TEST.wavelengthRangeUm,
    [0.4, 0.8],
  );
  assert.throws(
    () => restoreMaterialCatalog({ BROKEN: { coefficients: [NaN] } }),
    /six finite/,
  );
  close(sellmeier('RESTORE_TEST', wl), 1.5);
  restoreMaterialCatalog({});
  assert.throws(() => sellmeier('RESTORE_TEST', wl), /Unresolved/);
  assert.equal(resolveMaterial('N-BK7', wl).provenance.verified, true);
});
