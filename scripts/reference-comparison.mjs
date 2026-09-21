import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createOpticalEngine } from '../src/core/engine.js';
import { sellmeier } from '../src/core/materials.js';
import { snell, fresnelUnpolarized } from '../src/core/surfaces.js';

export const reference = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/reference-rayoptics.json', import.meta.url),
    'utf8',
  ),
);

// Fixed before interpreting Tracy results. These budgets cover independent
// double-precision intersection/normal arithmetic, not manufacturing errors.
export const tolerances = Object.freeze({
  interceptMm: 2e-8,
  directionCosine: 2e-10,
  index: 2e-12,
  oplMm: 3e-8,
  focalMm: 2e-7,
  power: 2e-10,
  state: 0,
});

const error3 = (a, b) =>
  !a || !b ? Infinity : Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const segmentDirection = (a, b) => {
  const d = b.map((v, i) => v - a[i]);
  const length = Math.hypot(...d);
  return d.map((v) => v / length);
};

export function compareReference() {
  const checks = [];
  const check = (caseId, metric, actual, expected, tolerance) => {
    const error = Array.isArray(expected)
      ? error3(actual, expected)
      : typeof expected === 'boolean'
        ? actual === expected
          ? 0
          : 1
        : Math.abs(actual - expected);
    checks.push({
      caseId,
      metric,
      actual,
      expected,
      error,
      tolerance,
      pass: Number.isFinite(error) && error <= tolerance,
    });
  };
  for (const [glass, entries] of Object.entries(reference.indices)) {
    for (const q of entries)
      check(
        `${glass}/${q.wavelength}`,
        'index',
        sellmeier(glass, q.wavelength),
        q.index,
        tolerances.index,
      );
  }
  for (const q of reference.snell) {
    const caseId = `plane-Snell/${q.n1}/${q.n2}/${q.incidentAngleDeg}`;
    const transmitted = snell(q.direction, [0, 0, -1], q.n1, q.n2);
    const fr = fresnelUnpolarized(q.direction, [0, 0, -1], q.n1, q.n2);
    check(
      caseId,
      'tir',
      transmitted === null,
      q.transmittedDirection === null,
      0,
    );
    if (q.transmittedDirection)
      check(
        caseId,
        'directionCosine',
        transmitted,
        q.transmittedDirection,
        tolerances.directionCosine,
      );
    check(caseId, 'power', fr.R, q.reflectance, tolerances.power);
  }
  for (const fixture of reference.cases) {
    const engine = createOpticalEngine({ surfaces: fixture.surfaces, epd: 24 });
    for (const [rayIndex, q] of fixture.rays.entries()) {
      const caseId = `${fixture.id}/${q.wavelength}/${rayIndex % 3}`;
      const expected = q.expected;
      const seq = engine.traceRay(q.origin, q.direction, q.wavelength);
      check(
        caseId,
        'sequential.vignetted',
        seq.vignetted,
        expected.vignetted,
        0,
      );
      check(
        caseId,
        'sequential.pointCount',
        seq.points.length,
        expected.points.length,
        0,
      );
      seq.points.forEach((p, i) => {
        check(
          caseId,
          'sequential.interceptMm',
          p,
          expected.points[i],
          tolerances.interceptMm,
        );
        if (i + 1 < seq.points.length)
          check(
            caseId,
            'sequential.directionCosine',
            segmentDirection(p, seq.points[i + 1]),
            expected.directions[i],
            tolerances.directionCosine,
          );
      });
      check(
        caseId,
        'sequential.oplMm',
        seq.opl,
        expected.opl,
        tolerances.oplMm,
      );
      const fr = engine.traceFresnel3D(q.origin, q.direction, q.wavelength, {
        ghosts: false,
      });
      check(caseId, 'fresnel.vignetted', !fr.primaryHit, expected.vignetted, 0);
      if (!expected.vignetted && fr.primaryHit) {
        check(
          caseId,
          'fresnel.interceptMm',
          fr.primaryHit.p,
          expected.points.at(-1),
          tolerances.interceptMm,
        );
        check(
          caseId,
          'fresnel.oplMm',
          fr.primaryHit.opl,
          expected.opl,
          tolerances.oplMm,
        );
        check(
          caseId,
          'fresnel.power',
          fr.primaryHit.power,
          expected.primaryPower,
          tolerances.power,
        );
        check(
          caseId,
          'fresnel.directionCosine',
          fr.primaryHit.direction,
          expected.directions.at(-1),
          tolerances.directionCosine,
        );
      }
      check(caseId, 'fresnel.topologyErrors', fr.topologyErrors?.length, 0, 0);
    }
    for (const q of fixture.paraxial) {
      const matrix = engine.paraxialToSurface(
        fixture.surfaces.length - 1,
        q.wavelength,
      );
      check(
        `${fixture.id}/${q.wavelength}`,
        'eflMm',
        -1 / matrix[2],
        q.efl,
        tolerances.focalMm,
      );
      check(
        `${fixture.id}/${q.wavelength}`,
        'focalZMm',
        fixture.surfaces.at(-1).z - matrix[0] / matrix[2],
        q.focalZ,
        tolerances.focalMm,
      );
    }
    if (fixture.paraxial.length === 3) {
      const [f, , c] = fixture.paraxial;
      const mf = engine.paraxialToSurface(
        fixture.surfaces.length - 1,
        f.wavelength,
      );
      const mc = engine.paraxialToSurface(
        fixture.surfaces.length - 1,
        c.wavelength,
      );
      check(
        fixture.id,
        'chromaticFocalShiftMm',
        -mf[0] / mf[2] + mc[0] / mc[2],
        f.focalZ - c.focalZ,
        tolerances.focalMm * 2,
      );
    }
  }
  const plate = reference.cases.find((c) => c.id === 'plane-parallel-plate');
  const engine = createOpticalEngine({ surfaces: plate.surfaces, epd: 24 });
  for (const q of reference.ghosts) {
    const result = engine.traceFresnel3D(q.origin, q.direction, q.wavelength, {
      ghosts: true,
      minPower: 1e-9,
      maxBounces: 4,
    });
    const ghost = result.detectorHits
      .filter((h) => h.ghost)
      .sort((a, b) => b.power - a.power)[0];
    const id = `two-reflection-ghost/${q.wavelength}`;
    check(id, 'ghost.exists', !!ghost, true, 0);
    if (ghost) {
      check(
        id,
        'ghost.interceptMm',
        ghost.p,
        q.expected.points.at(-1),
        tolerances.interceptMm,
      );
      check(id, 'ghost.oplMm', ghost.opl, q.expected.opl, tolerances.oplMm);
      check(
        id,
        'ghost.power',
        ghost.power,
        q.expected.primaryPower,
        tolerances.power,
      );
      check(
        id,
        'ghost.directionCosine',
        ghost.direction,
        q.expected.directions.at(-1),
        tolerances.directionCosine,
      );
    }
  }
  const summary = {};
  for (const q of checks) {
    const metric = (summary[q.metric] ??= {
      checks: 0,
      maxError: 0,
      tolerance: q.tolerance,
      failures: 0,
    });
    metric.checks++;
    metric.maxError = Math.max(metric.maxError, q.error);
    if (!q.pass) metric.failures++;
  }
  return {
    sourceSha256: Object.fromEntries(
      [
        'src/core/surfaces.js',
        'src/core/sequential.js',
        'src/core/fresnel.js',
        'src/core/regions.js',
        'src/core/materials.js',
        'src/core/pupil.js',
      ].map((path) => [
        path,
        createHash('sha256')
          .update(
            readFileSync(
              new URL(`../${path}`, import.meta.url),
              'utf8',
            ).replace(/\r\n/g, '\n'),
          )
          .digest('hex'),
      ]),
    ),
    referenceGeneratorSha256: reference.generatorSha256,
    referencePackages: reference.packages,
    tolerances,
    summary,
    checks: checks.length,
    passed: checks.filter((q) => q.pass).length,
    failed: checks.filter((q) => !q.pass),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = compareReference();
  const target = new URL(
    '../tests/fixtures/reference-comparison.json',
    import.meta.url,
  );
  writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (result.failed.length) process.exitCode = 1;
}
