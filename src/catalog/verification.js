import { parseZMX } from '../io/zmx.js';

// Independent Fraunhofer d-line reference indices, intentionally separate from
// the ray tracer's Sellmeier coefficient table.
export const REFERENCE_GLASS_ND = Object.freeze({
  'N-BK7': 1.5168,
  'N-SF11': 1.78472,
});

function near(issues, actual, expected, tolerance, label) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance)
    issues.push(`${label}: expected ${expected}, received ${actual}`);
}

export function planoConvexParaxialEflMm(specification) {
  const refractiveIndex = REFERENCE_GLASS_ND[specification.glass];
  if (!refractiveIndex)
    throw new Error(`No independent d-line index for ${specification.glass}`);
  return specification.radius1Mm / (refractiveIndex - 1);
}

export function verifySpecDerivedZmx(entry, model, text) {
  const issues = [];
  const specification = model.specification;
  let parsed;
  try {
    parsed = parseZMX(text);
  } catch (error) {
    return {
      ok: false,
      issues: [`ZMX parse failed: ${error.message || error}`],
      paraxialEflMm: NaN,
    };
  }
  const [front, back, image] = parsed.surfaces;
  if (parsed.surfaces.length !== 3)
    issues.push(
      `${entry.id}: expected 3 sequential surfaces, received ${parsed.surfaces.length}`,
    );
  if (!front || !back || !image)
    return { ok: false, issues, paraxialEflMm: NaN, parsed };

  near(
    issues,
    front.curvature,
    1 / specification.radius1Mm,
    1e-12,
    `${entry.id} front curvature`,
  );
  near(
    issues,
    front.thickness,
    specification.centerThicknessMm,
    1e-9,
    `${entry.id} center thickness`,
  );
  if (front.glass !== specification.glass)
    issues.push(
      `${entry.id} glass: expected ${specification.glass}, received ${front.glass}`,
    );
  near(
    issues,
    front.sd,
    specification.clearApertureMm / 2,
    1e-9,
    `${entry.id} clear semi-aperture`,
  );
  near(issues, back.curvature, 0, 1e-14, `${entry.id} back curvature`);
  near(
    issues,
    back.thickness,
    specification.backFocalLengthMm,
    1e-9,
    `${entry.id} back focal distance`,
  );
  near(issues, image.curvature, 0, 1e-14, `${entry.id} image curvature`);

  const paraxialEflMm = planoConvexParaxialEflMm(specification);
  near(
    issues,
    paraxialEflMm,
    specification.effectiveFocalLengthMm,
    Math.max(0.05, specification.effectiveFocalLengthMm * 0.001),
    `${entry.id} independent paraxial EFL`,
  );
  return { ok: issues.length === 0, issues, paraxialEflMm, parsed };
}
