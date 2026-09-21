# Engineering records

## E001

Date: 2026-09-21 UTC. Kind: initial source inspection. Requirements: REQ-001,002,007 / TEST-001.
Configuration: a5c94516578c8edf44743048e677f424e81d0b85; initially clean worktree; Node 24.14.1, npm 11.11.0.
Observed: rendering/rays.js reads physics from controls, includes optional chief rays in bundle counts and detector statistics; analysis/metrics.js falls back to equal weights for zero-power samples; README states no autosave. Existing tests include prototype parity and targeted regressions.
Conclusion: P0 corrections and canonical simulation extraction are necessary; baseline tests have not yet been run. Source inspection is not numerical validation.

## D001

Date: 2026-09-21 UTC. Basis: H001/E001.
Decision: preserve native JS modules; introduce rigorous JSDoc contract and pure simulate API incrementally. Follow template's optional delegation for bounded non-overlapping work, with root as the sole STATE/records owner.
Consequence: independent core validation, core-medium/material corrections, and UI/persistence can progress alongside coordinator-owned simulation integration. Each contributor must return actual test evidence.
Reconsider if: interface conflicts or validation demonstrates incompatibility.

## E002

Date: 2026-09-21 UTC. Requirements: REQ-001 / TEST-001. Baseline source a5c9451, Node 24.14.1.
Method: npm test (process-enabled execution after sandbox EPERM), scripts/capture-baseline.mjs on unmodified numerical/UI files.
Result: 48/48 baseline tests PASS. Captured desktop/mobile screenshots and seven-run timings (two warmups/five measured); default 5001×3 primary rays median 240.061 ms sequential, 1519.528 ms Fresnel.
Artifacts: [baseline timings](../outputs/baseline-benchmark.json), [before desktop](../outputs/screenshots/before-desktop.png), [before mobile](../outputs/screenshots/before-mobile.png). Historical capture now refuses modified source.
Limit: prototype compatibility is not physical validation; timing is machine/load dependent.

## D002

Date: 2026-09-21 UTC. Basis: H001, manufacturer evidence in [core audit](../docs/core-physics-audit.md).
Decision: correct N-PK51 and S-NPH2 rather than preserve erroneous default optical outputs; keep prototype geometry compatibility with both sides using corrected materials.
Consequence: default results intentionally change. Primary manufacturer index regressions and independent RayOptics cases establish correctness within their domains.

## E003

Date: 2026-09-21 UTC. Requirements: REQ-002–008 / TEST-002–008.
Method: npm run check on integrated 0.2.0 candidate; Node24.14.1/npm11.11.0; ESLint, type contract, Node tests, catalog audit, clean static build, formatting.
Result: 103/103 tests PASS; lint/type/catalog/build/format PASS. Includes chief/ghost/display invariance, zero-weight semantics, material strict/exploratory/ranges/provenance, medium adversaries, source collection and overflow, malformed state, curved-glass source rejection, focus and stale-worker/error cleanup.
Artifacts: [tests](../tests), [audit](../docs/audit.md), [definitions](../docs/physics-definitions.md).
Limit: browser workflows validated separately; result is modeled optics, not hardware measurement. Later source edits require affected checks again.

## E004

Date: 2026-09-21 UTC. Requirement: REQ-006 / TEST-006.
Method: pinned RayOptics0.9.8/opticalglass1.1.1 independently generate frozen reference rays; node scripts/reference-comparison.mjs compares current core, with source hashes recorded.
Result: 1504/1504 comparisons PASS; maximum ray intercept discrepancy 4.276e-12 mm, direction cosine 2.027e-15, OPL 2.232e-12 mm, EFL/focal-z 1.422e-14 mm; Fresnel power 1.111e-16. Six separate analytic test cases PASS.
Artifacts: [machine comparisons](../tests/fixtures/reference-comparison.json), [reference report](../docs/external-validation.md), [generator](../scripts/reference-rayoptics.py).
Limit: supported coaxial/scalar domain and fixture ranges only; explicit reference/tolerance conventions in report. No diffraction/coating/polarization-history claim.

## E005

Date: 2026-09-21 UTC. Requirements: REQ-009–012 / TEST-009–012.
Method: real Chromium workflow/visual review during integration, isolated contexts and blocked external origins.
Result: desktop1440×1000/mobile390×844 review finds no page errors or horizontal overflow; corrected menu/dock/analysis sizing and keyboard access. Browser tests exposed loss of detector identity in schema reconstruction after stronger canonical validation. Fixed reconstruction and added regression; 19/19 IO/persistence tests PASS.
Artifacts: [browser suite](../e2e/workbench.spec.js), [persistence tests](../tests/persistence.test.js), [review screenshots](../outputs/screenshots).
Limit: full final browser run still pending at this checkpoint; do not infer PASS from intermediate checks.

## D003

Date: 2026-09-21 UTC. Basis: H001, E003 and topology fixtures.
Decision: quantitative metrics use consistently traced positive-power primary samples. Undefined primary topology blocks aggregation; ghost-only undefined edge paths are distinctly warned and do not invalidate primary results. Zero-power diagnostic rays cannot invalidate emitted-power metrics.
Consequence: no claimed full ghost-inclusive collection or sidewall model. Every retained refractive interaction has consistent region adjacency; sidewalls remain P2 domain work.

## E006

Date: 2026-09-21 UTC. Requirements: REQ-007,009–012 / TEST-007,009–012.
Method: final npm run check after UI refinements, then full Playwright suite against rebuilt dist (TRACY_E2E_DIST=1), isolated port5192; Chromium1.55.1 toolchain, Windows/Node24.14.1. Development suite previously completed on port5191.
Result: final gate PASS: 103/103 Node tests, lint/type/catalog/build/format. Development E2E 9/9 PASS; final production E2E 9/9 PASS in 1.2 minutes. No uncaught page exceptions or attempted external network origins. Latest focus interval and imported A/B geometry refinements included. Desktop/mobile screenshots visually reviewed.
Artifacts: [development browser report](../outputs/browser-results.json), [production browser report](../outputs/browser-production-results.json), [screenshots](../outputs/screenshots), [CI](../.github/workflows/quality.yml).
Limit: local runs validate code/build behavior; remote GitHub CI and required-check policy have not been configured/observed. Chromium is not exhaustive cross-browser certification.

## E007

Date: 2026-09-21 UTC. Requirement: REQ-008 / TEST-008.
Method: node scripts/benchmark.mjs after browser jobs stopped; two warmups/five measured runs, same workstation and matched source/primary-trace baseline scope. Also measures complete new API on three systems × three counts × two engines.
Result: default5001×3 primary-only median sequential335.192 ms/Fresnel1653.510 ms versus baseline240.061/1519.528 ms. Complete API median392.030/1752.129 ms. Performance watchdogs PASS in integrated tests.
Artifacts: [current timings](../outputs/current-benchmark.json), [baseline](../outputs/baseline-benchmark.json), [report](../outputs/REPORT.md).
Conclusion: correctness checks add raw cost; do not claim tracing speedup. Worker isolation, cancellation and bounded display paths address responsiveness. Timing remains machine/load dependent; source hashes and exact scope are recorded.
