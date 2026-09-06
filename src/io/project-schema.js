// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { DEFAULT_COMPONENT_LIBRARY } from '../data/defaults.js';
import { validateImportedSurface } from './surface-schema.js';

const kinds = new Set([
  'single',
  'achromat',
  'aperture',
  'detector',
  'imported',
]);
function validateComponent(c, template = false) {
  if (
    !c ||
    !kinds.has(c.kind) ||
    typeof c.name !== 'string' ||
    typeof c.id !== 'string' ||
    !c.id ||
    c.id === '__source__'
  )
    throw new Error('Invalid component identity or kind.');
  if (!template && !Number.isFinite(c.z))
    throw new Error('Component position must be finite.');
  if (
    !c.params ||
    !(c.params.diameter > 0) ||
    !Number.isFinite(c.params.diameter)
  )
    throw new Error('Component diameter must be positive and finite.');
  const numericKeys =
    c.kind === 'single'
      ? ['R1', 'R2', 't']
      : c.kind === 'achromat'
        ? ['R1', 'R2', 'R3', 't1', 't2']
        : [];
  if (numericKeys.some((key) => !Number.isFinite(c.params[key])))
    throw new Error('Invalid component prescription.');
  const glassKeys =
    c.kind === 'single'
      ? ['glass']
      : c.kind === 'achromat'
        ? ['glass1', 'glass2']
        : [];
  if (glassKeys.some((key) => typeof c.params[key] !== 'string'))
    throw new Error('Invalid glass name.');
  if (c.kind === 'imported') {
    if (!Array.isArray(c.surfaces) || !c.surfaces.length)
      throw new Error('Imported component has no surfaces.');
    for (const s of c.surfaces) validateImportedSurface(s);
  }
}

export const SOFT_ETHER_PROJECT_FORMAT = 'soft-ether-workbench';

export const SOFT_ETHER_PROJECT_VERSION = 1;

export function validateProjectJSON(p) {
  if (!p || typeof p !== 'object')
    throw new Error('Project JSON must contain an object.');
  if (p.format !== SOFT_ETHER_PROJECT_FORMAT)
    throw new Error('Not a Soft Ether workbench project JSON.');
  if (
    !Number.isInteger(p.version) ||
    p.version < 1 ||
    p.version > SOFT_ETHER_PROJECT_VERSION
  )
    throw new Error(`Unsupported project version ${p.version}.`);
  if (!p.bench || !Array.isArray(p.bench.components))
    throw new Error('Project is missing bench components.');
  if (p.bench.components.length > 500)
    throw new Error('Project contains more than 500 bench components.');
  const imported = p.library?.imported || [];
  if (!Array.isArray(imported) || imported.length > 500)
    throw new Error('Imported component library is invalid or too large.');
  let surfaceCount = 0;
  const componentIds = new Set();
  for (const c of p.bench.components) {
    validateComponent(c);
    if (componentIds.has(c.id))
      throw new Error(`Duplicate component id: ${c.id}`);
    componentIds.add(c.id);
    if (
      !c ||
      typeof c !== 'object' ||
      typeof c.kind !== 'string' ||
      !Number.isFinite(+c.z)
    )
      throw new Error('Invalid bench component record.');
    if (Array.isArray(c.surfaces)) surfaceCount += c.surfaces.length;
  }
  if (p.bench.components.filter((c) => c.kind === 'detector').length > 1)
    throw new Error('Only one detector is supported.');
  const libraryIds = new Set(DEFAULT_COMPONENT_LIBRARY.map((t) => t.id));
  for (const t of imported) {
    validateComponent(t, true);
    if (libraryIds.has(t.id))
      throw new Error(`Duplicate or reserved library id: ${t.id}`);
    libraryIds.add(t.id);
    if (
      !t ||
      typeof t !== 'object' ||
      t.kind !== 'imported' ||
      !Array.isArray(t.surfaces)
    )
      throw new Error('Invalid imported lens template.');
    surfaceCount += t.surfaces.length;
  }
  if (surfaceCount > 20000)
    throw new Error(
      'Project contains more than 20,000 stored optical surfaces.',
    );
  for (const [name, c] of Object.entries(p.library?.customGlasses || {})) {
    if (
      !name ||
      !Array.isArray(c) ||
      c.length !== 6 ||
      !c.every(Number.isFinite)
    )
      throw new Error(
        `Invalid custom glass coefficients for ${name || 'unnamed glass'}.`,
      );
  }
  return p;
}
