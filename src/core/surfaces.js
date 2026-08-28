// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { FP_EPS, kahanAdd, finite3, norm3, clamp1, dot3 } from './vector.js';

export const GEO_ABS_TOL = 1e-9;

export const INTERSECT_F_TOL = 1e-10;

export function conicSD(r, c, K) {
  if (!Number.isFinite(r) || !Number.isFinite(c) || !Number.isFinite(K))
    return null;
  if (Math.abs(c) < 1e-15 || r < 1e-15) return { s: 0, d: 0 };
  const q = (1 + K) * c * c * r * r;
  let rad = 1 - q;
  // Only clamp negatives that are plausibly IEEE-754 roundoff.  The old 1e-6
  // clamp could fabricate a surface near the conic domain edge.
  const radTol = 128 * FP_EPS * Math.max(1, Math.abs(q));
  if (rad < 0) {
    if (rad >= -radTol) rad = 0;
    else return null;
  }
  const sq = Math.sqrt(rad),
    den = 1 + sq;
  if (!(den > 0)) return null;
  const sag = (c * r * r) / den;
  // At the exact conic rim the derivative is formally infinite.  Returning a
  // huge finite slope would be worse than rejecting that measure-zero point.
  if (sq <= 64 * FP_EPS)
    return Number.isFinite(sag)
      ? { s: sag, d: Math.sign(c * r) * Infinity }
      : null;
  const d = (c * r) / sq;
  return Number.isFinite(sag) && Number.isFinite(d) ? { s: sag, d } : null;
}

export function asphSD(r, parm) {
  if (!Number.isFinite(r)) return null;
  const ss = { s: 0, c: 0 },
    dd = { s: 0, c: 0 },
    r2 = r * r;
  const terms = Object.entries(parm || {})
    .map(([ks, a]) => [parseInt(ks), +a])
    .filter(([k, a]) => k > 0 && Number.isFinite(a))
    .sort((a, b) => a[0] - b[0]);
  for (const [k, a] of terms) {
    const r2k = Math.pow(r2, k);
    if (!Number.isFinite(r2k)) return null;
    const sv = a * r2k;
    if (!Number.isFinite(sv)) return null;
    kahanAdd(ss, sv);
    if (r > 1e-18) {
      const dv = (a * 2 * k * r2k) / r;
      if (!Number.isFinite(dv)) return null;
      kahanAdd(dd, dv);
    }
  }
  return { s: ss.s, d: dd.s };
}

export function sagSD(r, surf) {
  const conicRes = conicSD(r, surf.curvature || 0, surf.conic || 0);
  if (!conicRes) return null;
  const { s: s1, d: d1 } = conicRes;
  if (!Number.isFinite(s1)) return null;
  if (surf.type === 'EVENASPH' && surf.parm && Object.keys(surf.parm).length) {
    const a = asphSD(r, surf.parm);
    if (!a) return null;
    const ss = s1 + a.s;
    // At a conic domain rim, ds/dr can legitimately tend to +/-Infinity.
    // Keep that information: surfNormal() converts it to the finite limiting normal.
    const dd = Number.isFinite(d1) ? d1 + a.d : d1;
    if (!Number.isFinite(ss) || Number.isNaN(dd)) return null;
    return { s: ss, d: dd };
  }
  return Number.isNaN(d1) ? null : { s: s1, d: d1 };
}

export function conicDomainRadius(surf) {
  const c = surf.curvature || 0,
    K = surf.conic || 0;
  if (Math.abs(c) > 1e-14 && 1 + K > 0)
    return 1 / (Math.abs(c) * Math.sqrt(1 + K));
  return Infinity;
}

export function effectiveSemiDiameter(surf) {
  const sd = surf && surf.sd > 0 ? surf.sd : Infinity,
    dom = conicDomainRadius(surf);
  if (!Number.isFinite(dom)) return sd;
  // Only inset a mathematical singular rim by a floating-point guard, not by a visible amount.
  const inset = Math.max(1e-9, 512 * FP_EPS * Math.max(1, dom));
  return Math.min(sd, Math.max(0, dom - inset));
}

