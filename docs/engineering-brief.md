You are a senior optical-software engineer responsible for advancing:

https://github.com/cct1123/Tracy

Tracy is an interactive browser optical workbench for constructing coaxial lens systems, tracing rays, importing optical prescriptions, and inspecting detector/optical-path results.

The objective is NOT to maximize feature count. Advance Tracy from a polished prototype into a trustworthy, maintainable optical-engineering workbench with physically explicit semantics, strong validation, and substantially better UX.

Preserve the useful existing architecture and functionality. Refactor incrementally rather than rewriting the project.

## 1. Audit first

Review the complete repository, numerical engine, imports, state management, rendering, UI, tests, documentation, and existing improvement plan.

Map every displayed engineering quantity back to:

* its physical definition;
* numerical implementation;
* sampling assumptions;
* units;
* normalization;
* validity limits;
* relevant tests.

Identify cases where the UI implies greater physical fidelity than the implementation provides.

Do not assume prototype-parity tests establish physical correctness.

## 2. P0 — Physics and numerical correctness

### Chief/reference rays

Separate physical sampling rays from reference/display rays.

The optional chief ray must NOT contribute statistical weight to:

* RMS spot radius;
* transmission/throughput;
* vignetted fraction;
* spectral averages;
* any other population statistic.

It may be used as a geometrical or OPL reference.

Add regression tests proving Chief Ray ON/OFF leaves physical metrics unchanged.

### Optical-path terminology

The current chief-referenced accumulated OPL diagnostic is not a conventional reference-sphere wavefront-error calculation.

Rename the current UI/result to:
“Relative OPL” or equivalent.

Do not label it Wavefront Error or Aberration without implementing the appropriate reference wavefront.

Document the exact mathematical definition next to the analysis.

### Materials

Do not silently use an unknown glass as an ordinary quantitative result.

Implement:

* strict engineering mode: unresolved glass blocks quantitative tracing;
* optional exploratory fallback mode;
* persistent visible approximate-material warning.

Record material provenance.

Add wavelength-validity handling for dispersion models.

Clearly label anisotropic materials modeled with scalar refractive index as isotropic approximations until birefringent propagation is implemented.

### Fresnel medium topology

Audit the non-sequential/nearest-surface Fresnel tracer.

Do not infer the incident medium solely from surface order and propagation direction when the ray path can bypass or revisit surfaces.

Track and validate the physical medium/region occupied by each ray branch.

Create adversarial fixtures covering:

* front/back surfaces with unequal apertures;
* rays bypassing one surface and encountering another;
* backwards ghost propagation;
* multiple internal reflections;
* TIR;
* reversed assemblies.

Assert medium consistency at every interaction.

### Source sampling

Define the physical meaning of every sampling pattern.

Separate:

1. geometrical sample coordinates;
2. statistical/radiometric ray weights;
3. Fresnel transmitted power.

For point sources, explicitly support or document distributions such as:

* uniform angular sampling;
* uniform solid-angle emission;
* uniform pupil illumination;
* optional Gaussian/custom weighting.

Do not treat arbitrary geometric samples as equal-power rays without a stated source model.

### Spectral weighting

Add wavelength weights.

For each active wavelength store:

* wavelength;
* source weight;
* display color.

Normalize weights and expose them in the UI.

Label the existing F/d/C default clearly if equal weighting is used.

### Transmission metrics

Separate:

* bundle survival/transmission;
* Fresnel transmission of the sampled bundle;
* total source-power collection.

A stop that shrinks the generated pupil bundle must not misleadingly imply unchanged real collected power.

Allow physical source illumination to be defined independently of the entrance pupil when total collected power is requested.

## 3. Independent physics validation

Create an external-validation suite independent of the original Tracy prototype.

Use analytically solvable cases and at least one established independent optical solver where licensing/tooling permits.

Include:

* plane interface and Snell-law cases;
* critical-angle/TIR cases;
* plane-parallel plate;
* plano-convex singlet;
* biconvex singlet;
* achromat;
* even asphere;
* explicit aperture/vignetting case;
* finite point source;
* reversed lens;
* multi-surface Fresnel transmission;
* representative ghost path.

Compare:

* ray intercepts;
* ray direction cosines;
* refractive indices;
* focal positions/EFL where applicable;
* OPL;
* Fresnel power;
* chromatic behavior;
* aperture/vignetting state.

Define justified tolerances for each metric and record the reference source and convention.

Prototype-parity tests should remain backward-compatibility tests, not the primary physics-validation authority.

## 4. P1 — Software architecture

Create a canonical typed simulation model.

Target architecture:

UI → actions → SimulationState → simulate() → SimulationResult → renderer/analysis UI

Rendering modules must not read DOM controls to decide the physical simulation.

Centralize:

* source configuration;
* wavelengths and weights;
* engine configuration;
* ray sampling;
* component state;
* analysis configuration.

Make simulation callable without a browser.

Introduce TypeScript or rigorous JSDoc/types, particularly around:

* mm;
* µm;
* nm;
* degrees/radians;
* curvature;
* refractive index;
* ray power;
* pupil coordinates;
* surface/component identifiers.

