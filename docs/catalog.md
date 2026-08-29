# Vendor lens catalog

The catalog is designed for a static browser application. Tracy does not scrape vendor pages, require a vendor account, or depend on a proxy service at runtime.

## Data and delivery

`src/catalog/vendor-catalog.js` is the curated manifest. A record contains stable search metadata, its official product page, and one or more prescription deliveries. `src/ui/catalog.js` owns rendering, vendor filtering, safe-link handling, and local-model import. The ray tracer only sees a catalog lens after it has passed through the existing ZMX/ZAR importer.

The initial catalog uses two delivery modes:

- **Vendor-hosted:** Thorlabs ZMX and ZAR actions point directly to the files exposed by the official product page. The browser downloads the file; the user can drop it into Tracy. This avoids assuming that a third-party host enables cross-origin `fetch` for every deployment.
- **Local:** Edmund Optics publishes a complete Zemax catalog as a ZMF archive rather than individual public ZMX links. Three representative spherical lenses are included as compact text ZMX files derived from the public radius, thickness, glass, clear-aperture, and back-focal-length specifications. These import with one click. The official full catalog and product pages remain linked.

Catalog metadata and links were checked on 2026-08-29. Prices and stock status are intentionally excluded because they change often. Vendor names and product identifiers belong to their respective owners; inclusion does not imply endorsement.

## Adding a lens

1. Add a manifest record with a unique namespaced ID, vendor/stock identifiers, searchable metadata, the official product URL, and at least one prescription model.
2. Keep a vendor-hosted file on its official HTTPS host. Put a reviewable local text ZMX under `src/catalog/models/` only when its public prescription can be cited and maintained.
3. Add or extend a parser test that checks the key geometry and glass. Run `npm run check` and verify the card, filter, link, and import flow in the browser.

Allowed catalog URLs are explicit. Extend the allow-list in `vendor-catalog.js` when adding another official vendor host; do not accept arbitrary URLs from project files or query parameters.

## Current limits

Tracy imports text ZMX and supported legacy ZAR members. It does not parse ZMF catalogs, binary ZOS designs, coating catalogs, or every Zemax surface type. Vendor prescriptions remain subject to the engineering limits documented in the main README and should be checked against the current vendor data before procurement or release.
