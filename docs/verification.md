# Verification and reproducibility

The [report](../outputs/REPORT.md) and [records](../records/RECORDS.md) contain actual run evidence. Tests establish the supported model domain; they are not calibration or measurements of real optics.

## Required checks

`npm run check` runs ESLint, the typed canonical contract, all Node regressions, offline catalog integrity, a clean static build and formatting. `npm run test:physics` isolates numerical/material/topology/source regressions. `npm run reference:check` refreshes the machine comparison report against frozen independently generated fixtures. `npm run test:e2e` runs real Chromium workflows; install its pinned browser with `npx playwright install chromium` first.

CI runs these checks on push and pull request using Node 24. Physics-affecting changes must include numerical regression coverage. Make the Engineering validation job a required branch-protection check in the repository settings to enforce merge gating; source files cannot themselves enforce GitHub account policy.

## Evidence layers

| Layer                   | Scope                                                                                                                          | Authority                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Analytic                | Snell/TIR, plate displacement/OPL/power, thick lens, paraboloid/even powers, free propagation/clipping, multislab/ghost        | Independent closed-form equations, documented conventions           |
| Established solver      | 90 exact RayOptics rays across 10 prescriptions and three wavelengths, focal/EFL/chromatic comparisons, ghost/plane references | Frozen RayOptics 0.9.8 + opticalglass 1.1.1 data; 1,504 comparisons |
| Manufacturer materials  | F/d/C index tables, coefficient provenance and ranges                                                                          | Linked primary SCHOTT/Ohara/fused-silica sources                    |
| Adversarial regressions | Unequal apertures, bypass, regions, ghosts, TIR, reversal, chief/weights/collection, bad input and worker races                | Explicit invariants, independent/analytic fixtures where applicable |
| Compatibility           | Supported prototype source/geometry with corrected materials                                                                   | Backwards behavior only; never independent physical validation      |
| Software/browser        | Import/schema, autosave ordering/recovery, JSON round trips, rendering style, server confinement, UI workflows                 | Real DOM/IndexedDB/Worker/browser assertions                        |

The [external report](external-validation.md) gives reference versions, source hashes, conventions, per-metric tolerances and maximum discrepancies. Fixtures regenerate with the pinned Python requirements and script; ordinary tests consume JSON offline. The [physics definitions](physics-definitions.md) map UI metrics to implementation and tests.

## Browser validation

Playwright uses isolated browser contexts and blocks unexpected network origins. Workflows exercise startup, component click/keyboard/drag insertion, edit/removal, source/engine/display changes, focus scan and minimum movement, plot scales/A-B, ZMX import and prescription reset, strict/exploratory materials, named/autosaved recovery, exported JSON re-import, narrow layouts, keyboard menus and day/night theme. Tests fail on uncaught page exceptions. Screenshots are written under `outputs/screenshots/`; baseline and current images are linked in [REPORT](../outputs/REPORT.md).

The production build uses the same source modules with a rewritten local import map. Re-run build and browser checks when changing module paths, Worker entry points or asset packaging. No physics result is validated merely because a screenshot looks plausible.

## Performance

`npm run benchmark` records warmups, five measured runs, medians, Node/OS/CPU and source hashes in [current-benchmark.json](../outputs/current-benchmark.json). It measures default doublet, singlet and achromat at 49/1,201/5,001 samples per wavelength. The source-and-primary-trace subset can be compared with [baseline-benchmark.json](../outputs/baseline-benchmark.json), with identical source/engine parameters. Corrected material/topology/provenance checks change calculation costs; no raw tracing speedup is claimed. CPU contention affects wall-clock measurements.

Broad performance tests catch catastrophic regressions without relying on tight machine-specific timing. Responsiveness comes from Worker isolation, cancellation and bounded rendering, with numerical metrics still using the complete analysis population.

## Limits of evidence

The matrix does not prove arbitrary conic-rim/tangent convergence, unmodeled lens edges, coatings/polarization/diffraction or unverified catalog coefficients. Fans/rings are discrete diagnostic distributions. Grid focus minima can move with sample count or clipping; inspect survival and refine the grid. Browser storage may be evicted and immediate crashes can precede a debounced write. Chromium automation is not a claim of exhaustive cross-browser certification.
