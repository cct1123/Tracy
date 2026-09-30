# Engineering state

## Status

VALIDATED — documented P0/P1 behavior and H007 wavefront/online-catalog scope. Last applied human input: H007. Software evidence establishes the stated modeled domain, not measured optical hardware.

## Loop continuity

- Session owner: /root, 2026-09-30 UTC, final review and delivery. Advisory staleness window: 24 hours without live session evidence.
- In-flight action: H002/H004-authorized normal commit and push of the reviewed H007 candidate to main. Expected effect: local HEAD and origin/main identify the same commit. Verify actual refs and a clean tree before any retry; do not force-push. Implementation, references and browser validation are complete; no delegated work remains outstanding.
- Current gap: final documentation/diff gate and Git delivery. No remaining implementation gap in the bounded H007 criteria. All delegated artifacts were integrated and independently checked. Attempts: final checks pass; no repeated inconclusive action pending.
- Effort limit: none stated. Root is the sole canonical-state writer.
- Ruled out: prototype parity as independent physics authority (H001/E004), retained only for compatibility; silent unknown n=1.52 (E003), allowed only as explicitly labeled exploratory fallback; inferred bypassed media from surface order (E003/D003), replaced by region adjacency; raw-speedup claims (E007), correctness adds cost and workers improve responsiveness.
- Ruled out for H005: minimum-gap relocation for a newly inserted optic leaves no forward adjustment room (E012). Superseded by H006: remove detector relocation and movement barriers altogether, rather than retain the prior 30 mm insertion default.
- Ruled out for H007: raw relative OPL as wavefront error (D004/E014); use incident phase and a defined reference sphere. Native Hopkins OPD agreement is not established; revisit only with a resolved formula/convention analysis. Undocumented supplier APIs or challenge-page scraping are not part of the static catalog; revisit embedded discovery if a documented permitted endpoint becomes available.

## Requirements

Full criteria: [PROJECT](PROJECT.md), [brief](docs/engineering-brief.md). PASS describes documented software behavior and the supported optical domain.

| Requirement | Method                                                   | Status | Evidence                                                                                                                       |
| ----------- | -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| REQ-001     | TEST-001 audit and metric traceability                   | PASS   | [Audit](docs/audit.md), [definitions](docs/physics-definitions.md), E001/E002                                                  |
| REQ-002     | TEST-002 chief/display invariance and weighted OPL       | PASS   | E014: full simulation regressions; separate phase/OPL definitions                                                              |
| REQ-003     | TEST-003 material policy/provenance/ranges               | PASS   | E003/E014: material-policy regressions and core audit                                                                          |
| REQ-004     | TEST-004 adversarial region traversal                    | PASS   | E003/D003/E013/E014: region regressions and movable launch origins in both engines                                             |
| REQ-005     | TEST-005 source/spectral normalization and collection    | PASS   | E003/E014: simulation regressions and definitions                                                                              |
| REQ-006     | TEST-006 analytic/independent solver comparisons         | PASS   | E014: 1,504 existing and 7,678 WFE comparisons; explicitly defined reference conventions                                       |
| REQ-007     | TEST-007 typed headless contract/integration             | PASS   | E014: typed WFE/settings contract, worker and structural/layout regressions                                                    |
| REQ-008     | TEST-008 worker races/performance                        | PASS   | E007/E014: cancellation/error tests and broad performance watchdogs; no new benchmark claim                                    |
| REQ-009     | TEST-009 bench/insertion/import workflows                | PASS   | E013/E014: crossings, fine movement and vendor ZMX/ZAR import                                                                  |
| REQ-010     | TEST-010 focus/plots/A-B                                 | PASS   | E014: WFE units/reference controls, detector response, comparison scales and spot-RMS focus                                    |
| REQ-011     | TEST-011 persistence/recovery/JSON                       | PASS   | E014: conventions and vendor provenance survive export/reload; prior project regressions                                       |
| REQ-012     | TEST-012 integrated quality/CI/documentation             | PASS   | E014: 135 tests, quality checks, 18 production-browser workflows and updated day/night tutorial                                |
| REQ-013     | TEST-013 static browser deployment                       | PASS   | E008 historical deployment at 7bfee883; H007 is a repository update, not a Site redeployment                                   |
| REQ-014     | TEST-014 advanced-physics gate                           | PASS   | E014/D004: bounded WFE reference gate; [roadmap](docs/improvement-plan.md) retains other unsupported quantities as future work |
| REQ-015     | TEST-015 reference-sphere WFE and plot controls          | PASS   | E014: analytic tests, 22 independent cases / 902 rays, both engines and production UI coverage                                 |
| REQ-016     | TEST-016 arbitrary vendor search and prescription import | PASS   | E014: live official route review, query validation, attributed ZMX/ZAR import and recovery                                     |

## Current system

Tracy 0.2.0; H007 follows clean main `512d480e94e077d4619423fb6411f984b006dcff`. Node 24.14.1/npm 11.11.0 on Windows. Canonical typed snapshot → pure Worker simulation → result renderer. Native/static/local-first with IndexedDB projects and explicit material/source/metric semantics. Original brief is preserved verbatim.

The primary map is monochromatic WFE at the current detector, in nm or waves, with piston removed, optional fitted tilt removal and defocus retained. Reference geometry and sampling limits are visible. Raw Relative OPL remains a secondary diagnostic. Online catalog queries open official Edmund Optics or Thorlabs results; locally imported vendor models retain user-provided attribution and file hashes. The obsolete fixed vendor runtime has been removed; frozen numerical fixtures remain under tests.

Final application gate (E014): 135/135 tests, lint, types, frozen catalog integrity, build and formatting pass. Independent comparisons: 1,504/1,504 existing and 7,678/7,678 WFE checks. Production browser suite: 18/18, zero flaky/skipped/unexpected results. See [report](outputs/REPORT.md), [browser evidence](outputs/wavefront-catalog-browser-results.json) and [wavefront reference limits](docs/wavefront-validation.md). The native Hopkins diagnostic remains an explicitly unresolved convention/formula difference, not a passed agreement claim.

## Completion and continuation

H007 implementation and integrated validation are complete (E014). The catalog and WFE tutorial pairs were recaptured in day/night themes, with source hashes and actual sample metrics; the other 18 tutorial images retain their historical provenance. Documentation validation checks 64 local links, 22 PNGs and 11 pairs. Historical before/after engineering screenshots are unchanged.

[Hosted Tracy](https://tracy-optical-workbench.quantumsensing.chatgpt.site) remains owner-private at application revision `7bfee883020797977a9b17769811977f58a170bb`. This repository push does not redeploy the Site. Future work should follow the gated roadmap, extend difficult geometry/material/reference coverage and rerun affected checks before widening fidelity claims.

## Blockers / human action

None for the bounded implementation or Git delivery. No physical hardware interaction applies. GitHub branch protection has not been changed; CI is ready for administrators to require. Public sharing and hosted redeployment are outside this follow-up.
