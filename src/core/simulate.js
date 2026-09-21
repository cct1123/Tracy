import { createOpticalEngine } from './engine.js';
import { generateSourceSamples } from './sources.js';
import { validateMaterials } from './materials.js';
import { createRegionTopology } from './regions.js';
import { validateSimulationState } from '../model/simulation-state.js';
import { analyzeSpot, analyzeRelativeOPL } from '../analysis/metrics.js';

const percent = (value) =>
  value === null ? '—' : `${(value * 100).toFixed(1)}%`;

function emptyResult(state, errors = [], warnings = []) {
  return {
    status: 'blocked',
    errors,
    warnings,
    assumptions: [],
    paths: [],
    hits: [],
    referenceHits: [],
    traced: 0,
    vignetted: 0,
    detectorHits: 0,
    totalPower: null,
    throughput: null,
    throughputText: '—',
    bundleSurvival: null,
    conditionalFresnelTransmission: null,
    sourceCollection: null,
    rms: null,
    rmsText: '—',
    centroid: null,
    spotHits: 0,
    spot: analyzeSpot([]),
    aberration: analyzeRelativeOPL([]),
    perWavelength: [],
    source: state?.source || {},
    wavelengths: [],
    engine: state?.engine?.type,
    rayCount: state?.sampling?.count || 0,
    display: state?.display,
    pupil: null,
  };
}

/**
 * Deterministic DOM/Three-free simulation. No mutable global material catalog is
 * consulted: each state supplies custom definitions against immutable builtins.
 * @param {import('../model/simulation-types.js').SimulationState} state
 */
