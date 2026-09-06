# Architecture

## Baseline and scope

`references/soft_ether_optical_workbench_aberration_style_matched.html` is the unmodified source supplied by the user. Its SHA-256 is:

```text
842bba1a6189c09212c80035d06c016569c0d6ff313204dff227d49469826b8b
```

Production does not execute the reference file. The application uses HTML, CSS, native ES modules, Canvas, and WebGL, without a framework conversion or desktop wrapper.

## Ownership and initialization

`src/main.js` is the composition root. It constructs one bench state and optical engine, registers rendering/UI functions, builds the shell, binds events, performs the initial trace, and starts animation. DOM access occurs in UI/rendering initialization, not in the numerical modules.

The application context has six explicit owners:

| Owner                                    | Purpose                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `state` (called `model` inside adapters) | Components, flattened surfaces, pupil metadata, library, selection, snap spacing, ID sequences                   |
| `bench`                                  | Component insertion, collision-aware axial placement, orientation-derived prescriptions, surface synchronization |
| `optics`                                 | Sequential/Fresnel tracing, entrance-pupil computation, real-ray aiming, source generation                       |
| `view`                                   | Renderer, camera, controls, scene groups, disposable meshes/lines, plot caches                                   |
| `ui`                                     | User actions, inspectors, history, project workflow, shell/status rendering                                      |
| `session`                                | Trace batching, latest analysis, and the analysis-update callback                                                |

No application function is installed on `window`. Inline HTML handlers were replaced with event listeners. The theme bootstrap runs before styles to preserve the reference's initial theme behavior.

Core factories take a workbench state; they do not import UI, Canvas, or Three.js. Surfaces are rebuilt from components before tracing. A component stores local axial positions, while flattened surfaces use absolute bench positions. `surface.glass` is the medium immediately **after** that surface. The last surface is the terminal detector. The shared material catalog retains the prototype's AGF registration behavior; material catalogs per independent engine are a future extension.

Example without a browser:

```js
import { createBenchState } from '../src/model/state.js';
import { createBench } from '../src/model/bench.js';
import { createOpticalEngine } from '../src/core/engine.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from '../src/data/defaults.js';

const state = createBenchState();
const bench = createBench(state);
bench.initializeBenchFromSurfaces(DEFAULT_SURFACES, DEFAULT_NAME, DEFAULT_EPD);
const optics = createOpticalEngine(state);
const ray = optics.traceRay([0, 0, -30], [0, 0, 1], 0.5875618);
```

## Migration boundaries

The optics algorithms retain the reference implementation with targeted correctness fixes. Tests execute only the original numerical section in an isolated VM and compare the default system with the ES modules; separate regression tests cover intentionally corrected behavior. The reference's UI enhancement layers remain explicit decorators in `ui/interactions.js` and `ui/status.js`; this avoids mixing a large interface rewrite into the first checkpoint. Register decorators before binding listeners. Replace these layers with direct actions/components incrementally as features evolve.

Base markup remains in `index.html`; the toolbar/docks retain their original shell builder in `ui/shell.js`. Styles retain their cascade order: base, workbench, themes. The prototype's Soft Ether branding and v1 project-format marker remain compatible even though the repository/application title is Tracy.

Small repairs included in the migration:

- Implemented missing Layout, Front, and Fit camera functions.
- Resized the viewport when dock or analysis dimensions change.
- Disposed scene geometry/material/label resources on rebuild.
- Removed the unsupported Three.js r128 material `thickness` option, which had no effect.
- Prevented new component IDs from colliding with loaded project IDs.
- Preserved custom AGF overrides as well as added glasses in project saves.
- Validated component identities/prescriptions before project mutation and escaped imported names in HTML.
- Kept the toolbar accessible by horizontal scrolling at constrained widths.

## Import validation

[`src/io/surface-schema.js`](../src/io/surface-schema.js) owns the supported surface types (`STANDARD`, `EVENASPH`) and validation of finite geometry, glass names, and asphere coefficients. The ZMX parser normalizes type names and rejects unsupported types; it validates physical surfaces after converting geometry to millimetres. Project loading and direct parsed-lens insertion use the same surface validator.

The UI importer removes the final Zemax image surface when creating a reusable library assembly. The bench owns its detector separately. For ZAR imports, the chosen text ZMX is parsed before embedded AGF glasses are registered, so an unsupported design cannot change the material catalog. Component prescriptions and import metadata are serialized in Soft Ether v1 projects; the format version is unchanged.

## Pupils and tracing

An explicit `ENPD`, or `PUPD` type 0 used as its fallback, stays in the imported component's `importMeta`. For a component with a STOP, its original paraxial transfer maps that diameter to a sampling radius at the stop. The current bench then images that radius back to its entrance pupil. [`entrancePupil`](../src/core/pupil.js) returns the resulting diameter, `aimRadius`, and the `apertureMeta` used for the UI's provenance label. [`makeCollimated`](../src/core/sources.js) aims real rays at `aimRadius`; the physical semi-diameter remains the clipping boundary.

This preserves the imported stop footprint after placement, reversal, or insertion of upstream optics. The first user-added bench aperture takes precedence over imported STOP flags. Without an explicit stop, an imported pupil diameter on the first component supplies the collimated beam diameter. Older projects with only bench-level ENPD metadata retain a fallback path. Pupil imaging is paraxial, so the entrance-pupil diameter describes the paraxial image of the real-ray sampling targets.

Both engines reject rays outside imported STOP surfaces and bench apertures. Sequential tracing also vignettes rays that miss any prescribed surface. Fresnel tracing searches for the nearest intersection and permits bypassing ordinary finite optics outside their clear aperture; stops and the terminal detector remain blocking.

Each Fresnel input ray has separate primary and ghost step counters. Ghost processing is limited to 96 steps. Primary processing is bounded by `(surfaceCount + 1) * (maxBounces + 1)`, allowing a traversal and escape step for each permitted bounce interval. This removes the former 96-surface cutoff while retaining a guard against cyclic paths. Transmitted primary work runs before queued ghost work. The UI samples ghosts for dense bundles while tracing every primary ray.

## Extension points

Add component prescriptions in `model/components.js` and catalog templates in `data/defaults.js`. Supporting a new surface type requires equations/intersections in `core/surfaces.js`, parser handling, shared validation in `io/surface-schema.js`, and independent numerical tests. Add analysis in `analysis/` so it does not depend on plot visibility. Extend file-format support in `io/`, maintaining unit conversion and rejecting unsupported models explicitly. A Web Worker can later host the core engine; GPU/worker tracing, optimization, wave optics, and a full responsive UI are not implemented here.

Vendor catalog records live separately in `catalog/vendor-catalog.js`; they are discovery metadata, not executable component templates. `ui/catalog.js` turns a local catalog prescription into an imported component through the normal ZMX parser. Vendor-hosted files stay external and use explicit official-host allow-listing. See [vendor lens catalog](catalog.md).

## Build and dependencies

The static build removes any previous `dist/` tree before copying source and the exact locally installed Three.js modules, then rewrites the import map to `vendor/three/`. Cleaning first prevents deleted assets from surviving in a production build. No bundler or runtime transpilation is needed. The dev server exposes only application assets and Three.js, not reference files, tests, credentials, or Git metadata. `dist/`, npm caches, and dependencies are ignored by Git. No remote repository or hosted deployment is created.
