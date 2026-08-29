/**
 * Curated vendor catalog records for the browser UI.
 *
 * Prescriptions are either kept on the vendor's official host or represented by
 * a small, reviewable local ZMX file. The application never scrapes product
 * pages at runtime, so catalog browsing remains deterministic and deployable as
 * a static site.
 */

export const CATALOG_LAST_VERIFIED = '2026-08-29';

export const CATALOG_SOURCES = [
  {
    id: 'thorlabs',
    name: 'Thorlabs',
    homeUrl: 'https://www.thorlabs.com/',
    note: 'Product-hosted ZMX and ZAR files',
  },
  {
    id: 'edmund-optics',
    name: 'Edmund Optics',
    homeUrl: 'https://www.edmundoptics.com/',
    catalogUrl: 'https://www.edmundoptics.com/products/services/zemax-catalog/',
    catalogDownloadUrl:
      'https://www.edmundoptics.com/media/onujl21f/edmund-optics-2019zmf.zip',
    note: 'Official full Zemax catalog plus local ZMX seed models',
  },
];

export const VENDOR_LENS_CATALOG = [
  {
    id: 'thorlabs-ac254-100-a',
    vendorId: 'thorlabs',
    vendor: 'Thorlabs',
    sku: 'AC254-100-A',
    name: 'Ø1 in Achromatic Doublet',
    family: 'Achromatic doublet',
    icon: '◖≋◗',
    meta: 'f 100 mm · Ø25.4 · 400–700 nm',
    productUrl: 'https://www.thorlabs.com/item/AC254-100-A',
    models: [
      {
        format: 'ZMX',
        delivery: 'vendor',
        url: 'https://media.thorlabs.com/globalassets/items/a/ac/ac2/ac254-100-a/20529-s03.zmx?v=0116101917',
      },
      {
        format: 'ZAR',
        delivery: 'vendor',
        url: 'https://media.thorlabs.com/globalassets/items/a/ac/ac2/ac254-100-a/20529-s02.zar?v=0116101917',
      },
    ],
  },
  {
    id: 'thorlabs-la5763',
    vendorId: 'thorlabs',
    vendor: 'Thorlabs',
    sku: 'LA5763',
    name: 'CaF₂ Plano-Convex Lens',
    family: 'Spherical singlet',
    icon: '◖│',
    meta: 'f 50 mm · Ø25.4 · uncoated',
    productUrl: 'https://www.thorlabs.com/item/LA5763',
    models: [
      {
        format: 'ZMX',
        delivery: 'vendor',
        url: 'https://media.thorlabs.com/globalassets/items/l/la/la5/la5763/3328-s03.zmx?v=0116121916',
      },
      {
        format: 'ZAR',
        delivery: 'vendor',
        url: 'https://media.thorlabs.com/globalassets/items/l/la/la5/la5763/3328-s02.zar?v=0116121915',
      },
    ],
  },
  {
    id: 'thorlabs-c430tme-c',
    vendorId: 'thorlabs',
    vendor: 'Thorlabs',
    sku: 'C430TME-C',
    name: 'Mounted Aspheric Lens',
    family: 'Molded asphere',
    icon: '◖⌁',
    meta: 'f 5 mm · NA 0.15 · 1050–1700 nm',
    productUrl: 'https://www.thorlabs.com/item/C430TME-C',
    models: [
      {
        format: 'ZMX',
        delivery: 'vendor',
        url: 'https://media.thorlabs.com/globalassets/items/c/c4/c43/c430tme-c/ttn079345-s03.zmx?v=0116104940',
      },
      {
        format: 'ZAR',
        delivery: 'vendor',
        url: 'https://media.thorlabs.com/globalassets/items/c/c4/c43/c430tme-c/ttn079345-s02.zar?v=0116104940',
      },
    ],
  },
  {
    id: 'edmund-49-849',
    vendorId: 'edmund-optics',
    vendor: 'Edmund Optics',
    sku: '#49-849',
    name: 'N-BK7 Plano-Convex Lens',
    family: 'TECHSPEC spherical singlet',
    icon: '◖│',
    meta: 'f 50.8 mm · Ø25.4 · uncoated',
    productUrl:
      'https://www.edmundoptics.com/p/254mm-dia-x-508mm-fl-uncoated-plano-convex-lens/10321/',
    models: [
      {
        format: 'ZMX',
        delivery: 'local',
        url: './src/catalog/models/edmund-49-849.zmx',
      },
    ],
  },
  {
    id: 'edmund-49-847',
    vendorId: 'edmund-optics',
    vendor: 'Edmund Optics',
    sku: '#49-847',
    name: 'N-SF11 Plano-Convex Lens',
    family: 'TECHSPEC spherical singlet',
    icon: '◖│',
    meta: 'f 25.4 mm · Ø25.4 · uncoated',
    productUrl:
      'https://www.edmundoptics.com/p/254mm-dia-x-254mm-fl-uncoated-plano-convex-lens/10319/',
    models: [
      {
        format: 'ZMX',
        delivery: 'local',
        url: './src/catalog/models/edmund-49-847.zmx',
      },
    ],
  },
  {
    id: 'edmund-32-972',
    vendorId: 'edmund-optics',
    vendor: 'Edmund Optics',
    sku: '#32-972',
    name: 'N-BK7 Plano-Convex Lens',
    family: 'TECHSPEC spherical singlet',
    icon: '◖│',
    meta: 'f 100 mm · Ø50 · uncoated',
    productUrl:
      'https://www.edmundoptics.com/p/500mm-dia-x-1000mm-fl-uncoated-plano-convex-lens/2741/',
    models: [
      {
        format: 'ZMX',
        delivery: 'local',
        url: './src/catalog/models/edmund-32-972.zmx',
      },
    ],
  },
];

const OFFICIAL_HOSTS = new Set([
  'www.thorlabs.com',
  'media.thorlabs.com',
  'www.edmundoptics.com',
]);

export function isAllowedCatalogUrl(url, { local = true } = {}) {
  const value = String(url || '');
  if (local && /^\.\/src\/catalog\/models\/[a-z0-9-]+\.zmx$/i.test(value))
    return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && OFFICIAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function catalogSearchText(entry) {
  return [
    entry.vendor,
    entry.sku,
    entry.name,
    entry.family,
    entry.meta,
    ...entry.models.map((model) => model.format),
  ]
    .join(' ')
    .toLowerCase();
}

export function filterCatalog(entries, query = '', vendorId = 'all') {
  const q = String(query).trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (vendorId === 'all' || entry.vendorId === vendorId) &&
      (!q || catalogSearchText(entry).includes(q)),
  );
}
