import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createOpticalEngine } from '../src/core/engine.js';
import { analyzeWavefront } from '../src/analysis/wavefront.js';

export const wavefrontReference = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/reference-wavefront.json', import.meta.url),
    'utf8',
  ),
);

// Fixed numerical budgets, not physical uncertainty or pupil convergence claims.
// 0.001 nm = 1e-9 mm leaves margin for independently accumulated OPL roundoff.
export const wavefrontTolerances = Object.freeze({
  wfeNm: 0.001,
  pupilMm: 1e-9,
});

export function compareWavefrontReference() {
  const failed = [];
  const maxErrors = {};
  let checks = 0;
  function check(caseId, metric, actual, expected, tolerance) {
    checks++;
    const error = Math.abs(actual - expected);
    maxErrors[metric] = Math.max(maxErrors[metric] || 0, error);
    if (!Number.isFinite(error) || error > tolerance)
      failed.push({ caseId, metric, actual, expected, error, tolerance });
  }
  let maxNativeHopkinsDifferenceNm = 0;
  for (const c of wavefrontReference.cases) {
    const engine = createOpticalEngine({
      surfaces: c.surfaces,
      epd: 2 * c.pupilRadiusMm,
    });
    const exit = engine.exitPupil(c.wavelengthUm);
    check(
      c.id,
      'exitPupilMm',
      exit.z,
      c.exitPupilZMm,
      wavefrontTolerances.pupilMm,
    );
    for (const kind of ['sequential', 'fresnel']) {
      function trace(q, chief = false) {
        const ray =
          kind === 'sequential'
            ? engine.traceRay(q.origin, q.launchDirection, c.wavelengthUm)
            : engine.traceFresnel3D(
                q.origin,
                q.launchDirection,
                c.wavelengthUm,
                { ghosts: false },
              );
        const hit =
          kind === 'sequential'
            ? { p: ray.points.at(-1), direction: ray.direction, opl: ray.opl }
            : ray.primaryHit;
        return {
          ...hit,
          uv: q.uv || [0, 0],
          sampleWeight: chief ? 0 : q.sampleWeight,
          chief,
          incidentPhaseMm: q.incidentPhaseMm || 0,
        };
      }
      const chief = trace(c.chief, true);
      const hits = c.samples.map((q) => trace(q));
      for (const removeTilt of [false, true]) {
        const id = `${c.id}/${kind}/${removeTilt ? 'piston-tilt' : 'piston'}`;
        const result = analyzeWavefront(hits, {
          referenceHit: chief,
          wavelengthUm: c.wavelengthUm,
          exitPupilZMm: exit.z,
          imageIndex: exit.imageIndex,
          removeTilt,
        });
        check(id, 'valid', Number(result.status === 'ok'), 1, 0);
        check(id, 'samples', result.points.length, c.samples.length, 0);
        const expected = removeTilt ? c.pistonTiltRemoved : c.pistonRemoved;
        check(
          id,
          'rmsNm',
          result.rmsNm,
          expected.rmsNm,
          wavefrontTolerances.wfeNm,
        );
        check(
          id,
          'pvNm',
          result.pvNm,
          expected.pvNm,
          wavefrontTolerances.wfeNm,
        );
        check(
          id,
          'rmsWaves',
          result.rmsWaves,
          expected.rmsNm / (1000 * c.wavelengthUm),
          wavefrontTolerances.wfeNm / (1000 * c.wavelengthUm),
        );
        result.points.forEach((p, i) => {
          const expectedPoint = c.samples[i];
          check(
            id,
            'rawWfeNm',
            p.rawWfeNm,
            expectedPoint.rawWfeNm,
            wavefrontTolerances.wfeNm,
          );
          check(
            id,
            'residualWfeNm',
            p.wfeNm,
            removeTilt ? expectedPoint.wfeTiltRemovedNm : expectedPoint.wfeNm,
            wavefrontTolerances.wfeNm,
          );
        });
      }
    }
    for (const q of c.samples)
      maxNativeHopkinsDifferenceNm = Math.max(
        maxNativeHopkinsDifferenceNm,
        Math.abs(q.rawWfeNm - q.nativeHopkinsWfeNm),
      );
  }
  return {
    schema: 1,
    reference: 'RayOptics 0.9.8 trace_raw + paraxial_trace + Conic.intersect',
    cases: wavefrontReference.cases.length,
    samples: wavefrontReference.cases.reduce((n, c) => n + c.samples.length, 0),
    checks,
    passed: checks - failed.length,
    failed,
    maxErrors,
    tolerances: wavefrontTolerances,
    fixtureSha256: createHash('sha256')
      .update(
        readFileSync(
          new URL(
            '../tests/fixtures/reference-wavefront.json',
            import.meta.url,
          ),
        ),
      )
      .digest('hex'),
    nativeHopkinsDiagnostic: {
      maxDifferenceNm: maxNativeHopkinsDifferenceNm,
      status:
        'Unresolved formula/convention difference; not used as the accepted geometric sphere reference.',
    },
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = compareWavefrontReference();
  writeFileSync(
    new URL('../outputs/wavefront-comparison.json', import.meta.url),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(
    `Wavefront reference: ${result.passed}/${result.checks} PASS; ${result.cases} cases, ${result.samples} samples.`,
  );
  if (result.failed.length) {
    console.error(JSON.stringify(result.failed.slice(0, 10), null, 2));
    process.exitCode = 1;
  }
}
