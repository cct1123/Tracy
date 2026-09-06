import { escapeHTML } from './dom.js';
// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { GLASS_DB, BUILTIN_GLASS_DB } from '../core/materials.js';
import {
  TRACY_PROJECT_FORMAT,
  TRACY_PROJECT_VERSION,
  validateProjectJSON,
} from '../io/project-schema.js';
import { DEFAULT_EPD } from '../data/defaults.js';

export function installProjects({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function captureProjectJSON() {
    const state = ui.captureState('Project save');
    const customGlasses = {};
    for (const [name, coeff] of Object.entries(GLASS_DB)) {
      if (JSON.stringify(coeff) !== JSON.stringify(BUILTIN_GLASS_DB[name]))
        customGlasses[name] = ui.clone(coeff);
    }
    const app = document.getElementById('app');
    return {
      format: TRACY_PROJECT_FORMAT,
      version: TRACY_PROJECT_VERSION,
      app: {
        name: 'Tracy',
        kind: 'Optical Workbench Project',
        savedAt: new Date().toISOString(),
      },
      bench: {
        components: ui.clone(model.components),
        selected: model.selectedComponentId,
        benchEpd: model.benchEpd,
        epd: model.epd,
        lensName: model.lensName,
        zemaxImportMeta: ui.clone(model.importMeta),
        snapMm: model.snapMm,
      },
      library: {
        imported: ui.clone(
          model.componentLibrary.filter((t) => t.kind === 'imported'),
        ),
        importedSequence: model.importedSequence,
        customGlasses,
      },
      simulation: {
        radios: state.radios,
        checks: state.checks,
        values: state.vals,
      },
      view: {
        camera: {
          position: view.camera.position.toArray(),
          target: view.controls.target.toArray(),
          fov: view.camera.fov,
        },
        analysisCollapsed:
          document
            .getElementById('analysisDrawer')
            ?.classList.contains('collapsed') || false,
        leftCollapsed: app?.classList.contains('left-collapsed') || false,
        rightCollapsed: app?.classList.contains('right-collapsed') || false,
        theme: ui.activeTheme(),
      },
    };
  }

  function projectFileName() {
    const d = new Date(),
      pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const raw =
      (model.lensName || 'optical-workbench')
        .replace(/[^a-z0-9._-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 55) || 'optical-workbench';
    return `${raw}-${stamp}.tracy.json`;
  }

  function saveProjectJSON() {
    try {
      const project = captureProjectJSON();
      const text = JSON.stringify(project, null, 2);
      const blob = new Blob([text], { type: 'application/json' }),
        url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = projectFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      ui.benchToast(`Project saved · ${model.components.length} components`);
    } catch (e) {
      console.error(e);
      ui.benchToast('Project save failed');
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Project save error:<br>${escapeHTML(String(e.message || e))}</div>`;
    }
  }

  function restoreProjectControls(sim = {}) {
    const prevSuspend = !!session.suspendTrace;
    session.suspendTrace = true;
    for (const [name, id] of Object.entries(sim.radios || {})) {
      const e = document.getElementById(id);
      if (e && e.type === 'radio') e.checked = true;
    }
    for (const [id, v] of Object.entries(sim.checks || {})) {
      const e = document.getElementById(id);
      if (e && e.type === 'checkbox') {
        e.checked = !!v;
        e.dispatchEvent(new Event('change'));
      }
    }
    for (const [id, v] of Object.entries(sim.values || {})) {
      const e = document.getElementById(id);
      if (e && e.type !== 'file') e.value = String(v);
    }
    // Refresh slider labels/gradients and source UI without repeatedly rebuilding
    // the whole bench for every restored control.
    for (const id of ui.stateControlIds) {
      const e = document.getElementById(id);
      if (e && e.type === 'range') e.dispatchEvent(new Event('input'));
    }
    const isPt = document.getElementById('stPt').checked;
    document.getElementById('srcPos').classList.toggle('show', isPt);
    document.getElementById('collPos').classList.toggle('hide', isPt);
    session.suspendTrace = prevSuspend;
  }

  function restoreProjectView(v = {}) {
    const app = document.getElementById('app');
    app?.classList.toggle('left-collapsed', !!v.leftCollapsed);
    app?.classList.toggle('right-collapsed', !!v.rightCollapsed);
    document
      .getElementById('analysisDrawer')
      ?.classList.toggle('collapsed', !!v.analysisCollapsed);
    const c = v.camera;
    if (
      c &&
      Array.isArray(c.position) &&
      c.position.length === 3 &&
      c.position.every(Number.isFinite) &&
      Array.isArray(c.target) &&
      c.target.length === 3 &&
      c.target.every(Number.isFinite)
    ) {
      view.camera.position.fromArray(c.position);
      view.controls.target.fromArray(c.target);
      if (Number.isFinite(c.fov) && c.fov >= 5 && c.fov <= 120) {
        view.camera.fov = c.fov;
        view.camera.updateProjectionMatrix();
      }
      view.controls.update();
    } else view.fitBench();
  }

  function applyProjectJSON(raw, sourceName = 'project.json') {
    const p = validateProjectJSON(raw);
    if (p.view?.theme === 'day' || p.view?.theme === 'night')
      ui.applyWorkbenchTheme(p.view.theme, { persist: true, rebuild: false });
    ui.uxRestoring = true;
    try {
      // Reset the catalog, then restore added AND overridden AGF definitions.
      for (const key of Object.keys(GLASS_DB)) delete GLASS_DB[key];
      Object.assign(GLASS_DB, ui.clone(BUILTIN_GLASS_DB));
      for (const [name, coeff] of Object.entries(
        p.library?.customGlasses || {},
      ))
        GLASS_DB[name.toUpperCase()] = ui.clone(coeff);

      // Replace only the Imported group; the standard built-in library is part of
      // the application and should not be duplicated inside every project file.
      for (let i = model.componentLibrary.length - 1; i >= 0; i--)
        if (model.componentLibrary[i].kind === 'imported')
          model.componentLibrary.splice(i, 1);
      const used = new Set(model.componentLibrary.map((t) => t.id));
      for (const t0 of p.library?.imported || []) {
        const t = ui.clone(t0);
        if (typeof t.id !== 'string' || !t.id || used.has(t.id))
          throw new Error(
            `Duplicate or reserved library id: ${t.id || '(missing)'}`,
          );
        used.add(t.id);
        model.componentLibrary.push(t);
      }
      const maxId = model.componentLibrary
        .filter((t) => t.kind === 'imported')
        .map((t) => Number(String(t.id).match(/(\d+)$/)?.[1] || 0))
        .reduce((a, b) => Math.max(a, b), 0);
      model.importedSequence = Math.max(
        maxId + 1,
        Number(p.library?.importedSequence) || 1,
      );

      model.components = ui.clone(p.bench.components);
      model.selectedComponentId = p.bench.selected ?? null;
      model.benchEpd =
        Number.isFinite(+p.bench.benchEpd) && +p.bench.benchEpd > 0
          ? +p.bench.benchEpd
          : DEFAULT_EPD;
      model.epd =
        Number.isFinite(+p.bench.epd) && +p.bench.epd > 0
          ? +p.bench.epd
          : model.benchEpd;
      model.lensName = String(p.bench.lensName || 'Optical bench');
      model.importMeta = {
        objectDistance: null,
        pupilType: 0,
        pupilValue: null,
        rayAimRaw: null,
        unitName: 'MM',
        unitScale: 1,
        enpdSource: 'project',
        apertureApprox: false,
        ...ui.clone(p.bench.zemaxImportMeta || {}),
      };
      model.snapMm =
        Number.isFinite(+p.bench.snapMm) &&
        +p.bench.snapMm >= 0.001 &&
        +p.bench.snapMm <= 20
          ? +p.bench.snapMm
          : 0.1;
      restoreProjectControls(p.simulation || {});
      bench.syncSurfacesFromComponents();
      ui.updateSourceZRange();
      view.buildLens();
      view.buildRays();
      ui.refreshSystemInfo();
      ui.renderLibrary(document.getElementById('libSearch')?.value || '');
      ui.renderBenchList();
      ui.renderRuler();
      ui.updateAnalysisSummary();
      ui.updateStatusBar();
      restoreProjectView(p.view || {});
      if (document.getElementById('uxSnap'))
        document.getElementById('uxSnap').value = String(model.snapMm);
      ui.uxHistory.length = 0;
      ui.uxRedo.length = 0;
      ui.updateUndoButtons();
      document.getElementById('uName').textContent = `project · ${sourceName}`;
      document.getElementById('parseWarn').innerHTML =
        `<div style="font-size:9px;color:var(--d);font-family:'DM Mono',monospace;line-height:1.55;margin-top:6px">✓ Project restored<br><span style="color:var(--tlo)">${model.components.length} bench components · ${(p.library?.imported || []).length} imported library lenses</span></div>`;
    } finally {
      ui.uxRestoring = false;
    }
    if (model.selectedComponentId === ui.SOURCE_ID) ui.openSourceInspector();
    else if (
      model.selectedComponentId &&
      model.components.some((c) => c.id === model.selectedComponentId)
    )
      ui.openInspector(model.selectedComponentId);
    else {
      model.selectedComponentId = null;
      ui.showDockEmpty();
    }
    ui.benchToast(`Project loaded · ${sourceName}`);
  }

  async function loadProjectFile(file) {
    try {
      if (!file) throw new Error('No project file selected.');
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON: ${e.message}`);
      }
      applyProjectJSON(parsed, file.name || 'project.json');
    } catch (e) {
      console.error(e);
      ui.benchToast('Project load failed');
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Project load error:<br>${escapeHTML(String(e.message || e))}</div>`;
    }
  }
  Object.assign(ui, {
    captureProjectJSON,
    projectFileName,
    saveProjectJSON,
    restoreProjectControls,
    restoreProjectView,
    applyProjectJSON,
    loadProjectFile,
  });
  return function bindEvents() {};
}
