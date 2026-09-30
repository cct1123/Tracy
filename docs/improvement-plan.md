# Prioritized engineering roadmap

Acceptance is defined by [the supplied brief](engineering-brief.md) and tracked in [STATE](../STATE.md). This roadmap does not replace unmet requirements with feature-count goals. Findings: [audit](audit.md).

## P0: trustworthy modeled quantities

Implemented with numerical regression coverage: separate zero-weight references; Relative OPL definitions; corrected manufacturer glass constants; strict materials and exploratory warnings; wavelength/provenance handling; carried Fresnel regions and invalid-sidewall detection; defined source distributions and weights; normalized spectral weights; separate survival/power/collection. Independent exact rays, paraxial and analytic references cover the requested case classes.

Continue expanding authoritative ranges/provenance beyond the audited materials. Add reference cases near conic singularities, very small/large geometry and strong oblique fields before extending advertised operating limits. A material warning must not be converted to a verified claim without source evidence. Prototype compatibility is never the physics gate.

## P1: dependable workbench workflows

Implemented: canonical typed/JSDoc state/results; pure headless API; cancellable Worker calculations; independent display count; grouped toolbar and reachable bench/catalog/properties/analysis; click/keyboard placement; imported aperture override/reset; locked/shared plots and previous overlay; transparent 1-D focus scan; A/B snapshots; local autosave/recovery/named projects/schema migration/JSON; browser tests and CI; deployment-ready static build.

Maintain the CI gates for all changes. Repository administrators should make the Engineering validation job a required branch-protection check; a workflow file alone cannot enforce hosting-account settings. Future performance work should profile immutable per-simulation material/region caches, rather than remove correctness checks. Larger vendor catalogs need versioned packs and virtualized search after provenance coverage grows.

## P2: gated advanced optical capability

Do not begin the following until current P0/P1 validation remains green and each extension has a physical definition, independent reference and numerical regression case:

1. Coatings and bulk absorption with documented spectral/range conventions.
2. Polarized Fresnel/Jones propagation with transported polarization bases; current per-interface unpolarized scalar averaging does not retain polarization history.
3. Decenter/tilt and coordinate breaks, then additional surface types, with full spatial region boundaries and reversed/backward path cases.
4. Multiple detector planes and tolerancing/Monte Carlo with reproducible seeded distributions, convergence and uncertainty reporting.
5. H007 implements the bounded reference-sphere wavefront gate: monochromatic phase at the current detector, explicit incident phase and piston/tilt treatment, analytic and independent ray/sphere validation. [Validation and limitations](wavefront-validation.md). Planar afocal references, distorted-pupil area reconstruction and broader difficult geometry remain extensions requiring their own evidence.
6. PSF/MTF/diffraction: specify coherent/incoherent spectral assumptions, pupil amplitude/phase sampling, FFT normalization, detector sampling and convergence; compare independent physical-optics references.
7. Optimization only after transparent objectives/constraints, stable focus workflow, reproducibility and independent validation. Do not silently optimize by clipping away poor rays.

Unsupported physics remains a visible limitation. No P2 placeholder appears as an engineering result.
