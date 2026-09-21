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

## E008

Date: 2026-09-21 UTC. Requirement: REQ-013 / TEST-013.
Method: commit verified implementation on codex/tracy-engineering-validation, push exact source to existing Sites repository, verify full HEAD, package production static output with official helper, save version1 and deploy with owner-private operation.
Source: `7bfee883020797977a9b17769811977f58a170bb`. Site: `appgprj_6ab0a25232cc8191aed0a0d4a1c8fbea`. Version: `appgprj_6ab0a25232cc8191aed0a0d4a1c8fbea~appgver_d03472a941388191b1bdce132a9924ba`. Deployment: `appgdep_6ab0a7ab44a08191b69de21062974809`.
Result: native deployment returned succeeded at 2026-09-21T03:42:44 UTC, URL https://tracy-optical-workbench.quantumsensing.chatgpt.site. User-facing browser opening queued successfully. Archive validated index, Worker, local vendor modules and hosting manifest; 71 files. Current audience remains owner-private; no public sharing change.
Artifacts: [deployment evidence](../outputs/deployment.json), [report](../outputs/REPORT.md), hosting manifest.
Packaging recovery: Node wrapper chose unavailable WSL, so used official shell helper directly with installed Git Bash. GNU tar requires /c/... archive paths to avoid interpreting C: as a remote host. Successful helper exit and archive inspection preceded saving. Do not repeat the failed path forms.
Limit: production local-browser checks validate built runtime; native hosting status verifies publication. No extra live-site fetch was performed. Closing evidence/documentation does not modify deployed application files.

## E009

Date: 2026-09-21 UTC. Source: H002. Scope: bounded review of a5c9451..89c3751 plus minimal cleanup/fixes.
Findings reproduced before fixes: a failed worker left the prior RMS 0.153 mm and spectral/power results visible; an 850-interface planar BK7/air train changed survival from 1 to 0 when the ghost cutoff was raised from 0 to 0.003, despite positive primary throughput below 1e-15.
Changes: clear failed-worker plot caches, numerical values and stale scene/result state, then allow retry; apply the ghost cutoff only to ghosts, preserving primary geometric survival. Removed one unused revision assignment and five intermediate review screenshots superseded by retained before/after captures. Corrected obsolete archive captions/link while preserving intentional historical images and independent fixtures. Incidental screenshot recaptures were excluded from the cleanup diff.
Validation: both new regressions failed before their fixes and passed afterward. Final npm run check PASS (104/104 Node tests, lint, types, catalog, static build, formatting); reference:check PASS (1504/1504, numerical residuals unchanged); production Chromium suite PASS (10/10, 59.6 seconds, no page errors or unexpected external origins). Final diff inspected; git diff --check clean.
Artifacts: [production browser report](../outputs/browser-production-results.json), [numerical regression](../tests/simulation.test.js), [browser regression](../e2e/workbench.spec.js), [independent comparisons](../tests/fixtures/reference-comparison.json).
Git delivery: commit this reviewed tree and push codex/tracy-engineering-validation to origin without force or merge. Verify the remote branch SHA equals local HEAD; Git remote/tracking refs provide the cheaply re-checkable delivery state. Existing deployment remains at E008's application revision; this request is repository review/commit/push.

## E010

Date: 2026-09-21 UTC. Source: H003. Scope: REQ-009–012 tutorial documentation; application source remains f5d3abd0f826899b415f9e073abd5c5c349b6d38.
Method: browse the current local application at port 5195 in a separate origin; inspect 11 tutorial function views in both themes; capture authentic viewport PNGs and crop the visible target controls/results. Normal viewport: 838 × 912. No generated or retouched interface pixels. Update README and the step-by-step user guide, preserving archived historical images.
Observed: applied/reset the imported 85301 aperture override; ran 30–45 mm focus scans at seven positions in both themes; moved to the tested minimum, captured A/B and restored A; saved Tutorial doublet; imported examples/plano-convex.zmx and verified its reusable catalog card/success message. The coarse grid reports 495.494 µm at 32.500 mm versus the original detector's 0.153 mm RMS. The guide explicitly explains that the grid minimum is worse than the baseline. Browser error log empty at the end of capture.
Validation: npm run format:check PASS; git diff --check PASS; 60 local documentation/image links and linked heading targets resolve; 22 valid PNGs form 11 distinct day/night pairs with matched dimensions; all guide images referenced exactly once, with 11 balanced night-mode disclosures. Images and final documentation diff visually reviewed. Application, dependency and test files are unchanged; E009 numerical/automated-browser results remain applicable, not rerun or claimed as new evidence.
Artifacts: [illustrated tutorial](../docs/user-guide.md), [capture provenance](../docs/images/tutorial/README.md), [image integrity and link results](../outputs/tutorial-validation.json). Recheck links/anchors, PNG signatures/dimensions/SHA-256 and paired filenames against that artifact when modifying the guide.
Git delivery: commit the documentation and evidence on codex/tracy-engineering-validation and push to origin under H002/H003, without force or merge. Verify the remote SHA equals local HEAD. This repository update does not redeploy the earlier hosted application.

## E011

Date: 2026-09-21 UTC. Source: H004. Scope: review and integrate every unmerged branch into main.
Inventory: refreshed all remote refs and listed remote heads. Only main at a5c94516578c8edf44743048e677f424e81d0b85 and codex/tracy-engineering-validation at 9217fd9ed8f3c31f663e1267cf23324f4687bc31 exist. The feature branch contains four commits and directly descends from main; fast-forward integration preserves every commit without conflicts.
Review: inspected the aggregate diff, prior audit/fix evidence, worker cancellation/error handling, canonical simulation/material boundaries, import/persistence interfaces, CI/build changes and tutorial artifacts. No additional merge-blocking finding or application change. Historical screenshots were restored byte-for-byte after the browser evidence run; their SHA-256 values match the pre-run files.
Validation: npm run check PASS (104/104 tests, lint, typecheck, catalog, build, formatting); npm run reference:check PASS (1504/1504). Production Chromium suite PASS (10/10, 89.413 seconds, no skipped/flaky tests, page exceptions or unexpected external origins). Documentation checks PASS (60 local links/heading targets, 22 PNGs/11 theme pairs). git diff --check PASS. The first sandboxed Node test attempt could not launch subprocesses (spawn EPERM); the authorized run outside the sandbox passed, without code changes.
Browser command: set PLAYWRIGHT_BROWSERS_PATH=C:/projects/Tracy/.cache/playwright, PLAYWRIGHT_JSON_OUTPUT_FILE=C:/projects/Tracy/outputs/main-integration-browser-results.json and TRACY_E2E_DIST=1, then npm run test:e2e. [Production report](../outputs/main-integration-browser-results.json) records the final application validation; the independent comparison artifact remains unchanged.
Git operation: commit this integration evidence, fast-forward local main to the complete reviewed branch, and push main to origin without force. Preserve the source branch. Verify origin/main equals local main/HEAD and every local/remote source branch is an ancestor of main; Git refs are the authoritative, cheaply re-checkable completion evidence. This integration does not redeploy the Site or alter its audience.
