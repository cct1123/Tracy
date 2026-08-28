// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.

export function cloneSurface(s) {
  return { ...s, parm: { ...(s.parm || {}) } };
}

export function airLikeGlass(g) {
  return !g || ['AIR', 'NONE', 'NULL', ''].includes(String(g).toUpperCase());
}

export function radiusToCurvature(R) {
  const v = parseFloat(R);
  return !isFinite(v) || Math.abs(v) < 1e-12 ? 0 : 1 / v;
}

export function componentLength(c) {
  const ss = componentLocalSurfaces(c);
  if (!ss.length) return 0;
  let lo = Infinity,
    hi = -Infinity;
  for (const q of ss) {
    lo = Math.min(lo, q.z || 0);
    hi = Math.max(hi, q.z || 0);
  }
  return Math.max(0, hi - lo);
}

export function componentRadius(c) {
  const ss = componentLocalSurfaces(c);
  return Math.max(1, ...ss.map((q) => q.sd || 1));
}

export function componentHasOrientation(c) {
  return !!c && !['aperture', 'detector'].includes(c.kind);
}

export function componentOrientation(c) {
  return componentHasOrientation(c) && c.orientation === -1 ? -1 : 1;
}

export function orientSurfaceSequence(base, orientation) {
  const src = (base || []).map(cloneSurface);
  if (orientation !== -1 || src.length < 2) return src;
  const z0 = Math.min(...src.map((q) => q.z || 0)),
    z1 = Math.max(...src.map((q) => q.z || 0)),
    L = z1 - z0;
  const before = src.map((q, i) => (i === 0 ? null : src[i - 1].glass));
  return src
    .map((q, i) => ({ q, i }))
    .reverse()
    .map(({ q, i }) => {
      const out = cloneSurface(q);
      out.z = L - ((q.z || 0) - z0);
      out.curvature = -(q.curvature || 0);
      out.parm = Object.fromEntries(
        Object.entries(q.parm || {}).map(([k, v]) => [k, -v]),
      );
      out.glass = before[i] || null;
      return out;
    })
    .sort((a, b) => a.z - b.z);
}

export function setComponentOrientation(c, orientation) {
  if (!componentHasOrientation(c)) return;
  c.orientation = orientation === -1 ? -1 : 1;
}

export function componentLocalSurfaces(c) {
  let base = [];
  if (c.kind === 'single') {
    const p = c.params;
    base = [
      {
        num: 1,
        z: 0,
        type: 'STANDARD',
        curvature: radiusToCurvature(p.R1),
        conic: 0,
        parm: {},
        glass: p.glass || 'N-BK7',
        sd: p.diameter / 2,
        thickness: p.t,
      },
      {
        num: 2,
        z: Math.max(0.05, +p.t || 0.05),
        type: 'STANDARD',
        curvature: radiusToCurvature(p.R2),
        conic: 0,
        parm: {},
        glass: null,
        sd: p.diameter / 2,
        thickness: 0,
      },
    ];
  } else if (c.kind === 'achromat') {
    const p = c.params,
      t1 = Math.max(0.05, +p.t1 || 0.05),
      t2 = Math.max(0.05, +p.t2 || 0.05);
    base = [
      {
        num: 1,
        z: 0,
        type: 'STANDARD',
        curvature: radiusToCurvature(p.R1),
        conic: 0,
        parm: {},
        glass: p.glass1 || 'N-BK7',
        sd: p.diameter / 2,
        thickness: t1,
      },
      {
        num: 2,
        z: t1,
        type: 'STANDARD',
        curvature: radiusToCurvature(p.R2),
        conic: 0,
        parm: {},
        glass: p.glass2 || 'N-F2',
        sd: p.diameter / 2,
        thickness: t2,
      },
      {
        num: 3,
        z: t1 + t2,
        type: 'STANDARD',
        curvature: radiusToCurvature(p.R3),
        conic: 0,
        parm: {},
        glass: null,
        sd: p.diameter / 2,
        thickness: 0,
      },
    ];
  } else if (c.kind === 'aperture' || c.kind === 'detector') {
    const d = Math.max(0.2, +c.params.diameter || 25.4);
    base = [
      {
        num: 1,
        z: 0,
        type: 'STANDARD',
        curvature: 0,
        conic: 0,
        parm: {},
        glass: null,
        sd: d / 2,
        thickness: 0,
        isStop: c.kind === 'aperture',
      },
    ];
  } else base = (c.surfaces || []).map(cloneSurface);
  return orientSurfaceSequence(base, componentOrientation(c));
}
