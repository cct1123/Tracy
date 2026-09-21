# Core physics audit and corrections

Scope: REQ-003 / TEST-003 (materials) and REQ-004 / TEST-004 (Fresnel regions). Baseline inspected: a5c9451. This document describes modeled geometric optics; it is not hardware measurement evidence.

## Audit findings

| Classification     | Baseline finding                                                                          | Consequence                                                                                                           | Correction/evidence                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug                | An unresolved glass silently became n=1.52.                                               | Ordinary looking quantitative results used fabricated material data.                                                  | Strict default throws a structured material error; explicit exploratory mode returns approximation metadata and persistent warnings. `materials-policy.test.js`.                   |
| Bug                | Sellmeier output was clamped to n²≥1.                                                     | Invalid/pole/negative dispersion evaluations could appear physical.                                                   | Reject nonfinite wavelengths, poles, invalid coefficients and nonpositive n² in both modes. Zero-strength poles contribute zero.                                                   |
| Bug                | Default N-PK51 used incorrect C coefficients; default S-NPH2 used unrelated coefficients. | Legacy d-line indices were 1.528220598 and 1.812542062, respectively, versus manufacturer values 1.52855 and 1.92286. | Replace from manufacturer sheets; F/d/C regression against tabulated values with absolute tolerance 6e-6 (table rounding and wavelength precision).                                |
| Missing capability | Coefficients carried no source, validity or anisotropy information.                       | Apparent catalog identity implied unsupported fidelity.                                                               | Provenance and known wavelength limits retained; unknown validity and unaudited legacy provenance explicitly warn. MgF2 and sapphire always report scalar isotropic approximation. |
| Architectural debt | Imported material globals crossed workbench and worker boundaries.                        | Results depended on which catalog another project had loaded.                                                         | Explicit scoped catalog passed through all numerical lookups; snapshot and atomic restoration include metadata.                                                                    |
| Bug                | AGF parser filtered invalid coefficient tokens.                                           | A malformed token could shift later coefficients into the wrong role.                                                 | Validate the original first six CD fields without filtering; collect LD bounds and source identity.                                                                                |
| Bug                | Nearest-surface tracer chose n1 from surface index and sign of D.z.                       | Bypassed entrance faces fabricated glass; returning branches could use a medium they had never entered.               | Carry physical region ID and n per branch; validate adjacency at every interaction using the local face normal.                                                                    |
| Numerical risk     | Numerical launch offsets were omitted from OPL.                                           | Each interface shortened the integrated path by approximately n×1e-8 mm.                                              | Keep physical hit origins separately from numerical search origins; integrate physical hit-to-hit lengths.                                                                         |
| Missing capability | Finite faces have clear apertures but no sidewall prescription.                           | A branch may leave a glass edge without a defined optical interaction.                                                | Such paths end with explicit topology errors and unresolved power, never an assumed glass-to-air refraction.                                                                       |
| Missing capability | Pruned, blocked and undefined branches had no complete accounting.                        | Returned energy appeared lost without a reason.                                                                       | Distinct detector, escaped, blocked, discarded and unresolved fractions; sum tested against incident power 1.                                                                      |

## Material model and provenance

`resolveMaterial(name, wavelengthUm, options)` returns scalar n plus material identity, provenance, wavelength range, approximation flag and structured warnings. `sellmeier()` returns the scalar or throws `MaterialResolutionError`. Options are `mode: 'strict' | 'exploratory'` and optional `customGlasses`. Passing even an empty custom catalog selects immutable builtins plus that catalog, isolating the call from legacy UI globals. `validateMaterials()` performs a preflight suitable for result and UI diagnostics.

Strict mode blocks unresolved materials and evaluation outside a recorded wavelength interval. Exploratory mode explicitly permits constant n=1.52 for unresolved identity or finite extrapolation of a known formula. Invalid arithmetic is blocked in either mode. Entries with no independently established range remain usable with an approximate/unverified warning; absence of a range is never presented as unlimited physical validity.

Audited primary sources:

