# Technical reference

For setup and a first experiment, start with the [README](../README.md). For help using the interface, see the [illustrated user guide](user-guide.md). This page covers implementation details, file support, and simulation limits.

## Implementation background

A browser-native optical engineering app based on the supplied **Tracy** HTML prototype. Native ES modules separate the optics, bench model, file formats, renderer, and interface. The app retains the prototype's visual design and default-system numerical behavior, with regression-tested fixes for imported stops, pupil sizing, surface validation, and long Fresnel paths.

## Runtime and commands

Requires **Node.js 22.13+** (Node 24 recommended), npm, and a modern browser with WebGL and import-map support.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Reload after editing source files; the development server does not implement hot reload. Serve over HTTP instead of opening `index.html` with `file://`.

```sh
npm run check                # lint, tests, offline catalog audit, build, formatting
npm run catalog:check         # offline catalog schema/hash audit
npm run catalog:check:online  # official-link and vendor-file audit
npm run build                # self-contained JS/CSS/Three.js output in dist/
npm run preview              # serve dist/ at http://localhost:4173
```

Both servers bind to the local machine only. No account, backend, cloud solver, deployment, or telemetry is configured. Lens and project files are read in the browser. Google Fonts is the only optional runtime network dependency; system fallback fonts work offline. Three.js and its controls/line rendering modules are installed locally and pinned to the prototype's **0.128.0** version.

## Features and file support

- Sequential Snell tracing and a bounded Fresnel reflection/transmission tracer.
- Spherical/conic and even-asphere surfaces; dispersive Sellmeier glass catalog.
- Collimated and point sources, pupil sampling, real-ray stop aiming, and optional ghost branches.
- A movable component bench, editable singlets/achromats/stops/detector, reversal, and undo/redo.
- Detector spot RMS and relative optical-path diagnostics.
- ZMX import, supported ZAR members with embedded AGF glasses, and compatible Tracy v1 JSON project save/load.
- Searchable Thorlabs and Edmund Optics seed catalogs with official product/prescription links and clearly labeled spec-derived local ZMX models.
- Day/night themes and Layout, 3D, Front, and Fit camera views.

Try **Import Lens** with `examples/plano-convex.zmx`. Importing adds a reusable library item; drag it onto the viewport to place it on the bench. **Load Project** replaces the active session; **Save Project** downloads its JSON.

To check the example on its own, delete the default `85301` lens assembly and place the imported singlet on the bench, retaining the detector. Its declared entrance pupil is **10 mm**, smaller than its **25.4 mm** clear aperture. With no other optics or added stop, the entrance-pupil diameter is 10 mm and the on-axis collimated bundle samples that diameter. The imported file's image plane is omitted; position the bench detector as needed.

## Imports and ray behavior

- **Surface support:** ZMX and supported ZAR designs accept `STANDARD` and `EVENASPH` surfaces. Unsupported types produce an import error before a lens enters the library. Lens imports and project loads share surface validation. An unsupported ZAR design is rejected before its embedded AGF glasses are registered.
- **Pupil sizing:** Explicit `ENPD`, or `PUPD` type 0 when `ENPD` is absent, stays with the imported component and is saved with the project. For an imported STOP, the original prescription determines the sampling radius at that stop. Moving or reversing the assembly, or adding upstream optics, preserves this radius while the current bench determines the entrance pupil. A user-added bench aperture takes precedence.
- **Apertures:** Both tracing engines block rays outside imported STOP surfaces and bench apertures. Clear apertures may still clip a requested ray bundle. Without a STOP, an explicit pupil diameter on the first component sets the collimated beam diameter.
- **Fresnel budgets:** Primary propagation is independent of the 96-step ghost budget and supports systems with more than 96 surfaces. Bounce limits and a guard scaled to the number of surfaces keep tracing bounded. Dense bundles sample ghost branches while tracing every primary ray.
- **Ray colors:** Wavelength colors stay consistent across ray counts and tracing engines. Dense bundles use thinner lines; ghosts and vignetted rays remain faint. Ray brightness is a display style, not a measurement of optical power.

The vendor catalog shares the library search box and adds a vendor filter. **Use ZMX** imports a bundled, spec-derived seed model immediately. Thorlabs ZMX/ZAR actions open official vendor files directly; download one and drop it into Tracy. Edmund's official full ZMF catalog is linked for use in Zemax, but ZMF parsing is not yet supported in Tracy.

Keyboard shortcuts: `1` Layout, `2` 3D, `3` Front, `F` Fit, `T` theme, `R` reverse selection, arrows move the selected optic, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S save, Ctrl/Cmd+O load. Inputs retain their normal keyboard behavior.

## Source layout

| Directory        | Responsibility                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `src/core/`      | DOM-free vector math, surfaces, materials, tracers, pupils, and sources                       |
| `src/model/`     | Per-workbench state, component prescriptions, axial placement                                 |
| `src/analysis/`  | Detector spot and relative OPD metrics                                                        |
| `src/io/`        | ZMX/ZAR parsing, shared surface validation, and project validation                            |
| `src/catalog/`   | Curated vendor manifest and locally reviewable seed prescriptions                             |
| `src/rendering/` | Three.js scene, geometry, rays, plots, cameras, animation                                     |
| `src/ui/`        | Controls, component editing, history, imports/projects, shell, theme                          |
| `src/styles/`    | Original base, workbench, and theme styles                                                    |
| `tests/`         | Prototype parity, consistency regressions, import/project, catalog, and server tests          |
| `references/`    | Reference HTML with Tracy naming and the original numerical baseline; never loaded by the app |

## Engineering limits

This is a simulation foundation, not a validated replacement for commercial optical design software. All lengths are **mm**, ray wavelengths **µm**, displayed wavelengths **nm**, and interface angles **degrees**. Components are coaxial; reversal is supported, arbitrary decenter/tilt is not.

The prototype's material coefficients and built-in lens are retained, not independently certified. Unknown glasses warn and use `n = 1.52`. Pupil imaging is paraxial; real rays are iteratively aimed at the resulting stop targets. Fresnel power is unpolarized, with no coatings, absorption, diffraction, or coherent interference. The aberration display is **relative path-length diagnostics**, not a reference-sphere wavefront/PSF/MTF calculation.

ZMF catalogs, binary ZOS designs, coordinate breaks, and surface types other than `STANDARD` and `EVENASPH` are unsupported. Prototype-parity and regression tests do not establish agreement with an independent optical-design solver.

## Further reading

- [Architecture](architecture.md): module ownership, initialization, tracing, and extension points.
- [Vendor catalog](catalog.md): model sources, fidelity, and catalog maintenance.
- [Verification](verification.md): test commands, recorded results, and checks still outstanding.
- [Improvement plan](improvement-plan.md): planned work and current priorities.
- [Third-party notices](../THIRD_PARTY_NOTICES.md): licenses and attribution.
