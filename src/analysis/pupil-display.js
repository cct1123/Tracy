/** Presentation only: calculated phase and weights stay in the numerical core. */
export function pupilMapData(result, options = {}) {
  const raw = options.pupilMetric === 'relative-opl';
  const key = options.wavefrontWavelengthKey || 'd';
  const wavefront = result?.wavefront;
  const wavelength = result?.wavelengths?.find((w) => w.key === key);
  const wavelengthUm = wavelength?.wavelengthUm ?? wavefront?.wavelengthUm;
  const unit = raw ? 'µm' : options.wavefrontUnits === 'waves' ? 'waves' : 'nm';
  const base = {
    title: raw ? 'Pupil · Relative OPL' : 'Pupil · Wavefront error',
    unit,
    wavelengthUm,
    points: [],
    rms: null,
    pv: null,
    maxAbs: 0,
    reason: 'No current quantitative result.',
    signature: `${raw ? 'opl' : 'wfe'}:${key}:${wavelengthUm}:${raw ? '' : !!options.wavefrontRemoveTilt}`,
  };
  if (result?.status !== 'ok') return base;
  if (!raw) {
    if (
      wavefront?.status !== 'ok' ||
      wavefront.wavelengthKey !== key ||
      wavefront.tiltRemoved !== !!options.wavefrontRemoveTilt
    )
      return {
        ...base,
        reason:
          wavefront?.reason ||
          'Wavefront result unavailable for these settings.',
      };
    const waves = unit === 'waves';
    return {
      ...base,
      points: wavefront.points.map((p) => ({
        ...p,
        value: waves ? p.wfeWaves : p.wfeNm,
      })),
      rms: waves ? wavefront.rmsWaves : wavefront.rmsNm,
      pv: waves ? wavefront.pvWaves : wavefront.pvNm,
      maxAbs: waves
        ? wavefront.maxAbsNm / (1000 * wavelengthUm)
        : wavefront.maxAbsNm,
      reason: null,
      note: `Current detector reference sphere. Piston removed; tilt ${wavefront.tiltRemoved ? 'removed' : 'retained'}; defocus retained. ${wavefront.weighting}`,
    };
  }
  const group = result.relativeOPL?.groups.find(
    (g) => g.wl === wavelength?.wavelengthUm,
  );
  if (!group)
    return {
      ...base,
      reason:
        'Enable the selected wavelength to view its relative optical path.',
    };
  return {
    ...base,
    points: group.points.map((p) => ({ ...p, value: p.opd })),
    rms: group.opdRms,
    pv: group.maxOpd - group.minOpd,
    maxAbs: Math.max(Math.abs(group.minOpd), Math.abs(group.maxOpd)),
    reason: null,
    note: `Launch-to-detector OPL minus ${group.referenceKind} OPL, without incident-phase or reference-sphere correction. This is not wavefront error.`,
  };
}

export function pupilMapScale(current, comparisons, options = {}) {
  if (options.scaleMode === 'locked') {
    const span =
      options.pupilMetric === 'relative-opl'
        ? options.oplSpanUm
        : options.wavefrontSpanNm /
          (current.unit === 'waves' ? 1000 * current.wavelengthUm : 1);
    if (Number.isFinite(span) && span > 0) return span;
  }
  return Math.max(
    current.maxAbs,
    ...comparisons
      .filter((m) => m.signature === current.signature && !m.reason)
      .map((m) => m.maxAbs),
    current.unit === 'nm' ? 0.001 : 1e-6,
  );
}

/** The map and legend share one signed, wavelength-independent colour scale. */
export function pupilMapColor(fraction) {
  const t = Math.max(-1, Math.min(1, fraction));
  const middle = [241, 241, 232];
  const end = t < 0 ? [40, 92, 180] : [190, 44, 50];
  return `rgb(${middle.map((v, i) => Math.round(v + (end[i] - v) * Math.abs(t))).join(',')})`;
}
