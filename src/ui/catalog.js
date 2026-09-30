import {
  ONLINE_CATALOG_SOURCES,
  catalogSearchUrl,
  vendorImportAttribution,
  validateVendorModelFile,
} from '../catalog/online-catalog.js';
import { escapeHTML } from './dom.js';

export function installCatalog({ ui }) {
  function buildCatalogControls(container, before) {
    const controls = document.createElement('section');
    controls.id = 'catalogControls';
    controls.setAttribute('aria-label', 'Online vendor catalogs');
    controls.innerHTML = `
      <h3>Search online catalogs</h3>
      <form id="onlineCatalogForm" method="get" target="_blank" rel="noopener noreferrer">
        <label for="onlineCatalogVendor">Supplier</label>
        <select id="onlineCatalogVendor">${ONLINE_CATALOG_SOURCES.map((source) => `<option value="${source.id}">${escapeHTML(source.name)}</option>`).join('')}</select>
        <label for="onlineCatalogQuery">Product, stock number or specification</label>
        <input id="onlineCatalogQuery" type="search" maxlength="300" required placeholder="e.g. aspheric lens 25 mm" autocomplete="off">
        <button type="submit">Search supplier ↗</button>
      </form>
      <p class="mini-note">Opens live results on the selected supplier’s website in a new tab. Download its ZMX/ZAR prescription, then import it below. No design data is sent.</p>
      <details id="catalogImportDetails">
        <summary>Import a downloaded vendor model</summary>
        <form id="catalogImportForm">
          <label for="catalogProductUrl">Official product URL</label>
          <input id="catalogProductUrl" type="url" required placeholder="https://www.thorlabs.com/…">
          <label for="catalogStockNumber">Stock number (optional)</label>
          <input id="catalogStockNumber" type="text" maxlength="128" placeholder="e.g. AC254-075-A">
          <label for="catalogModelFile">Downloaded ZMX/ZAR (up to 20 MB)</label>
          <input id="catalogModelFile" type="file" accept=".zmx,.zar" required>
          <button type="submit">Import into local library</button>
        </form>
        <p class="mini-note">The product link is your attribution, not verification of the file. Check geometry, glass and import warnings before tracing. ZMF catalogs must first be exported as individual ZMX/ZAR files.</p>
        <p id="catalogImportStatus" class="mini-note" role="status" aria-live="polite"></p>
      </details>`;
    container.insertBefore(
      controls,
      document.getElementById('libSearch') || before,
    );
  }

  Object.assign(ui, { buildCatalogControls });
  return function bindEvents() {
    const searchForm = document.getElementById('onlineCatalogForm');
    const query = document.getElementById('onlineCatalogQuery');
    const vendor = document.getElementById('onlineCatalogVendor');
    function updateSearchTarget() {
      const source = ONLINE_CATALOG_SOURCES.find(
        (item) => item.id === vendor.value,
      );
      searchForm.action = source.searchUrl;
      query.name = source.queryParameter;
      searchForm.querySelector('button').textContent =
        `Search ${source.name} ↗`;
    }
    updateSearchTarget();
    vendor.addEventListener('change', updateSearchTarget);
    query.addEventListener('input', () => query.setCustomValidity(''));
    searchForm.addEventListener('submit', (event) => {
      try {
        // Use the same validation and escaping contract as tests. The browser's
        // native GET form handles opening results without a popup dependency.
        catalogSearchUrl(vendor.value, query.value);
        query.value = query.value.trim();
      } catch (error) {
        event.preventDefault();
        query.setCustomValidity(error.message);
        query.reportValidity();
      }
    });
    document
      .getElementById('catalogImportForm')
      .addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button');
        const status = document.getElementById('catalogImportStatus');
        button.disabled = true;
        status.textContent = 'Validating model…';
        try {
          const attribution = vendorImportAttribution(
            document.getElementById('catalogProductUrl').value,
            document.getElementById('catalogStockNumber').value,
          );
          const file = document.getElementById('catalogModelFile').files[0];
          validateVendorModelFile(file);
          const digest = await globalThis.crypto.subtle.digest(
            'SHA-256',
            await file.arrayBuffer(),
          );
          const sha256 = [...new Uint8Array(digest)]
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
          const added = await ui.loadLensFile(file, {
            ...attribution,
            importedOn: new Date().toISOString(),
            downloadedFile: file.name,
            downloadedFileSha256: sha256,
            downloadedFileBytes: file.size,
          });
          if (!added)
            throw new Error(
              'Import failed. See the prescription warning below.',
            );
          status.textContent = `${added.name} added locally. Product attribution is user-provided; inspect import warnings.`;
        } catch (error) {
          status.textContent = error.message || String(error);
        } finally {
          button.disabled = false;
        }
      });
  };
}
