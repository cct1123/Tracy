# Tracy architecture

Native HTML/CSS/ES modules and Three.js remain intact. Changes are incremental; the supplied prototype stays in `references/` as compatibility evidence and is not shipped with the app.

## Canonical simulation boundary

`src/model/simulation-state.js` defines defaults, snapshot creation and runtime validation. `simulation-types.d.ts` supplies typed source/spectrum/engine/sampling/display/analysis settings, surface/coordinate/power/result definitions. `npm run typecheck` checks the JS contract and negative type fixtures. Units are explicit at the API: lengths `Mm`, wavelengths `Um`, angles `Deg`; material equations consume µm and surface curvature uses 1/mm.

UI actions in `src/ui/engineering.js` capture the editable bench plus all physics controls into a serializable state. The snapshot contains component/surface identity, source settings, sample distribution/weights, spectrum/color/weights, material policy and scoped custom material records. It is independent of the mutable global import catalog.

`simulate(state)` in `src/core/simulate.js` validates the state/materials, generates physical samples and an always-computed zero-weight central reference, traces, then computes metrics. It returns status/errors/warnings/provenance/assumptions, weighted hits, per-wavelength results, bounded display paths and pupil data. A blocked result has no quantitative metric. There are no DOM/Three imports in the numerical path.

```js
import { createBenchState } from './src/model/state.js';
import { createBench } from './src/model/bench.js';
import { createSimulationState } from './src/model/simulation-state.js';
import { simulate, focusScan } from './src/core/simulate.js';
import {
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
} from './src/data/defaults.js';

const benchState = createBenchState();
createBench(benchState).initializeBenchFromSurfaces(
  DEFAULT_SURFACES,
  DEFAULT_NAME,
  DEFAULT_EPD,
);
const state = createSimulationState(benchState);
state.engine.type = 'fresnel';
state.sampling.count = 1201;
state.display.count = 49;
const result = simulate(state);
console.log(result.status, result.rms, result.throughput, result.warnings);
const fromMm = state.surfaces.at(-2).z + 5;
const scan = focusScan(state, { fromMm, toMm: fromMm + 60, steps: 41 });
```

## Workers and display

`simulation-worker.js` executes a complete trace or focus scan. `worker-client.js` terminates the previous Worker on a new request and resolves obsolete promises with null; version IDs additionally reject late messages. A 60 ms UI debounce reduces worker churn during dragging. A failed worker leaves no claimed current numerical result. Analysis sample count is independent of deterministically selected visible paths. Ghost tracing is a bounded display diagnostic and never changes primary metrics.

`rendering/rays.js` consumes `SimulationResult`; its legacy `buildRays` entry delegates to a UI action so existing controls/decorators remain compatible. It does not read physical settings from DOM or choose an optical trace. Line appearance does not encode power. `rendering/plots.js` uses numerical hits with common physical axes, explicit scales, optional previous overlay and shared comparison extent.

## Physical interfaces and ownership

Lengths are mm; `surface.glass` is the sequential medium after a face. Components own local prescriptions and flattened surfaces carry absolute z, component identity and kind. The final surface is the detector. Sequential tracing clips missed prescribed apertures. Fresnel tracing permits ordinary finite-optic bypass but carries a region ID and verifies adjacent regions at each interaction. It never repairs a missed boundary by inventing a medium. Exact physical points accumulate OPL; numerical launch offsets are only intersection guards. See [core audit](core-physics-audit.md).

Editable placement permits objects to cross. `componentsInTraceOrder` sorts complete optical prescriptions by z and appends the explicitly identified detector, independently of its physical position. `validateSimulationState` checks serializable settings; `validateTraceLayout` separately rejects overlapping prescriptions, an upstream detector or source origins downstream of the first surface before numerical tracing. This separation lets unfinished layouts round-trip without changing coordinates or claiming valid optical results. Collimated `source.zMm` denotes the launch plane; source ray origins are checked against exterior-air regions in both engines.

Imports preserve units, ENPD/PUPD/STOP and original surface apertures. Unsupported surface types fail validation before mutation. Explicit aperture overrides preserve a restorable original prescription, including unequal apertures and asphere coefficients. Scoped custom materials carry provenance and AGF LD ranges across Worker/JSON boundaries.

## Persistence and UI

The existing bench, selection, camera and undo owners remain. Grouped native menu controls and Bench/Catalog tabs provide mouse/keyboard/mobile access. Project schema v2 carries canonical settings plus legacy control snapshots for backwards compatibility. `local-projects.js` owns IndexedDB storage and autosave sequencing; dirty state survives a failed or stale write. Saved named projects and recovery are separate records. Opening a replacement preserves the outgoing session. JSON remains the portable backup; storage may be evicted by a browser.

The UI has no telemetry/cloud solver or remote font requirement. All local calculations/project data stay in the browser. Vendor links are explicit actions. Build output contains only application/static dependency files, not tests or project records.

## Validation and release

See [verification](verification.md), [external references](external-validation.md) and [physics definitions](physics-definitions.md). CI runs lint, type contract, unit/import/material/topology/independent-reference tests, catalog integrity, build and Chromium E2E. Performance ceilings catch catastrophic regressions; benchmark reports retain actual timings rather than implying an engine speedup from threading.
