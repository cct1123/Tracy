# Verification

Run `npm run check` for lint, automated tests, the offline catalog audit, the static build, and formatting checks. Default-system parity tests compare the modular engines with the immutable prototype. Separate consistency tests cover intentional departures from that baseline. Neither suite establishes agreement with an independent optical-design solver.

## Commands

```sh
npm run check
```

If the environment blocks child-process spawning and `npm test` reports `spawn EPERM`, run the same checks separately with test isolation disabled:

```sh
npm run lint
node --test --test-isolation=none
npm run catalog:check
npm run build
npm run format:check
```

For the consistency regressions alone, use `node --test --test-isolation=none tests/consistency.test.js`. Online vendor checks are separate: `npm run catalog:check:online` verifies current links and pinned vendor artifacts; `npm run catalog:check:strict` also fails on automation-blocking responses.

## Automated coverage

- Point/collimated source generation and both engines at F, d, and C wavelengths.
- Separate bench instances, Snell refraction/TIR, Fresnel conservation, plane/sphere geometry, aperture edges, glass dispersion, dense sampling, reversal, and primary throughput independence from ghost display.
- ZMX object-plane handling, STOP/ENPD, units/asphere scaling; representative legacy ZAR decoding and corrupt input rejection.
- Vendor catalog schema/provenance, search/filter behavior, URL allow-listing, local and official artifact hashes, structured local ZMX geometry, independent plano-convex focal-length consistency, and static serving.
- Project v1 validation, ID collision prevention, HTML escaping, and restricted static-server routes.
- Ray materials at all toolbar counts, including either side of the former 700-ray blending threshold: stable F/d/C/custom colors, primary opacity, complete dense geometry, and ghost/vignette visibility in both engines (`tests/ray-rendering.test.js`).

The app also runs 17 startup diagnostics in [`src/diagnostics/self-tests.js`](../src/diagnostics/self-tests.js), including real-ray pupil aiming, critical-angle guards, and marginal asphere intersections. The diagnostics do not replace the Node test suite.

## Consistency regressions

[`tests/consistency.test.js`](../tests/consistency.test.js) adds 11 tests for the four reported issues:

| Area               | Regression scenarios                                                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stop blocking      | Imported STOPs, bench apertures, and raw STOP surfaces agree on edge/interior/outside rays in both engines; ordinary finite optics remain bypassable in Fresnel tracing.                                                                        |
| Pupil sizing       | The 10 mm ENPD and PUPD examples retain their sampling diameter through import, placement, and project serialization; legacy bench metadata, internal stops, no-STOP fallback, upstream optics, reversal, and bench-stop overrides are covered. |
| Surface validation | Unsupported types fail before library mutation; supported type names normalize and pass project validation; unsupported ZAR designs leave embedded glass definitions unregistered.                                                              |
| Fresnel budgets    | Systems with 96, 97, and 161 surfaces deliver the expected primary power with ghosts both enabled and disabled; ghost steps remain bounded.                                                                                                     |

## Browser checklist

Use a current browser with WebGL. Run both development and built previews when changing module imports or packaging.

1. Confirm the default bench renders, analysis shows 50 traced rays (49 samples plus the chief ray at the d wavelength), and all startup diagnostics pass.
2. Switch Sequential/Fresnel engines; change ray count and source type; verify analysis updates. Compare wavelength colors at 49, 601, 1,201, and 5,001 rays in both themes; dense bundles should narrow lines without whitening or changing hue.
3. Exercise camera presets, theme switching, component selection/editing/reversal, undo and redo.
4. Import `examples/plano-convex.zmx`; confirm it enters the library without replacing the bench. Remove the default lens assembly and place the imported example on its own, keeping the detector. With no added bench stop, confirm a 10.00 mm entrance pupil rather than the 25.4 mm physical clear aperture.
5. Try a copy of a ZMX containing an unsupported type such as `TOROIDAL`; confirm an import error and no added library entry.
6. Save and reload a project; confirm component geometry, pupil metadata, source controls, custom glass definitions, imported library items, and view are restored.
7. Collapse/reopen docks and analysis; confirm the viewport resizes and controls remain usable.
8. Inspect browser errors and verify the built app loads its local `vendor/three` modules.

## User-guide browser walkthrough

On 2026-09-05, the development WebUI at `http://localhost:5173` was opened in the Codex in-app browser for the [illustrated user guide](user-guide.md). Sixteen screenshots of the actual interface were captured in `docs/images/user-guide/`; that original set is archived at Git commit `4aa1c6e`. They show the default bench, source modes, wavelengths, tracing/analysis, component and detector properties, an aperture, catalog search/import, camera presets, display controls, themes, and collapsed panels.

The walkthrough confirmed:

