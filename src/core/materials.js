// Extracted from the supplied Tracy prototype; see docs/architecture.md.

export const GLASS_DB = {
  'N-BK7': [
    1.03961212, 0.231792344, 1.01046945, 6.00069867e-3, 2.00179144e-2,
    103.560653,
  ],
  'N-PK51': [
    1.15610775, 0.153229344, 0.785618966, 5.85597402e-3, 1.94072416e-2,
    140.537046,
  ],
  'N-PK52A': [
    1.029607, 0.1880506, 0.736488165, 5.16800155e-3, 1.66658798e-2, 138.964129,
  ],
  'N-FK51A': [
    0.971247817, 0.216901417, 0.904651666, 4.72301995e-3, 1.53575612e-2,
    168.68133,
  ],
  'N-FK5': [
    0.844309338, 0.344147824, 0.910790213, 4.75111955e-3, 1.49814849e-2,
    97.8600293,
  ],
  'N-F2': [
    1.39757037, 0.159201403, 1.2686543, 9.95906143e-3, 5.46931752e-2,
    119.248346,
  ],
  'N-SF2': [
    1.47343127, 0.163681849, 1.36920899, 1.09019098e-2, 5.85683687e-2,
    127.404933,
  ],
  'N-SF5': [
    1.52481889, 0.187085527, 1.42729015, 1.1254756e-2, 5.88995392e-2,
    129.141675,
  ],
  'N-SF11': [
    1.73759695, 0.313747346, 1.89878101, 1.3188707e-2, 6.23068142e-2, 155.23629,
  ],
  'N-SF57': [
    1.87543831, 0.37375765, 2.30001797, 1.41749518e-2, 6.40509927e-2,
    177.389795,
  ],
  'N-LAK22': [
    1.14229781, 0.535138441, 1.04088385, 5.85778594e-3, 1.98546147e-2,
    100.834017,
  ],
  'N-SSK5': [
    1.59222659, 0.103520774, 1.05174016, 9.0446902e-3, 4.97616572e-2, 122.96696,
  ],
  'N-BAF10': [
    1.5851495, 0.143559385, 1.08521269, 9.26681282e-3, 4.24489805e-2,
    105.613573,
  ],
  'N-BAK1': [
    1.12365662, 0.309276848, 0.881511957, 6.44742752e-3, 2.22284402e-2,
    107.297751,
  ],
  'N-BAK4': [1.1614748, 0.2520847, 0.825203, 6.764e-3, 2.187e-2, 107.828],
  'N-SK16': [
    1.34317774, 0.241144399, 0.994317969, 7.04687339e-3, 2.29005e-2, 92.7508526,
  ],
  'N-LASF31A': [
    1.96485075, 0.475228326, 1.48360109, 9.1970049e-3, 3.4683146e-2, 110.739909,
  ],
  'S-BSL7': [
    1.03965338, 0.231807674, 1.01384436, 6.00105045e-3, 2.00207384e-2,
    103.560735,
  ],
  'S-NPH2': [
    2.0386951, 0.437269641, 2.96711461, 1.70796224e-2, 7.49254813e-2,
    174.155354,
  ],
  'S-FPL51': [
    0.97129977, 0.234190044, 0.726471937, 4.70973855e-3, 1.57660565e-2,
    146.847134,
  ],
  'S-FPL53': [
    0.9736048, 0.1520118, 0.8780249, 4.741984e-3, 1.553129e-2, 102.4616,
  ],
  'S-LAL7': [
    1.54765261, 0.23623269, 1.05657224, 8.52444375e-3, 3.41302278e-2,
    119.762278,
  ],
  'S-PHM52': [
    1.02982212, 0.179501412, 0.793891685, 5.27644831e-3, 1.71168396e-2,
    135.533707,
  ],

  // EO & Thorlabs Specialized Base Substrates
  UVFS: [
    0.6961663, 0.4079426, 0.8974794, 4.67914826e-3, 1.35120631e-2, 97.9340025,
  ],
  CAF2: [0.5675888, 0.4710914, 3.8484723, 2.52643e-3, 1.007833e-2, 1200.556],
  MGF2: [
    0.48755108, 0.39875031, 2.3120353, 1.882178e-3, 8.951888e-3, 566.13559,
  ],
  SAPPHIRE: [
    1.4313493, 0.65054713, 5.3414021, 5.2799261e-3, 1.42382647e-2, 325.017834,
  ],
  ZNSE: [4.2980149, 0.62776557, 2.8955633, 3.627674e-2, 5.4657154e-2, 2200.0],
  B270: [1.0252431, 0.2458448, 0.9419137, 6.478e-3, 2.3247e-2, 98.7186],
  BOROFLOAT: [
    1.03666016, 0.231924559, 0.933227448, 6.00155627e-3, 1.99557436e-2,
    104.408272,
  ],

  // Plastics / Polymers
  PMMA: [0.4963, 0.6965, 0.3223, 0.0071, 0.0118, 9700],
  POLYCARB: [0.8534, 0.5459, 0.0, 0.0166, 0.0216, 0.0],
};