export function getSafeR(r, surf) {
  return Math.min(Math.max(0, r), effectiveSemiDiameter(surf));
}

export function asphereOnlySD(r, surf) {
  if (surf.type === 'EVENASPH' && surf.parm && Object.keys(surf.parm).length)
    return asphSD(r, surf.parm);
  return { s: 0, d: 0 };
}

export function surfaceEquationAt(O, D, t, surf) {
  const px = O[0] + t * D[0],
    py = O[1] + t * D[1],
    pz = O[2] + t * D[2];
  if (![px, py, pz].every(Number.isFinite)) return null;
  const r = Math.hypot(px, py),
    a = asphereOnlySD(r, surf);
  if (!a) return null;
  const drdt = r > 1e-18 ? (px * D[0] + py * D[1]) / r : 0;
  const zc = pz - surf.z - a.s,
    dzcdt = D[2] - a.d * drdt,
    c = surf.curvature || 0,
    K = surf.conic || 0;
  if (Math.abs(c) < 1e-14)
    return { F: zc, dF: dzcdt, px, py, pz, r, zc, a, branch: true };
  const F = c * (r * r + (1 + K) * zc * zc) - 2 * zc;
  const dF = 2 * c * (px * D[0] + py * D[1] + (1 + K) * zc * dzcdt) - 2 * dzcdt;
  // The implicit conic contains a second sheet. The explicit Zemax sag uses
  // the sheet for which sqrt(rad)=1-(1+K)c*zc is non-negative.
  const branchMetric = 1 - (1 + K) * c * zc,
    branchTol = 1024 * FP_EPS * Math.max(1, Math.abs((1 + K) * c * zc));
  return {
    F,
    dF,
    px,
    py,
    pz,
    r,
    zc,
    a,
    branch: branchMetric >= -branchTol,
    branchMetric,
  };
}

