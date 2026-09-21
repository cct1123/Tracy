# Changelog

## 0.2.0 — engineering validation and workflows

### Results that changed

- Corrected default N-PK51 and S-NPH2 coefficients against manufacturer data. In particular, S-NPH2 d-line index changes from about 1.81254 to 1.92286. Old default lens numbers are not retained as an accuracy target.
- Chief/reference rays have zero statistical weight. Zero-power hits no longer acquire invented weight. Source/sample, spectral and Fresnel weights are separate.
- Fresnel branches carry medium-region identity; unknown finite-edge paths are flagged. OPL uses physical hit-to-hit distances, fixing the numerical launch-offset bias.
- “Pupil · Aberration” is now **Pupil · Relative OPL** with its equation and reference convention; no reference-sphere wavefront claim.
- Strict material mode blocks unresolved/out-of-known-range models. Exploratory approximations, unaudited provenance/ranges and scalar crystal approximations remain visible.

### What can be trusted, within scope

The supported coaxial geometric ray, direction, scalar-index, focal, OPL, aperture and scalar Fresnel cases agree with independent RayOptics/analytic references within the [recorded tolerances](docs/external-validation.md). Spot metrics use positive delivered power and exclude reference rays. Bundle survival, sampled power and collection of an explicitly defined finite source are distinct. This evidence does not validate real hardware, diffraction, coatings, polarization history, arbitrary sidewalls or every legacy glass model.

### Workbench

Added a headless typed simulation API, cancellable workers, separate visible/analysis ray counts, spectral and source distributions, grouped responsive controls, accessible click/keyboard placement, imported aperture reset, explicit plot scales/overlay, focus grid scan, A/B snapshots, IndexedDB autosave/recovery/named projects, schema v2 migration, browser E2E/CI, independent fixtures and benchmark/screenshot evidence. JSON v1 files remain readable.

### Deferred

P2 coatings/absorption/polarization, noncoaxial optics, tolerancing and wavefront/PSF/MTF/diffraction remain gated by definitions and independent validation. No generalized optimizer is included. See [roadmap](docs/improvement-plan.md).
