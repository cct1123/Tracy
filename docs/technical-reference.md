# Technical reference

## Runtime and build

Node 22.13+ (24 recommended), npm; browser needs WebGL, ES modules/import maps, module Workers and IndexedDB. `npm ci && npm run dev` serves localhost:5173. `npm run build` cleans and writes `dist/` with locally pinned Three.js modules; `npm run preview` serves it at localhost:4173. Any static host can serve this directory. No app backend, remote font, cloud solver or telemetry is required. Local calculations/data remain in the browser; hosting access control is separate from optical calculations.

The build deliberately omits tests, reference tooling, Git metadata, engineering records and local project files. The development server allowlists application/dependency routes. Three.js remains 0.128.0 to preserve existing rendering compatibility. Browser/type-check development tools are pinned in package-lock.json.

## Supported optical domain

Coaxial homogeneous isotropic media, real scalar Sellmeier dispersion, STANDARD spherical/conic and EVENASPH surfaces, sequential Snell and finite-aperture nearest-surface Fresnel branches. Lengths mm, wavelengths µm internally/nm in UI, UI angles degrees, curvature 1/mm. Air is n=1 without pressure/temperature dispersion. Pupil imaging is paraxial; stop targets use real-ray aiming.

Sequential rays must meet prescribed surfaces in order. Fresnel rays carry physical region identity; backwards/ghost/TIR branches validate adjacency. Finite sidewalls are unspecified, so a missed refractive boundary is not repaired by guessing a medium. Primary invalid topology blocks aggregate metrics; incomplete ghost branches are warned and excluded from primary metrics. OPL integrates n times physical segment length without numerical epsilon loss.

Per-interface unpolarized Fresnel does not retain polarization across interfaces. No coating, bulk absorption, birefringence, decenter/tilt, coordinate breaks, coherent interference, diffraction, PSF or MTF. Monochromatic geometric wavefront error uses the explicitly defined detector-centered reference sphere and incident phase; Relative OPL remains a separate path diagnostic. See [wavefront validation](wavefront-validation.md) for reference conventions and limitations. [Definitions](physics-definitions.md) and [independent evidence](external-validation.md) bound engineering interpretation.

## Materials

`resolveMaterial(name,wavelengthUm,{mode,customGlasses})` returns scalar n, provenance, validity range and warnings; strict resolution errors are typed. N-BK7, N-F2, N-PK51, S-NPH2 and fused silica have audited source records; other legacy models retain visible unverified/range warnings. A recorded range is enforced; an unknown range is never invented. MgF2/sapphire are labeled isotropic approximations. AGF Sellmeier-1 (formula 2) imports preserve coefficient ordering, source metadata and LD limits. Unsupported formulas remain unresolved.

`captureMaterialCatalog()` and `restoreMaterialCatalog()` preserve definitions and metadata; canonical simulation snapshots supply their own catalog against immutable builtins. Pure simulations do not share mutable imported catalog state. Exploratory n=1.52 fallback is explicit; poles/non-real dispersion remain errors.

## Import, persistence and headless use

ZMX converts supported MM/CM/etc units, STOP, ENPD/PUPD and asphere coefficients through shared validation. The object plane is not treated as an optic; the imported image plane is removed from a reusable assembly. ZAR supports the documented legacy text/AGF members; arbitrary binary ZOS/ZMF, unsupported surfaces and coordinate breaks fail. Imported pupil metadata follows placement/reversal; a user bench aperture takes precedence. Imported aperture overrides preserve an original resettable prescription.

Projects v2 contain bench, library/custom materials, canonical source/spectrum/engine/sampling/display/analysis, compatibility control snapshots, view and local identity. Version 1 is migrated without mutation. IndexedDB stores named projects and a recovery record; autosave serializes writes and retains dirty/error state on failure. JSON export is required for backup outside the browser profile.

See [architecture](architecture.md) for the typed `createSimulationState → simulate → SimulationResult` API and focusScan example. The core is DOM/Three-free, deterministic and Node-callable. Worker cancellation/versioning prevents stale calculations from replacing a later edit. Maximum per-wavelength analysis count is 5,001; focus scans use 3–201 grid positions. Display count may be zero and is independent of analysis.

## Quality commands

```sh
npm run check
npm run test:physics
npm run reference:check
npm run wavefront:check
npx playwright install chromium
npm run test:e2e
```

For restricted Node process environments, targeted pure tests can use `node --test --test-isolation=none tests/simulation.test.js`; server/browser tests still require supported process/network-loopback permissions. Independent Python tooling is needed only to regenerate frozen RayOptics fixtures; normal npm tests require no Python/network. See [verification](verification.md).

Browser artifacts are isolated by mode under ignored `test-results/development/` and `test-results/production/`. See [production browser commands](verification.md#browser-validation). Run `npm run benchmark` only when collecting fresh timings; it replaces `outputs/current-benchmark.json` with a new measured report.
