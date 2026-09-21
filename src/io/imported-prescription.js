// Preserve the imported prescription before any intentional aperture modification.
// Placement and orientation belong to the bench and are not reset here.
export function preserveImportedPrescription(component) {
  if (component.kind !== 'imported') return;
  component.importedPrescription ??= structuredClone({
    surfaces: component.surfaces,
    params: component.params,
    importMeta: component.importMeta ?? null,
  });
}

export function overrideImportedApertures(component, diameterMm) {
  if (component.kind !== 'imported')
    throw new Error('An imported assembly is required.');
  if (!Number.isFinite(diameterMm) || diameterMm <= 0)
    throw new Error('Clear-aperture diameter must be positive and finite.');
  preserveImportedPrescription(component);
  component.params.diameter = diameterMm;
  for (const surface of component.surfaces) surface.sd = diameterMm / 2;
  component.apertureOverrideMm = diameterMm;
}

export function resetImportedPrescription(component) {
  const original = component.importedPrescription;
  if (!original) return false;
  component.surfaces = structuredClone(original.surfaces);
  component.params = structuredClone(original.params);
  component.importMeta = structuredClone(original.importMeta);
  delete component.apertureOverrideMm;
  return true;
}
