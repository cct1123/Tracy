// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.

export function analyzeSpot(hits) {
  const valid = [];
  for (const h of hits || []) {
    if (!h || !h.p || !Number.isFinite(h.p[0]) || !Number.isFinite(h.p[1]))
      continue;
    const power = Number.isFinite(h.power) ? Math.max(0, h.power) : 1;
    valid.push({ ...h, power });
  }
  if (!valid.length)
    return {
      hits: 0,
      weight: 0,
      mx: null,
      my: null,
      rms: null,
      maxr: null,
      rmsText: '—',
    };
  let sw = 0,
    mx = 0,
    my = 0;
  for (const h of valid) {
    sw += h.power;
    mx += h.p[0] * h.power;
    my += h.p[1] * h.power;
  }
  // A zero-power cloud can occur only in malformed/custom data. Fall back to
  // equal weights rather than divide by zero or silently retain an old RMS.
  if (!(sw > 0)) {
    sw = valid.length;
    mx = valid.reduce((a, h) => a + h.p[0], 0);
    my = valid.reduce((a, h) => a + h.p[1], 0);
  }
  mx /= sw;
  my /= sw;
  let r2 = 0,
    maxr = 0;
  for (const h of valid) {
    const dx = h.p[0] - mx,
      dy = h.p[1] - my,
      w = h.power > 0 ? h.power : sw === valid.length ? 1 : 0;
    r2 += (dx * dx + dy * dy) * w;
    maxr = Math.max(maxr, Math.hypot(dx, dy));
  }
  const rms = Math.sqrt(Math.max(0, r2 / sw));
  const rmsText =
    rms < 0.001 ? `${(rms * 1000).toFixed(2)} µm` : `${rms.toFixed(3)} mm`;
  return { hits: valid.length, weight: sw, mx, my, rms, maxr, rmsText, valid };
}

export function analyzeAberration(points) {
  const valid = [];
  for (const p of points || []) {
    const rho = Number.isFinite(p?.rho)
      ? Math.max(0, Math.min(1, p.rho))
      : null;
    const opl = Number.isFinite(p?.opl) ? p.opl : null;
    const x = p?.p?.[0],
      y = p?.p?.[1],
      u = p?.uv?.[0],
      v = p?.uv?.[1];
    if (
      rho === null ||
      opl === null ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(u) ||
      !Number.isFinite(v)
    )
      continue;
    valid.push({ ...p, rho, opl, uv: [u, v] });
  }
  if (!valid.length)
    return { points: 0, groups: [], opdPVText: '—', opdRmsText: '—' };
  const groupsMap = new Map();
  for (const p of valid) {
    const key = `${p.wl || 0}`;
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(p);
  }
  const groups = [];
  let globalOPDAbsMax = 0,
    globalPV = 0,
    globalRms = 0;
  for (const arr of groupsMap.values()) {
    arr.sort((a, b) => a.rho - b.rho);
    let ref =
      arr.find((q) => q.chief) ||
      arr.reduce((best, q) => (q.rho < best.rho ? q : best), arr[0]);
    const rx = ref.p[0],
      ry = ref.p[1],
      ropl = ref.opl;
    let minOpd = Infinity,
      maxOpd = -Infinity,
      maxTsa = 0,
      sum2 = 0;
    const pts = arr.map((q) => {
      const opd = (q.opl - ropl) * 1000;
      const tsa = Math.hypot(q.p[0] - rx, q.p[1] - ry) * 1000;
      minOpd = Math.min(minOpd, opd);
      maxOpd = Math.max(maxOpd, opd);
      maxTsa = Math.max(maxTsa, tsa);
      sum2 += opd * opd;
      return { ...q, opd, tsa };
    });
    const opdRms = Math.sqrt(sum2 / Math.max(1, pts.length));
    globalOPDAbsMax = Math.max(
      globalOPDAbsMax,
      Math.abs(minOpd),
      Math.abs(maxOpd),
    );
    globalPV = Math.max(globalPV, maxOpd - minOpd);
    globalRms = Math.max(globalRms, opdRms);
    groups.push({
      wl: arr[0].wl,
      col: arr[0].col,
      ref,
      points: pts,
      minOpd,
      maxOpd,
      maxTsa,
      opdRms,
    });
  }
  const opdPVText =
    globalPV < 1 ? `${globalPV.toFixed(3)} µm` : `${globalPV.toFixed(2)} µm`;
  const opdRmsText =
    globalRms < 1 ? `${globalRms.toFixed(3)} µm` : `${globalRms.toFixed(2)} µm`;
  return {
    points: valid.length,
    groups,
    opdPV: globalPV,
    opdPVText,
    opdRms: globalRms,
    opdRmsText,
    globalOPDAbsMax: Math.max(globalOPDAbsMax, 1e-6),
  };
}
