/**
 * Curated vendor catalog records for the browser UI.
 *
 * Prescriptions are either kept on the vendor's official host or represented by
 * a small, reviewable local ZMX file. The application never scrapes product
 * pages at runtime, so catalog browsing remains deterministic and deployable as
 * a static site.
 */

import { assertCatalogManifest } from './schema.js';

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
    note: 'Official full Zemax catalog plus spec-derived local seed models',
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
        fidelity: 'official',
        url: 'https://media.thorlabs.com/globalassets/items/a/ac/ac2/ac254-100-a/20529-s03.zmx?v=0116101917',
        sourceUrl:
          'https://media.thorlabs.com/globalassets/items/a/ac/ac2/ac254-100-a/20529-s03.zmx?v=0116101917',
        retrievedOn: '2026-08-29',
        sha256:
          '2a4949b2a9b59902fd48888084f310286e6dde7a3277e7db52408021477a736e',
        byteLength: 2773,
      },
      {
        format: 'ZAR',
        delivery: 'vendor',
        fidelity: 'official',
        url: 'https://media.thorlabs.com/globalassets/items/a/ac/ac2/ac254-100-a/20529-s02.zar?v=0116101917',
        sourceUrl:
          'https://media.thorlabs.com/globalassets/items/a/ac/ac2/ac254-100-a/20529-s02.zar?v=0116101917',
        retrievedOn: '2026-08-29',
        sha256:
          '6d42d39a1738abbc7786b81845af16c68bab62e211e81204dafe7907b0afdff5',
        byteLength: 177556,
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
        fidelity: 'official',
        url: 'https://media.thorlabs.com/globalassets/items/l/la/la5/la5763/3328-s03.zmx?v=0116121916',
        sourceUrl:
          'https://media.thorlabs.com/globalassets/items/l/la/la5/la5763/3328-s03.zmx?v=0116121916',
        retrievedOn: '2026-08-29',
        sha256:
          '41493af107e709be89bb9ffff76bd21ffdd004b00a87a55f554f669742731da7',
        byteLength: 2436,
      },
      {
        format: 'ZAR',
        delivery: 'vendor',
        fidelity: 'official',
        url: 'https://media.thorlabs.com/globalassets/items/l/la/la5/la5763/3328-s02.zar?v=0116121915',
        sourceUrl:
          'https://media.thorlabs.com/globalassets/items/l/la/la5/la5763/3328-s02.zar?v=0116121915',
        retrievedOn: '2026-08-29',
        sha256:
          'e645c12886912667ae014018cab96480cf6da627de392ac803229447cd43d5c7',
        byteLength: 88688,
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
        fidelity: 'official',
        url: 'https://media.thorlabs.com/globalassets/items/c/c4/c43/c430tme-c/ttn079345-s03.zmx?v=0116104940',
        sourceUrl:
          'https://media.thorlabs.com/globalassets/items/c/c4/c43/c430tme-c/ttn079345-s03.zmx?v=0116104940',
        retrievedOn: '2026-08-29',
        sha256:
          'ca9ac0d2c2dc18bf19b55438f86c2d01fbce97b003030197843fe7b578d0f794',
        byteLength: 6714,
      },
      {
        format: 'ZAR',
        delivery: 'vendor',
        fidelity: 'official',
        url: 'https://media.thorlabs.com/globalassets/items/c/c4/c43/c430tme-c/ttn079345-s02.zar?v=0116104940',
        sourceUrl:
          'https://media.thorlabs.com/globalassets/items/c/c4/c43/c430tme-c/ttn079345-s02.zar?v=0116104940',
        retrievedOn: '2026-08-29',
        sha256:
          '594b32042890b4463350d8e15eecd52449f8f61ca197c1d33ec7f2dcac782caf',
        byteLength: 176327,
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
        fidelity: 'spec-derived',
        url: './src/catalog/models/edmund-49-849.zmx',
        sourceUrl:
          'https://www.edmundoptics.com/p/254mm-dia-x-508mm-fl-uncoated-plano-convex-lens/10321/',
        retrievedOn: '2026-08-29',
        sha256:
          'c2952711af23fa12aa8619daf0da01e6dff8553b5e2600eb7b36de2fd5afc93e',
        byteLength: 348,
        specification: {
          effectiveFocalLengthMm: 50.8,
          backFocalLengthMm: 47.5,
          diameterMm: 25.4,
          radius1Mm: 26.25,
          centerThicknessMm: 5,
          clearApertureMm: 24.4,
          glass: 'N-BK7',
          referenceWavelengthNm: 587.5618,
        },
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
        fidelity: 'spec-derived',
        url: './src/catalog/models/edmund-49-847.zmx',
        sourceUrl:
          'https://www.edmundoptics.com/p/254mm-dia-x-254mm-fl-uncoated-plano-convex-lens/10319/',
        retrievedOn: '2026-08-29',
        sha256:
          'e8e8d3b8ce9b7640662d51e14740cb5d39643f595d95d5462dcf035d412cb1ca',
        byteLength: 350,
        specification: {
          effectiveFocalLengthMm: 25.4,
          backFocalLengthMm: 21.48,
          diameterMm: 25.4,
          radius1Mm: 19.93,
          centerThicknessMm: 7,
          clearApertureMm: 24.4,
          glass: 'N-SF11',
          referenceWavelengthNm: 587.5618,
        },
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
        fidelity: 'spec-derived',
        url: './src/catalog/models/edmund-32-972.zmx',
        sourceUrl:
          'https://www.edmundoptics.com/p/500mm-dia-x-1000mm-fl-uncoated-plano-convex-lens/2741/',
        retrievedOn: '2026-08-29',
        sha256:
          'cc039a89f14a526256597301e76b30dee107afe31bb3945156de9dec6ab3e011',
        byteLength: 345,
        specification: {
          effectiveFocalLengthMm: 100,
          backFocalLengthMm: 93.41,
          diameterMm: 50,
          radius1Mm: 51.68,
          centerThicknessMm: 10,
          clearApertureMm: 49,
          glass: 'N-BK7',
          referenceWavelengthNm: 587.5618,
        },
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
    ...entry.models.flatMap((model) => [model.format, model.fidelity]),
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

export const CATALOG_VALIDATION = assertCatalogManifest(
  {
    verifiedOn: CATALOG_LAST_VERIFIED,
    sources: CATALOG_SOURCES,
    entries: VENDOR_LENS_CATALOG,
  },
  { isAllowedUrl: isAllowedCatalogUrl },
);
