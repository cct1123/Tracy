# Tracy engineering objective

Source: [H001](records/HUMAN_INPUTS.md#h001); the complete, authoritative user brief is [engineering-brief.md](docs/engineering-brief.md). This is a software-only project.

Advance the existing browser optical workbench into a trustworthy, maintainable engineering tool. Preserve its native-module architecture and supported imports. Correctness, explicit assumptions, independent validation, and usable engineering workflows take priority over feature count.

## Requirements and acceptance criteria

| ID      | Priority | Required outcome                                                                                                                                                                                            |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-001 | P0       | Audit the complete repository; classify findings; map quantities to definitions, units, weights, validity, implementation and tests; prioritize a roadmap.                                                  |
| REQ-002 | P0       | Chief/display rays never affect physical statistics; Relative OPL has an explicit definition and is never represented as reference-sphere wavefront error.                                                  |
| REQ-003 | P0       | Strict unresolved-material blocking; explicit exploratory fallback with persistent warnings; provenance, wavelength validity and scalar anisotropy labels.                                                  |
| REQ-004 | P0       | Fresnel branches track physical regions; adversarial bypass, aperture, reversal, reflection and TIR fixtures enforce medium consistency.                                                                    |
| REQ-005 | P0       | Separate coordinates, source/sample weights, spectral weights and Fresnel power; define point distributions and independent source illumination; distinguish survival, sampled-bundle power and collection. |
| REQ-006 | P0       | Analytic and established independent-solver validation for all cases/metrics in brief section 3, with reference conventions and justified tolerances.                                                       |
| REQ-007 | P1       | Canonical typed/JSDoc SimulationState → simulate() → SimulationResult; DOM/Three-free core; UI actions own physics settings; renderers consume results.                                                     |
| REQ-008 | P1       | Worker tracing/analysis with stale-result rejection; independent analysis/display count; reproducible benchmarks and performance checks.                                                                    |
| REQ-009 | P1       | Reachable bench tree/catalog/properties/analysis; click, drag and keyboard insertion; grouped responsive toolbar; explicit imported-aperture override/reset.                                                |
| REQ-010 | P1       | Numeric plot axes, auto/locked/shared scales and previous overlay; transparent 1-D focus scan; A/B system snapshots and quantitative comparison.                                                            |
| REQ-011 | P1       | IndexedDB autosave/recovery, dirty state, named projects, schema migration, JSON round trip and offline/local privacy.                                                                                      |
| REQ-012 | P1       | Unit/physics/import/build/lint/browser CI; browser workflow, responsive, keyboard and theme tests; before/after screenshots; updated docs and trust changelog.                                              |
| REQ-013 | P1       | Publish a static browser-accessible application, retain contributor workflow and verify deployment.                                                                                                         |
| REQ-014 | P2       | Record gated roadmap for advanced optics; no trusted wavefront/PSF/MTF or generalized optimizer before conventions and independent validation.                                                              |

Full detailed acceptance criteria remain in the brief; this table does not narrow them. All quantities use explicit units and model assumptions. Prototype parity establishes compatibility only.

H005 extends REQ-009–012: detectors can be placed immediately after the final optical vertex without a 5 mm clearance, including through focus controls and saved/imported geometry. Shift enables finer lens/detector positioning by keyboard and dragging. Typed axial positions retain precision, component ordering remains valid, and undo/recovery preserve the resulting geometry. These workflows require model and production-browser regression evidence.

## Available system and constraints

- Existing checkout: C:/projects/Tracy, origin https://github.com/cct1123/Tracy, starting revision a5c94516578c8edf44743048e677f424e81d0b85.
- Native browser ES modules, Three.js 0.128, Node tests, ESLint, Prettier, local static build/server; preserve working behavior incrementally.
- User authorizes implementation, validation and static deployment by the attached brief. Do not contact other people or interact with physical hardware. No credentials in artifacts.
- Use the agentic-engineering-template workflow: AGENTS.md, this intent, STATE.md, records and outputs/REPORT.md. Template license: records/TEMPLATE-LICENSE.
- Numerical tests establish modeled geometric optics, not measured optical hardware performance.

## Known unknowns and assumptions

- Deployment credentials/provider availability must be inspected; prepare a deployable build regardless.
- Independent solver licensing/tooling availability must be established and reported honestly.
- P2 is a progressive roadmap, gated behind P0/P1 evidence; implementation is not assumed authorized ahead of that gate.
- No additional scope clarification is necessary to begin.
