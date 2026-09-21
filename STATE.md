# Engineering state

## Status

VALIDATED within the documented P0/P1 scope after the requested bounded review and regression fixes (E009). Last applied human input: H002.

## Loop continuity

- Session owner: released after final review; checkpoint 2026-09-21 UTC. Advisory staleness window: 24 hours without live session evidence.
- In-flight action: none. Native deployment succeeded; exact identity/source/status is in `outputs/deployment.json`. Reuse `.openai/hosting.json` for future work; never register another Site for this checkout.
- Current gap: none in reviewed software. E009 records final commit/push intent for codex/tracy-engineering-validation; verify origin's branch SHA against local HEAD to reconcile delivery. No force push or merge is authorized by this review.
- Effort limit: none stated. All three delegated assignments completed and integrated.
- Ruled out: prototype parity as independent physics authority (H001/E004), retained only for compatibility; silent unknown n=1.52 (E003), allowed only as explicitly labeled exploratory fallback; inferred bypassed media from surface order (E003/D003), replaced by region adjacency; raw-speedup claims (E007), correctness adds cost and workers improve responsiveness.

## Requirements

Full criteria: [PROJECT](PROJECT.md), [brief](docs/engineering-brief.md). PASS describes the documented modeled domain and software workflow, not measured optical hardware.

| Requirement | Method                                                | Status | Evidence                                                                      |
| ----------- | ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| REQ-001     | TEST-001 audit and metric traceability                | PASS   | [Audit](docs/audit.md), [definitions](docs/physics-definitions.md), E001/E002 |
| REQ-002     | TEST-002 chief/display invariance and weighted OPL    | PASS   | simulation regressions, definitions, E003/E004                                |
| REQ-003     | TEST-003 material policy/provenance/ranges            | PASS   | materials-policy regressions, core audit, E003                                |
| REQ-004     | TEST-004 adversarial region traversal                 | PASS   | fresnel-regions regressions, E003/D003                                        |
| REQ-005     | TEST-005 source/spectral normalization and collection | PASS   | simulation regressions, definitions, E003                                     |
| REQ-006     | TEST-006 analytic/independent solver comparisons      | PASS   | E004, [external report](docs/external-validation.md), 1,504 comparisons       |
| REQ-007     | TEST-007 typed headless contract/integration          | PASS   | typecheck, simulation tests, architecture, E003/E006                          |
| REQ-008     | TEST-008 worker races/performance                     | PASS   | cancellation/error tests, watchdogs, E007                                     |
| REQ-009     | TEST-009 bench/insertion/import workflows             | PASS   | E006; 9/9 development and 9/9 production browser tests                        |
| REQ-010     | TEST-010 focus/plots/A-B                              | PASS   | simulation/focus tests, final production E2E, E006                            |
| REQ-011     | TEST-011 persistence/recovery/JSON                    | PASS   | IO/persistence tests, E005/E006                                               |
| REQ-012     | TEST-012 integrated quality/CI/documentation          | PASS   | E003/E006; hosted required-check policy remains an administrator setting      |
| REQ-013     | TEST-013 static browser deployment                    | PASS   | E008; native deployment succeeded, owner-private browser URL                  |
| REQ-014     | TEST-014 advanced-physics gate                        | PASS   | [Roadmap](docs/improvement-plan.md); unsupported quantities not exposed       |

## Current system

Tracy 0.2.0 based on `a5c94516578c8edf44743048e677f424e81d0b85`; Node24.14.1/npm11.11.0 on Windows. Canonical typed snapshot → pure Worker simulation → result renderer. Native/static/local-first, indexed projects, explicit material/source/metric semantics. Original brief is preserved verbatim.

Final review gate (E009): 104/104 tests, lint, types, catalog, build and formatting pass. Independent comparisons: 1,504/1,504. Historical development browser suite: 9/9. Final production browser suite: 10/10, including worker-failure clearing/retry, with no page exceptions or attempted external origins. [Report](outputs/REPORT.md) links deliverables, retained screenshots and original-source benchmarks.

## Completion and continuation

All requirement rows have scoped evidence, with affected checks renewed in E009. [Final report](outputs/REPORT.md) contains deliverables, limitations and operation instructions. [Hosted Tracy](https://tracy-optical-workbench.quantumsensing.chatgpt.site) is owner-private at the earlier application revision `7bfee883020797977a9b17769811977f58a170bb`. The later worker-error and weak-primary fixes are in Git branch `codex/tracy-engineering-validation`; this repository push does not redeploy the Site.

Future work should follow the gated roadmap and rerun affected checks. Extend authoritative material provenance and difficult geometry references before widening fidelity claims. Configure the CI job as a required GitHub branch-protection check through repository administration when desired.

## Blockers / human action

No implementation or deployment blocker. Public sharing has not been explicitly requested. GitHub branch-protection policy has not been changed; CI is ready for administrators to require. No physical hardware interaction applies.
