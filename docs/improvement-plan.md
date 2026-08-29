# Improvement plan

This plan separates correctness work from feature expansion. Catalog size should not grow faster than prescription provenance, parser coverage, and optical validation.

## P0 · engineering confidence

1. **Prescription provenance:** add a source URL, retrieval date, content hash, and fidelity level to every model. Official vendor files and spec-derived geometry must remain visibly distinct. The current Edmund seed models omit coatings, tolerances, and any prescription detail absent from public product specifications.
2. **Independent optical validation:** compare representative systems against an independent reference solver for focal location, ray intercepts, chromatic behavior, throughput, and reversal. Current tests strongly protect prototype parity, but parity is not independent validation.
3. **Link and artifact health:** add a maintenance script that checks official product/model URLs and verifies local-model hashes without making application startup depend on vendor availability.

## P1 · usable catalog scale

1. Move the hand-maintained manifest to a versioned JSON schema with a generator and validation report. Add pagination or virtualized rendering before importing hundreds of records.
2. Add IndexedDB persistence for imported lenses and user catalog packs. Today imports survive only when the user explicitly saves and reloads a project.
3. Support catalog-pack import/export and duplicate resolution by vendor, stock number, model hash, and revision.
4. Add browser-level regression coverage for vendor filtering, responsive dock transitions, local import, project persistence, and failed downloads.

## P2 · optical capability

1. Add ZMF catalog ingestion and broaden ZAR/ZOS compatibility without silently approximating unsupported surfaces.
2. Model coatings, absorption, tolerances, coordinate breaks, decenter/tilt, and additional Zemax surface types.
3. Move dense ray tracing to a Web Worker before adding optimization loops, tolerancing, or substantially larger systems.
4. Add reference-sphere wavefront, PSF/MTF, and diffraction analysis only with explicit sampling and validation criteria.

## Deliberate non-goals for the next catalog increment

- Runtime scraping of vendor sites.
- A general-purpose proxy that bypasses browser CORS controls.
- Displaying price or stock data that becomes stale quickly.
- Treating a spec-derived seed model as an official vendor prescription.