export const BUILTIN_GLASS_DB = Object.freeze(
  Object.fromEntries(
    Object.entries(GLASS_DB).map(([name, coefficients]) => [
      name,
      Object.freeze([...coefficients]),
    ]),
  ),
);
export const UNKNOWN_GLASS = new Set();

const LEGACY_PROVENANCE = {
  kind: 'legacy-built-in',
  source: 'references/tracy-prototype.html',
  verified: false,
};

/** Metadata is deliberately honest about legacy catalog entries not yet audited. */
export const MATERIAL_METADATA = Object.fromEntries(
  Object.keys(BUILTIN_GLASS_DB).map((name) => [
    name,
    {
      provenance: { ...LEGACY_PROVENANCE },
      wavelengthRangeUm: null,
      scalarApproximation: ['MGF2', 'SAPPHIRE'].includes(name),
    },
  ]),
);
MATERIAL_METADATA['N-BK7'] = {
  provenance: {
    kind: 'manufacturer',
    source:
      'https://media.schott.com/api/public/content/41e799d0bf874807a0bb8e702fbb75b5?v=54856406',
    verified: true,
    note: 'SCHOTT datasheet 2023-12-01; range restricted to tabulated refractive indices, relative to air.',
  },
  wavelengthRangeUm: [0.3126, 2.3254],
  scalarApproximation: false,
};
MATERIAL_METADATA.UVFS = {
  provenance: {
    kind: 'publication',
    source: 'https://doi.org/10.1364/JOSA.55.001205',
    verified: true,
    note: 'Malitson 1965, 20 °C; absolute index approximated with ambient n=1.',
  },
  wavelengthRangeUm: [0.21, 3.71],
  scalarApproximation: false,
};
MATERIAL_METADATA['N-PK51'] = {
  provenance: {
    kind: 'manufacturer',
    source:
      'https://www.schott.com/en-gb/products/optical-glass/-/media/Project/OnEx/Products/O/optical-glass/Downloads/schott-optical-glass-collection-datasheets-english-may2019.pdf?rev=5358bb64e13a44f2b37f5065490509af#page=9',
    verified: true,
    note: 'SCHOTT 2019 collection, N-PK51 sheet 2018-02-21. Corrects three legacy C coefficients; range restricted to tabulated indices.',
  },
  wavelengthRangeUm: [0.3126, 2.3254],
  scalarApproximation: false,
};
MATERIAL_METADATA['S-NPH2'] = {
  provenance: {
    kind: 'manufacturer',
    source: 'https://oharacorp.com/wp-content/uploads/2025/04/esnph02.pdf',
    verified: true,
    note: 'OHARA 2025-04, relative index at 25 °C. Corrects all six legacy coefficients; range restricted to tabulated indices.',
  },
  wavelengthRangeUm: [0.404656, 2.32542],
  scalarApproximation: false,
};
MATERIAL_METADATA['N-F2'] = {
  provenance: {
    kind: 'manufacturer',
    source:
      'https://media.schott.com/api/public/content/061f3156c83a44ed9220770b0f65a869?v=d69b35e0',
    verified: true,
    note: 'SCHOTT N-F2 datasheet 2014-02-01; range restricted to tabulated refractive indices, relative to air.',
  },
  wavelengthRangeUm: [0.4047, 2.3254],
  scalarApproximation: false,
};
const BUILTIN_METADATA = structuredClone(MATERIAL_METADATA);

