# Tutorial screenshot provenance

These 22 PNGs are real browser screenshots of Tracy, captured on 2026-09-21 in the Codex in-app Chromium browser at `http://127.0.0.1:5195/`. The application source is commit `f5d3abd0f826899b415f9e073abd5c5c349b6d38` on `codex/tracy-engineering-validation`. This documentation update changes no application code.

The browser used its normal 838 × 912 CSS-pixel viewport. Focused images are rectangular crops of the original viewport capture. No controls, results, colors or labels were generated or retouched. Docks were opened/closed and panels scrolled through the ordinary interface. Each numbered function has matching `-day.png` and `-night.png` files; themes were changed through View.

The reference bench is the included 85301 doublet, collimated pupil-targeted illumination, d-line 587.56 nm, 49 analysis samples, Fresnel engine, strict materials and ghost reflections unchecked. The local tutorial browser origin is separate from hosted projects. The hosted Site remains at the earlier application revision `7bfee883020797977a9b17769811977f58a170bb`; these images document the current Git version.

| Prefix          | Capture and reproducible state                                                                                                                                                     | Size per theme |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `01-workbench`  | Default doublet, System / Bench and Analysis visible; Properties hidden; Layout view.                                                                                              | 838 × 912      |
| `02-catalog`    | Catalog tab, insertion coordinate 50 mm; built-in cards before insertion.                                                                                                          | 214 × 790      |
| `03-properties` | Select 85301; apply a 25 mm all-aperture override. Modified-aperture message and enabled reset are visible. Reset before analysis.                                                 | 272 × 449      |
| `04-source`     | Open Source to inspect distribution, illumination, disk and Gaussian controls.                                                                                                     | 337 × 497      |
| `05-spectrum`   | Source → Wavelengths; only d enabled, input weights 1.                                                                                                                             | 309 × 390      |
| `06-trace`      | Open Trace; Fresnel, 49 analysis samples, strict materials, 97 visible samples.                                                                                                    | 337 × 352      |
| `07-analysis`   | Hide side docks; scroll Analysis to its spot, Relative OPL and summary metrics.                                                                                                    | 838 × 435      |
| `08-focus`      | Scan 30–45 mm at 7 positions; crop settings, result and curve. Rerun after a theme change, which invalidates the scan.                                                             | 812 × 337      |
| `09-comparison` | Capture A at the original detector position; move to the tested minimum and capture B. Crop numerical table rows below the long geometry prescription. Columns are quantity, A, B. | 815 × 167      |
| `10-project`    | Project name “Tutorial doublet”; Save named project; the saved entry is selected.                                                                                                  | 337 × 490      |
| `11-import`     | Import `examples/plano-convex.zmx`; search “Example plano-convex”. Capture the reusable Imported card and success message.                                                         | 222 × 656      |

The coarse focus grid reports 495.494 µm at z = 32.500 mm with 2.500 mm spacing. A/B shows A at z = 31.767086267095 mm, RMS 0.153 mm, versus B at 32.5 mm, RMS 0.495 mm; both have 100.00% bundle survival and 81.04% primary sampled power. This is a demonstration of why a tested grid minimum is not a guaranteed improvement. Restore A to recover the baseline.

Screenshots illustrate controls and observed software results, not independent optical validation. See [the tutorial](../../user-guide.md), [quantity definitions](../../physics-definitions.md) and [independent validation](../../external-validation.md). Older images elsewhere in `docs/images/` remain historical references for archived documentation; the active README and tutorial use this set.
