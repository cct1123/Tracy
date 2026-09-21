import { canonicalMaterialName, sellmeier } from './materials.js';
import { apertureOutside, sagSD, surfNormal } from './surfaces.js';
import { dot3 } from './vector.js';

/**
 * Coaxial, piecewise homogeneous region topology. A material prescription defines
 * the two adjacent regions of each face, not the medium of an arriving branch.
 * Air gaps share the connected exterior; separate glass volumes keep distinct IDs.
 * Side walls are not prescribed: inconsistent bypasses terminate explicitly.
 */
export function createRegionTopology(
  surfaces,
  wavelengthUm,
  materialOptions = {},
) {
  const regions = new Map([['air', { id: 'air', material: 'AIR', n: 1 }]]);
  const boundaries = [];
  let previous = regions.get('air');
  for (let i = 0; i < surfaces.length; i++) {
    const terminal =
      i === surfaces.length - 1 || surfaces[i].componentKind === 'detector';
    const material = terminal
      ? previous.material
      : canonicalMaterialName(surfaces[i].glass);
    let next = previous;
    if (material !== previous.material) {
      if (previous.id !== 'air') previous.end = i;
      if (material === 'AIR') next = regions.get('air');
      else {
        next = {
          id: `region:${i}:${material}`,
          material,
          start: i,
          end: null,
          n: sellmeier(material, wavelengthUm, materialOptions),
        };
        regions.set(next.id, next);
      }
    }
    boundaries.push({
      surfaceIndex: i,
      before: previous.id,
      after: next.id,
      terminal,
    });
    previous = next;
  }

  function locate(point) {
    const r = Math.hypot(point[0], point[1]);
    const candidates = [];
    let ambiguous = false;
    for (const region of regions.values()) {
      if (region.id === 'air') continue;
      const front = surfaces[region.start];
      const back = region.end === null ? null : surfaces[region.end];
      const frontSag = sagSD(r, front),
        backSag = back ? sagSD(r, back) : null;
      if (!frontSag || (back && !backSag)) continue;
      const low = front.z + frontSag.s,
        high = back ? back.z + backSag.s : Infinity;
      if (point[2] <= low + 1e-9 || point[2] >= high - 1e-9) continue;
      const insideFront = !apertureOutside(point, front);
      const insideBack = !back || !apertureOutside(point, back);
      if (insideFront && insideBack) candidates.push(region.id);
      else if (insideFront || insideBack) ambiguous = true;
    }
    if (candidates.length > 1 || ambiguous)
      return {
        regionId: null,
        error:
          'Initial point lies in overlapping or undefined finite-element geometry.',
      };
    return { regionId: candidates[0] || 'air', error: null };
  }

  function crossing(surfaceIndex, hit, direction, currentRegionId) {
    const boundary = boundaries[surfaceIndex];
    // Orient the geometric normal toward increasing local sag coordinate. The
    // sign of D.z alone is wrong for strongly sloped faces and returning rays.
    const positiveNormal = surfNormal(hit, surfaces[surfaceIndex], [0, 0, -1]);
    if (!positiveNormal)
      return { valid: false, reason: 'undefined-surface-normal' };
    const localForward = dot3(positiveNormal, direction) >= 0;
    const expected = localForward ? boundary.before : boundary.after;
    const destination = localForward ? boundary.after : boundary.before;
    if (currentRegionId !== expected)
      return {
        valid: false,
        reason: 'medium-region-mismatch',
        expectedRegionId: expected,
        actualRegionId: currentRegionId,
        destinationRegionId: destination,
      };
    return {
      valid: true,
      from: regions.get(expected),
      to: regions.get(destination),
      localForward,
    };
  }

  return { regions, boundaries, locate, crossing };
}