export function canonicalMaterialName(glass) {
  const key = String(glass ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (['AIR', 'NONE', 'NULL', ''].includes(key)) return 'AIR';
  return (
    {
      FUSED_SILICA: 'UVFS',
      SILICA: 'UVFS',
      ACRYLIC: 'PMMA',
      POLYCARBONATE: 'POLYCARB',
      BOROFLOAT33: 'BOROFLOAT',
    }[key] || key
  );
}

export class MaterialResolutionError extends Error {
  constructor(code, message, material, wavelengthUm) {
    super(message);
    this.name = 'MaterialResolutionError';
    this.code = code;
    this.material = material;
    this.wavelengthUm = wavelengthUm;
  }
}

/**
 * Resolve one scalar, lossless index. Wavelength is µm. Strict is the default.
 * Passing customGlasses (even {}) isolates a simulation from global AGF imports.
 * Entries may be six coefficients or {coefficients, provenance, wavelengthRangeUm}.
 */
export function resolveMaterial(glass, wavelengthUm, options = {}) {
  const material = canonicalMaterialName(glass);
  const mode = options.mode ?? 'strict';
  if (!['strict', 'exploratory'].includes(mode))
    throw new TypeError(`Unknown material policy: ${mode}`);
  const fail = (code, message) => {
    throw new MaterialResolutionError(code, message, material, wavelengthUm);
  };
  if (!(wavelengthUm > 0) || !Number.isFinite(wavelengthUm))
    fail(
      'invalid-wavelength',
      'Wavelength must be a finite positive value in µm.',
    );
  if (material === 'AIR')
    return {
      material,
      wavelengthUm,
      n: 1,
      approximate: false,
      warnings: [],
      wavelengthRangeUm: null,
      provenance: {
        kind: 'model-assumption',
        source: 'Ambient medium n=1; no pressure/temperature dispersion.',
        verified: true,
      },
    };
  const scoped = options.customGlasses !== undefined;
  const supplied = scoped ? options.customGlasses?.[material] : null;
  const coefficients = supplied
    ? Array.isArray(supplied)
      ? supplied
      : supplied.coefficients
    : scoped
      ? BUILTIN_GLASS_DB[material]
      : GLASS_DB[material];
  const metadata = supplied
    ? Array.isArray(supplied)
      ? {}
      : supplied
    : scoped
      ? BUILTIN_METADATA[material]
      : MATERIAL_METADATA[material];
  const provenance = metadata?.provenance || {
    kind: 'project-supplied',
    source: 'Project material coefficients; source not supplied.',
    verified: false,
  };
  const warnings = [];
  const warn = (code, message) =>
    warnings.push({ code, material, wavelengthUm, message });
  if (!coefficients) {
    UNKNOWN_GLASS.add(String(glass));
    if (mode === 'strict')
      fail(
        'unresolved-material',
        `Unresolved material ${material}; quantitative tracing is blocked.`,
      );
    warn(
      'approximate-material',
      `Exploratory approximation: ${material} uses constant n=1.52; quantitative material results are unverified.`,
    );
    return {
      material,
      wavelengthUm,
      n: 1.52,
      approximate: true,
      warnings,
      wavelengthRangeUm: null,
      provenance: {
        kind: 'exploratory-fallback',
        source: 'User-selected n=1.52 fallback',
        verified: false,
      },
    };
  }
  if (
    !Array.isArray(coefficients) ||
    coefficients.length !== 6 ||
    !coefficients.every(Number.isFinite)
  )
    fail(
      'invalid-dispersion',
      `${material} needs six finite Sellmeier coefficients.`,
    );
  const range = metadata?.wavelengthRangeUm || null;
  if (
    range &&
    (!(range[0] > 0) ||
      !(range[1] >= range[0]) ||
      !range.every(Number.isFinite))
  )
    fail(
      'invalid-validity-range',
      `${material} has an invalid wavelength validity interval.`,
    );
  if (range && (wavelengthUm < range[0] || wavelengthUm > range[1])) {
    const message = `${material} at ${wavelengthUm} µm is outside its recorded ${range[0]}–${range[1]} µm interval.`;
    if (mode === 'strict') fail('wavelength-out-of-range', message);
    warn(
      'dispersion-extrapolation',
      `Exploratory dispersion extrapolation: ${message}`,
    );
  } else if (!range)
    warn(
      'unknown-wavelength-validity',
      `${material}: wavelength validity is not documented; verify the source catalog before engineering use.`,
    );
  if (!provenance.verified)
    warn(
      'unverified-material-provenance',
      `${material}: coefficient provenance is ${provenance.kind}; independent catalog verification is pending.`,
    );
  if (metadata?.scalarApproximation || ['MGF2', 'SAPPHIRE'].includes(material))
    warn(
      'isotropic-approximation',
      `${material}: anisotropic crystal modeled as an isotropic scalar approximation; no birefringent propagation.`,
    );
  const l2 = wavelengthUm * wavelengthUm;
  let n2 = 1;
  for (let i = 0; i < 3; i++) {
    // A zero strength term contributes nothing, including at its unused pole.
    if (coefficients[i] === 0) continue;
    const denominator = l2 - coefficients[i + 3];
    if (
      Math.abs(denominator) <=
      32 * Number.EPSILON * Math.max(l2, Math.abs(coefficients[i + 3]))
    )
      fail(
        'dispersion-pole',
        `${material}: wavelength lies at a Sellmeier pole.`,
      );
    n2 += (coefficients[i] * l2) / denominator;
  }
  if (!(n2 > 0) || !Number.isFinite(n2))
    fail(
      'invalid-dispersion',
      `${material}: dispersion does not produce a finite positive real index.`,
    );
  return {
    material,
    wavelengthUm,
    n: Math.sqrt(n2),
    approximate: warnings.length > 0,
    warnings,
    provenance: structuredClone(provenance),
    wavelengthRangeUm: range ? [...range] : null,
  };
}

export function sellmeier(glass, lam, options = {}) {
  return resolveMaterial(glass, lam, options).n;
}

/** Preflight usable media. Results retain warnings for UI, export and reports. */
export function validateMaterials(surfaces, wavelengths, options = {}) {
  const materials = [],
    errors = [],
    warnings = [];
  const names = [
    ...new Set(surfaces.map((s) => canonicalMaterialName(s.glass))),
  ];
  for (const name of names)
    for (const wavelength of wavelengths) {
      const wl =
        typeof wavelength === 'number'
          ? wavelength
          : (wavelength.wavelengthUm ??
            wavelength.value ??
            wavelength.wavelength);
      try {
        const result = resolveMaterial(name, wl, options);
        materials.push(result);
        warnings.push(...result.warnings);
      } catch (error) {
        if (!(error instanceof MaterialResolutionError)) throw error;
        errors.push({
          code: error.code,
          material: name,
          wavelengthUm: wl,
          message: error.message,
        });
      }
    }
  return {
    valid: errors.length === 0,
    approximate: warnings.length > 0,
    errors,
    warnings,
    materials,
  };
}

/** Snapshot imported/overridden glasses plus metadata for deterministic workers. */
export function captureMaterialCatalog() {
  return Object.fromEntries(
    Object.entries(GLASS_DB)
      .filter(
        ([name, c]) =>
          JSON.stringify(c) !== JSON.stringify(BUILTIN_GLASS_DB[name]) ||
          JSON.stringify(MATERIAL_METADATA[name]) !==
            JSON.stringify(BUILTIN_METADATA[name]),
      )
      .map(([name, coefficients]) => [
        name,
        {
          coefficients: [...coefficients],
          ...structuredClone(MATERIAL_METADATA[name] || {}),
        },
      ]),
  );
}

/** Atomically replace legacy UI catalog globals; scoped simulations stay isolated. */
export function restoreMaterialCatalog(catalog = {}) {
  const entries = Object.entries(catalog).map(([name, value]) => {
    const key = canonicalMaterialName(name);
    const record = Array.isArray(value) ? { coefficients: value } : value;
    if (
      !record ||
      key === 'AIR' ||
      ['__PROTO__', 'CONSTRUCTOR', 'PROTOTYPE'].includes(key)
    )
      throw new TypeError(`Invalid material catalog entry: ${name}`);
    const coefficients = record.coefficients;
    if (
      !Array.isArray(coefficients) ||
      coefficients.length !== 6 ||
      !coefficients.every(Number.isFinite)
    )
      throw new TypeError(`${name} needs six finite Sellmeier coefficients.`);
    const range = record.wavelengthRangeUm ?? null;
    if (
      range &&
      (!Array.isArray(range) ||
        range.length !== 2 ||
        !range.every(Number.isFinite) ||
        !(range[0] > 0) ||
        range[1] < range[0])
    )
      throw new TypeError(
        `${name} has an invalid wavelength validity interval.`,
      );
    return [
      key,
      {
        coefficients: [...coefficients],
        provenance: structuredClone(
          record.provenance || {
            kind: 'project-supplied',
            source: 'Imported project coefficients',
            verified: false,
          },
        ),
        wavelengthRangeUm: range ? [...range] : null,
        scalarApproximation: Boolean(record.scalarApproximation),
      },
    ];
  });
  for (const name of Object.keys(GLASS_DB)) delete GLASS_DB[name];
  for (const name of Object.keys(MATERIAL_METADATA))
    delete MATERIAL_METADATA[name];
  for (const [name, coefficients] of Object.entries(BUILTIN_GLASS_DB))
    GLASS_DB[name] = [...coefficients];
  Object.assign(MATERIAL_METADATA, structuredClone(BUILTIN_METADATA));
  for (const [name, { coefficients, ...metadata }] of entries) {
    GLASS_DB[name] = coefficients;
    MATERIAL_METADATA[name] = metadata;
  }
  UNKNOWN_GLASS.clear();
}

/** Import AGF Sellmeier-1/formula 2 with LD validity limits and source identity. */
export function registerAGF(
  text,
  source = 'Imported AGF (filename not supplied)',
) {
  let current = null,
    count = 0;
  const finish = () => {
    if (!current?.coefficients || current.formula !== 2) return;
    GLASS_DB[current.name] = current.coefficients;
    MATERIAL_METADATA[current.name] = {
      provenance: {
        kind: 'agf-import',
        source,
        verified: false,
        formula: 'Sellmeier-1 (AGF 2)',
      },
      wavelengthRangeUm: current.range || null,
      scalarApproximation: ['MGF2', 'SAPPHIRE'].includes(current.name),
    };
    count++;
  };
  for (const raw of text.split(/\r?\n/)) {
    const parts = raw.trim().split(/\s+/),
      tag = parts[0]?.toUpperCase();
    if (tag === 'NM') {
      finish();
      current = {
        name: canonicalMaterialName(parts[1]),
        formula: Number(parts[2]),
      };
    } else if (tag === 'CD' && current?.formula === 2) {
      const c = parts.slice(1, 7).map(Number);
      // Do not filter malformed entries: filtering would shift coefficient roles.
      if (c.length === 6 && c.every(Number.isFinite))
        current.coefficients = [c[0], c[2], c[4], c[1], c[3], c[5]];
    } else if (tag === 'LD' && current) {
      const lo = Number(parts[1]),
        hi = Number(parts[2]);
      if (lo > 0 && hi >= lo && Number.isFinite(hi)) current.range = [lo, hi];
    }
  }
  finish();
  return count;
}
