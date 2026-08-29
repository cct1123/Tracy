const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MODEL_FORMATS = new Set(['ZMX', 'ZAR']);
const DELIVERY_MODES = new Set(['vendor', 'local']);
const FIDELITY_LEVELS = new Set(['official', 'spec-derived']);

function requiredString(issues, value, path) {
  if (typeof value !== 'string' || !value.trim())
    issues.push(`${path} must be a non-empty string`);
}

function positiveNumber(issues, value, path) {
  if (!Number.isFinite(value) || value <= 0)
    issues.push(`${path} must be a positive number`);
}

function validateSpecification(issues, specification, path) {
  if (!specification || typeof specification !== 'object') {
    issues.push(`${path} is required for spec-derived models`);
    return;
  }
  for (const field of [
    'effectiveFocalLengthMm',
    'backFocalLengthMm',
    'diameterMm',
    'radius1Mm',
    'centerThicknessMm',
    'clearApertureMm',
    'referenceWavelengthNm',
  ])
    positiveNumber(issues, specification[field], `${path}.${field}`);
  requiredString(issues, specification.glass, `${path}.glass`);
}

export function validateCatalogManifest(
  { verifiedOn, sources, entries },
  { isAllowedUrl },
) {
  const issues = [];
  if (!DATE_PATTERN.test(String(verifiedOn || '')))
    issues.push('verifiedOn must use YYYY-MM-DD');
  if (!Array.isArray(sources) || !sources.length)
    issues.push('sources must be a non-empty array');
  if (!Array.isArray(entries) || !entries.length)
    issues.push('entries must be a non-empty array');
  if (typeof isAllowedUrl !== 'function')
    issues.push('isAllowedUrl must be a function');
  if (issues.length)
    return { ok: false, issues, sourceCount: 0, entryCount: 0, modelCount: 0 };

  const sourceIds = new Set();
  for (const [index, source] of sources.entries()) {
    const path = `sources[${index}]`;
    requiredString(issues, source.id, `${path}.id`);
    requiredString(issues, source.name, `${path}.name`);
    if (sourceIds.has(source.id)) issues.push(`${path}.id must be unique`);
    sourceIds.add(source.id);
    for (const field of ['homeUrl', 'catalogUrl', 'catalogDownloadUrl']) {
      if (source[field] && !isAllowedUrl(source[field], { local: false }))
        issues.push(`${path}.${field} is not an allowed official URL`);
    }
  }

  const entryIds = new Set();
  let modelCount = 0;
  for (const [entryIndex, entry] of entries.entries()) {
    const path = `entries[${entryIndex}]`;
    requiredString(issues, entry.id, `${path}.id`);
    requiredString(issues, entry.vendorId, `${path}.vendorId`);
    requiredString(issues, entry.vendor, `${path}.vendor`);
    requiredString(issues, entry.sku, `${path}.sku`);
    requiredString(issues, entry.name, `${path}.name`);
    if (entryIds.has(entry.id)) issues.push(`${path}.id must be unique`);
    entryIds.add(entry.id);
    if (!sourceIds.has(entry.vendorId))
      issues.push(`${path}.vendorId does not identify a catalog source`);
    if (!isAllowedUrl(entry.productUrl, { local: false }))
      issues.push(`${path}.productUrl is not an allowed official URL`);
    if (!Array.isArray(entry.models) || !entry.models.length) {
      issues.push(`${path}.models must be a non-empty array`);
      continue;
    }

    for (const [modelIndex, model] of entry.models.entries()) {
      modelCount += 1;
      const modelPath = `${path}.models[${modelIndex}]`;
      if (!MODEL_FORMATS.has(model.format))
        issues.push(`${modelPath}.format is unsupported`);
      if (!DELIVERY_MODES.has(model.delivery))
        issues.push(`${modelPath}.delivery is unsupported`);
      if (!FIDELITY_LEVELS.has(model.fidelity))
        issues.push(`${modelPath}.fidelity is unsupported`);
      const expectedFidelity =
        model.delivery === 'vendor' ? 'official' : 'spec-derived';
      if (model.fidelity !== expectedFidelity)
        issues.push(
          `${modelPath}.fidelity must be ${expectedFidelity} for ${model.delivery} delivery`,
        );
      if (!isAllowedUrl(model.url, { local: model.delivery === 'local' }))
        issues.push(`${modelPath}.url is not allowed`);
      if (!isAllowedUrl(model.sourceUrl, { local: false }))
        issues.push(`${modelPath}.sourceUrl is not an allowed official URL`);
      if (!DATE_PATTERN.test(String(model.retrievedOn || '')))
        issues.push(`${modelPath}.retrievedOn must use YYYY-MM-DD`);
      if (!SHA256_PATTERN.test(String(model.sha256 || '')))
        issues.push(`${modelPath}.sha256 must be a lowercase SHA-256 digest`);
      if (!Number.isInteger(model.byteLength) || model.byteLength <= 0)
        issues.push(`${modelPath}.byteLength must be a positive integer`);
      if (model.fidelity === 'spec-derived')
        validateSpecification(
          issues,
          model.specification,
          `${modelPath}.specification`,
        );
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    sourceCount: sources.length,
    entryCount: entries.length,
    modelCount,
  };
}

export function assertCatalogManifest(manifest, options) {
  const result = validateCatalogManifest(manifest, options);
  if (!result.ok)
    throw new Error(`Invalid catalog manifest:\n${result.issues.join('\n')}`);
  return result;
}
