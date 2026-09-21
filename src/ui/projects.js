import { escapeHTML } from './dom.js';
// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import {
  GLASS_DB,
  BUILTIN_GLASS_DB,
  captureMaterialCatalog,
  restoreMaterialCatalog,
} from '../core/materials.js';
import {
  TRACY_PROJECT_FORMAT,
  TRACY_PROJECT_VERSION,
  migrateProjectJSON,
} from '../io/project-schema.js';
import { DEFAULT_EPD } from '../data/defaults.js';
import { openLocalProjects, createAutosave } from '../io/local-projects.js';

export function installProjects({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  let localStore;
  let autosave;
  let persistenceReady = false;
  let identity = { id: newProjectId(), name: 'Untitled project' };

  function newProjectId() {
    return (
      globalThis.crypto?.randomUUID?.() ||
      `project-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
  }

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
      project: { ...identity },
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
        materialCatalog: captureMaterialCatalog(),
      },
      simulation: {
        radios: state.radios,
        checks: state.checks,
        values: state.vals,
        canonical: ui.captureEngineeringState?.(),
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
    const p = migrateProjectJSON(raw);
    if (p.view?.theme === 'day' || p.view?.theme === 'night')
      ui.applyWorkbenchTheme(p.view.theme, { persist: true, rebuild: false });
    ui.uxRestoring = true;
    try {
      identity = { ...p.project, id: raw.project?.id || newProjectId() };
      const name = document.getElementById('projectName');
      if (name) name.value = identity.name;
      // Reset coefficient AND provenance/range state before restoring overrides.
      // Bare v1 arrays remain readable; v2 records preserve AGF validity limits.
      restoreMaterialCatalog({
        ...(p.library?.customGlasses || {}),
        ...(p.library?.materialCatalog || {}),
      });

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
      ui.restoreEngineeringState?.(p.simulation?.canonical ?? null);
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
    projectChanged();
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
      migrateProjectJSON(parsed);
      if (localStore) await localStore.save(captureProjectJSON());
      applyProjectJSON(parsed, file.name || 'project.json');
    } catch (e) {
      console.error(e);
      ui.benchToast('Project load failed');
      document.getElementById('parseWarn').innerHTML =
        `<div class="warn">Project load error:<br>${escapeHTML(String(e.message || e))}</div>`;
    }
  }

  function persistenceStatus(state, error) {
    const element = document.getElementById('projectSaveState');
    if (!element) return;
    element.dataset.state = state;
    const labels = {
      dirty: '● Unsaved changes',
      saving: 'Saving locally…',
      saved: '✓ Autosaved locally',
      error: '⚠ Local save failed',
    };
    element.textContent = labels[state] || state;
    element.title = error
      ? `${error.message}. Export JSON to keep a backup.`
      : `${identity.name} · browser-local storage`;
  }

  function projectChanged() {
    if (!persistenceReady || ui.uxRestoring) return;
    autosave?.changed();
  }

  async function refreshLocalProjects() {
    const select = document.getElementById('localProjectList');
    if (!localStore || !select) return;
    const records = await localStore.list();
    select.innerHTML =
      '<option value="">Choose a project…</option>' +
      records
        .map(
          (record) =>
            `<option value="${escapeHTML(record.id)}">${escapeHTML(record.name)}</option>`,
        )
        .join('');
    select.value = records.some((record) => record.id === identity.id)
      ? identity.id
      : '';
  }

  async function saveNamedProject() {
    if (!localStore) return;
    const name = document.getElementById('projectName').value.trim();
    if (!name) {
      ui.benchToast('Enter a project name');
      return;
    }
    identity.name = name;
    try {
      await localStore.save(captureProjectJSON());
      projectChanged();
      await autosave.flush();
      await refreshLocalProjects();
      ui.benchToast(`Saved locally · ${name}`);
    } catch (error) {
      persistenceStatus('error', error);
    }
  }

  async function initializePersistence() {
    if (persistenceReady) return;
    try {
      localStore = await openLocalProjects();
      const recovered = await localStore.recovery();
      if (recovered) {
        applyProjectJSON(recovered, recovered.project.name);
        ui.benchToast(`Recovered autosave · ${recovered.project.name}`);
      }
      autosave = createAutosave({
        capture: captureProjectJSON,
        write: (project) => localStore.saveRecovery(project),
        status: persistenceStatus,
      });
      persistenceReady = true;
      persistenceStatus(recovered ? '✓ Recovered autosave' : 'Local project');
      document.documentElement.dataset.persistenceReady = 'true';
      await refreshLocalProjects();
      if (!recovered) projectChanged();
    } catch (error) {
      persistenceStatus('error', error);
      document.documentElement.dataset.persistenceReady = 'unavailable';
      for (const id of ['uxLocalSave', 'uxLocalLoad'])
        document.getElementById(id).disabled = true;
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
    initializePersistence,
    projectChanged,
    flushAutosave: () => autosave?.flush(),
  });
  return function bindEvents() {
    document.getElementById('uxLocalSave').onclick = saveNamedProject;
    document.getElementById('uxLocalLoad').onclick = async () => {
      const id = document.getElementById('localProjectList').value;
      if (!id || !localStore) return;
      try {
        // Preserve the current draft as a named copy before switching projects.
        const nextProject = await localStore.load(id);
        await localStore.save(captureProjectJSON());
        applyProjectJSON(nextProject, 'local project');
        await autosave.flush();
      } catch (error) {
        persistenceStatus('error', error);
      }
    };
    document.getElementById('uxNewProject').onclick = async () => {
      try {
        if (localStore) await localStore.save(captureProjectJSON());
      } catch (error) {
        persistenceStatus('error', error);
        return;
      }
      identity = {
        id: newProjectId(),
        name: `${identity.name.slice(0, 114)} copy`,
      };
      document.getElementById('projectName').value = identity.name;
      projectChanged();
      ui.benchToast('New local copy · choose a name and save');
    };
    document
      .getElementById('projectName')
      .addEventListener('change', (event) => {
        identity.name = event.target.value.trim() || identity.name;
        event.target.value = identity.name;
        projectChanged();
      });
    for (const event of ['input', 'change'])
      document.addEventListener(
        event,
        (e) => {
          if (
            e.target.matches('input:not([type=file]), select') &&
            !['libSearch', 'catalogVendorFilter', 'localProjectList'].includes(
              e.target.id,
            )
          )
            projectChanged();
        },
        true,
      );
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden')
        autosave?.flush().catch(() => {});
    });
    window.addEventListener('pagehide', () => {
      autosave?.flush().catch(() => {});
    });
    window.addEventListener('beforeunload', (event) => {
      if (autosave?.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
    view.controls.addEventListener?.('end', projectChanged);
  };
}
