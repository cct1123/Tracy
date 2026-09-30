# Engineering state

## Status

VALIDATED — H006 unrestricted rearrangement follow-up within the documented forward optical model. Required software checks pass (E013). Last applied human input: H006.

## Loop continuity

- Session owner: released by /root, 2026-09-30 UTC, after final H006 validation and review. Advisory staleness window: 24 hours without live session evidence.
- In-flight action: none. Final browser report verified; historical screenshots restored with matching hashes. Git delivery uses the normal commit/push procedure in E013; compare HEAD, origin/main and the remote main SHA to re-derive publication state.
- Current gap: none within H006. Objects cross without neighbor relocation; unsupported layouts remain editable and saveable with blocked trace results. Next action: deliver the validated tree to main under H002/H004, then follow new human steering. Attempts: closed by E013; no unresolved approach remains.
- Effort limit: none stated. All delegated implementation, validation and documentation assignments completed and integrated.
- Ruled out: prototype parity as independent physics authority (H001/E004), retained only for compatibility; silent unknown n=1.52 (E003), allowed only as explicitly labeled exploratory fallback; inferred bypassed media from surface order (E003/D003), replaced by region adjacency; raw-speedup claims (E007), correctness adds cost and workers improve responsiveness.
- Ruled out for H005: minimum-gap relocation for a newly inserted optic leaves no forward adjustment room (E012). Superseded by H006: remove detector relocation and movement barriers altogether, rather than retain the prior 30 mm insertion default.

## Requirements

Full criteria: [PROJECT](PROJECT.md), [brief](docs/engineering-brief.md). PASS describes the documented modeled domain and software workflow, not measured optical hardware.

| Requirement | Method                                                | Status | Evidence                                                                      |
| ----------- | ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| REQ-001     | TEST-001 audit and metric traceability                | PASS   | [Audit](docs/audit.md), [definitions](docs/physics-definitions.md), E001/E002 |
| REQ-002     | TEST-002 chief/display invariance and weighted OPL    | PASS   | simulation regressions, definitions, E003/E004                                |
| REQ-003     | TEST-003 material policy/provenance/ranges            | PASS   | materials-policy regressions, core audit, E003                                |
| REQ-004     | TEST-004 adversarial region traversal                 | PASS   | E003/D003/E013: region regressions and movable launch origins in both engines |
| REQ-005     | TEST-005 source/spectral normalization and collection | PASS   | simulation regressions, definitions, E003                                     |
| REQ-006     | TEST-006 analytic/independent solver comparisons      | PASS   | E004, [external report](docs/external-validation.md), 1,504 comparisons       |
| REQ-007     | TEST-007 typed headless contract/integration          | PASS   | E013: types, structural versus layout validation and source launch contract |
| REQ-008     | TEST-008 worker races/performance                     | PASS   | cancellation/error tests, watchdogs, E007                                     |
| REQ-009     | TEST-009 bench/insertion/import workflows             | PASS   | E013: 11 positioning/launch regressions, free crossing and fine drag/nudges |
| REQ-010     | TEST-010 focus/plots/A-B                              | PASS   | E013: short-focus optics, close detector focus and full analysis workflows |
| REQ-011     | TEST-011 persistence/recovery/JSON                    | PASS   | E013: unfinished layouts and precision survive undo/export/reload |
| REQ-012     | TEST-012 integrated quality/CI/documentation          | PASS   | E013: full checks, updated controls/docs, 14 production browser tests |
| REQ-013     | TEST-013 static browser deployment                    | PASS   | E008; native deployment succeeded, owner-private browser URL                  |
| REQ-014     | TEST-014 advanced-physics gate                        | PASS   | [Roadmap](docs/improvement-plan.md); unsupported quantities not exposed       |

## Current system

Tracy 0.2.0 based on `a5c94516578c8edf44743048e677f424e81d0b85`; Node24.14.1/npm11.11.0 on Windows. Canonical typed snapshot → pure Worker simulation → result renderer. Native/static/local-first, indexed projects, explicit material/source/metric semantics. Original brief is preserved verbatim.

Final rearrangement gate (E013): 116/116 tests, lint, types, catalog, build and formatting pass. Independent comparisons: 1,504/1,504. Production browser suite: 14/14, including object crossing, source dragging, empty-input recovery, precision drag/nudges, close focus and unfinished-layout persistence, with no page exceptions or attempted external origins. [Report](outputs/REPORT.md) links deliverables and [browser evidence](outputs/rearrangement-browser-results.json). Historical evidence remains applicable to unchanged areas.

## Completion and continuation

H006 free rearrangement implementation and final integrated validation are complete (E013), superseding H005's remaining placement restrictions. [Final report](outputs/REPORT.md) contains deliverables, limitations and operation instructions. [Hosted Tracy](https://tracy-optical-workbench.quantumsensing.chatgpt.site) remains owner-private at the earlier application revision `7bfee883020797977a9b17769811977f58a170bb`; this repository push does not redeploy the Site.

The 22 day/night tutorial screenshots from E010 retain their original capture provenance. H006 updates README, user guide, architecture and physics definitions for free placement and collimated launch positions; the text identifies older screenshots. Documentation links, image integrity and formatting pass.

Future work should follow the gated roadmap and rerun affected checks. Extend authoritative material provenance and difficult geometry references before widening fidelity claims. Configure the CI job as a required GitHub branch-protection check through repository administration when desired.

## Blockers / human action

No implementation or deployment blocker. Public sharing has not been explicitly requested. GitHub branch-protection policy has not been changed; CI is ready for administrators to require. No physical hardware interaction applies.
