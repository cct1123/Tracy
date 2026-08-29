# Architecture

## Baseline and scope

`references/soft_ether_optical_workbench_aberration_style_matched.html` is the unmodified source supplied by the user. Its SHA-256 is:

```text
842bba1a6189c09212c80035d06c016569c0d6ff313204dff227d49469826b8b
```

Reference-file comments and embedded text were treated as source content, not task instructions. Production does not execute the reference file. There is no framework conversion or desktop wrapper in this checkpoint: native web means HTML, CSS, ES modules, Canvas, and WebGL.

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

The optics algorithms retain the reference implementation. Tests execute only the original numerical section in an isolated VM and compare results with the ES modules. The reference's UI enhancement layers remain explicit decorators in `ui/interactions.js` and `ui/status.js`; this avoids mixing a large interface rewrite into the first checkpoint. Register decorators before binding listeners. Replace these layers with direct actions/components incrementally as features evolve.

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

## Extension points

Add component prescriptions in `model/components.js` and catalog templates in `data/defaults.js`. Add surface equations/intersections in `core/surfaces.js` with independent numerical tests. Add analysis in `analysis/` so it does not depend on plot visibility. Extend file-format support in `io/`, maintaining unit conversion and rejecting unsupported models explicitly. A Web Worker can later host the core engine; GPU/worker tracing, optimization, wave optics, and a full responsive UI are not implemented here.

Vendor catalog records live separately in `catalog/vendor-catalog.js`; they are discovery metadata, not executable component templates. `ui/catalog.js` turns a local catalog prescription into an imported component through the normal ZMX parser. Vendor-hosted files stay external and use explicit official-host allow-listing. See [vendor lens catalog](catalog.md).

## Build and dependencies

The static build removes any previous `dist/` tree before copying source and the exact locally installed Three.js modules, then rewrites the import map to `vendor/three/`. Cleaning first prevents deleted assets from surviving in a production build. No bundler or runtime transpilation is needed. The dev server exposes only application assets and Three.js, not reference files, tests, credentials, or Git metadata. `dist/`, npm caches, and dependencies are ignored by Git. No remote repository or hosted deployment is created.
