# Independent optical validation

Tracy now has independent numerical evidence for the supported coaxial, isotropic, geometric-optics cases below. These tests use **RayOptics 0.9.8**, **opticalglass 1.1.1**, and closed-form analytical solutions. They do not load the Tracy prototype as their reference. The existing prototype comparison tests remain compatibility checks.

This evidence validates calculations for specified ideal prescriptions. It does not certify manufactured optics, untested materials, arbitrary non-sequential solid geometry, diffraction, coatings, polarized transport, or reference-sphere wavefront accuracy.

## Reference provenance and reproducibility

- [RayOptics source](https://github.com/mjhoptics/ray-optics), BSD-3-Clause, supplies `trace_raw`, conic/even-polynomial intersections, refraction/reflection, and `paraxial_trace`. The [0.9.8 ray trace API](https://ray-optics.readthedocs.io/en/stable/api/rayoptics.raytr.raytrace.html) describes path entries and ray segments.
- [opticalglass source](https://github.com/mjhoptics/opticalglass), BSD-3-Clause, supplies its Schott catalog's N-BK7 and N-F2 dispersion. Its data are independent of Tracy's coefficient table. Agreement at F/d/C validates those selected entries at those wavelengths; it does not certify every built-in material.
- [The generator](../scripts/reference-rayoptics.py) defines prescriptions explicitly, imports no Tracy modules, and writes [frozen fixtures](../tests/fixtures/reference-rayoptics.json). Fixture metadata records package versions, source URLs, conventions and the generator SHA-256 after LF line-ending normalization.
- RayOptics provides geometry and indices; the generator separately evaluates the closed-form scalar Fresnel equations using reference ray normals and indices. Its reported power is **analytical Fresnel on independently traced rays**, not an independently polarized non-sequential solver output.
- [The comparison runner](../scripts/reference-comparison.mjs) runs Tracy against those frozen numbers and writes [the machine-readable comparison report](../tests/fixtures/reference-comparison.json). Normal Node tests need neither Python nor network access.

Run the complete independent check:

```sh
node --test tests/physics-analytic.test.js tests/physics-reference.test.js
node scripts/reference-comparison.mjs
```

On restricted hosts that disallow Node test subprocesses, add `--test-isolation=none` after `--test`. This changes the test process arrangement, not the numerical expectations.

Regenerate reference numbers in an isolated Python 3.11+ environment:

```sh
python -m venv .cache/reference-venv
# Activate the venv with the command appropriate to your shell.
python -m pip install --no-deps -r scripts/reference-requirements.txt
python scripts/reference-rayoptics.py
node scripts/reference-comparison.mjs
```

The minimal [pinned requirements](../scripts/reference-requirements.txt) run the headless reference APIs without RayOptics' optional GUI dependencies. The captured run used Python 3.12, NumPy 2.3.5, SciPy 1.16.2, pandas 3.0.1, and xlrd 2.0.2. Do not update fixture numbers merely because a regression fails; first establish whether the prescription, reference convention, or implementation changed. A reference-package change requires review and regeneration with its version recorded.

## Coordinate and quantity conventions

All lengths are millimetres. Optical propagation is initially along positive global z. Positive curvature means the centre of curvature lies toward positive z. Each surface's `glass` describes the medium after that surface in the positive-z prescription. Air is exactly n = 1. Wavelengths are stored in micrometres and converted to nanometres at the RayOptics boundary.

For reference tracing, every surface is expressed in its local vertex frame. The generator applies only axial translations and converts returned intersections back to global coordinates. Directions are unit vectors. The detector is a terminal dummy plane in the medium that precedes it. A ray outside a circular clear semi-aperture is blocked, with a 1e-7 mm boundary fuzz matching Tracy's aperture convention.

Even-asphere sag is `c r² / (1 + sqrt(1 − (1+K)c²r²)) + Σ a[k] r^(2k)`. RayOptics `coefs[0]` is the r² term; Tracy `parm[1]` is the same term. These fixtures have nonzero r⁴ and r⁶ terms.

**Accumulated OPL** is reconstructed as `Σ n × geometric segment length`, beginning at the stated source plane and ending at the detector or clipped intersection. It is not a wavefront error or an equally-inclined-chord diagnostic. Fresnel's numerical ray-launch offset is excluded from geometry errors by integrating between physical hit points.

For paraxial focal quantities, the reference traces a unit-height zero-angle axial ray. In air, EFL is `−1 / outgoing slope`; focal z is `detector z − detector ray height / outgoing slope`. Tracy independently constructs a reduced-angle ABCD matrix. These quantities characterize the prescription's paraxial power; the detector focus scan optimizes a finite sampled spot and can have a different minimum.

At a lossless uncoated interface, `R = (Rs + Rp)/2` and `T = 1 − R`. The branch's relative power is the product of its T/R factors. Multi-interface products assume unpolarized averaging at each interaction; real polarization evolves after each interface and requires a future polarized model. The normal-incidence ghost identity `T²R²` and OPL `air distance + 3 n thickness` also receive separate analytical tests.

## Case and observable matrix

Each full prescription includes axial, nonzero-height, and off-axis/skew rays at F = 486.1327 nm, d = 587.5618 nm, and C = 656.2725 nm. Finite-point rays instead share an explicit off-axis source point. There are 90 full prescription rays, 3 two-reflection ghost rays, 7 plane-interface/Snell/TIR cases, and 6 material-index references.

| Required case               | Independent reference                                                      | Checked observables                                                                      |
| --------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Plane interface / Snell law | RayOptics `bend` + sine law; plane prescription                            | Direction, index, intercept, OPL, R/T                                                    |
| Critical angle / TIR        | RayOptics `bend` above/below critical angle + analytical critical boundary | TIR state, transmitted direction, R = 1                                                  |
| Plane-parallel plate        | RayOptics exact trace + oblique displacement/OPL formula                   | Every intersection, direction, OPL, primary power                                        |
| Plano-convex singlet        | RayOptics exact and paraxial traces                                        | Intersections, directions, EFL/focal z, OPL, power, chromatic focus shift                |
| Biconvex singlet            | RayOptics exact/paraxial + thick-lens equation                             | Same as singlet, plus lensmaker power                                                    |
| Cemented achromat           | RayOptics exact/paraxial, independent crown/flint catalog                  | Intersections, directions, EFL/focal z, OPL, power, chromatic focus shift                |
| Even asphere                | RayOptics EvenPolynomial + exact polynomial/paraboloid sag derivative      | Intersections, directions, OPL, power, sag/normal convention, paraxial quantities        |
| Explicit aperture           | RayOptics circular aperture + straight-line stop test                      | PASS/clip state, clipped intersection, OPL                                               |
| Finite point                | RayOptics rays from explicit common point + free propagation               | Detector/physical intersections, directions, OPL, power, clipping                        |
| Reversed lens               | Explicit reversed RayOptics prescription + Tracy reversal/lensmaker test   | Intersections, directions, OPL, power, invariant EFL, changed focal z                    |
| Multi-surface Fresnel       | Two separate glass plates; analytic Fresnel product on RayOptics rays      | Every intersection/direction, OPL, four-interface power                                  |
| Representative ghost        | RayOptics prescribed front T → rear R → front R → rear T path              | Detector intercept/direction, branch OPL/power; additional analytical 4-reflection ghost |

All 90 ordinary Fresnel paths also assert no medium-topology errors. Adversarial medium bypass, unequal apertures, reversed boundaries, backwards branches and TIR paths belong to the dedicated topology regression suite. A rejected ambiguous path is not assigned a fabricated quantitative detector result.

## Tolerances and observed comparison

Tolerances were fixed before comparison. They are absolute numerical budgets for double-precision algorithms on millimetre-scale prescriptions, not physical uncertainties. The intercept/OPL budgets allow independent iterative asphere convergence and accumulated segment arithmetic. Direction and power budgets cover propagated normal/refraction roundoff. Paraxial focal budgets include matrix/slope division. State comparisons require exact agreement. These fixtures avoid singular grazing or zero-power-focus configurations where conditioning needs its own tolerance analysis.

| Quantity                          | Allowed absolute error | Maximum observed error |
| --------------------------------- | ---------------------: | ---------------------: |
| Ray intersection                  |                2e-8 mm |            4.28e-12 mm |
| Direction cosine                  |                  2e-10 |               2.03e-15 |
| Refractive index                  |                  2e-12 |                      0 |
| Accumulated OPL                   |                3e-8 mm |            2.24e-12 mm |
| EFL / focal z                     |                2e-7 mm |            1.43e-14 mm |
| F−C focal-z shift                 |                4e-7 mm |            2.14e-14 mm |
| Relative branch power             |                  2e-10 |               1.12e-16 |
| Vignetting / TIR / topology state |                  exact |                  exact |

Captured result: **1,504 / 1,504 comparison checks PASS**, and all six standalone analytical tests PASS. The report records maxima separately for sequential, Fresnel, and ghost paths. The largest OPL difference is about 2.24e-9 µm; this demonstrates agreement of ideal mathematical calculations, not measured length or material accuracy.

## Validation limits and next extensions

Coverage is deliberately finite. It does not prove global convergence of all asphere intersections, untested conic singularities, arbitrary custom glass fits, shape overlap, sidewalls/bevels, displaced/tilted components, or all possible non-sequential paths. Only N-BK7/N-F2 F/d/C values are cross-checked against the independent glass catalog in this suite. The achromat fixture is a numerical three-surface crown/flint test prescription, not a certified vendor product.

Ghost comparison uses a known physical path to test geometry, indices, OPL and scalar power. The analytic and topology suites test branch selection/budgets separately; no claim of exhaustive stray-light analysis follows. Source distributions, weighted statistics, display-chief invariance and focus scans have separate simulation regression tests. Wavefront/PSF/MTF remain unavailable as trusted quantities until their own reference conventions, sampling, and independent validation are implemented.
