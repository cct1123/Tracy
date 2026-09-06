// Extracted from the supplied Tracy prototype; see docs/architecture.md.

export const GLASS_DB = {
  'N-BK7': [
    1.03961212, 0.231792344, 1.01046945, 6.00069867e-3, 2.00179144e-2,
    103.560653,
  ],
  'N-PK51': [
    1.15610775, 0.153229344, 0.785618966, 5.95691642e-3, 1.97480763e-2,
    78.3995955,
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
  'S-NPH2': [1.849607, 0.3287684, 1.344552, 1.115556e-2, 4.522472e-2, 106.0658],
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

export function sellmeier(glass, lam) {
  if (!glass) return 1.0;
  let k = glass.toUpperCase().replace(/\s+/g, '_');
  if (['AIR', 'NONE', 'NULL', ''].includes(k)) return 1.0;

  if (k === 'FUSED_SILICA' || k === 'SILICA') k = 'UVFS';
  if (k === 'ACRYLIC') k = 'PMMA';
  if (k === 'POLYCARBONATE') k = 'POLYCARB';
  if (k === 'BOROFLOAT33') k = 'BOROFLOAT';

  const c = GLASS_DB[k];
  if (!c) {
    UNKNOWN_GLASS.add(glass);
    return 1.52;
  }

  const [B1, B2, B3, C1, C2, C3] = c;
  const l2 = lam * lam;
  return Math.sqrt(
    Math.max(
      1,
      1 + (B1 * l2) / (l2 - C1) + (B2 * l2) / (l2 - C2) + (B3 * l2) / (l2 - C3),
    ),
  );
}

export function registerAGF(text) {
  // Import embedded Sellmeier-1 (formula 2) glasses. This covers the majority
  // of conventional catalog glasses while leaving other formula types untouched.
  let current = null,
    count = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '!') continue;
    const parts = line.split(/\s+/),
      tag = parts[0]?.toUpperCase();
    if (tag === 'NM') current = { name: parts[1], formula: parseInt(parts[2]) };
    else if (tag === 'CD' && current && current.formula === 2) {
      const c = parts.slice(1).map(Number).filter(Number.isFinite);
      // Zemax Sellmeier 1: n² = 1 + K1 λ²/(λ²-L1) + K2 λ²/(λ²-L2) + K3 λ²/(λ²-L3)
      if (c.length >= 6) {
        GLASS_DB[current.name.toUpperCase()] = [
          c[0],
          c[2],
          c[4],
          c[1],
          c[3],
          c[5],
        ];
        count++;
      }
    }
  }
  return count;
}
