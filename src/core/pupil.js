// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { sellmeier } from './materials.js';
import { FP_EPS, norm3 } from './vector.js';
import { intersect, surfNormal, snell, apertureOutside } from './surfaces.js';

export function createPupil(model, optics = {}) {
  function mat2mul(a, b) {
    return [
      a[0] * b[0] + a[1] * b[2],
      a[0] * b[1] + a[1] * b[3],
      a[2] * b[0] + a[3] * b[2],
      a[2] * b[1] + a[3] * b[3],
    ];
  }

  function stopSurfaceIndex() {
    // A user-added bench aperture is an explicit new stop and overrides an imported stop.
    let i = model.surfaces.findIndex((s) => s.componentKind === 'aperture');
    if (i >= 0) return { index: i, kind: 'bench stop' };
    i = model.surfaces.findIndex((s) => s.isStop);
    if (i >= 0) return { index: i, kind: 'Zemax STOP' };
    return { index: -1, kind: 'fallback' };
  }

  function paraxialToSurface(stopIdx, wl = 0.5875618) {
    let M = [1, 0, 0, 1];
    if (stopIdx <= 0) return M;
    for (let i = 0; i < stopIdx; i++) {
      const s = model.surfaces[i],
        n1 = sellmeier(i > 0 ? model.surfaces[i - 1].glass : null, wl),
        n2 = sellmeier(s.glass, wl);
      // reduced-angle vector [y, n*theta]: refraction followed by translation
      const phi = (n2 - n1) * (s.curvature || 0);
      const R = [1, 0, -phi, 1];
      M = mat2mul(R, M);
      const dz = model.surfaces[i + 1].z - s.z;
      if (isFinite(dz) && Math.abs(dz) > 1e-15) {
        const T = [1, dz / Math.max(1e-9, n2), 0, 1];
        M = mat2mul(T, M);
      }
    }
    return M;
  }

  function entrancePupil(wl = 0.5875618) {
    if (!model.surfaces.length)
      return {
        z: 0,
        diameter: model.epd || 25,
        stopIndex: -1,
        stopKind: 'none',
        finite: true,
        source: 'fallback',
      };
    const st = stopSurfaceIndex();
    if (st.index < 0)
      return {
        z: model.surfaces[0].z,
        diameter: model.epd || 2 * (model.surfaces[0].sd || 12.5),
        stopIndex: -1,
        stopKind: 'no explicit stop',
        finite: true,
        source: 'first-surface fallback',
      };
    const M = paraxialToSurface(st.index, wl),
      A = M[0],
      B = M[1],
      firstZ = model.surfaces[0].z;
    if (Math.abs(A) < 1e-10)
      return {
        z: Infinity,
        diameter: Infinity,
        stopIndex: st.index,
        stopKind: st.kind,
        finite: false,
        source: 'paraxial stop image',
      };
    const z = firstZ + B / A;
    const stopD = 2 * (model.surfaces[st.index].sd || model.epd / 2 || 12.5);
    const explicitZemax =
      st.kind === 'Zemax STOP' &&
      isFinite(model.benchEpd) &&
      model.benchEpd > 0 &&
      /^ZMX (ENPD|PUPD)/.test(model.importMeta.enpdSource || '');
    const diameter = explicitZemax ? model.benchEpd : stopD / Math.abs(A);
    return {
      z,
      diameter,
      stopIndex: st.index,
      stopKind: st.kind,
      finite: isFinite(z) && isFinite(diameter),
      source: explicitZemax
        ? `${model.importMeta.enpdSource} + paraxial ENP`
        : 'paraxial stop image',
      A,
      B,
      stopDiameter: stopD,
    };
  }

  function traceToSurfaceIndex(O, D, wl, targetIdx) {
    let pos = [...O],
      dir = norm3(D);
    for (let i = 0; i <= targetIdx; i++) {
      const s = model.surfaces[i],
        hit = intersect(pos, dir, s);
      if (!hit) return null;
      if (i === targetIdx) return { hit, dir };
      if (apertureOutside(hit, s)) return null;
      const N = surfNormal(hit, s, dir);
      if (!N) return null;
      const n1 = sellmeier(i > 0 ? model.surfaces[i - 1].glass : null, wl),
        n2 = sellmeier(s.glass, wl),
        nd = snell(dir, N, n1, n2);
      if (!nd) return null;
      const eps = Math.max(1e-8, 128 * FP_EPS * Math.max(1, Math.abs(hit[2])));
      pos = [hit[0] + nd[0] * eps, hit[1] + nd[1] * eps, hit[2] + nd[2] * eps];
      dir = nd;
    }
    return null;
  }

  function aimCollimatedAtStop(D, wl, stopIdx, targetX, targetY, z0, x0, y0) {
    if (stopIdx < 0) return { O: [x0, y0, z0], ok: false, iterations: 0 };
    let x = x0,
      y = y0;
    const baseH = Math.max(2e-5, (model.epd || 25) * 2e-5);
    function hit(xx, yy) {
      return traceToSurfaceIndex([xx, yy, z0], D, wl, stopIdx);
    }
    for (let it = 0; it < 12; it++) {
      const a = hit(x, y);
      if (!a) break;
      const ex = a.hit[0] - targetX,
        ey = a.hit[1] - targetY;
      if (Math.hypot(ex, ey) < 1e-8)
        return { O: [x, y, z0], ok: true, iterations: it + 1 };
      let h = baseH,
        J = null;
      for (let tries = 0; tries < 4 && !J; tries++, h *= 0.35) {
        const xp = hit(x + h, y),
          xm = hit(x - h, y),
          yp = hit(x, y + h),
          ym = hit(x, y - h);
        let j00, j10, j01, j11;
        if (xp && xm) {
          j00 = (xp.hit[0] - xm.hit[0]) / (2 * h);
          j10 = (xp.hit[1] - xm.hit[1]) / (2 * h);
        } else if (xp) {
          j00 = (xp.hit[0] - a.hit[0]) / h;
          j10 = (xp.hit[1] - a.hit[1]) / h;
        } else if (xm) {
          j00 = (a.hit[0] - xm.hit[0]) / h;
          j10 = (a.hit[1] - xm.hit[1]) / h;
        } else continue;
        if (yp && ym) {
          j01 = (yp.hit[0] - ym.hit[0]) / (2 * h);
          j11 = (yp.hit[1] - ym.hit[1]) / (2 * h);
        } else if (yp) {
          j01 = (yp.hit[0] - a.hit[0]) / h;
          j11 = (yp.hit[1] - a.hit[1]) / h;
        } else if (ym) {
          j01 = (a.hit[0] - ym.hit[0]) / h;
          j11 = (a.hit[1] - ym.hit[1]) / h;
        } else continue;
        if ([j00, j10, j01, j11].every(Number.isFinite))
          J = [j00, j10, j01, j11];
      }
      if (!J) break;
      const [j00, j10, j01, j11] = J,
        det = j00 * j11 - j01 * j10;
      if (Math.abs(det) < 1e-14) break;
      let dx = (j11 * ex - j01 * ey) / det,
        dy = (-j10 * ex + j00 * ey) / det;
      const maxStep = Math.max(0.05, (model.epd || 25) * 0.15),
        mag = Math.hypot(dx, dy);
      if (mag > maxStep) {
        dx *= maxStep / mag;
        dy *= maxStep / mag;
      }
      x -= dx;
      y -= dy;
      if (!Number.isFinite(x) || !Number.isFinite(y)) break;
    }
    const q = hit(x, y),
      ok = !!q && Math.hypot(q.hit[0] - targetX, q.hit[1] - targetY) < 2e-6;
    return { O: [x, y, z0], ok, iterations: 12 };
  }

  return {
    mat2mul,
    stopSurfaceIndex,
    paraxialToSurface,
    entrancePupil,
    traceToSurfaceIndex,
    aimCollimatedAtStop,
  };
}
