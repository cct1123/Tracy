// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { sellmeier } from './materials.js';
import { intersect, surfNormal, snell, apertureOutside } from './surfaces.js';

export function createSequential(model, optics = {}) {
  function traceRay(O, D, wl) {
    let pos = [...O],
      dir = [...D],
      opl = 0,
      nCurrent = 1;
    const pts = [[...pos]];
    let vig = false;
    for (let i = 0; i < model.surfaces.length; i++) {
      const surf = model.surfaces[i],
        isImg = i === model.surfaces.length - 1;
      const n1 = sellmeier(i > 0 ? model.surfaces[i - 1].glass : null, wl);
      const n2 = sellmeier(surf.glass, wl);
      const hit = intersect(pos, dir, surf);

      if (!hit) {
        vig = true;
        break;
      }
      const segLen = Math.hypot(
        hit[0] - pos[0],
        hit[1] - pos[1],
        hit[2] - pos[2],
      );
      if (Number.isFinite(segLen)) opl += nCurrent * segLen;
      if (apertureOutside(hit, surf)) {
        pts.push([...hit]);
        vig = true;
        break;
      }

      pts.push([...hit]);
      if (isImg) break;

      const N = surfNormal(hit, surf, dir);
      if (!N) {
        vig = true;
        break;
      }
      const nd = snell(dir, N, n1, n2);
      if (!nd) {
        vig = true;
        break;
      }

      pos = [...hit];
      dir = [...nd];
      nCurrent = n2;
    }
    return { points: pts, vignetted: vig, opl };
  }

  return { traceRay };
}
