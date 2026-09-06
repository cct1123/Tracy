const SUPPORTED_SURFACE_TYPES = Object.freeze(['STANDARD', 'EVENASPH']);

export function validateSurfaceType(s) {
  if (!SUPPORTED_SURFACE_TYPES.includes(s?.type))
    throw new Error(
      `Unsupported surface type ${s?.type || '(missing)'} at surface ${s?.num ?? '?'}. Supported types: ${SUPPORTED_SURFACE_TYPES.join(', ')}.`,
    );
}

/** Shared by lens imports and project loads so accepted lenses remain reloadable. */
export function validateImportedSurface(s) {
  validateSurfaceType(s);
  if (![s.z, s.curvature, s.conic, s.sd].every(Number.isFinite) || !(s.sd > 0))
    throw new Error('Invalid imported surface geometry.');
  if (s.glass != null && typeof s.glass !== 'string')
    throw new Error('Invalid surface glass.');
  if (
    !s.parm ||
    typeof s.parm !== 'object' ||
    Object.entries(s.parm).some(
      ([k, v]) => !/^[1-9]\d*$/.test(k) || !Number.isFinite(v),
    )
  )
    throw new Error('Invalid asphere coefficients.');
}
