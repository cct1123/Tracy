import { performance } from 'node:perf_hooks';
import { cpus, platform, arch } from 'node:os';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { createSimulationState } from '../src/model/simulation-state.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_EPD,
  DEFAULT_NAME,
} from '../src/data/defaults.js';
import { createOpticalEngine } from '../src/core/engine.js';
import { simulate } from '../src/core/simulate.js';

const fixture = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/reference-rayoptics.json', import.meta.url),
    'utf8',
  ),
);
const wavelengths = [0.4861327, 0.5875618, 0.6562725];
const systems = [
  'default-aspheric-doublet',
  'plano-convex-singlet',
  'cemented-achromat',
];

export function representativeState(system, countPerWavelength, engine) {
  const benchState = createBenchState();
  const isDefault = system === systems[0];
  const surfaces = isDefault
    ? DEFAULT_SURFACES
    : fixture.cases.find((c) => c.id === system)?.surfaces;
  if (!surfaces) throw new Error(`Unknown benchmark prescription: ${system}`);
  createBench(benchState).initializeBenchFromSurfaces(
    surfaces,
    isDefault ? DEFAULT_NAME : system,
    isDefault ? DEFAULT_EPD : 24,
    benchState.importMeta,
  );
  return createSimulationState(benchState, {
    sampling: { count: countPerWavelength, pattern: 'pupil3d' },
    engine: { type: engine, ghosts: false },
    display: { count: 0, showChief: false, showGhosts: false },
  });
}

function traceOnly(state, engine) {
  for (const wavelength of wavelengths) {
    const rays = engine.makeCollimated(
      0,
      0,
      state.sampling.count,
      wavelength,
      false,
      'pupil3d',
    );
    for (const ray of rays) {
      if (state.engine.type === 'sequential')
        engine.traceRay(ray.O, ray.D, wavelength);
      else engine.traceFresnel3D(ray.O, ray.D, wavelength, { ghosts: false });
    }
  }
}

function measure(action, repeats) {
  action(); // Two unreported warmups match the captured pre-change baseline.
  action();
  const runsMs = [];
  let result;
  for (let i = 0; i < repeats; i++) {
    const begin = performance.now();
    result = action();
    runsMs.push(performance.now() - begin);
  }
  runsMs.sort((a, b) => a - b);
  return { medianMs: runsMs[Math.floor(runsMs.length / 2)], runsMs, result };
}

export function runBenchmarks({ repeats = 5, counts = [49, 1201, 5001] } = {}) {
  const timings = [];
  for (const system of systems)
    for (const countPerWavelength of counts) {
      for (const engine of ['sequential', 'fresnel']) {
        const state = representativeState(system, countPerWavelength, engine);
        const measured = measure(() => {
          const result = simulate(state);
          if (result.status !== 'ok') throw new Error(result.errors.join('; '));
          return {
            traced: result.traced,
            detectorHits: result.detectorHits,
            rmsMm: result.rms,
            throughput: result.throughput,
          };
        }, repeats);
        timings.push({
          system,
          countPerWavelength,
          engine,
          scope: 'complete-simulate',
          ...measured,
        });
      }
    }
  const legacyApi = [];
  for (const countPerWavelength of counts)
    for (const engine of ['sequential', 'fresnel']) {
      const state = representativeState(systems[0], countPerWavelength, engine);
      // Baseline creates the engine before its timing loops and discards trace
      // results. Use the same timed workload; full simulate metrics are above.
      const optics = createOpticalEngine({
        surfaces: state.surfaces,
        components: state.components,
        epd: state.epdMm,
        importMeta: state.importMeta,
      });
      legacyApi.push({
        system: systems[0],
        countPerWavelength,
        engine,
        scope: 'source-plus-primary-trace',
        ...measure(() => traceOnly(state, optics), repeats),
      });
    }
  const baseline = JSON.parse(
    readFileSync(
      new URL('../outputs/baseline-benchmark.json', import.meta.url),
      'utf8',
    ),
  );
  const comparison = legacyApi.map((entry) => {
    const old = baseline.timings.find(
      (b) =>
        b.countPerWavelength === entry.countPerWavelength &&
        b.engine === entry.engine,
    );
    return {
      countPerWavelength: entry.countPerWavelength,
      engine: entry.engine,
      baselineMedianMs: old?.medianMs ?? null,
      currentMedianMs: entry.medianMs,
      ratio: old ? entry.medianMs / old.medianMs : null,
    };
  });
  const numericalSourceFiles = [
    'src/core/simulate.js',
    'src/core/sequential.js',
    'src/core/fresnel.js',
    'src/core/surfaces.js',
    'src/core/materials.js',
    'src/core/sources.js',
    'src/core/pupil.js',
    'src/core/engine.js',
    'src/analysis/metrics.js',
    'src/model/simulation-state.js',
  ];
  const sourceSha256 = Object.fromEntries(
    numericalSourceFiles.map((path) => [
      path,
      createHash('sha256')
        .update(
          readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(
            /\r\n/g,
            '\n',
          ),
        )
        .digest('hex'),
    ]),
  );
  return {
    capturedAt: new Date().toISOString(),
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model,
    logicalCpuCount: cpus().length,
    repeats,
    configuration: {
      wavelengthsUm: wavelengths,
      source: 'on-axis collimated, entrance-pupil targeted',
      sampling: 'golden-angle equal-area pupil disk',
      ghosts: false,
      visibleRays: 0,
      completeScope:
        'state/material validation, sample generation, primary/reference traces, weighted spot/OPL and spectral metrics; no rendering or worker scheduling',
      legacyScope:
        'source generation plus primary tracing, no added chief rays; no rendering or metrics',
      comparisonCaveat:
        'Baseline and current legacy API use matched workload. Current implementation includes medium validation, material handling and physical OPL corrections; hardware load/JIT timing can vary.',
    },
    sourceSha256,
    timings,
    legacyApi,
    baselineComparison: comparison,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = runBenchmarks();
  writeFileSync(
    new URL('../outputs/current-benchmark.json', import.meta.url),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        timings: result.timings.map(({ runsMs, result, ...r }) => r),
        baselineComparison: result.baselineComparison,
      },
      null,
      2,
    ),
  );
}
