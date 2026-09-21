import { sellmeier } from './materials.js';
import { createRegionTopology } from './regions.js';
import { FP_EPS, finite3, norm3 } from './vector.js';
import {
  intersect,
  apertureOutside,
  surfNormal,
  snell,
  reflect3,
  fresnelUnpolarized,
} from './surfaces.js';

export function createFresnel(model, optics = {}) {
  const materialOptions = () => ({
    mode: model.materialPolicy ?? 'strict',
    customGlasses: model.customGlasses,
  });
  function mediumBefore(i, wl) {
    return sellmeier(
      i > 0 ? model.surfaces[i - 1].glass : null,
      wl,
      materialOptions(),
    );
  }
  function mediumAfter(i, wl) {
    return sellmeier(model.surfaces[i].glass, wl, materialOptions());
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
      if (
        outside &&
        !surf.isStop &&
        i !== model.surfaces.length - 1 &&
        !['aperture', 'detector'].includes(surf.componentKind)
      )
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
      detectorHits = [],
      interactions = [],
      topologyErrors = [];
    let escaped = 0,
      blockedPower = 0,
      discardedPower = 0,
      unresolvedPower = 0;
    const finish = () => ({
      segments,
      detectorHits,
      interactions,
      topologyErrors,
      primaryHit:
        detectorHits
          .filter((h) => !h.ghost)
          .sort((a, b) => b.power - a.power)[0] || null,
      escaped,
      blockedPower,
      discardedPower,
      unresolvedPower,
      valid: topologyErrors.length === 0,
      primaryValid: topologyErrors.every((error) => error.ghost === true),
      ghostsValid: topologyErrors.every((error) => error.ghost !== true),
    });
    const d0 = norm3(D);
    if (!d0 || !finite3(O)) {
      unresolvedPower = 1;
      topologyErrors.push({
        code: 'invalid-ray',
        message:
          'Ray origin and direction must be finite; direction must be nonzero.',
      });
      return finish();
    }
    const topology = createRegionTopology(
      model.surfaces,
      wl,
      materialOptions(),
    );
    const initial = topology.locate(O);
    if (initial.error) {
      unresolvedPower = 1;
      topologyErrors.push({
        code: 'undefined-initial-region',
        message: initial.error,
      });
      return finish();
    }
    const initialRegion = topology.regions.get(initial.regionId);
    const stack = [
      {
        O: [...O],
        physicalOrigin: [...O],
        D: d0,
        power: 1,
        bounces: 0,
        last: -1,
        kind: 'primary',
        regionId: initial.regionId,
        n: initialRegion.n,
        opl: 0,
      },
    ];
    const maxPrimarySteps = (model.surfaces.length + 1) * (maxB + 1);
    let primarySteps = 0,
      ghostSteps = 0;
    while (stack.length) {
      const r = stack.pop();
      if (
        (r.kind === 'ghost' && ghostSteps++ >= 96) ||
        (r.kind !== 'ghost' && primarySteps++ >= maxPrimarySteps)
      ) {
        discardedPower += r.power;
        continue;
      }
      const nx = nearestSurface(r.O, r.D, r.last);
      if (!nx) {
        if (r.regionId !== 'air') {
          unresolvedPower += r.power;
          topologyErrors.push({
            code: 'undefined-region-exit',
            message:
              'Ray leaves a glass region without a prescribed optical face; edge/sidewall geometry is undefined.',
            regionId: r.regionId,
            lastSurfaceIndex: r.last,
            power: r.power,
            ghost: r.kind === 'ghost',
          });
        } else {
          const L = Math.max(model.epd * 1.4 || 0, 25),
            b = r.O.map((v, j) => v + r.D[j] * L);
          segments.push({
            a: r.physicalOrigin,
            b,
            power: r.power,
            ghost: r.kind === 'ghost',
            regionId: r.regionId,
            n: r.n,
            oplStart: r.opl,
            oplEnd:
              r.opl +
              Math.hypot(...b.map((v, j) => v - r.physicalOrigin[j])) * r.n,
          });
          escaped += r.power;
        }
        continue;
      }
      const { i, hit, outside } = nx,
        surf = model.surfaces[i];
      const segLen = Math.hypot(...hit.map((v, j) => v - r.physicalOrigin[j]));
      const opl = r.opl + segLen * r.n;
      segments.push({
        a: r.physicalOrigin,
        b: hit,
        power: r.power,
        ghost: r.kind === 'ghost',
        regionId: r.regionId,
        n: r.n,
        oplStart: r.opl,
        oplEnd: opl,
      });
      if (outside) {
        blockedPower += r.power;
        continue;
      }
      const crossing = topology.crossing(i, hit, r.D, r.regionId);
      if (!crossing.valid) {
        unresolvedPower += r.power;
        topologyErrors.push({
          code: crossing.reason,
          message:
            'Encountered face is inconsistent with the carried ray region; finite-element side geometry is not defined.',
          surfaceIndex: i,
          hit,
          power: r.power,
          ghost: r.kind === 'ghost',
          ...crossing,
        });
        continue;
      }
      if (topology.boundaries[i].terminal) {
        detectorHits.push({
          p: hit,
          power: r.power,
          ghost: r.kind === 'ghost',
          opl,
          direction: [...r.D],
          regionId: r.regionId,
        });
        continue;
      }
      const N = surfNormal(hit, surf, r.D);
      const n1 = crossing.from.n,
        n2 = crossing.to.n;
      const fr = fresnelUnpolarized(r.D, N, n1, n2);
      const td = fr.tir ? null : snell(r.D, N, n1, n2),
        rd = reflect3(r.D, N);
      interactions.push({
        surfaceIndex: i,
        hit,
        incomingDirection: [...r.D],
        transmittedDirection: td,
        reflectedDirection: rd,
        regionBefore: crossing.from.id,
        regionAfter: crossing.to.id,
        n1,
        n2,
        R: fr.R,
        T: fr.T,
        tir: fr.tir,
        ghost: r.kind === 'ghost',
        power: r.power,
        opl,
      });
      const eps = Math.max(1e-8, 128 * FP_EPS * Math.max(1, Math.abs(hit[2])));
      const child = (direction, power, region, kind, bounces) => ({
        O: hit.map((v, j) => v + direction[j] * eps),
        physicalOrigin: [...hit],
        D: direction,
        power,
        bounces,
        last: i,
        kind,
        regionId: region.id,
        n: region.n,
        opl,
      });
      const tp = r.power * fr.T,
        rp = r.power * fr.R;
      let transmitted = null,
        reflected = null;
      if (
        !fr.tir &&
        td &&
        ((r.kind === 'primary' && tp > 1e-15) || tp >= minPower)
      )
        transmitted = child(td, tp, crossing.to, r.kind, r.bounces);
      else discardedPower += tp;
      if (fr.tir && rd && r.bounces < maxB)
        reflected = child(rd, r.power, crossing.from, r.kind, r.bounces + 1);
      else if (!fr.tir && ghosts && rd && rp >= minPower && r.bounces < maxB)
        reflected = child(rd, rp, crossing.from, 'ghost', r.bounces + 1);
      else discardedPower += rp;
      // Primary propagation precedes the independently budgeted ghost branches.
      if (reflected) stack.push(reflected);
      if (transmitted) stack.push(transmitted);
    }
    return finish();
  }
  return { mediumBefore, mediumAfter, nearestSurface, traceFresnel3D };
}
