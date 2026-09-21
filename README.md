# Tracy optical workbench

Build coaxial lens systems, trace geometric rays, import optical prescriptions and inspect detector results in your browser. Projects and calculations stay local. No Node installation is needed to use a hosted static copy.

![Tracy engineering workbench](outputs/screenshots/after-desktop.png)

## Run locally

For contributors: Node.js **22.13+**, npm and a modern browser with WebGL.

```sh
npm ci
npm run dev
```

Open [Tracy at localhost:5173](http://localhost:5173). `npm run build` creates a self-contained static `dist/`; `npm run preview` serves it locally. There is no runtime CDN, cloud optical solver or telemetry.

## Try an engineering workflow

1. Use **Bench** to select the detector and edit its **Axis z** in Properties.
2. Use **Catalog** to add a component by click, Enter/Space or drag; set the insertion position in mm.
3. Choose **Source** and **Trace** settings. Analysis sample count and visible-ray count are independent. Active wavelength weights are normalized and shown beside results.
4. Open **Focus Scan** in Analysis, choose a detector interval and run it. Inspect RMS **and survival**, then optionally move to the lowest tested position.
5. Capture **A/B** snapshots and use a shared or locked plot scale for comparisons.

The [user guide](docs/user-guide.md) covers these workflows, imported aperture reset, themes and keyboard controls.

## Interpret results

- **RMS spot radius** is about the weighted detector centroid. The optional chief/reference ray has zero statistical weight.
- **Bundle survival**, **primary sampled-bundle power**, **conditional Fresnel factor** and **collection of the defined source** are separate. Pupil-targeted/fan/ring samples do not imply total collected source power.
- **Relative OPL** is an accumulated-path difference to a wavelength-specific central reference. It is not reference-sphere wavefront error, PSF or MTF.
- Strict material mode blocks unresolved glasses and known out-of-range dispersion. Exploratory fallback and unverified/anisotropic material models remain visibly labeled.
- Scope: coaxial geometric optics, scalar materials, uncoated per-interface unpolarized Fresnel. No diffraction, coatings, absorption or polarization-state propagation. Undefined finite-lens sidewall paths are flagged.

See the [quantity definitions](docs/physics-definitions.md), [independent RayOptics/analytic validation](docs/external-validation.md), and [trust changelog](CHANGELOG.md). Two incorrect default-glass coefficient sets were corrected against manufacturers, so old prototype results intentionally change.

## Keep your work

IndexedDB autosaves this browser's working project and offers reload recovery. The Project menu shows dirty/saved/error status and supports **named local projects**, **Import Project JSON** and **Export Project JSON**. Export for portable backup; browser storage can be cleared or evicted. Version 1 saves migrate to version 2.

## Validate and contribute

```sh
npm run check          # lint, type contract, unit/physics/import tests, catalog, build, format
npx playwright install chromium
npm run test:e2e       # real browser workflows
npm run reference:check
npm run benchmark
```

Numerical changes require independent or analytic regression evidence. [CI](.github/workflows/quality.yml) checks every push/PR; configure its validation job as a required repository check. [Architecture](docs/architecture.md), [audit](docs/audit.md), [roadmap](docs/improvement-plan.md), [technical reference](docs/technical-reference.md), [verification](docs/verification.md).

## Project setup prompt

This checkout uses [agentic-engineering-template](https://github.com/cct1123/agentic-engineering-template). The supplied brief is captured in [PROJECT.md](PROJECT.md); current progress is in [STATE.md](STATE.md), evidence in [records](records/RECORDS.md), and supported outcomes in [REPORT](outputs/REPORT.md). To continue, read AGENTS.md, reconcile STATE.md against code/evidence, then close the highest-priority unmet requirement and checkpoint it. Do not repeat setup or treat prototype parity as independent physics validation.

## License

Tracy uses the [MIT License](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for dependencies, prototype provenance and independent-reference tooling.
