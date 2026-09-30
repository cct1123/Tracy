# Online vendor catalogs

Tracy searches the current **Edmund Optics** and **Thorlabs** catalogs using their official search pages. It does not restrict vendor discovery to a bundled selection of lenses. The search accepts a stock number, product name or optical specification, such as `AC254-075-A`, `aspheric lens 25 mm`, or `1550 nm collimating lens`.

## Search and import

1. Open **Catalog**, choose a supplier under **Search online catalogs**, and enter the query.
2. Select **Search supplier ↗**. Live results open on the supplier's website in a new tab. Apply its product filters and inspect the actual product specification and availability there. Tracy does not fetch results while you type or transmit your bench prescription.
3. Download a supported individual **ZMX** or **ZAR** model from the supplier's product/support documents. If only a **ZMF** catalog is offered, export the selected prescription as ZMX/ZAR using compatible optical-design software first. Tracy does not parse ZMF or binary ZOS designs.
4. Expand **Import a downloaded vendor model**. Enter the official product URL and optional stock number, choose the downloaded file, then select **Import into local library**. Files must be non-empty and no larger than 20 MB. Ordinary drag/drop import remains available when no vendor attribution is needed.
5. Inspect geometry, glass resolution, aperture and import warnings. Then click, press Enter on, or drag the imported local component to place it at the insertion coordinate.

The product URL and stock number are **user-provided attribution**, not independent verification that the chosen file belongs to that product. The project retains that distinction, the supplier, import timestamp, downloaded filename, byte count and SHA-256 digest. ZAR imports also retain archive metadata and embedded glass provenance. These records survive JSON export and local recovery. A file hash identifies the imported bytes; it does not certify a vendor prescription or its optical performance.

Generic parametric components and imported prescriptions remain local and searchable with **Filter local components**. They work offline. Supplier search and downloads require a network connection; if the supplier is unavailable, return to the local library and retry its site later. Search results remain on the vendor site, so Tracy does not display fabricated results or treat a blocked request as “no matches.”

## Search integration and evidence

The current public routes were verified on **2026-09-30** by using the suppliers' actual browser pages:

- [Thorlabs search for AC254-075-A](https://www.thorlabs.com/search?q=AC254-075-A) returned an exact-match 75 mm, one-inch achromatic doublet plus related products.
- [Edmund Optics search for aspheric lens 25 mm](https://www.edmundoptics.com/search/?criteria=aspheric+lens+25+mm) returned optical/aspheric categories and product families.
- [Edmund Optics Zemax catalog](https://www.edmundoptics.com/products/services/zemax-catalog/) offers its full prescription archive; individual models may require export or a supplier request.

`src/catalog/online-catalog.js` defines the two official search routes and validates query and attribution inputs. `src/ui/catalog.js` supplies a native GET search form that opens results in a separate tab, and passes downloaded files through the existing import validation. Search URLs encode arbitrary text rather than interpolating it into markup. Product attribution permits only the selected suppliers' HTTPS hosts, with no embedded credentials or nonstandard port. No proxy, API key or backend is required.

No documented public integration API was found during this review. Thorlabs' website currently uses its own search service configuration; Edmund Optics rejected direct automated page fetching with HTTP 403. The application therefore opens their supported public search interfaces instead of scraping pages, copying website API keys or relying on a cross-origin request that cannot be trusted to work. This is vendor-hosted live search, not an in-app product-results API.

## Frozen numerical references

The former six hardcoded vendor cards are removed from the application. Their dated metadata, three spec-derived Edmund ZMX files, manifest validator and independent paraxial checks remain under `tests/fixtures/catalog/` as regression evidence, outside the static production build. These fixtures are not live catalog data, official Edmund Zemax downloads or a list of currently available products.

`npm run catalog:check` audits these frozen references: manifest structure, exact byte count and SHA-256, parsed prescription geometry, and a separate d-line paraxial focal-length estimate. `npm run catalog:check:online` remains an optional maintenance check of the historical reference URLs and hashes; it is not how application search works. Automated supplier blocks are warnings unless `--strict-links` is set. The unit and browser suites cover arbitrary queries, official-host validation, file validation, ZMX/ZAR import, provenance preservation and no startup search traffic.

All imported lenses remain subject to the [engineering limits](technical-reference.md#engineering-limits). Tracy supports the documented spherical/even-asphere subset and cannot infer unsupported surface types, coatings or missing material data from a product name.
