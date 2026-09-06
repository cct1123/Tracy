import { escapeHTML } from './dom.js';
// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { cloneSurface } from '../model/components.js';
import { parseZMX } from '../io/zmx.js';
import { validateImportedSurface } from '../io/surface-schema.js';
import { decodeZemaxText, parseZAR } from '../io/zar.js';
import { registerAGF } from '../core/materials.js';

export function installImports({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function importedLensDisplayName(parsed, filename) {
    const n = String(parsed?.name || '').trim();
    if (n && n.toLowerCase() !== 'untitled') return n;
    return (
      String(filename || 'Imported lens')
        .replace(/^.*[\\/]/, '')
        .replace(/\.(zmx|zar)$/i, '') || 'Imported lens'
    );
  }

  function addParsedLensToLibrary(parsed, filename, extraMeta = {}) {
    if (!parsed?.surfaces || parsed.surfaces.length < 2)
      throw new Error('No valid optical prescription found.');
    for (const s of parsed.surfaces) validateImportedSurface(s);
    // Sequential Zemax files terminate at an image surface. A library lens is the
    // reusable optical assembly only, so the original image plane is not imported.
    const optical = parsed.surfaces.slice(0, -1);
    const z0 = optical[0].z || 0;
    const local = optical.map((q) => ({
      ...cloneSurface(q),
      z: (q.z || 0) - z0,
    }));
    const diameter = 2 * Math.max(...local.map((q) => q.sd || 0), 1);
    const name = importedLensDisplayName(parsed, filename);
    const id = `imported-${model.importedSequence++}`;
    const template = {
      id,
      name,
      icon: '◖⋯◗',
      kind: 'imported',
      meta: `Zemax · ${local.length} surf · Ø${diameter.toFixed(1)}`,
      params: { diameter },
      surfaces: local,
      sourceFile: filename,
      importMeta: {
        objectDistance: parsed.objectDistance,
        pupilType: parsed.pupilType,
        pupilValue: parsed.pupilValue,
        rayAimRaw: parsed.rayAimRaw,
        unitName: parsed.unitName,
        unitScale: parsed.unitScale,
        enpdSource: parsed.enpdSource,
        epd: parsed.epd,
        ...extraMeta,
      },
    };
    model.componentLibrary.push(template);
    const search = document.getElementById('libSearch');
    ui.renderLibrary(search?.value || '');
    document.getElementById('uName').textContent = `added · ${name}`;
    document.getElementById('parseWarn').innerHTML =
      `<div style="font-size:9px;color:var(--d);font-family:'DM Mono',monospace;line-height:1.55;margin-top:6px">✓ ${escapeHTML(name)}<br><span style="color:var(--tlo)">Added to Component Library · drag it onto the bench when needed.</span></div>`;
    if (typeof ui.benchToast === 'function')
      ui.benchToast(`${name} added to library`);
    return template;
  }

  function loadZMX(text, filename, extraMeta = {}) {
    let parsed;
    try {
      parsed = parseZMX(text);
    } catch (e) {
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Parse error: ${escapeHTML(e.message)}</div>`;
      return null;
    }
    try {
      return addParsedLensToLibrary(parsed, filename, extraMeta);
    } catch (e) {
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Import error:<br>${escapeHTML(String(e.message || e))}</div>`;
      return null;
    }
  }

  async function loadLensFile(file) {
    const name = file.name || 'lens';
    const lower = name.toLowerCase();
    document.getElementById('parseWarn').innerHTML = '';
    try {
      if (lower.endsWith('.zmx')) {
        loadZMX(await file.text(), name);
        return;
      }
      if (lower.endsWith('.zar')) {
        const members = parseZAR(await file.arrayBuffer());
        const zmx = members.filter((m) => m.ext === 'zmx' && m.data);
        const zos = members.filter((m) => m.ext === 'zos');
        const agf = members.filter((m) => m.ext === 'agf' && m.data);
        if (!zmx.length) {
          const detail = zos.length
            ? 'This archive contains a binary .ZOS design, but no text .ZMX design. Save/export the design as ZMX before creating the ZAR for browser import.'
            : 'No .ZMX lens design was found inside this ZAR.';
          throw new Error(detail);
        }
        // Prefer a ZMX whose basename matches the archive; otherwise choose the largest ZMX.
        const base = lower.replace(/\.zar$/, '');
        zmx.sort((a, b) => {
          const am =
            a.fileName
              .toLowerCase()
              .replace(/^.*[\\/]/, '')
              .replace(/\.zmx$/, '') === base
              ? 1
              : 0;
          const bm =
            b.fileName
              .toLowerCase()
              .replace(/^.*[\\/]/, '')
              .replace(/\.zmx$/, '') === base
              ? 1
              : 0;
          return bm - am || b.data.length - a.data.length;
        });
        const chosen = zmx[0];
        // Validate before registering embedded glasses or changing the library.
        const parsed = parseZMX(decodeZemaxText(chosen.data));
        let imported = 0;
        for (const g of agf) imported += registerAGF(decodeZemaxText(g.data));
        addParsedLensToLibrary(
          parsed,
          chosen.fileName.replace(/^.*[\\/]/, ''),
          {
            archive: name,
            archiveMembers: members.length,
            embeddedAGF: agf.length,
          },
        );
        const compressed = members.filter((m) => m.compressed).length;
        const note = `ZAR · ${members.length} members · ${zmx.length} ZMX${agf.length ? ` · ${agf.length} AGF (${imported} Sellmeier glasses imported)` : ''}${compressed ? ` · ${compressed} LZW` : ''}`;
        const existing = document.getElementById('parseWarn').innerHTML;
        document.getElementById('parseWarn').innerHTML =
          existing +
          `<div style="font-size:8px;color:var(--tlo);font-family:'DM Mono',monospace;line-height:1.5;margin-top:5px">${note}</div>`;
        return;
      }
      throw new Error('Unsupported file type. Use .ZMX or .ZAR.');
    } catch (e) {
      console.error(e);
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Archive/import error:<br>${escapeHTML(String(e.message || e))}</div>`;
    }
  }

  const dropOv = document.getElementById('dropOv');
  Object.assign(ui, {
    importedLensDisplayName,
    addParsedLensToLibrary,
    loadZMX,
    loadLensFile,
  });
  return function bindEvents() {
    document
      .getElementById('fileIn')
      .addEventListener('change', async function () {
        const f = this.files[0];
        if (!f) return;
        await loadLensFile(f);
        this.value = '';
      });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (
        !Array.from(e.dataTransfer.types || []).includes(
          'application/x-tracy-component',
        )
      )
        dropOv.classList.add('show');
    });
    document.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget) dropOv.classList.remove('show');
    });
    document.addEventListener('drop', async (e) => {
      if (e.dataTransfer.getData('application/x-tracy-component')) return;
      e.preventDefault();
      dropOv.classList.remove('show');
      const f = e.dataTransfer.files[0];
      if (
        f &&
        /\.json$/i.test(f.name) &&
        typeof ui.loadProjectFile === 'function'
      )
        await ui.loadProjectFile(f);
      else if (f && /\.(zmx|zar)$/i.test(f.name)) await loadLensFile(f);
      else
        document.getElementById('parseWarn').innerHTML =
          '<div class="warn">Drop a Tracy .JSON project, or a Zemax .ZMX/.ZAR lens file.</div>';
    });
  };
}
