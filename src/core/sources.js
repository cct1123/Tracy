// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { norm3 } from './vector.js';

export function createSources(model, optics = {}) {
  function pupilSamples(n, shape, R) {
    n = Math.max(1, Math.min(5001, Math.floor(Number(n) || 1)));
    R = Number.isFinite(+R) ? Math.abs(+R) : 1;
    const pts = [];
    if (shape === 'meridional') {
      for (let i = 0; i < n; i++) {
        const p = n > 1 ? -1 + (2 * i) / (n - 1) : 0;
        pts.push([0, p * R]);
      }
    } else if (shape === 'sagittal') {
      for (let i = 0; i < n; i++) {
        const p = n > 1 ? -1 + (2 * i) / (n - 1) : 0;
        pts.push([p * R, 0]);
      }
    } else if (shape === 'ring') {
      const rm = R * (1 - 1e-8);
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        pts.push([rm * Math.cos(a), rm * Math.sin(a)]);
      }
    } else {
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const rr = R * Math.sqrt((i + 0.5) / n),
          a = i * golden;
        pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
      }
    }
    return pts;
  }

  function makeCollimated(fieldYDeg, fieldXDeg, nRays, wl, addChief, shape) {
    const tx = Math.tan((fieldXDeg * Math.PI) / 180),
      ty = Math.tan((fieldYDeg * Math.PI) / 180),
      D = norm3([tx, ty, 1]) || [0, 0, 1],
      rays = [];
    const enp = optics.entrancePupil(wl),
      firstZ = model.surfaces[0].z;
    const zP = enp.finite ? enp.z : firstZ;
    const diameter = isFinite(enp.diameter) ? enp.diameter : model.epd || 25,
      R = (diameter / 2) * (1 - 1e-8);
    const z0 = Math.min(firstZ - 20, zP - Math.max(diameter, 20));
    const samples = [];
    if (addChief) samples.push([0, 0, true]);
    for (const [u, v] of pupilSamples(nRays, shape, 1))
      samples.push([u, v, false]);
    const stop = enp.stopIndex >= 0 ? model.surfaces[enp.stopIndex] : null;
    for (const [u, v, isChief] of samples) {
      const px = u * R,
        py = v * R,
        dzp = zP - z0;
      let ox = px - dzp * (D[0] / D[2]),
        oy = py - dzp * (D[1] / D[2]),
        aimed = false;
      if (stop && enp.finite) {
        const a = optics.aimCollimatedAtStop(
          D,
          wl,
          enp.stopIndex,
          u * (stop.sd || R),
          v * (stop.sd || R),
          z0,
          ox,
          oy,
        );
        ox = a.O[0];
        oy = a.O[1];
        aimed = a.ok;
      }
      rays.push({
        O: [ox, oy, z0],
        D: [...D],
        chief: isChief,
        wl,
        pupil: [px, py],
        normalizedPupil: [u, v],
        rayAimed: aimed,
      });
    }
    return rays;
  }

  function makePointSource(
    srcX,
    srcY,
    srcZ,
    aimYDeg,
    aimXDeg,
    NA,
    nRays,
    wl,
    addChief,
    shape,
  ) {
    const tx = Math.tan((aimXDeg * Math.PI) / 180),
      ty = Math.tan((aimYDeg * Math.PI) / 180),
      C = norm3([tx, ty, 1]) || [0, 0, 1],
      rays = [];
    const ref = Math.abs(C[2]) < 0.92 ? [0, 0, 1] : [0, 1, 0];
    let U = norm3([
      ref[1] * C[2] - ref[2] * C[1],
      ref[2] * C[0] - ref[0] * C[2],
      ref[0] * C[1] - ref[1] * C[0],
    ]) || [1, 0, 0];
    const V = norm3([
      C[1] * U[2] - C[2] * U[1],
      C[2] * U[0] - C[0] * U[2],
      C[0] * U[1] - C[1] * U[0],
    ]) || [0, 1, 0];
    const alpha = Math.asin(Math.max(0, Math.min(0.999, +NA || 0)));
    function emit(u, v, isChief) {
      const rho = Math.min(1, Math.hypot(u, v)),
        phi = Math.atan2(v, u),
        th = alpha * rho,
        st = Math.sin(th),
        ct = Math.cos(th);
      const D =
        norm3([
          C[0] * ct + U[0] * st * Math.cos(phi) + V[0] * st * Math.sin(phi),
          C[1] * ct + U[1] * st * Math.cos(phi) + V[1] * st * Math.sin(phi),
          C[2] * ct + U[2] * st * Math.cos(phi) + V[2] * st * Math.sin(phi),
        ]) || C.slice();
      rays.push({
        O: [srcX, srcY, srcZ],
        D,
        chief: isChief,
        wl,
        angular: [u, v],
      });
    }
    if (addChief) emit(0, 0, true);
    for (const [u, v] of pupilSamples(nRays, shape, 1)) emit(u, v, false);
    return rays;
  }

  return { pupilSamples, makeCollimated, makePointSource };
}