export function simulate(state) {
  const errors = validateSimulationState(state);
  if (errors.length) return emptyResult(state, errors);
  const active = state.spectrum.filter((w) => w.enabled && w.sourceWeight > 0);
  const maxWeight = Math.max(...active.map((w) => w.sourceWeight));
  const sw = active.reduce((sum, w) => sum + w.sourceWeight / maxWeight, 0);
  const spectrum = active.map((w) => ({
    ...w,
    normalizedWeight: w.sourceWeight / maxWeight / sw,
  }));
  const materials = validateMaterials(
    state.surfaces,
    spectrum.map((w) => w.wavelengthUm),
    {
      mode: state.engine.materialMode,
      customGlasses: state.customGlasses ?? {},
    },
  );
  const warnings = materials.warnings.map((w) =>
    typeof w === 'string' ? w : w.message || JSON.stringify(w),
  );
  if (!materials.valid)
    return {
      ...emptyResult(
        state,
        materials.errors.map((e) =>
          typeof e === 'string' ? e : e.message || JSON.stringify(e),
        ),
        warnings,
      ),
      materials,
    };
  const model = {
    surfaces: state.surfaces,
    components: state.components,
    epd: state.epdMm,
    importMeta: state.importMeta,
    materialPolicy: state.engine.materialMode,
    customGlasses: state.customGlasses ?? {},
  };
  const optics = createOpticalEngine(model);
  if (state.source.type === 'point') {
    const location = createRegionTopology(
      state.surfaces,
      spectrum[0].wavelengthUm,
      {
        mode: state.engine.materialMode,
        customGlasses: state.customGlasses ?? {},
      },
    ).locate([state.source.xMm, state.source.yMm, state.source.zMm]);
    if (location.error || location.regionId !== 'air')
      return {
        ...emptyResult(
          state,
          [
            'Point source must start in exterior air; the specified point lies inside glass or undefined finite-element geometry.',
          ],
          warnings,
        ),
        materials,
      };
  }
  const hits = [],
    referenceHits = [],
    paths = [],
    perWavelength = [];
  let survived = 0,
    throughput = 0,
    traced = 0,
    detectorHits = 0,
    topologyErrors = 0;
  const areaPopulation = state.sampling.pattern === 'pupil3d';
  const sourceDefined =
    areaPopulation &&
    (state.source.type === 'point' ||
      state.source.illumination === 'fixed-disk');
  const assumptions = [
    'Geometric optics · no diffraction',
    'Isotropic scalar material model',
    state.engine.type === 'fresnel'
      ? 'Per-interface unpolarized Fresnel · no polarization-state tracking · primary detector power only'
      : 'Sequential geometry · no Fresnel losses',
    'Chief/reference ray has zero statistical weight',
    state.source.type === 'point'
      ? `${state.source.distribution} over defined source ${state.source.distribution === 'uniform-pupil' ? 'target pupil' : 'cone'}`
      : state.source.illumination === 'fixed-disk'
        ? 'Fixed source disk, independent of entrance pupil'
        : 'Pupil-targeted discrete bundle; no total-source collection estimate',
    areaPopulation
      ? 'Deterministic equal-area disc quadrature'
      : 'Diagnostic fan/ring samples; no total-source collection estimate',
    spectrum.every(
      (w) => Math.abs(w.normalizedWeight - 1 / spectrum.length) < 1e-12,
    )
      ? 'Equal active spectral weighting'
      : 'Normalized source spectral weights',
  ];
  if (!areaPopulation)
    warnings.push(
      'Fan/ring metrics describe only this discrete ray population, not illuminated pupil area.',
    );
  if (state.source.gaussianSigma > 0)
    assumptions.push(
      'Gaussian weights normalized over the defined finite source population',
    );
  if (
    state.source.type === 'point' &&
    state.source.distribution === 'uniform-pupil'
  )
    assumptions.push(
      'Target pupil centered on optical axis; cone NA and aim settings are not used',
    );
  if (state.sampling.customWeights)
    assumptions.push('User-supplied discrete sample weights');
  if (state.engine.ghosts)
    assumptions.push(
      'Ghosts are display diagnostics with bounce/power limits; excluded from primary metrics',
    );
  try {
    for (const w of spectrum) {
      const { samples, reference } = generateSourceSamples(
        model,
        optics,
        state,
        w.wavelengthUm,
      );
      const displayIndices = new Set();
      const ndraw = Math.min(samples.length, state.display.count);
      for (let i = 0; i < ndraw; i++)
        displayIndices.add(Math.floor((i * samples.length) / ndraw));
      const drawn = [];
      let wavelengthSurvival = 0,
        wavelengthPower = 0;
      const wavelengthHits = [];
      function trace(ray, visible) {
        const path =
          state.engine.type === 'fresnel'
            ? optics.traceFresnel3D(ray.O, ray.D, w.wavelengthUm, {
                ghosts:
                  visible && state.engine.ghosts && state.display.showGhosts,
                maxBounces: state.engine.maxBounces,
                minPower: state.engine.minPower,
              })
            : optics.traceRay(ray.O, ray.D, w.wavelengthUm);
        path.chief = ray.chief;
        if (visible) drawn.push(path);
        // Reject primary topology failures; diagnostics on clipped ghost paths
        // are explicitly warnings and cannot alter primary-power statistics.
        const issues = path.topologyErrors || [];
        const primaryIssues = issues.filter(
          (e) => !e.ghost && e.kind !== 'ghost' && e.branchKind !== 'ghost',
        );
        if (primaryIssues.length && !ray.chief && ray.sampleWeight > 0)
          topologyErrors += primaryIssues.length;
        if (issues.length)
          warnings.push(
            ...issues.map((e) =>
              typeof e === 'string'
                ? e
                : (e.ghost ? 'Ghost diagnostic incomplete: ' : '') +
                  (e.message ||
                    e.reason ||
                    'Undefined finite-element medium topology.'),
            ),
          );
        const detector =
          state.engine.type === 'fresnel'
            ? path.primaryHit
            : !path.vignetted &&
                path.points.length === state.surfaces.length + 1
              ? { p: path.points.at(-1), power: 1, opl: path.opl }
              : null;
        if (!detector) return;
        const uv = ray.normalizedPupil || ray.angular || [0, 0];
        const hit = {
          ...detector,
          wl: w.wavelengthUm,
          col: w.color,
          chief: ray.chief,
          sampleWeight: ray.sampleWeight,
          spectralWeight: w.normalizedWeight,
          weight: ray.sampleWeight * w.normalizedWeight * detector.power,
          uv,
          rho: Math.hypot(...uv),
        };
        if (ray.chief) referenceHits.push(hit);
        else {
          hits.push(hit);
          wavelengthHits.push(hit);
          detectorHits++;
          wavelengthSurvival += ray.sampleWeight;
          wavelengthPower += ray.sampleWeight * detector.power;
        }
      }
      samples.forEach((ray, i) => trace(ray, displayIndices.has(i)));
      // Always calculate reference, irrespective of its display toggle.
      trace(reference, state.display.showChief);
      traced += samples.length;
      survived += w.normalizedWeight * wavelengthSurvival;
      throughput += w.normalizedWeight * wavelengthPower;
      const spot = analyzeSpot(wavelengthHits);
      perWavelength.push({
        ...w,
        wl: w.wavelengthUm,
        col: w.color,
        bundleSurvival: wavelengthSurvival,
        throughput: wavelengthPower,
        rms: spot.rms,
        rmsText: spot.rmsText,
        centroid: spot.hits ? [spot.mx, spot.my] : null,
      });
      paths.push({ wl: w.wavelengthUm, col: w.color, paths: drawn });
    }
  } catch (error) {
    return { ...emptyResult(state, [error.message], warnings), materials };
  }
  if (topologyErrors)
    return {
      ...emptyResult(
        state,
        [
          `Quantitative tracing blocked: ${topologyErrors} undefined primary medium interactions. Model the missing boundaries or correct the apertures.`,
        ],
        [...new Set(warnings)],
      ),
      materials,
      paths,
    };
  const spot = analyzeSpot(hits),
    relativeOPL = analyzeRelativeOPL([...hits, ...referenceHits]);
  if (relativeOPL.groups.some((g) => g.referenceKind !== 'central reference'))
    warnings.push(
      'Central reference is blocked for a wavelength; Relative OPL uses its innermost surviving sample.',
    );
  const pupil = optics.entrancePupil(spectrum[0].wavelengthUm);
  return {
    status: 'ok',
    errors: [],
    warnings: [...new Set(warnings)],
    assumptions,
    materials,
    paths,
    hits,
    referenceHits,
    traced,
    detectorHits,
    vignetted: traced - detectorHits,
    totalPower: throughput,
    throughput,
    throughputText: percent(throughput),
    bundleSurvival: survived,
    vignettedFraction: 1 - survived,
    conditionalFresnelTransmission: survived > 0 ? throughput / survived : null,
    sourceCollection: sourceDefined ? throughput : null,
    rms: spot.rms,
    rmsText: spot.rmsText,
    centroid: spot.hits ? [spot.mx, spot.my] : null,
    spotHits: spot.hits,
    spot,
    aberration: relativeOPL,
    relativeOPL,
    perWavelength,
    source: {
      ...state.source,
      fieldX: state.source.fieldXDeg,
      fieldY: state.source.fieldYDeg,
      x: state.source.xMm,
      y: state.source.yMm,
      z: state.source.zMm,
      aimX: state.source.aimXDeg,
      aimY: state.source.aimYDeg,
    },
    wavelengths: perWavelength,
    engine: state.engine.type,
    rayCount: state.sampling.count,
    display: state.display,
    pupil,
  };
}

