// @ts-check
/**
 * Canonical, serializable numerical configuration. Lengths are millimetres,
 * vacuum wavelengths micrometres, field/aim angles degrees, NA dimensionless
 * in incident air. Unit suffixes are part of the public API.
 * @typedef {import('./simulation-types.js').SimulationState} SimulationState
 */
import { WL_COLORS, WL_VALS } from '../core/wavelengths.js';
import { validateImportedSurface } from '../io/surface-schema.js';

export const SIMULATION_SCHEMA_VERSION = 1;

/** @returns {import('./simulation-types.js').SimulationSettings} */
export function defaultSimulationSettings() {
  return {
    source: {
      type: 'collimated',
      fieldXDeg: 0,
      fieldYDeg: 0,
      xMm: 0,
      yMm: 0,
      zMm: -40,
      aimXDeg: 0,
      aimYDeg: 0,
      na: 0.3,
      distribution: 'uniform-solid-angle',
      illumination: 'entrance-pupil',
      diameterMm: 25.4,
      pupilZMm: -1,
      gaussianSigma: 0,
    },
    spectrum: ['F', 'd', 'C'].map((key) => ({
      key,
      wavelengthUm: WL_VALS[key],
      sourceWeight: 1,
      color: WL_COLORS[key],
      enabled: true,
    })),
    sampling: { pattern: 'pupil3d', count: 49, customWeights: null },
    engine: {
      type: 'sequential',
      materialMode: 'strict',
      ghosts: false,
      maxBounces: 4,
      minPower: 0.003,
    },
    display: {
      count: 97,
      showChief: true,
      showVignetted: false,
      showGhosts: false,
      showPupil: true,
    },
    analysis: {
      pupilMetric: 'wavefront',
      wavefrontWavelengthKey: 'd',
      wavefrontUnits: 'nm',
      wavefrontRemoveTilt: false,
      wavefrontSpanNm: 100,
      scaleMode: 'auto',
      spotSpanMm: 1,
      oplSpanUm: 1,
      overlay: false,
      focusFromMm: null,
      focusToMm: null,
      focusSteps: 41,
    },
  };
}

/** Merge only recognized sections; validate before using imported settings.
 * @param {Partial<import('./simulation-types.js').SimulationSettings>} patch
 */
export function simulationSettings(patch = {}) {
  const defaults = defaultSimulationSettings();
  return {
    source: { ...defaults.source, ...patch.source },
    spectrum: structuredClone(patch.spectrum ?? defaults.spectrum),
    sampling: { ...defaults.sampling, ...patch.sampling },
    engine: { ...defaults.engine, ...patch.engine },
    display: { ...defaults.display, ...patch.display },
    analysis: { ...defaults.analysis, ...patch.analysis },
  };
}

/** Snapshot the editable bench: simulations never mutate live geometry.
 * @returns {SimulationState}
 */
export function createSimulationState(
  bench,
  settings = {},
  customGlasses = {},
) {
  return {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    ...simulationSettings(settings),
    components: structuredClone(bench.components || []),
    surfaces: structuredClone(bench.surfaces || []),
    epdMm: bench.epd || 25.4,
    importMeta: structuredClone(bench.importMeta || {}),
    customGlasses: structuredClone(customGlasses),
  };
}

/** Reject malformed settings; editable layout feasibility is checked separately.
 * @param {SimulationState} s
 * @returns {string[]}
 */
