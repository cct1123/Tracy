# Verification

Run `npm run check` for lint, automated tests, the static build, and formatting checks. The numerical regression suite compares the modular engines directly with the immutable prototype; matching a prototype is not independent physical validation.

## Automated coverage

- Point/collimated source generation and both engines at F, d, and C wavelengths.
- Separate bench instances, Snell refraction/TIR, Fresnel conservation, plane/sphere geometry, aperture edges, glass dispersion, dense sampling, reversal, and primary throughput independence from ghost display.
- ZMX object-plane handling, STOP/ENPD, units/asphere scaling; representative legacy ZAR decoding and corrupt input rejection.
- Project v1 validation, ID collision prevention, HTML escaping, and restricted static-server routes.

The prototype also retains its 17 startup diagnostics in `src/diagnostics/self-tests.js`, including real-ray pupil aiming, critical-angle guards, and marginal asphere intersections. The diagnostics do not replace the Node test suite.

## Browser checklist

Use a current browser with WebGL. Run both development and built previews when changing module imports or packaging.

1. Confirm the default bench renders, analysis shows 50 traced rays, and all startup diagnostics pass.
2. Switch Sequential/Fresnel engines; change ray count and source type; verify analysis updates.
3. Exercise camera presets, theme switching, component selection/editing/reversal, undo and redo.
4. Import `examples/plano-convex.zmx`; confirm it enters the library without replacing the bench.
5. Save and reload a project; confirm component geometry, source controls, catalog definitions, and view are restored.
6. Collapse/reopen docks and analysis; confirm the viewport resizes and controls remain usable.
7. Inspect browser errors and verify the built app loads its local `vendor/three` modules.

## Limits of this checkpoint

Initial validation on 2026-08-28: 24 Node tests passed; lint and static build passed; the in-app Chromium browser passed all 17 startup diagnostics. Browser smoke checks covered development and production startup, Sequential/Fresnel selection, 49/97-ray settings, point/collimated source switching, undo/redo, Layout/3D/Front/Fit, day/night themes, and ZMX library import/search. Production startup produced no JavaScript errors. Project state/control/view/catalog round trips were tested with a Node UI-adapter harness rather than an end-to-end browser download/reupload test.

No independent vendor prescription validation, optical-design reference solver comparison, exhaustive archive corpus, performance benchmark, or cross-browser certification has been completed. Tests protect the migration and selected mathematical invariants, not every optical or UI edge case.
