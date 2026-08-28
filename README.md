# Tracy optical workbench

A browser-native optical engineering app based on the supplied **Soft Ether** HTML prototype. The first checkpoint preserves its visual design and numerical algorithms while separating the optics, bench model, file formats, renderer, and interface into ES modules.

## Run

Requires **Node.js 22.13+** (Node 24 recommended), npm, and a modern browser with WebGL and import-map support.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Reload after editing source files; the development server does not implement hot reload. Serve over HTTP instead of opening `index.html` with `file://`.

```sh
npm run check       # lint, tests, static build, formatting
npm run build       # self-contained JS/CSS/Three.js output in dist/
npm run preview     # serve dist/ at http://localhost:4173
```

Both servers bind to the local machine only. No account, backend, cloud solver, deployment, or telemetry is configured. Lens and project files are read in the browser. Google Fonts is the only optional runtime network dependency; system fallback fonts work offline. Three.js and its controls/line rendering modules are installed locally and pinned to the prototype's **0.128.0** version.

## Included

- Sequential Snell tracing and a bounded Fresnel reflection/transmission tracer.
- Spherical/conic and even-asphere surfaces; dispersive Sellmeier glass catalog.
- Collimated and point sources, pupil sampling, real-ray stop aiming, and optional ghost branches.
- A movable component bench, editable singlets/achromats/stops/detector, reversal, and undo/redo.
- Detector spot RMS and relative optical-path diagnostics.
- ZMX import, supported ZAR members with embedded AGF glasses, and compatible Soft Ether v1 JSON project save/load.
- Day/night themes and Layout, 3D, Front, and Fit camera views.

Try **Import Lens** with `examples/plano-convex.zmx`. Importing adds a reusable library item; drag it onto the viewport to place it on the bench. **Load Project** replaces the active session; **Save Project** downloads its JSON.

Keyboard shortcuts: `1` Layout, `2` 3D, `3` Front, `F` Fit, `T` theme, `R` reverse selection, arrows move the selected optic, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S save, Ctrl/Cmd+O load. Inputs retain their normal keyboard behavior.

## Develop

| Directory        | Responsibility                                                          |
| ---------------- | ----------------------------------------------------------------------- |
| `src/core/`      | DOM-free vector math, surfaces, materials, tracers, pupils, and sources |
| `src/model/`     | Per-workbench state, component prescriptions, axial placement           |
| `src/analysis/`  | Detector spot and relative OPD metrics                                  |
| `src/io/`        | ZMX/ZAR parsing and project validation                                  |
| `src/rendering/` | Three.js scene, geometry, rays, plots, cameras, animation               |
| `src/ui/`        | Controls, component editing, history, imports/projects, shell, theme    |
| `src/styles/`    | Original base, workbench, and theme styles                              |
| `tests/`         | Optical parity, numerical invariants, import/project, and server tests  |
| `references/`    | Original HTML preserved byte for byte; never loaded by the app          |

See [architecture](docs/architecture.md), [verification](docs/verification.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

## Engineering limits

This is a simulation foundation, not a validated replacement for commercial optical design software. All lengths are **mm**, ray wavelengths **µm**, displayed wavelengths **nm**, and interface angles **degrees**. Components are coaxial; reversal is supported, arbitrary decenter/tilt is not.

The prototype's material coefficients and built-in lens are retained, not independently certified. Unknown glasses warn and use `n = 1.52`. Fresnel power is unpolarized, with no coatings, absorption, diffraction, or coherent interference. Ghost tracing has finite branch/bounce budgets and dense bundles sample ghost branches. The aberration display is **relative path-length diagnostics**, not a reference-sphere wavefront/PSF/MTF calculation. Unsupported Zemax surface types and binary ZOS designs are outside the current model.