export function validateSimulationState(s) {
  const errors = [];
  if (!s || typeof s !== 'object')
    return ['Simulation state must be an object.'];
  const finite = (value, name) => {
    if (!Number.isFinite(value)) errors.push(`${name} must be finite.`);
  };
  if (s?.schemaVersion !== SIMULATION_SCHEMA_VERSION)
    errors.push('Unsupported simulation schema.');
  if (!Array.isArray(s?.surfaces) || !s.surfaces.length)
    errors.push('A terminal detector is required.');
  const surfaces = Array.isArray(s?.surfaces) ? s.surfaces : [];
  if (
    surfaces.at(-1)?.componentKind !== 'detector' ||
    surfaces.filter((surface) => surface?.componentKind === 'detector')
      .length !== 1
  )
    errors.push(
      'Exactly one explicitly identified terminal detector is required.',
    );
  for (const surface of surfaces) {
    if (!surface || typeof surface !== 'object') {
      errors.push('Invalid surface record.');
      continue;
    }
    try {
      validateImportedSurface({
        type: 'STANDARD',
        conic: 0,
        parm: {},
        ...surface,
      });
    } catch (error) {
      errors.push(error.message);
    }
    finite(surface.z, 'Surface z (mm)');
    finite(surface.curvature, 'Curvature (1/mm)');
    if (!(surface.sd > 0 && Number.isFinite(surface.sd)))
      errors.push('Clear semi-apertures must be positive finite mm.');
  }
  for (const key of [
    'fieldXDeg',
    'fieldYDeg',
    'xMm',
    'yMm',
    'zMm',
    'aimXDeg',
    'aimYDeg',
    'na',
    'diameterMm',
    'pupilZMm',
    'gaussianSigma',
  ])
    finite(s?.source?.[key], key);
  if (!['point', 'collimated'].includes(s?.source?.type))
    errors.push('Unknown source type.');
  if (
    !['uniform-angular', 'uniform-solid-angle', 'uniform-pupil'].includes(
      s?.source?.distribution,
    )
  )
    errors.push('Unknown point distribution.');
  if (!['entrance-pupil', 'fixed-disk'].includes(s?.source?.illumination))
    errors.push('Unknown illumination model.');
  if (!(s?.source?.na >= 0 && s.source.na < 1))
    errors.push('Air NA must be in [0,1).');
  if (!(s?.source?.diameterMm > 0))
    errors.push('Source disk diameter must be positive.');
  if (!(s?.source?.gaussianSigma >= 0))
    errors.push('Gaussian sigma must be nonnegative.');
  for (const key of ['fieldXDeg', 'fieldYDeg', 'aimXDeg', 'aimYDeg'])
    if (Math.abs(s?.source?.[key]) >= 89)
      errors.push(`${key} must be within ±89 degrees.`);
  if (
    !Number.isInteger(s?.sampling?.count) ||
    s.sampling.count < 1 ||
    s.sampling.count > 5001
  )
    errors.push(
      'Analysis count must be an integer from 1 to 5001 per wavelength.',
    );
  if (
    !['pupil3d', 'meridional', 'sagittal', 'ring'].includes(
      s?.sampling?.pattern,
    )
  )
    errors.push('Unknown sampling pattern.');
  if (
    s?.sampling?.customWeights !== null &&
    s?.sampling?.customWeights !== undefined
  ) {
    const w = s.sampling.customWeights;
    if (
      !Array.isArray(w) ||
      w.length !== s.sampling.count ||
      !w.every((v) => Number.isFinite(v) && v >= 0) ||
      !w.some((v) => v > 0)
    )
      errors.push(
        'Custom sample weights must be nonnegative, have positive sum, and match analysis count.',
      );
  }
  if (!['sequential', 'fresnel'].includes(s?.engine?.type))
    errors.push('Unknown trace engine.');
  if (!['strict', 'exploratory'].includes(s?.engine?.materialMode))
    errors.push('Unknown material policy.');
  if (
    !Number.isInteger(s?.engine?.maxBounces) ||
    s.engine.maxBounces < 0 ||
    s.engine.maxBounces > 12
  )
    errors.push('Bounce limit must be 0–12.');
  if (!(s?.engine?.minPower >= 0 && s.engine.minPower <= 1))
    errors.push('Ghost cutoff must be in [0,1].');
  if (
    !Number.isInteger(s?.display?.count) ||
    s.display.count < 0 ||
    s.display.count > 5001
  )
    errors.push('Display count must be 0–5001.');
  if (
    !Array.isArray(s?.spectrum) ||
    !s.spectrum.length ||
    s.spectrum.length > 32
  )
    errors.push('Specify 1–32 spectral entries.');
  let sum = 0;
  for (const w of Array.isArray(s?.spectrum) ? s.spectrum : []) {
    if (!w || typeof w !== 'object') {
      errors.push('Invalid spectral record.');
      continue;
    }
    if (!(Number.isFinite(w.wavelengthUm) && w.wavelengthUm > 0))
      errors.push('Wavelengths must be positive micrometres.');
    if (!(Number.isFinite(w.sourceWeight) && w.sourceWeight >= 0))
      errors.push('Spectral weights must be nonnegative.');
    if (!Number.isInteger(w.color) || w.color < 0 || w.color > 0xffffff)
      errors.push('Invalid wavelength display color.');
    if (w.enabled) sum += w.sourceWeight;
  }
  if (!(sum > 0))
    errors.push('Enable at least one wavelength with positive source weight.');
  if (!['auto', 'locked', 'shared'].includes(s?.analysis?.scaleMode))
    errors.push('Unknown plot scale mode.');
  if (!['wavefront', 'relative-opl'].includes(s?.analysis?.pupilMetric))
    errors.push('Unknown pupil metric.');
  if (typeof s?.analysis?.wavefrontWavelengthKey !== 'string')
    errors.push('Wavefront wavelength key must be a string.');
  if (!['nm', 'waves'].includes(s?.analysis?.wavefrontUnits))
    errors.push('Wavefront units must be nm or waves.');
  if (typeof s?.analysis?.wavefrontRemoveTilt !== 'boolean')
    errors.push('Wavefront tilt removal must be a boolean.');
  if (
    !(
      s?.analysis?.wavefrontSpanNm > 0 &&
      Number.isFinite(s.analysis.wavefrontSpanNm)
    )
  )
    errors.push('Wavefront scale must be positive finite nm.');
  if (
    !(s?.analysis?.spotSpanMm > 0 && Number.isFinite(s.analysis.spotSpanMm)) ||
    !(s?.analysis?.oplSpanUm > 0 && Number.isFinite(s.analysis.oplSpanUm))
  )
    errors.push('Plot scales must be positive finite values.');
  if (
    !Number.isInteger(s?.analysis?.focusSteps) ||
    s.analysis.focusSteps < 3 ||
    s.analysis.focusSteps > 201
  )
    errors.push('Focus scan count must be 3–201.');
  for (const key of ['focusFromMm', 'focusToMm'])
    if (s?.analysis?.[key] !== null && !Number.isFinite(s?.analysis?.[key]))
      errors.push('Focus bounds must be finite mm or unset.');
  return errors;
}

/** Editable projects may contain unfinished layouts; only tracing requires this.
 * @param {SimulationState} s
 * @returns {string[]}
 */
export function validateTraceLayout(s) {
  const errors = [],
    optical = s.surfaces.slice(0, -1);
  if (optical.some((surface, i) => i > 0 && surface.z < optical[i - 1].z))
    errors.push('Optical components overlap. Separate them to resume tracing.');
  if (
    optical.length &&
    (s.surfaces.at(-1)?.z ?? -Infinity) <=
      Math.max(...optical.map((surface) => surface.z))
  )
    errors.push(
      'Move the detector after the optics to trace in the +z direction.',
    );
  if (s.source.zMm >= s.surfaces[0].z)
    errors.push(
      'Move the source before the first surface in air to trace in the +z direction.',
    );
  if (
    s.source.type === 'point' &&
    s.source.distribution === 'uniform-pupil' &&
    s.source.pupilZMm <= s.source.zMm
  )
    errors.push('Target pupil plane must be after the point source.');
  return errors;
}
