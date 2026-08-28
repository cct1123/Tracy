// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { sellmeier } from './materials.js';
import { FP_EPS, norm3 } from './vector.js';
import {
  intersect,
  apertureOutside,
  surfNormal,
  snell,
  reflect3,
  fresnelUnpolarized,
} from './surfaces.js';

export function createFresnel(model, optics = {}) {
  function mediumBefore(i, wl) {
    return sellmeier(i > 0 ? model.surfaces[i - 1].glass : null, wl);
  }

  function mediumAfter(i, wl) {
    return sellmeier(model.surfaces[i].glass, wl);
  }

  function nearestSurface(O, D, exclude = -1) {
    let best = null,
      bestT = Infinity;
    for (let i = 0; i < model.surfaces.length; i++) {
      if (i === exclude) continue;
      const surf = model.surfaces[i],
        h = intersect(O, D, surf);
      if (!h) continue;
      const t =
        (h[0] - O[0]) * D[0] + (h[1] - O[1]) * D[1] + (h[2] - O[2]) * D[2];
      const tMin = Math.max(
        1e-9,
        512 * FP_EPS * Math.max(1, Math.abs(O[2]), Math.abs(surf.z)),
      );
      if (t <= tMin || t >= bestT) continue;
      const outside = apertureOutside(h, surf);
      // A finite refractive element does not intercept a ray outside its clear aperture.
      // Aperture stops and detector planes intentionally remain blocking/terminal surfaces.
      if (outside && !['aperture', 'detector'].includes(surf.componentKind))
        continue;
      bestT = t;
      best = { i, hit: h, outside };
    }
    return best;
  }

  function traceFresnel3D(O, D, wl, opt = {}) {
    const maxB = opt.maxBounces ?? 4,
      minPower = opt.minPower ?? 0.004,
      ghosts = opt.ghosts !== false;
    const segments = [],
      detectorHits = [];
    let escaped = 0;
    const d0 = norm3(D);
    if (!d0) return { segments, detectorHits, primaryHit: null, escaped: 1 };
    const stack = [
      {
        O: [...O],
        D: d0,
        power: 1,
        bounces: 0,
        last: -1,
        kind: 'primary',
        n: 1,
        opl: 0,
      },
    ];
    let branches = 0;
    while (stack.length && branches < 96) {
      const r = stack.pop();
      branches++;
      const nx = nearestSurface(r.O, r.D, r.last);
      if (!nx) {
        const L = Math.max(model.epd * 1.4, 25),
          b = [r.O[0] + r.D[0] * L, r.O[1] + r.D[1] * L, r.O[2] + r.D[2] * L];
        segments.push({ a: r.O, b, power: r.power, ghost: r.kind === 'ghost' });
        escaped += r.power;
        continue;
      }
      const { i, hit, outside } = nx,
        surf = model.surfaces[i];
      const segLen = Math.hypot(
        hit[0] - r.O[0],
        hit[1] - r.O[1],
        hit[2] - r.O[2],
      );
      const opl =
        (r.opl || 0) + (Number.isFinite(segLen) ? segLen : 0) * (r.n || 1);
      segments.push({
        a: r.O,
        b: hit,
        power: r.power,
        ghost: r.kind === 'ghost',
      });
      if (outside) {
        escaped += r.power;
        continue;
      }
      if (i === model.surfaces.length - 1) {
        detectorHits.push({
          p: hit,
          power: r.power,
          ghost: r.kind === 'ghost',
          opl,
        });
        continue;
      }
      const N = surfNormal(hit, surf, r.D);
      if (!N) {
        escaped += r.power;
        continue;
      }
      const forward = r.D[2] >= 0,
        n1 = forward ? mediumBefore(i, wl) : mediumAfter(i, wl),
        n2 = forward ? mediumAfter(i, wl) : mediumBefore(i, wl),
        fr = fresnelUnpolarized(r.D, N, n1, n2),
        eps = Math.max(1e-8, 128 * FP_EPS * Math.max(1, Math.abs(hit[2])));
      let transmitted = null,
        reflected = null;
      if (!fr.tir) {
        const td = snell(r.D, N, n1, n2),
          tp = r.power * fr.T;
        // Never prune the primary transmission path with the ghost display cutoff.
        // This keeps detector throughput invariant under ghost settings and branch budget.
        const keepPrimary = r.kind === 'primary' && tp > 1e-15;
        if (td && (keepPrimary || tp >= minPower))
          transmitted = {
            O: [
              hit[0] + td[0] * eps,
              hit[1] + td[1] * eps,
              hit[2] + td[2] * eps,
            ],
            D: td,
            power: tp,
            bounces: r.bounces,
            last: i,
            kind: r.kind,
            n: n2,
            opl,
          };
      }
      const rd = reflect3(r.D, N),
        rp = r.power * fr.R;
      if (fr.tir) {
        // Under TIR the reflected ray is the physical continuation of the incident
        // path, not automatically a ghost. Preserve primary classification.
        if (rd && r.bounces < maxB)
          reflected = {
            O: [
              hit[0] + rd[0] * eps,
              hit[1] + rd[1] * eps,
              hit[2] + rd[2] * eps,
            ],
            D: rd,
            power: r.power,
            bounces: r.bounces + 1,
            last: i,
            kind: r.kind,
            n: n1,
            opl,
          };
      } else if (ghosts && rd && rp >= minPower && r.bounces < maxB) {
        reflected = {
          O: [hit[0] + rd[0] * eps, hit[1] + rd[1] * eps, hit[2] + rd[2] * eps],
          D: rd,
          power: rp,
          bounces: r.bounces + 1,
          last: i,
          kind: 'ghost',
          n: n1,
          opl,
        };
      }
      // Stack is LIFO: enqueue lower-priority reflected/ghost work first, then the
      // transmitted branch. The primary transmitted path therefore reaches its
      // terminal detector/escape state before ghost recursion can exhaust budget.
      if (reflected) stack.push(reflected);
      if (transmitted) stack.push(transmitted);
    }
    const primaryHit =
      detectorHits
        .filter((h) => !h.ghost)
        .sort((a, b) => b.power - a.power)[0] || null;
    return { segments, detectorHits, primaryHit, escaped };
  }

  return { mediumBefore, mediumAfter, nearestSurface, traceFresnel3D };
}
