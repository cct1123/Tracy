import {
  CATALOG_LAST_VERIFIED,
  CATALOG_SOURCES,
  VENDOR_LENS_CATALOG,
  filterCatalog,
  isAllowedCatalogUrl,
} from '../catalog/vendor-catalog.js';
import { escapeHTML } from './dom.js';

const MAX_LOCAL_MODEL_BYTES = 2 * 1024 * 1024;

export function installCatalog({ state: model, ui }) {
  function safeHref(url, options) {
    return isAllowedCatalogUrl(url, options) ? escapeHTML(url) : '';
  }

  function sourceActions(source) {
    const links = [];
    if (source.catalogUrl)
      links.push(
        `<a href="${safeHref(source.catalogUrl)}" target="_blank" rel="noopener noreferrer">Catalog ↗</a>`,
      );
    if (source.catalogDownloadUrl)
      links.push(
        `<a href="${safeHref(source.catalogDownloadUrl)}" target="_blank" rel="noopener noreferrer" title="Official Zemax catalog archive; Tracy currently imports individual ZMX/ZAR files">ZMF ZIP ↗</a>`,
      );
    if (!links.length)
      links.push(
        `<a href="${safeHref(source.homeUrl)}" target="_blank" rel="noopener noreferrer">Site ↗</a>`,
      );
    return links.join('');
  }

  function modelAction(entry, prescription) {
    const format = escapeHTML(prescription.format);
    if (prescription.delivery === 'local') {
      const present = model.componentLibrary.some(
        (template) => template.importMeta?.catalogId === entry.id,
      );
      return `<button type="button" data-catalog-import="${escapeHTML(entry.id)}" data-format="${format}" ${present ? 'disabled' : ''}>${present ? 'In library' : `Use ${format}`}</button>`;
    }
    const href = safeHref(prescription.url, { local: false });
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="Download the official ${format} file, then drop it into Tracy">${format} ↓</a>`;
  }

  function catalogCard(entry) {
    const productHref = safeHref(entry.productUrl, { local: false }),
      fidelity = entry.models.every((model) => model.fidelity === 'official')
        ? 'Official vendor files'
        : 'Spec-derived local model';
    return `<article class="catalog-card" data-catalog-id="${escapeHTML(entry.id)}">
      <div class="catalog-card-head"><span class="catalog-vendor">${escapeHTML(entry.vendor)}</span><span class="catalog-sku">${escapeHTML(entry.sku)}</span></div>
      <div class="catalog-card-body"><span class="catalog-icon">${escapeHTML(entry.icon)}</span><div><div class="catalog-name">${escapeHTML(entry.name)}</div><div class="catalog-meta">${escapeHTML(entry.meta)}</div><div class="catalog-fidelity">${escapeHTML(fidelity)}</div></div></div>
      <div class="catalog-actions"><a href="${productHref}" target="_blank" rel="noopener noreferrer">Product ↗</a>${entry.models.map((prescription) => modelAction(entry, prescription)).join('')}</div>
    </article>`;
  }

  function renderCatalogLibrary(query = '') {
    const vendorId =
      document.getElementById('catalogVendorFilter')?.value || 'all';
    const matches = filterCatalog(VENDOR_LENS_CATALOG, query, vendorId);
    if (!matches.length) return '';
    let html = `<div class="lib-group catalog-library"><div class="catalog-intro"><b>Vendor catalog</b><span>${matches.length} seed models · verified ${escapeHTML(CATALOG_LAST_VERIFIED)}</span></div><div class="catalog-note">Spec-derived local models import in one click. Official vendor files download directly; drop the resulting ZMX/ZAR here to add them.</div></div>`;
    for (const source of CATALOG_SOURCES) {
      const entries = matches.filter((entry) => entry.vendorId === source.id);
      if (!entries.length) continue;
      html += `<div class="lib-group catalog-group"><div class="catalog-group-head"><div><span>${escapeHTML(source.name)}</span><small>${escapeHTML(source.note)}</small></div><div class="catalog-source-actions">${sourceActions(source)}</div></div><div class="catalog-grid">${entries.map(catalogCard).join('')}</div></div>`;
    }
    return html;
  }

  function buildCatalogControls(container, before) {
    const controls = document.createElement('div');
    controls.id = 'catalogControls';
    controls.innerHTML = `<label for="catalogVendorFilter">Vendor</label><select id="catalogVendorFilter"><option value="all">All vendors</option>${CATALOG_SOURCES.map((source) => `<option value="${escapeHTML(source.id)}">${escapeHTML(source.name)}</option>`).join('')}</select>`;
    container.insertBefore(controls, before);
    controls
      .querySelector('select')
      .addEventListener('change', () =>
        ui.renderLibrary(document.getElementById('libSearch')?.value || ''),
      );
  }

  async function importLocalModel(entryId, format) {
    const entry = VENDOR_LENS_CATALOG.find(
        (candidate) => candidate.id === entryId,
      ),
      prescription = entry?.models.find(
        (candidate) =>
          candidate.delivery === 'local' && candidate.format === format,
      );
    if (!entry || !prescription)
      throw new Error('Catalog prescription is unavailable.');
    if (!isAllowedCatalogUrl(prescription.url))
      throw new Error('Catalog prescription URL is not allowed.');
    const existing = model.componentLibrary.find(
      (template) => template.importMeta?.catalogId === entry.id,
    );
    if (existing) {
      ui.benchToast?.(`${entry.sku} is already in the library`);
      return existing;
    }
    const response = await fetch(prescription.url, {
      credentials: 'same-origin',
      cache: 'no-cache',
    });
    if (!response.ok)
      throw new Error(`Catalog model request failed (${response.status}).`);
    const declaredSize = Number(response.headers.get('content-length'));
    if (declaredSize > MAX_LOCAL_MODEL_BYTES)
      throw new Error('Catalog model exceeds the 2 MB import limit.');
    const text = await response.text();
    if (text.length > MAX_LOCAL_MODEL_BYTES)
      throw new Error('Catalog model exceeds the 2 MB import limit.');
    if (!/^VERS\s|^NAME\s|^SURF\s/m.test(text))
      throw new Error('Catalog model is not a text ZMX prescription.');
    return ui.loadZMX(text, `${entry.vendor} ${entry.sku}.zmx`, {
      catalogId: entry.id,
      vendor: entry.vendor,
      sku: entry.sku,
      productUrl: entry.productUrl,
      catalogFidelity: prescription.fidelity,
      catalogSourceUrl: prescription.sourceUrl,
      catalogSha256: prescription.sha256,
      retrievedOn: prescription.retrievedOn,
      verifiedOn: CATALOG_LAST_VERIFIED,
    });
  }

  async function handleCatalogClick(event) {
    const button = event.target.closest?.('[data-catalog-import]');
    if (!button || button.disabled) return;
    button.disabled = true;
    button.textContent = 'Loading…';
    try {
      const added = await importLocalModel(
        button.dataset.catalogImport,
        button.dataset.format,
      );
      if (!added) {
        button.disabled = false;
        button.textContent = `Use ${button.dataset.format}`;
      }
    } catch (error) {
      console.error(error);
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Catalog import error:<br>${escapeHTML(error.message || error)}</div>`;
      ui.benchToast?.('Catalog import failed');
      button.disabled = false;
      button.textContent = `Use ${button.dataset.format}`;
    }
  }

  Object.assign(ui, {
    buildCatalogControls,
    renderCatalogLibrary,
    importLocalModel,
  });
  return function bindEvents() {
    document
      .getElementById('componentLibrary')
      .addEventListener('click', handleCatalogClick);
  };
}