/** Transparent grid search; reports tested minimum, not continuous optimum. */
export function focusScan(state, { fromMm, toMm, steps = 41 }) {
  if (
    !Number.isFinite(fromMm) ||
    !Number.isFinite(toMm) ||
    fromMm >= toMm ||
    !Number.isInteger(steps) ||
    steps < 3 ||
    steps > 201
  )
    throw new Error(
      'Focus scan requires an increasing finite interval and 3–201 steps.',
    );
  const lastOptic = state.surfaces.at(-2)?.z ?? -Infinity;
  if (fromMm <= lastOptic)
    throw new Error('Focus interval must lie after the last optical surface.');
  const points = [];
  for (let i = 0; i < steps; i++) {
    const zMm = fromMm + ((toMm - fromMm) * i) / (steps - 1);
    const copy = structuredClone(state);
    copy.surfaces.at(-1).z = zMm;
    copy.display.count = 0;
    copy.display.showChief = false;
    copy.display.showGhosts = false;
    const result = simulate(copy);
    if (result.status !== 'ok') throw new Error(result.errors.join(' '));
    points.push({
      zMm,
      rmsMm: result.rms,
      bundleSurvival: result.bundleSurvival,
      throughput: result.throughput,
    });
  }
  const finite = points.filter((p) => p.rmsMm !== null);
  const best = finite.reduce((a, b) => (!a || b.rmsMm < a.rmsMm ? b : a), null);
  return {
    points,
    best,
    stepMm: (toMm - fromMm) / (steps - 1),
    metric: 'Power-weighted RMS spot radius about centroid (mm)',
    settings: state,
  };
}