- [SCHOTT N-BK7 datasheet](https://media.schott.com/api/public/content/41e799d0bf874807a0bb8e702fbb75b5?v=54856406): original coefficients retained; conservative interval 0.3126–2.3254 µm follows tabulated refractive indices.
- [SCHOTT N-PK51, page 9](https://www.schott.com/en-gb/products/optical-glass/-/media/Project/OnEx/Products/O/optical-glass/Downloads/schott-optical-glass-collection-datasheets-english-may2019.pdf?rev=5358bb64e13a44f2b37f5065490509af#page=9): corrected three denominator coefficients; interval 0.3126–2.3254 µm.
- [OHARA S-NPH2, April 2025](https://oharacorp.com/wp-content/uploads/2025/04/esnph02.pdf): corrected all six coefficients; interval 0.404656–2.32542 µm follows its populated index table.
- [SCHOTT N-F2 datasheet](https://media.schott.com/api/public/content/061f3156c83a44ed9220770b0f65a869?v=d69b35e0): coefficients retained; interval 0.4047–2.3254 µm.
- [Malitson 1965, fused silica](https://doi.org/10.1364/JOSA.55.001205): existing rounded squared-resonance coefficients retained, 0.21–3.71 µm at 20 °C.

Other inherited catalog entries explicitly retain `legacy-built-in`, original prototype source and `verified:false`. Imported AGF files retain filename/source, formula and LD limits, but importing is not independent verification. `captureMaterialCatalog()` snapshots additions/overrides; `restoreMaterialCatalog()` validates before replacing global UI state. These snapshots also preserve deliberately supplied project coefficients, and do not contact a network service.

All indices are scalar, real, lossless and used with ambient n=1. Manufacturer glass indices are relative to ambient air at catalog reference conditions; fused-silica absolute data is approximated within that ambient convention. No thermo-optic correction, pressure correction, absorption, coating, birefringent splitting or polarization state transport is implemented. Catalog validity of refractive index does not establish high transmission.

## Region model and boundaries

Each prescription face defines adjacent regions. Continuous identical glass spans share a region ID; disconnected volumes retain different IDs even at identical refractive index. Air gaps belong to the connected exterior. Each ray carries its actual region from its launch point. Transmission changes to the validated adjacent region. Reflection, including total internal reflection, retains the incident region. The crossing direction comes from the dot product with the local geometrical normal, not solely the axial direction.

A launch inside a fully bounded glass interval is classified from the two surface sags and clear apertures. Ambiguous unequal-aperture launch regions are rejected. A ray missing both faces can remain exterior air. A ray missing one face and encountering an incompatible face is rejected with `medium-region-mismatch`. A ray leaving glass without a prescribed face is `undefined-region-exit`. The model deliberately does not invent sidewall shape or reflectivity.

Results expose per-interaction incident/transmitted/reflected directions, n1/n2, region IDs, Fresnel R/T, TIR, incoming power and accumulated OPL. Segments expose n, region ID and OPL endpoints. Detector hits include final direction. `valid` means all traced branches have defined topology; `primaryValid` and `ghostsValid` keep primary engineering metrics separate from incomplete ghost display paths. An undefined ghost cannot alter the primary spot or primary sampled-bundle transmission. Ghost totals are incomplete whenever a ghost is unresolved or discarded.

Power ledger: detector-hit powers + escaped exterior power + blocked stop/detector power + discarded branch power + unresolved-topology power = 1 (within floating-point tolerance). The ghost bounce/work/cutoff budget contributes discarded power; it is not absorption. Under TIR the reflected continuation preserves primary classification. A maximum-bounce termination is explicit discarded power.

## Validation

Reproduce the focused regression suite:

```sh
node --test --test-isolation=none tests/materials-policy.test.js tests/fresnel-regions.test.js tests/consistency.test.js
```

Independent constant-index fixtures establish unequal entrance/exit apertures in both directions, complete bypass, backwards propagation, backwards ghosts, multiple internal reflections, interior launch and TIR, reversed curved assemblies, disconnected same-index regions, undefined initial side geometry, obstruction versus unresolved topology, and power conservation. A plane plate gives primary OPL 35 mm and first two-reflection ghost OPL 65 mm for 10 mm air + 10 mm n=1.5 glass + 10 mm air; powers are 0.96² and 0.96²×0.04². Tolerance is 1e-11 mm/power for these arithmetic fixtures. Existing pupil, import and long-path regressions also run.

The separate external-solver suite covers broader intercept/direction/OPL reference cases. Prototype parity remains compatibility evidence only. In particular, corrected default material coefficients intentionally change the original default optical output; old default-output parity is not a valid acceptance criterion.

## Remaining limits and next priority

The physical topology is limited to non-overlapping coaxial prescribed faces. Arbitrary solids, sidewall surfaces, coordinate breaks and decenter/tilt remain outside scope. Sequential tracing assumes forward traversal from incident air; Fresnel tracing explicitly handles bounded interior starts and returning branches. Numerical nearest-face search retains the existing prohibition on immediately re-hitting the last face, so pathological same-face repeated encounters are not a supported ghost model. Such geometry needs a general closed-solid intersection representation before broader non-sequential claims.

Continue primary-source verification of the remaining legacy material coefficients before treating those entries as manufacturer-validated. The explicit warning policy prevents that unfinished audit from masquerading as verified catalog data.
