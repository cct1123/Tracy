import { dot3, finite3, norm3 } from '../core/vector.js';

export function unavailableWavefront(reason, options = {}) {
  return {
    status: 'unavailable',
    reason,
    wavelengthKey: options.wavelengthKey ?? '',
    wavelengthUm: options.wavelengthUm ?? null,
    units: options.units ?? 'nm',
    points: [],
    rmsNm: null,
    pvNm: null,
    rmsWaves: null,
    pvWaves: null,
    maxAbsNm: 0,
    reference: null,
    pistonRemoved: true,
    tiltRemoved: options.removeTilt ?? false,
    defocusRemoved: false,
    weighting: options.weighting ?? 'Equal surviving sample weights',
  };
}

/**
 * Exact geometric OPD on an exit-pupil reference sphere, in nm.
 * The sphere is centered on the chief detector intercept and passes through
 * the chief's intersection with the paraxial exit-pupil plane. Propagation is
 * extrapolated in the homogeneous image medium, including virtual pupils.
 *
 * Positive W means chief minus sample optical phase (optical path advance).
 * incidentPhaseMm is D·(O-O_chief) for a plane wave launched on equal-z origins,
 * zero for rays from a common point. Raw geometric OPL alone is not WFE.
 *
 * Equal surviving sample weights deliberately exclude Fresnel, Gaussian and
 * spectral intensity weights. Piston is removed; optional least-squares tilt
 * is fitted in normalized sampling coordinates. Defocus is always retained.
 */
export function analyzeWavefront(hits, options) {
  const {
    referenceHit: chief,
    wavelengthUm,
    exitPupilZMm,
    imageIndex = 1,
    removeTilt = false,
  } = options;
  const unavailable = (reason) => unavailableWavefront(reason, options);
  if (!chief || !finite3(chief.p) || !Number.isFinite(chief.opl))
    return unavailable('The chief/reference ray does not reach the detector.');
  const chiefDir = norm3(chief.direction);
  if (!chiefDir || Math.abs(chiefDir[2]) < 1e-10)
    return unavailable(
      'The chief direction cannot define a finite exit-pupil reference.',
    );
  if (
    !(wavelengthUm > 0) ||
    !Number.isFinite(wavelengthUm) ||
    !(imageIndex > 0) ||
    !Number.isFinite(imageIndex) ||
    !Number.isFinite(exitPupilZMm)
  )
    return unavailable(
      'A finite exit pupil, wavelength and image index are required.',
    );
  const signedRadius = (exitPupilZMm - chief.p[2]) / chiefDir[2],
    radius = Math.abs(signedRadius);
  if (!(radius > 1e-6) || !Number.isFinite(radius))
    return unavailable(
      'The detector is at the exit pupil; the reference sphere is singular.',
    );
  const branch = Math.sign(signedRadius),
    physical = hits.filter(
      (h) => !h.chief && h.role !== 'reference' && (h.sampleWeight ?? 1) > 0,
    );
  if (physical.length < 3)
    return unavailable('At least three surviving pupil samples are required.');
  const points = [];
  for (const h of physical) {
    const direction = norm3(h.direction);
    if (
      !direction ||
      !finite3(h.p) ||
      !Number.isFinite(h.opl) ||
      !Number.isFinite(h.incidentPhaseMm) ||
      !Array.isArray(h.uv) ||
      h.uv.length !== 2 ||
      !h.uv.every(Number.isFinite)
    )
      return unavailable(
        'A pupil sample has incomplete phase or direction data.',
      );
    const q = h.p.map((value, i) => value - chief.p[i]),
      b = dot3(q, direction),
      q2 = dot3(q, q),
      discriminant = radius * radius + b * b - q2;
    if (!(discriminant > 0) || !Number.isFinite(discriminant))
      return unavailable(
        'A sampled ray does not cross the selected reference sphere.',
      );
    // (t_sample - t_chief), rationalized to avoid subtracting two large radii.
    const correction =
        -b + (branch * (b * b - q2)) / (Math.sqrt(discriminant) + radius),
      rawWfeNm =
        -1e6 *
        (h.opl - chief.opl + h.incidentPhaseMm + imageIndex * correction);
    if (!Number.isFinite(rawWfeNm))
      return unavailable('Wavefront phase exceeds the finite numerical range.');
    points.push({ ...h, rawWfeNm });
  }
  const mean = (fn) =>
      points.reduce((sum, p) => sum + fn(p), 0) / points.length,
    pistonNm = mean((p) => p.rawWfeNm),
    u0 = mean((p) => p.uv[0]),
    v0 = mean((p) => p.uv[1]);
  let tiltUNm = 0,
    tiltVNm = 0;
  if (removeTilt) {
    const uu = mean((p) => (p.uv[0] - u0) ** 2),
      vv = mean((p) => (p.uv[1] - v0) ** 2),
      uv = mean((p) => (p.uv[0] - u0) * (p.uv[1] - v0)),
      uw = mean((p) => (p.uv[0] - u0) * (p.rawWfeNm - pistonNm)),
      vw = mean((p) => (p.uv[1] - v0) * (p.rawWfeNm - pistonNm)),
      angle = 0.5 * Math.atan2(2 * uv, uu - vv),
      c = Math.cos(angle),
      s = Math.sin(angle),
      delta = Math.hypot(uu - vv, 2 * uv),
      eigen = [(uu + vv + delta) / 2, (uu + vv - delta) / 2];
    // Pseudoinverse also handles a one-dimensional fan without fitting an
    // unsupported transverse direction or deleting the quadratic defocus term.
    for (const [i, vector] of [
      [0, [c, s]],
      [1, [-s, c]],
    ]) {
      if (eigen[i] > Math.max(1e-15, eigen[0] * 1e-12)) {
        const coefficient = (vector[0] * uw + vector[1] * vw) / eigen[i];
        tiltUNm += coefficient * vector[0];
        tiltVNm += coefficient * vector[1];
      }
    }
  }
  let sum2 = 0,
    lo = Infinity,
    hi = -Infinity;
  for (const p of points) {
    p.wfeNm =
      p.rawWfeNm -
      pistonNm -
      tiltUNm * (p.uv[0] - u0) -
      tiltVNm * (p.uv[1] - v0);
    p.wfeWaves = p.wfeNm / (wavelengthUm * 1000);
    sum2 += p.wfeNm ** 2;
    lo = Math.min(lo, p.wfeNm);
    hi = Math.max(hi, p.wfeNm);
  }
  const rmsNm = Math.sqrt(sum2 / points.length),
    pvNm = hi - lo;
  return {
    ...unavailableWavefront(null, options),
    status: 'ok',
    points,
    rmsNm,
    pvNm,
    rmsWaves: rmsNm / (wavelengthUm * 1000),
    pvWaves: pvNm / (wavelengthUm * 1000),
    maxAbsNm: Math.max(Math.abs(lo), Math.abs(hi)),
    pistonNm,
    tiltUNm,
    tiltVNm,
    reference: {
      kind: 'exit-pupil sphere',
      centerMm: [...chief.p],
      pointMm: chief.p.map((value, i) => value + chiefDir[i] * signedRadius),
      radiusMm: radius,
      exitPupilZMm,
      imageIndex,
      sign: 'chief minus sample optical phase',
    },
  };
}
