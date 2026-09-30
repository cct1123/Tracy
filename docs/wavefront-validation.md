# Independent wavefront validation

The primary pupil map reports monochromatic geometric wavefront error on a reference sphere at the current detector position. The sphere is centered at the chief ray's detector intercept and passes through that ray at the paraxial exit-pupil plane. Moving the detector changes this reference and retains defocus. Mean piston is removed; optional tilt removal fits a constant and two linear terms in the normalized sampling coordinates. No best-focus or defocus fit is applied implicitly.

The sign is **chief optical phase minus sample optical phase** at the sphere. For a collimated source, the launch-plane phase correction is `D · (O − O_chief)` in incident air; origins on an equal-z plane are not generally equiphase at nonzero field. Rays from a common point start at equal phase. Phase includes refractive index times geometric path length through the prescription, followed by signed extrapolation in the homogeneous output medium to the sphere. This is a different observable from source-to-detector Relative OPL.

Referencing optical path to an exit-pupil sphere, rather than directly to the image plane, follows the [OpticStudio reference-OPD description](https://ansyshelp.ansys.com/public/Views/Secured/Zemax/v252/en/OpticStudio_User_Guide/OpticStudio_Help/topics/Exit_Pupil.html). The precise sphere location is part of the definition: Tracy uses the **paraxial exit-pupil plane** even off axis. RayOptics also offers a real chief-ray axis-crossing pupil convention; that different option is not used in these fixtures. The [RayOptics wavefront API](https://ray-optics.readthedocs.io/en/stable/api/rayoptics.raytr.waveabr.html) exposes the reference sphere and chief package separately.

## Independent method and coverage

[reference-wavefront.py](../scripts/reference-wavefront.py) imports no Tracy code. It uses RayOptics 0.9.8 `trace_raw` for exact refraction and geometric paths, `paraxial_trace` to image the stop, and `Conic.intersect` to intersect the output rays with the reference sphere. It asserts the sphere equation at every reference intersection to within `1e-10 mm`. The [RayOptics profile source](https://github.com/mjhoptics/ray-optics/blob/v0.9.8/src/rayoptics/elem/profiles.py) implements the independent conic intersection. SCHOTT dispersion comes from opticalglass 1.1.1. NumPy performs an independent least-squares piston/tilt fit.

The [frozen fixtures](../tests/fixtures/reference-wavefront.json) cover 22 cases and 902 sample rays:

- A biconvex N-BK7 singlet with an explicit stop, at F/d/C wavelengths, on axis and at `(1.5°, 2°)` field, with detectors at 53, 58 and 63 mm.
- Finite point sources on and off axis, with a detector at 105 mm.
- An off-axis collimated launch plane shifted from −40 to −80 mm, preserving phase differences.
- A strong singlet whose exit pupil is at 43.257689 mm, beyond its 20 mm detector, exercising the positive extrapolation root as well as the usual negative root.

Each case uses 41 equal-area source-disc samples and a separate zero-weight central reference. The comparison runs both sequential and Fresnel primary tracing, checking the exit-pupil location, raw phase error, piston-only residuals, piston/tilt residuals, RMS/PV and conversion to waves. The defocus and launch-invariance assertions also inspect the independent numbers directly.

The accepted tolerances are `0.001 nm` for phase/metric comparisons and `1e-9 mm` for exit-pupil position. These cover double-precision numerical arithmetic, not manufacturing or measurement uncertainty. [The recorded comparison](../outputs/wavefront-comparison.json) passes **7,678 / 7,678 checks**. Maximum observed differences are approximately `1.02e-7 nm` raw WFE, `7.24e-9 nm` RMS and `9.45e-8 nm` PV.

## Native Hopkins diagnostic

The generator also calls RayOptics' unmodified `wave_abr_full_calc` with the same chief, explicit pupil point, sphere center/radius, internal path, indices and wavelength. Its values are retained as `nativeHopkinsWfeNm` rather than silently substituted for the geometric result. On these cases the maximum difference from the independently intersected sphere is **35.7431 nm**. This is an unresolved formula/convention difference; it is not evidence of agreement with that native OPD API and is not asserted to be a RayOptics defect.

The accepted reference is the explicitly defined geometric sphere intersection, whose intersections satisfy the sphere equation and which agrees with Tracy's independently implemented distance correction. Tracy's analytical tests separately cover perfect spherical convergence, defocus response, plane-wave launch phase and singular-reference rejection. Do not loosen tolerances or regenerate expected values just to hide a future failure. Resolving the native Hopkins diagnostic would require a separate investigation of its equally-inclined-chord conventions and finite-pupil formula; the [upstream implementation](https://github.com/mjhoptics/ray-optics/blob/v0.9.8/src/rayoptics/raytr/waveabr.py) is the reference for that work.

## Reproduction and limits

Normal comparison requires only the repository's Node environment and no network:

```sh
node --test tests/wavefront.test.js tests/wavefront-reference.test.js
node scripts/wavefront-comparison.mjs
```

To regenerate independently, use Python 3.12 and the [pinned reference requirements](../scripts/reference-requirements.txt) in an isolated environment. The captured run used NumPy 2.3.5, SciPy 1.16.2, RayOptics 0.9.8 and opticalglass 1.1.1. Fixture metadata records versions and LF-normalized SHA-256 hashes of both generator scripts.

```sh
python -m venv .cache/wavefront-reference-venv
# Activate the environment using the command appropriate to your shell.
python -m pip install --no-deps -r scripts/reference-requirements.txt
python -B scripts/reference-wavefront.py
npx prettier --write tests/fixtures/reference-wavefront.json
node scripts/wavefront-comparison.mjs
```

The captured Windows run reused the bundled Python 3.12 runtime with `PYTHONPATH=C:\projects\Tracy\.cache\reference-python`, the existing pinned reference packages, and `PYTHONDONTWRITEBYTECODE=1`. No package updates were needed.

Results describe the surviving sample population. Equal sample weighting excludes Fresnel power, Gaussian weights and spectral weights, and is not automatically uniform area at the exit pupil. Angular point-source sampling, fans/rings, vignetting and a finite sample count change that interpretation; sampled PV is not a continuous-pupil extremum. A stop fallback, if used, is reported explicitly. An infinite exit pupil, a singular sphere at the detector, a blocked chief or a ray that misses the sphere yields unavailable WFE, not a fabricated value. Virtual finite pupils are supported by signed extrapolation in a single homogeneous output medium.

This evidence covers the stated coaxial isotropic geometric prescriptions and pupil convention. It does not establish arbitrary tilted/decentered or nonsequential geometry, diffractive/coating phase, polarization, measured wavefronts, pupil convergence, PSF/MTF, Strehl ratio, or equivalence with all commercial software conventions.