export function intersect(O, D, surf) {
  if (!finite3(O) || !finite3(D) || !surf || !Number.isFinite(surf.z))
    return null;
  const dn = norm3(D);
  if (!dn) return null;
  D = dn;
  const dz = D[2];
  if (Math.abs(dz) < 1e-15) return null;
  const c = surf.curvature || 0,
    K = surf.conic || 0,
    ocx = O[0],
    ocy = O[1],
    ocz = O[2] - surf.z;
  const tScale = Math.max(1, Math.abs(O[2]), Math.abs(surf.z)),
    tTol = Math.max(1e-10, 256 * FP_EPS * tScale);
  let candidates = [];
  if (Math.abs(c) > 1e-14) {
    const A = c * (1 + K * dz * dz),
      F = c * (ocx * ocx + ocy * ocy + (1 + K) * ocz * ocz) - 2 * ocz;
    const G = dz - c * (ocx * D[0] + ocy * D[1] + (1 + K) * ocz * dz);
    let delta = G * G - A * F;
    const dTol = 512 * FP_EPS * Math.max(1, G * G, Math.abs(A * F));
    if (delta < 0) {
      if (delta >= -dTol) delta = 0;
      else if (
        !(
          surf.type === 'EVENASPH' &&
          surf.parm &&
          Object.keys(surf.parm).length
        )
      )
        return null;
    }
    if (delta >= 0) {
      const sq = Math.sqrt(delta),
        sgn = G >= 0 ? 1 : -1,
        q = G + sgn * sq;
      if (Math.abs(q) > 256 * FP_EPS * Math.max(1, Math.abs(G), sq))
        candidates.push(F / q);
      if (Math.abs(A) > 256 * FP_EPS * Math.max(1, Math.abs(c)))
        candidates.push(q / A);
    }
  }
  candidates.push((surf.z - O[2]) / dz);
  candidates = [
    ...new Set(
      candidates
        .filter(Number.isFinite)
        .map((x) => (Math.abs(x) < tTol ? 0 : x)),
    ),
  ]
    .filter((x) => x >= -tTol)
    .sort((a, b) => a - b);
  if (!candidates.length) return null;
  const isAsphere =
    surf.type === 'EVENASPH' && surf.parm && Object.keys(surf.parm).length;
  const eqTol = (q) =>
    Math.max(
      1e-11,
      1024 * FP_EPS * Math.max(1, Math.abs(q.zc), q.r, Math.abs(surf.z)),
    );
  if (!isAsphere) {
    for (const t of candidates) {
      const q = surfaceEquationAt(O, D, t, surf);
      if (q && q.branch && Math.abs(q.F) <= eqTol(q)) return [q.px, q.py, q.pz];
    }
    return null;
  }
  for (const seed of candidates) {
    let t = seed,
      lastAbs = Infinity;
    for (let it = 0; it < 48; it++) {
      const q = surfaceEquationAt(O, D, t, surf);
      if (!q) break;
      const tol = eqTol(q),
        aF = Math.abs(q.F);
      if (q.branch && aF <= tol) return [q.px, q.py, q.pz];
      if (!Number.isFinite(q.dF) || Math.abs(q.dF) < 1e-15) break;
      let dt = q.F / q.dF;
      if (!Number.isFinite(dt)) break;
      let maxStep = Math.max(0.02, 0.3 * Math.max(Math.abs(t), 1));
      if (aF > lastAbs) maxStep *= 0.2;
      if (Math.abs(dt) > maxStep) dt = Math.sign(dt) * maxStep;
      const next = t - dt;
      if (next < -tTol) break;
      if (
        Math.abs(next - t) <=
        Math.max(1e-12, 256 * FP_EPS * Math.max(1, Math.abs(t)))
      ) {
        const qq = surfaceEquationAt(O, D, next, surf);
        if (qq && qq.branch && Math.abs(qq.F) <= 10 * eqTol(qq))
          return [qq.px, qq.py, qq.pz];
        break;
      }
      lastAbs = aF;
      t = next;
    }
  }
  // Bracketed fallback across the actual surface sag range.
  const er = effectiveSemiDiameter(surf);
  let smin = 0,
    smax = 0;
  if (Number.isFinite(er) && er > 0) {
    for (let i = 0; i <= 32; i++) {
      const q = sagSD((er * i) / 32, surf);
      if (q) {
        smin = Math.min(smin, q.s);
        smax = Math.max(smax, q.s);
      }
    }
  }
  let ta = (surf.z + smin - O[2]) / dz,
    tb = (surf.z + smax - O[2]) / dz;
  if (ta > tb) [ta, tb] = [tb, ta];
  ta = Math.max(-tTol, ta - 1e-6);
  tb += 1e-6;
  if (Number.isFinite(ta) && Number.isFinite(tb) && tb >= ta) {
    let prevT = ta,
      prev = surfaceEquationAt(O, D, prevT, surf);
    for (let i = 1; i <= 64; i++) {
      const tt = ta + ((tb - ta) * i) / 64,
        cur = surfaceEquationAt(O, D, tt, surf);
      if (cur && cur.branch && Math.abs(cur.F) <= eqTol(cur))
        return [cur.px, cur.py, cur.pz];
      if (prev && cur && prev.F * cur.F < 0) {
        let a = prevT,
          b = tt,
          fa = prev.F;
        for (let k = 0; k < 56; k++) {
          const m = 0.5 * (a + b),
            qm = surfaceEquationAt(O, D, m, surf);
          if (!qm) break;
          if (qm.branch && Math.abs(qm.F) <= eqTol(qm))
            return [qm.px, qm.py, qm.pz];
          if (fa * qm.F <= 0) b = m;
          else {
            a = m;
            fa = qm.F;
          }
        }
        const qm = surfaceEquationAt(O, D, 0.5 * (a + b), surf);
        if (qm && qm.branch) return [qm.px, qm.py, qm.pz];
      }
      if (cur) {
        prevT = tt;
        prev = cur;
      }
    }
  }
  return null;
}

