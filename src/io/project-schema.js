// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { DEFAULT_COMPONENT_LIBRARY } from '../data/defaults.js';
import { validateImportedSurface } from './surface-schema.js';
import { componentLocalSurfaces } from '../model/components.js';
import {
  createSimulationState,
  validateSimulationState,
} from '../model/simulation-state.js';

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

export const TRACY_PROJECT_FORMAT = 'tracy-workbench';

export const TRACY_PROJECT_VERSION = 2;

// Accept existing v1 saves; new exports use the Tracy format above.
const LEGACY_PROJECT_FORMAT = 'soft-ether-workbench';

export function validateProjectJSON(p) {
  if (!p || typeof p !== 'object')
    throw new Error('Project JSON must contain an object.');
  if (p.format !== TRACY_PROJECT_FORMAT && p.format !== LEGACY_PROJECT_FORMAT)
    throw new Error('Not a Tracy workbench project JSON.');
  if (
    !Number.isInteger(p.version) ||
    p.version < 1 ||
    p.version > TRACY_PROJECT_VERSION
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
  for (const [name, material] of Object.entries(
    p.library?.materialCatalog || {},
  )) {
    if (
      !name ||
      !material ||
      !Array.isArray(material.coefficients) ||
      material.coefficients.length !== 6 ||
      !material.coefficients.every(Number.isFinite)
    )
      throw new Error(`Invalid material catalog entry for ${name}.`);
    const range = material.wavelengthRangeUm;
    if (
      range != null &&
      (!Array.isArray(range) ||
        range.length !== 2 ||
        !range.every(Number.isFinite) ||
        range[0] <= 0 ||
        range[1] < range[0])
    )
      throw new Error(`Invalid material wavelength range for ${name}.`);
  }
  for (const c of p.bench.components) {
    if (
      c.apertureOverrideMm != null &&
      (!Number.isFinite(c.apertureOverrideMm) || c.apertureOverrideMm <= 0)
    )
      throw new Error(
        'Imported aperture override must be positive and finite.',
      );
    if (c.importedPrescription) {
      const original = c.importedPrescription;
      if (
        c.kind !== 'imported' ||
        !Array.isArray(original.surfaces) ||
        original.surfaces.length !== c.surfaces.length ||
        !(original.params?.diameter > 0)
      )
        throw new Error('Invalid original imported prescription.');
      for (const surface of original.surfaces) validateImportedSurface(surface);
    }
  }
  if (
    p.project &&
    (typeof p.project.id !== 'string' ||
      !p.project.id ||
      typeof p.project.name !== 'string' ||
      !p.project.name.trim() ||
      p.project.name.length > 120)
  )
    throw new Error('Invalid local project identity.');
  if (
    p.simulation?.canonical != null &&
    (typeof p.simulation.canonical !== 'object' ||
      Array.isArray(p.simulation.canonical))
  )
    throw new Error('Invalid canonical simulation settings.');
  if (p.simulation?.canonical) {
    const surfaces = p.bench.components
      .flatMap((component) =>
        componentLocalSurfaces(component).map((surface) => ({
          ...surface,
          z: component.z + surface.z,
          componentKind: component.kind,
          componentId: component.id,
        })),
      )
      .sort((a, b) => a.z - b.z);
    const candidate = createSimulationState(
      { ...p.bench, surfaces },
      p.simulation.canonical,
    );
    const errors = validateSimulationState(candidate);
    if (errors.length)
      throw new Error(
        `Invalid canonical simulation settings: ${errors.join(' ')}`,
      );
  }
  return p;
}

/** Pure, non-mutating migration. A v1 file cannot reveal historical aperture
 * overrides, so its saved prescription becomes the preserved starting point. */
export function migrateProjectJSON(raw) {
  validateProjectJSON(raw);
  const project = structuredClone(raw);
  if (project.version === 1) {
    project.format = TRACY_PROJECT_FORMAT;
    project.version = 2;
    project.project ??= {
      id: 'legacy-project',
      name: String(project.bench.lensName || 'Imported project').slice(0, 120),
    };
    project.app = { ...project.app, migratedFromVersion: 1 };
  }
  project.project ??= { id: 'imported-project', name: 'Imported project' };
  return project;
}