- Default collimated d-line Fresnel tracing at 49 samples plus the chief ray: 50 traced rays, 0.490 mm RMS, 83.3% throughput, and zero vignetted rays.
- Point-source controls and live result changes; restoring Collimated; enabling F+d+C; switching to Sequential with 150 traced rays and 0.527 mm RMS on the starting bench.
- Selecting the default assembly and detector from Bench objects; changing detector z to a snapped 32.80 mm, observing 1.152 mm RMS in that three-wavelength Sequential setup, and undoing back to 31.77 mm / 0.527 mm RMS.
- Dragging a built-in plano-convex lens onto the bench, inspecting its full geometry fields, reversing it, and undoing both reversal and placement. Adding a 10 mm aperture produced the visible bench-stop state and was also undone.
- Layout, 3D, Front, and Fit actions; opening View; day/night switching; collapsing and reopening both side panels and Analysis.
- Searching `49-849`, filtering to Edmund Optics, and using **Use ZMX**. The card changed to **In library** and an Imported card appeared without changing the bench.
- Importing `examples/plano-convex.zmx` through the browser file chooser and finding **Example plano-convex singlet** in the library.
- **Save Project** displayed **Project saved · 2 components**. The browser automation did not expose the download, so the downloaded JSON and a save/download/reload round trip were **not verified**. The success toast alone is not evidence of a completed file round trip.

The browser's captured warning/error log was empty after those interactions. No external vendor downloads, new online catalog audit, or production-preview run was performed for this documentation pass. Instructions for unexercised settings and project loading were checked against the local implementation; the previously recorded automated-test results below are not a new test run.

### Screenshot crop pass

On 2026-09-06, the guide's function illustrations were replaced by 22 focused PNG crops of the original JPEG captures. The overview was left uncropped, and the originals were retained at that point. Each crop was visually reviewed, checked against its source bounds, and compared pixel-for-pixel with the decoded source region. Image references and local documentation links were checked, along with formatting. This pass changed documentation assets only; it did not repeat the optical tests or browser save/load workflow.

### Tracy naming update

On 2026-09-06, the interface, documentation, diagnostic labels, reference filename, and new project exports were updated to Tracy. New saves use `tracy-workbench`, version 1, with a `.tracy.json` filename. An explicit legacy marker remains in the loader so earlier v1 files still open. Theme startup copies an earlier saved preference to the Tracy storage key.

All 48 Node tests passed with `--test-isolation=none`, including the earlier-file compatibility check and Tracy export metadata/filename assertions. The numerical prototype-parity tests passed after the reference naming changes. The browser displayed Tracy in both brand locations and project tooltips, and the example ZMX import succeeded without captured warnings or errors.

The overview and import capture were refreshed from the browser. The README showcase uses the latest user-supplied Tracy screenshot, copied byte-for-byte at its original resolution. Superseded full screenshots are kept in Git history at `4aa1c6e`; only current full captures and focused function details remain in the documentation tree. All 22 crops were compared pixel-for-pixel against the current or archived source recorded in `crops.json`.

Lint, formatting, the offline catalog audit, and the static build passed. Four theme checks covered preference migration, precedence of the current key, read-only storage, and unavailable storage. All 95 local documentation links and 25 current image files were checked. A final browser check confirmed both brand labels, the page title, and project tooltips use Tracy, with no earlier branding in visible page text.

## Latest verification

After the optical consistency and ray-color fixes, all 47 Node tests passed, including 11 optical consistency tests and 3 rendering regressions. Lint, formatting, the offline catalog audit, and the static build passed. Tests ran with `node --test --test-isolation=none` because the sandbox blocked test-process spawning. Development and production browser previews both passed all 17 startup diagnostics without console warnings or errors. Visual checks covered sparse and dense bundles, F/d/C wavelengths, both tracing engines, and day/night themes.

The earlier optical consistency check loaded the example project in the browser and confirmed a 10.00 mm pupil and 50 unvignetted sequential rays. A full browser save/download/reupload round trip remains untested.

## Earlier validation

Baseline validation on 2026-08-29: 33 Node tests passed; lint, offline catalog audit, and static build passed; a stale-file probe confirmed that rebuilding removes previous `dist/` contents. The online audit downloaded and matched all six pinned Thorlabs ZMX/ZAR artifacts. Thorlabs pages responded successfully; Edmund public pages returned HTTP 403 to the automated client and were correctly classified as automation warnings rather than false broken-link failures. This online audit was not repeated during the consistency fixes.

Earlier browser smoke checks covered catalog rendering, fidelity labels, vendor filtering, search, one-click local ZMX import, responsive transitions between 507 px and 1280 px layouts, and absence of console errors. Workbench checks covered development and production startup, Sequential/Fresnel selection, 49/97-ray settings, point/collimated source switching, undo/redo, Layout/3D/Front/Fit, day/night themes, and manual ZMX library import/search. Project state/control/view/catalog round trips are covered by a Node UI-adapter harness.

## Outstanding validation

No external optical-design reference solver comparison, exhaustive archive corpus, performance benchmark, or cross-browser certification has been completed. The new focal-length checks independently protect the simplest local prescriptions, but they do not validate the full ray tracer or official vendor models. Tests protect the migration and selected mathematical invariants, not every optical or UI edge case.
