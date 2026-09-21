/** Delivered statistical weight; a display/reference ray never has weight. */
export function statisticalWeight(hit) {
  if (hit?.chief || hit?.role === 'reference') return 0;
  const weight =
    hit?.weight ??
    (hit?.sampleWeight ?? 1) * (hit?.spectralWeight ?? 1) * (hit?.power ?? 1);
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

export function analyzeSpot(hits) {
  const valid = (hits || []).filter(
    (h) =>
      Number.isFinite(h?.p?.[0]) &&
      Number.isFinite(h?.p?.[1]) &&
      statisticalWeight(h) > 0,
  );
  const sw = valid.reduce((sum, h) => sum + statisticalWeight(h), 0);
  if (!(sw > 0))
    return {
      hits: 0,
      weight: 0,
      mx: null,
      my: null,
      rms: null,
      maxr: null,
      rmsText: '—',
      valid: [],
    };
  const mx =
    valid.reduce((sum, h) => sum + h.p[0] * statisticalWeight(h), 0) / sw;
  const my =
    valid.reduce((sum, h) => sum + h.p[1] * statisticalWeight(h), 0) / sw;
  let r2 = 0,
    maxr = 0;
  for (const h of valid) {
    const d2 = (h.p[0] - mx) ** 2 + (h.p[1] - my) ** 2;
    r2 += statisticalWeight(h) * d2;
    maxr = Math.max(maxr, Math.sqrt(d2));
  }
  const rms = Math.sqrt(r2 / sw);
  const rmsText =
    rms < 0.001 ? `${(rms * 1000).toFixed(2)} µm` : `${rms.toFixed(3)} mm`;
  return { hits: valid.length, weight: sw, mx, my, rms, maxr, rmsText, valid };
}

/**
 * Relative OPL = 1000 * (sum n*segmentLength - reference OPL), in µm.
 * Reference: zero-weight central ray at this wavelength, or innermost surviving
 * sample when blocked (reported explicitly). Launch-plane-to-detector path
 * diagnostic; NOT a reference-sphere wavefront error.
 */
export function analyzeRelativeOPL(points) {
  const valid = (points || []).filter(
    (p) =>
      Number.isFinite(p?.opl) &&
      Number.isFinite(p?.rho) &&
      p?.p?.slice(0, 2).every(Number.isFinite) &&
      p?.uv?.every(Number.isFinite),
  );
  const grouped = new Map();
  for (const p of valid) {
    const key = p.wl ?? 0;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(p);
  }
  const groups = [];
  let globalOPDAbsMax = 0,
    opdPV = 0,
    sum2 = 0,
    totalWeight = 0,
    pointCount = 0;
  for (const arr of grouped.values()) {
    const physical = arr.filter((p) => statisticalWeight(p) > 0);
    if (!physical.length) continue;
    const ref =
      arr.find((p) => p.chief || p.role === 'reference') ||
      physical.reduce((a, b) => (a.rho < b.rho ? a : b));
    const referenceKind =
      ref.chief || ref.role === 'reference'
        ? 'central reference'
        : 'innermost surviving sample';
    let groupSum = 0,
      groupWeight = 0,
      minOpd = Infinity,
      maxOpd = -Infinity,
      maxTsa = 0;
    const pts = physical.map((p) => {
      const opd = (p.opl - ref.opl) * 1000;
      const tsa = Math.hypot(p.p[0] - ref.p[0], p.p[1] - ref.p[1]) * 1000;
      const w = statisticalWeight(p);
      groupSum += w * opd * opd;
      groupWeight += w;
      minOpd = Math.min(minOpd, opd);
      maxOpd = Math.max(maxOpd, opd);
      maxTsa = Math.max(maxTsa, tsa);
      return { ...p, opd, tsa };
    });
    sum2 += groupSum;
    totalWeight += groupWeight;
    pointCount += pts.length;
    opdPV = Math.max(opdPV, maxOpd - minOpd);
    globalOPDAbsMax = Math.max(
      globalOPDAbsMax,
      Math.abs(minOpd),
      Math.abs(maxOpd),
    );
    groups.push({
      wl: arr[0].wl,
      col: arr[0].col,
      ref,
      referenceKind,
      points: pts,
      minOpd,
      maxOpd,
      maxTsa,
      opdRms: Math.sqrt(groupSum / groupWeight),
    });
  }
  if (!pointCount)
    return {
      points: 0,
      groups: [],
      opdPV: null,
      opdRms: null,
      opdPVText: '—',
      opdRmsText: '—',
      globalOPDAbsMax: 0,
    };
  const opdRms = Math.sqrt(sum2 / totalWeight);
  return {
    points: pointCount,
    groups,
    opdPV,
    opdRms,
    opdPVText: `${opdPV.toFixed(3)} µm`,
    opdRmsText: `${opdRms.toFixed(3)} µm`,
    globalOPDAbsMax,
  };
}

// Compatibility API only. The UI and documentation use Relative OPL.
export const analyzeAberration = analyzeRelativeOPL;
