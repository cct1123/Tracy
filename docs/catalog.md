# Vendor lens catalog

The catalog is designed for a static browser application. Tracy does not scrape vendor pages, require a vendor account, or depend on a proxy service at runtime.

## Using the catalog in the WebUI

For a screenshot walkthrough, see [Find or import a lens](user-guide.md#find-or-import-a-lens) in the user guide.

1. Enter a stock number such as `49-849` in **Search lenses & components…**, then choose **Edmund Optics** in **Vendor**.
2. Click **Use ZMX** on the matching **Spec-derived local model**. Wait for **In library** and the import-success message.
3. Find its card under **Imported** and drag it onto the viewport. Importing a model does not replace the active bench.
4. Use **Save Project** to keep both the bench and your imported library items.

For an **Official vendor files** card, use **ZMX ↓** or **ZAR ↓** to obtain the file, then use **Import Lens**. A linked **ZMF ZIP** cannot be imported into Tracy. Clear the search box to show the other components again.

## Data and delivery

`src/catalog/vendor-catalog.js` is the curated manifest. A record contains stable search metadata, its official product page, and one or more prescription deliveries. Every delivery records its source URL, retrieval date, exact byte length, SHA-256 digest, and fidelity. Spec-derived deliveries also carry structured public prescription values. `src/catalog/schema.js` validates those records when the manifest loads. `src/ui/catalog.js` owns rendering, vendor filtering, safe-link handling, and local-model import. The ray tracer only sees a catalog lens after it has passed through the existing ZMX/ZAR importer.

The initial catalog uses two delivery modes:

- **Vendor-hosted:** Thorlabs ZMX and ZAR actions point directly to the files exposed by the official product page. The browser downloads the file; the user can drop it into Tracy. This avoids assuming that a third-party host enables cross-origin `fetch` for every deployment.
- **Spec-derived local:** Edmund Optics publishes a complete Zemax catalog as a ZMF archive rather than individual public ZMX links. Three representative spherical lenses are included as compact text ZMX seed models derived from the public radius, thickness, glass, clear-aperture, and back-focal-length specifications. They are not official Edmund Zemax files and omit data not present in those public specifications. The official full catalog and product pages remain linked.

Catalog metadata and links were checked on 2026-08-29. Prices and stock status are intentionally excluded because they change often. Vendor names and product identifiers belong to their respective owners; inclusion does not imply endorsement.

## Import behavior

Catalog models use the same import path as user-supplied lenses. `STANDARD` and `EVENASPH` are the supported surface types; an unsupported type produces an error before the model enters the library. The final image surface is removed from the reusable assembly, and the bench retains its own detector.

Explicit ENPD/PUPD type 0 metadata remains attached to the imported component and is included in project saves. For a model with a STOP, ray aiming uses the pupil's footprint at that stop, which can be smaller than its physical clear aperture. Added upstream optics or reversal can change the entrance-pupil image. A bench aperture overrides the imported stop for aiming. See [pupils and tracing](architecture.md#pupils-and-tracing).

An official download link or matching artifact hash establishes provenance and integrity; it does not establish compatibility with every Zemax feature. Unsupported ZAR designs are rejected before their embedded AGF definitions are registered.

## Integrity and link health

Run `npm run catalog:check` for the deterministic offline audit. It validates the manifest, recomputes local model byte lengths and SHA-256 digests, compares each local ZMX with its structured prescription, and independently estimates plano-convex d-line focal length from radius and a separate reference refractive index.

Run `npm run catalog:check:online` during catalog maintenance. It also checks official pages and downloads every vendor-hosted model to verify its pinned hash. A missing page, network failure, changed size, or changed digest fails the command. Some vendors block automated requests to otherwise public pages; HTTP 401, 403, and 429 responses are reported as warnings because they do not establish that a link is broken. `npm run catalog:check:strict` promotes those warnings to failures.

## Adding a lens

1. Add a manifest record with a unique namespaced ID, vendor/stock identifiers, searchable metadata, the official product URL, and at least one model whose fidelity is explicitly `official` or `spec-derived`. Record the source URL, retrieval date, byte length, and lowercase SHA-256 digest.
2. Keep a vendor-hosted file on its official HTTPS host. Put a reviewable local text ZMX under `src/catalog/models/` only when its public prescription can be cited and maintained.
3. Add or extend a parser test that checks the key geometry and glass. For a spec-derived model, include its structured specification and an independent consistency check. Run `npm run check`, `npm run catalog:check:online`, and verify the card, filter, link, and import flow in the browser.

Allowed catalog URLs are explicit. Extend the allow-list in `vendor-catalog.js` when adding another official vendor host; do not accept arbitrary URLs from project files or query parameters.

## Current limits

Tracy imports text ZMX and supported legacy ZAR members with `STANDARD` or `EVENASPH` surfaces. It does not parse ZMF catalogs, binary ZOS designs, coating catalogs, coordinate breaks, or other surface types. Vendor prescriptions remain subject to the [engineering limits](technical-reference.md#engineering-limits) and should be checked against the current vendor data before procurement or release. The latest maintenance pass verified the offline catalog; the recorded online vendor-link audit remains dated 2026-08-29.
