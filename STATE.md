# Engineering state

## Status

VALIDATED — H005 close-detector and precision-positioning acceptance passes final model, optical and production-browser validation (E012). Last applied human input: H005.

## Loop continuity

- Session owner: none; released after precision-positioning validation, 2026-09-30 UTC. Advisory staleness window: 24 hours without live session evidence.
- In-flight action: none requiring artifact recovery. E012 records complete validation and commit/push intent for main. Git delivery is cheaply re-derived by comparing local HEAD with origin/main/the remote main SHA; inspect divergence before any retry. Historical screenshots are restored. Hosted identity/source/status remains in outputs/deployment.json.
- Current gap: none for H005. Close placement, precise typed/keyboard/drag coordinates, focus movement, undo and reload are validated. Source and documentation review is complete. New catalog optics retain normal detector working space; existing close positions remain intact. Hosted source remains the earlier E008 revision.
- Effort limit: none stated. All delegated implementation, validation and documentation assignments completed and integrated.
- Ruled out: prototype parity as independent physics authority (H001/E004), retained only for compatibility; silent unknown n=1.52 (E003), allowed only as explicitly labeled exploratory fallback; inferred bypassed media from surface order (E003/D003), replaced by region adjacency; raw-speedup claims (E007), correctness adds cost and workers improve responsiveness.
- Ruled out for H005: minimum-gap relocation for a newly inserted optic leaves no forward adjustment room (E012). Retain the 30 mm insertion default when the detector must move; revisit only if lens movement explicitly carries the detector with it.

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
| REQ-009     | TEST-009 bench/insertion/import workflows             | PASS | E012: 9 positioning regressions, production keyboard/drag/insertion tests |
| REQ-010     | TEST-010 focus/plots/A-B                              | PASS | E012: short-focus optics and close detector focus controls                |
| REQ-011     | TEST-011 persistence/recovery/JSON                    | PASS | E012: precise coordinates retained through undo/export/reload             |
| REQ-012     | TEST-012 integrated quality/CI/documentation          | PASS | E012: full checks, updated controls/docs, 12 production browser tests     |
| REQ-013     | TEST-013 static browser deployment                    | PASS   | E008; native deployment succeeded, owner-private browser URL                  |
| REQ-014     | TEST-014 advanced-physics gate                        | PASS   | [Roadmap](docs/improvement-plan.md); unsupported quantities not exposed       |

## Current system

Tracy 0.2.0 based on `a5c94516578c8edf44743048e677f424e81d0b85`; Node24.14.1/npm11.11.0 on Windows. Canonical typed snapshot → pure Worker simulation → result renderer. Native/static/local-first, indexed projects, explicit material/source/metric semantics. Original brief is preserved verbatim.

Final positioning gate (E012): 113/113 tests, lint, types, catalog, build and formatting pass. Independent comparisons: 1,504/1,504. Production browser suite: 12/12, including precision drag/nudges, close focus and recovery, with no page exceptions or attempted external origins. [Report](outputs/REPORT.md) links deliverables and [browser evidence](outputs/positioning-browser-results.json). Historical E011 evidence remains applicable to unchanged areas.

## Completion and continuation

H005 positioning implementation and final integrated validation are complete (E012). [Final report](outputs/REPORT.md) contains deliverables, limitations and operation instructions. [Hosted Tracy](https://tracy-optical-workbench.quantumsensing.chatgpt.site) remains owner-private at the earlier application revision `7bfee883020797977a9b17769811977f58a170bb`; this repository push does not redeploy the Site.

The 22 day/night tutorial screenshots from E010 retain their original capture provenance. H005 updates README, user guide and keyboard instructions for the new precision controls; the text identifies older screenshots. Documentation links, image integrity and formatting pass.

Future work should follow the gated roadmap and rerun affected checks. Extend authoritative material provenance and difficult geometry references before widening fidelity claims. Configure the CI job as a required GitHub branch-protection check through repository administration when desired.

## Blockers / human action

No implementation or deployment blocker. Public sharing has not been explicitly requested. GitHub branch-protection policy has not been changed; CI is ready for administrators to require. No physical hardware interaction applies.
