# Tracy user guide

Tracy is a coaxial geometric-optics workbench. Open the hosted application, or follow the local contributor instructions in the [README](../README.md). A WebGL browser is required. Calculations, imported prescriptions and local projects stay in the browser.

![Engineering workbench on desktop](../outputs/screenshots/after-desktop.png)

## Find your way around

The toolbar groups **Project**, **Source**, **Trace**, **Analysis** and **View** into menus. **Bench** and **Catalog** are separate tabs at left; Properties are at right. The center shows the scene, axial ruler and Analysis. On a small screen, use the two toolbar dock buttons to open/close the left and right panels. Controls wrap or open menus instead of disappearing beyond a horizontal toolbar.

![Narrow-screen workbench](../outputs/screenshots/after-mobile.png)

## Place and edit components

Choose Catalog, enter **Insert at z (mm)** and click a component. Keyboard users can focus its button and press Enter/Space. Dragging a card onto the bench still works. Tracy moves colliding components to a valid axial placement and keeps its single detector after the optics. The chosen insertion z and resulting position are visible.

Choose an object in Bench or the scene. Properties edit its name, axial position, material and supported prescription values. Singlets have two radii/thickness; achromats have three radii/two thicknesses. A radius of zero represents a plane. Reverse flips an assembly about its axial extent; it does not implement decenter or tilt. Undo/redo applies to bench edits and restored settings.

Imported assemblies keep each surface's original clear aperture. **Override all clear apertures** explicitly modifies every imported aperture and marks the prescription modified. **Reset to Imported Prescription** restores the imported values. It preserves the assembly's bench placement. For old v1 projects, the saved prescription is the only recoverable original; pre-save historical changes cannot be reconstructed.

## Define the light and spectrum

Use Source → Source & sampling for collimated/point settings and diagnostic pattern. Source menu controls define the radiometric interpretation:

- **Collimated / pupil-targeted bundle:** ray targets follow the system's entrance pupil. Statistics describe this sampled bundle; total source collection is not defined.
- **Collimated / fixed source disk:** a disk diameter and axial plane define illumination independently of lens/stop diameter. Shrinking a stop reduces reported collection of this defined source.
- **Point / uniform solid angle:** equal source power per solid angle within the configured air-NA cone. The cone contains the modeled total source power; this is not an estimate of full-sphere emission.
- **Point / uniform polar angle:** uniform polar-angle/azimuth coordinates within that cone, a different emission distribution.
- **Point / uniform target pupil:** directions target a disk centered on the optical axis at the chosen plane. Equal power is assigned per pupil area; cone NA and aim angles do not determine these directions.

Optional Gaussian weighting is normalized over the configured finite population; zero selects uniform weights. The headless API also accepts explicit nonnegative sample weights. The 3D pupil uses deterministic disc-area quadrature; meridional/sagittal fans and rings are diagnostic populations and never claim area-integrated collection.

Source → Wavelengths lets you enable F/d/C/custom wavelengths and edit each source weight. Default F/d/C source weights are equal. The Analysis table shows normalized active weights, wavelength RMS and sampled power. All-zero active weights block the result. Display color does not measure radiometric power.

## Trace and interpret results

Trace selects Sequential geometric or **Uncoated Fresnel + Ghosts (Coaxial)**. Analysis samples per wavelength affect calculation density; visible samples affect only the scene. Chief/reference rays always have zero statistical weight. The display toggle cannot change the physical result.

Strict engineering material mode blocks unresolved glasses and dispersion outside documented ranges. Exploratory mode allows a labeled n=1.52 fallback or out-of-range extrapolation where a finite model exists. Persistent warnings identify approximations, unverified provenance and unknown ranges. Scalar anisotropic crystal models do not propagate birefringence. A warning is not a verified optical material claim.

Analysis reports:

| Result                         | Meaning                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| RMS spot radius                | Weighted detector radius about its centroid, in mm or µm. Only positive-power physical samples contribute.                                          |
| Bundle survival                | Sum of normalized emitted sample/spectral weights whose primary rays reach the detector.                                                            |
| Primary sampled power          | Sum of surviving sample × spectrum × Fresnel power; sequential mode models no Fresnel losses.                                                       |
| Fresnel factor among survivors | Sampled power divided by survival, conditional on those rays reaching the detector.                                                                 |
| Collection of defined source   | Primary power normalized to the independent source disk/cone/target-pupil population. “Not defined” for targeted collimated bundles and fans/rings. |
| Relative OPL                   | Accumulated optical path minus the same-wavelength central reference path, displayed in µm. Not reference-sphere wavefront error.                   |

Undefined primary finite-lens edge paths block quantitative aggregation. Ghost edge paths can be incomplete while primary metrics remain valid; their warning says so. Ghost branches are bounded display diagnostics, excluded from primary spot/transmission. There is no trusted total ghost-inclusive collection, polarization history, coating, absorption, diffraction, PSF or MTF result.

The exact equations and validity limits are in [physics definitions](physics-definitions.md), and are summarized beside the analysis. Recalculation marks previous values stale until the newest Worker result finishes.

## Focus, scales and comparisons

Open Analysis → Focus Scan. Choose an interval after the last optical face and 3–201 steps. The worker evaluates weighted RMS at each detector z and shows a numeric-axis curve, tested minimum, step size, source/spectral settings and survival table. A boundary minimum means the best point may lie outside the interval. This is a grid search, not a fitted continuous optimum.

Inspect survival/power: a smaller RMS caused by clipping away marginal rays is not necessarily a better focus. **Move detector to tested minimum** or enter a selected z. The bench requires the detector to remain at least 5 mm after the final optic.

Plot scales offer **Auto Scale**, **Lock Scale** and **Shared A/B Scale**. Locked half-spans have explicit mm/µm units. Spots use detector-axis coordinates rather than independently recentering away centroid shifts. Previous-result overlay shows the prior completed result in gray. Capture A, change the system, then Capture B; the comparison table includes geometry, detector position, RMS, survival, power and wavelength results. Restore A/B restores each captured project. A/B snapshots are session-local; export separate project JSON files to retain them permanently.

## Imports and local projects

Project → Import Lens accepts supported text ZMX and ZAR members with supported embedded AGF data. Unsupported surface types fail explicitly. Import adds a reusable library component; click or drag it onto the bench. Pupil metadata stays with the imported assembly. Official vendor links are user-triggered downloads; bundled catalog models are labeled spec-derived where applicable.

IndexedDB autosaves the current working project. The status distinguishes unsaved, saving, saved and failed states. Reload recovers the saved working state; dirty work not yet written can be lost on an immediate crash. Named local projects can be saved and opened through Project. Opening another project preserves the outgoing draft. JSON export/import provides a portable backup and v1 files migrate to v2. Browser storage can be cleared or evicted: it is not a substitute for exported files. See [local project details](local-projects-and-workflows.md).

## Keyboard and troubleshooting

Tab/Enter/Space operate component buttons and menus. `1` Layout, `2` 3D, `3` Front, `F` Fit, `T` theme, `R` reverse selection, arrows move the selected optic, Delete removes it; Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S export, Ctrl/Cmd+O import. Text inputs keep their normal keyboard behavior.

If tracing is blocked, read the local material/topology message and correct the prescription or source rather than interpreting stale values. If autosave fails, export JSON before leaving. If WebGL is unavailable, enable it or use a supported browser. Serve the application over HTTP; double-clicking index.html cannot load ES modules/Workers correctly.

The older screenshots under `docs/images/user-guide/` document the prototype-era interface and are retained as historical assets; the current screenshots above reflect this implementation.
