import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  compareWavefrontReference,
  wavefrontReference,
} from '../scripts/wavefront-comparison.mjs';

test('wavefront reference records independent solver and exact generator provenance', () => {
  for (const [file, expected] of [
    ['reference-wavefront.py', wavefrontReference.generatorSha256],
    ['reference-rayoptics.py', wavefrontReference.geometryGeneratorSha256],
  ]) {
    const source = readFileSync(
      new URL(`../scripts/${file}`, import.meta.url),
      'utf8',
    ).replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(source).digest('hex'), expected);
  }
  assert.equal(wavefrontReference.packages.rayoptics, '0.9.8');
  assert.equal(wavefrontReference.cases.length, 22);
});

test('both tracing engines match independent sphere phase, pupil location and RMS/PV', () => {
  const result = compareWavefrontReference();
  assert.ok(result.checks > 7000);
  assert.deepEqual(result.failed, []);
});

test('independent fixtures retain detector defocus and invariant launch-plane phase', () => {
  const cases = wavefrontReference.cases;
  const onAxis = cases.filter(
    (c) =>
      c.sourceType === 'collimated' &&
      c.wavelengthUm === 0.5875618 &&
      c.fieldDeg.every((v) => v === 0) &&
      c.pupilRadiusMm === 5,
  );
  assert.equal(onAxis.length, 3);
  assert.ok(onAxis[0].pistonRemoved.rmsNm > 2 * onAxis[1].pistonRemoved.rmsNm);
  assert.ok(onAxis[2].pistonRemoved.rmsNm > 2 * onAxis[1].pistonRemoved.rmsNm);
  const shifted = cases.find((c) => c.id === 'bcx/shifted-launch');
  const nominal = cases.find(
    (c) =>
      c.wavelengthUm === shifted.wavelengthUm &&
      c.fieldDeg[0] === shifted.fieldDeg[0] &&
      c.surfaces.at(-1).z === 58,
  );
  assert.ok(
    Math.abs(shifted.pistonRemoved.rmsNm - nominal.pistonRemoved.rmsNm) < 1e-6,
  );
  const virtual = cases.find((c) => c.id === 'bcx/pupil-beyond-detector');
  assert.ok(virtual.exitPupilZMm > virtual.surfaces.at(-1).z);
});