export function surfNormal(hit, surf, D) {
  const x = hit[0],
    y = hit[1],
    z = hit[2],
    r = Math.hypot(x, y),
    a = asphereOnlySD(r, surf);
  if (!a) return null;
  const c = surf.curvature || 0,
    K = surf.conic || 0,
    zc = z - surf.z - a.s;
  let nx, ny, nz;
  if (Math.abs(c) < 1e-14) {
    nx = r > 1e-18 ? (-a.d * x) / r : 0;
    ny = r > 1e-18 ? (-a.d * y) / r : 0;
    nz = 1;
  } else {
    const gz = 2 * c * (1 + K) * zc - 2,
      adr = r > 1e-18 ? a.d / r : 0;
    nx = 2 * c * x - gz * adr * x;
    ny = 2 * c * y - gz * adr * y;
    nz = gz;
  }
  const len = Math.hypot(nx, ny, nz);
  if (!(len > 0) || !Number.isFinite(len)) return null;
  nx /= len;
  ny /= len;
  nz /= len;
  if (nx * D[0] + ny * D[1] + nz * D[2] > 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  return [nx, ny, nz];
}

export function snell(D, N, n1, n2) {
  if (
    !finite3(D) ||
    !finite3(N) ||
    !(n1 > 0) ||
    !(n2 > 0) ||
    !Number.isFinite(n1) ||
    !Number.isFinite(n2)
  )
    return null;
  const d = norm3(D),
    nn = norm3(N);
  if (!d || !nn) return null;
  const mu = n1 / n2,
    cosI = clamp1(-dot3(nn, d));
  let s2 = mu * mu * Math.max(0, 1 - cosI * cosI);
  const tirTol = 256 * FP_EPS * Math.max(1, Math.abs(s2));
  if (s2 > 1 + tirTol) return null;
  if (s2 > 1) s2 = 1;
  const cosT = Math.sqrt(Math.max(0, 1 - s2)),
    B = mu * cosI - cosT;
  return norm3([
    mu * d[0] + B * nn[0],
    mu * d[1] + B * nn[1],
    mu * d[2] + B * nn[2],
  ]);
}

export function apertureTolerance(surf, r = 0) {
  // Keep the boundary deterministic at nanometre/sub-nanometre scale without
  // creating a visible clear-aperture allowance.
  return Math.max(
    1e-7,
    1024 * FP_EPS * Math.max(1, Math.abs(r), Math.abs(surf?.sd || 0)),
  );
}

export function apertureOutside(hit, surf) {
  if (!(surf.sd > 0)) return false;
  const r = Math.hypot(hit[0], hit[1]);
  return r > surf.sd + apertureTolerance(surf, r);
}

export function apertureMargin(hit, surf) {
  return (surf.sd || Infinity) - Math.hypot(hit[0], hit[1]);
}

export function reflect3(D, N) {
  const d = norm3(D),
    n = norm3(N);
  if (!d || !n) return null;
  const q = 2 * dot3(d, n);
  return norm3([d[0] - q * n[0], d[1] - q * n[1], d[2] - q * n[2]]);
}

export function fresnelUnpolarized(D, N, n1, n2) {
  const d = norm3(D),
    n = norm3(N);
  if (!d || !n || !(n1 > 0) || !(n2 > 0)) return { R: 1, T: 0, tir: true };
  const ci = Math.max(0, Math.min(1, -dot3(n, d))),
    eta = n1 / n2;
  let st2 = eta * eta * Math.max(0, 1 - ci * ci),
    tol = 256 * FP_EPS * Math.max(1, Math.abs(st2));
  if (st2 > 1 + tol) return { R: 1, T: 0, tir: true };
  if (st2 > 1) st2 = 1;
  const ct = Math.sqrt(Math.max(0, 1 - st2)),
    ds = n1 * ci + n2 * ct,
    dp = n2 * ci + n1 * ct;
  if (Math.abs(ds) < 1e-15 || Math.abs(dp) < 1e-15)
    return { R: 1, T: 0, tir: false };
  const rs = (n1 * ci - n2 * ct) / ds,
    rp = (n2 * ci - n1 * ct) / dp;
  const R = Math.max(0, Math.min(1, 0.5 * (rs * rs + rp * rp)));
  return { R, T: Math.max(0, 1 - R), tir: false };
}