Keep the numerical core deterministic and free of DOM/Three.js dependencies.

## 5. Performance

Move expensive ray tracing and analysis off the UI thread using a Web Worker.

Support cancellation/versioning so stale calculations cannot overwrite newer parameter changes.

Keep interactive dragging responsive.

Separate:

* analysis sample count;
* visible/display ray count.

A user should be able to calculate with hundreds/thousands of rays without drawing every ray.

Benchmark representative systems and add performance regression checks.

## 6. P1 — UX redesign

Optimize the application for common optical-engineering workflows.

### Navigation

Separate:

* System / Bench Tree
* Component Catalog
* Properties
* Analysis

Bench objects should always be easy to reach without scrolling through the component catalog.

### Adding components

Support:

* click-to-add;
* drag-to-position;
* keyboard operation;
* clear insertion location.

Do not require drag-and-drop as the only placement method.

### Toolbar

Replace the long horizontally scrolling toolbar with logical groups:

* Project
* Source
* Trace
* Analysis
* View

Use a responsive overflow menu instead of hiding functionality offscreen.

### Analysis plots

Add:

* Auto Scale;
* Lock Scale;
* shared scale across comparisons;
* previous-result overlay;
* numeric axis labels and units.

Do not allow automatic plot rescaling to make two physically different results appear visually identical.

### Focus workflow

Add a Focus Scan tool:

* choose detector-z interval;
* calculate RMS spot versus z;
* show curve;
* report minimum;
* optionally move detector to selected/best position.

Keep the underlying metric and wavelength/source settings visible.

Do not begin with a generalized optimizer; implement this transparent one-dimensional workflow first.

### Comparison workflow

Allow A/B snapshots of a system and compare:

* geometry;
* detector position;
* spot RMS;
* bundle transmission;
* wavelength results.

### Fidelity communication

Every result panel should expose its model assumptions locally.

Examples:

* Geometric optics
* Uncoated Fresnel
* Isotropic material model
* No diffraction
* Equal spectral weighting
* Approximate/unknown material

Avoid vague labels such as “PHYSICAL”.

Rename “Fresnel 3D” to something that communicates the actual scope, for example:
“Uncoated Fresnel + Ghosts (Coaxial)”.

Rename the existing “Pupil · Aberration” analysis to “Pupil · Relative OPL”.

### Imported assemblies

Do not expose a generic “Diameter” control when it overrides every imported surface clear aperture.

Use an explicit control such as:
“Override all clear apertures”

Show that the prescription has been modified and provide Reset to Imported Prescription.

## 7. Persistence and distribution

Add:

* IndexedDB autosave;
* reload/crash recovery;
* dirty-state indication;
* named local projects;
* schema/version migration;
* explicit JSON import/export.

Retain local/offline privacy.

Deploy the static application so users can try Tracy directly in a browser without installing Node.

Keep the local-development workflow for contributors.

## 8. Browser/software quality

Add automated browser E2E coverage for:

* application startup;
* component insertion/editing/removal;
* source changes;
* engine changes;
* focus scan;
* import;
* autosave/recovery;
* JSON save/load round trip;
* responsive layouts;
* keyboard operation;
* day/night themes.

Add CI for lint, unit tests, physics validation, import fixtures, build, and browser tests.

No physics-affecting pull request should merge without numerical regression coverage.

## 9. P2 — Advanced optical capabilities

Only after P0/P1 validation is strong, progressively implement:

* coating models;
* bulk absorption;
* polarized Fresnel/Jones propagation;
* decenter and tilt;
* coordinate breaks;
* additional surface types;
* multiple detector/analysis planes;
* tolerancing and Monte Carlo analysis;
* reference-sphere wavefront error;
* PSF;
* MTF;
* diffraction/physical-optics methods;
* optimization.

Wavefront/PSF/MTF must have explicit sampling conventions and independent reference validation before being exposed as trusted engineering results.

## 10. Required deliverables

Produce:

1. Audit report with findings classified as bug / numerical risk / UX issue / architectural debt / missing capability.
2. Prioritized P0/P1/P2 roadmap.
3. Physics definitions document for every quantitative metric.
4. External-validation fixtures and comparison report.
5. Architecture refactor with canonical SimulationState/SimulationResult.
6. UX improvements described above.
7. Automated test and CI expansion.
8. Updated README and user/technical documentation.
9. Before/after screenshots and benchmark results.
10. A concise changelog explaining which results can now be trusted and under what assumptions.

## Engineering principles

* Correctness before feature count.
* Explicit assumptions before plausible-looking output.
* Never silently approximate unsupported optical behavior.
* Separate visualization from physical calculation.
* Separate reference rays from statistical samples.
* Separate sampling weights from optical power.
* Prefer testable pure numerical functions.
* Preserve imported prescription fidelity.
* Validate against independent references, not only Tracy itself.
* Keep the UI understandable to an optical engineer without requiring the documentation to decode every metric.
* Preserve the project's lightweight, browser-native, local-first character.
