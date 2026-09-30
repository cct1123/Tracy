/** Public vendor search pages, verified using their own search UIs on 2026-09-30. */
export const ONLINE_CATALOG_SOURCES = Object.freeze([
  Object.freeze({
    id: 'thorlabs',
    name: 'Thorlabs',
    searchUrl: 'https://www.thorlabs.com/search',
    queryParameter: 'q',
    productHosts: ['www.thorlabs.com', 'thorlabs.com'],
  }),
  Object.freeze({
    id: 'edmund-optics',
    name: 'Edmund Optics',
    searchUrl: 'https://www.edmundoptics.com/search/',
    queryParameter: 'criteria',
    productHosts: ['www.edmundoptics.com', 'edmundoptics.com'],
  }),
]);

export function catalogSearchUrl(vendorId, query) {
  const source = ONLINE_CATALOG_SOURCES.find((item) => item.id === vendorId);
  if (!source) throw new Error('Choose Edmund Optics or Thorlabs.');
  const term = String(query || '').trim();
  if (!term || term.length > 300)
    throw new Error(
      'Enter a product, stock number or optical specification (1–300 characters).',
    );
  const url = new URL(source.searchUrl);
  url.searchParams.set(source.queryParameter, term);
  return url.href;
}

/** Attribution supplied by the user is not independent vendor verification. */
export function vendorImportAttribution(productUrl, stockNumber = '') {
  let url;
  try {
    url = new URL(String(productUrl).trim());
  } catch {
    throw new Error(
      'Enter the official Edmund Optics or Thorlabs product URL.',
    );
  }
  const vendor = ONLINE_CATALOG_SOURCES.find((source) =>
    source.productHosts.includes(url.hostname),
  );
  if (
    !vendor ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error(
      'Use an HTTPS product URL on edmundoptics.com or thorlabs.com.',
    );
  const sku = String(stockNumber || '').trim();
  if (sku.length > 128)
    throw new Error('Stock number must be at most 128 characters.');
  return {
    vendor: vendor.name,
    productUrl: url.href,
    ...(sku ? { sku } : {}),
    attribution: 'user-provided',
    catalogFidelity: 'unverified-download',
  };
}

export const MAX_VENDOR_MODEL_BYTES = 20 * 1024 * 1024;

export function validateVendorModelFile(file) {
  if (!file || !/\.(zmx|zar)$/i.test(file.name || ''))
    throw new Error('Choose a downloaded .ZMX or .ZAR model.');
  if (
    !Number.isInteger(file.size) ||
    file.size <= 0 ||
    file.size > MAX_VENDOR_MODEL_BYTES
  )
    throw new Error('Choose a non-empty model no larger than 20 MB.');
}
