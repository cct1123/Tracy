// Extracted from the supplied Tracy prototype; see docs/architecture.md.

export function installHistory({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  ui.SOURCE_ID = '__source__';

  ui.uxHistory = [];

  ui.uxRedo = [];

  ui.uxRestoring = false;

  ui.sourceDrag = null;

  ui.componentDragSnapshot = null;

  ui.stateControlIds = [
    'sPX',
    'sPY',
    'sPZ',
    'sPtDirX',
    'sPtDirY',
    'sPtNA',
    'sField',
    'sFieldX',
    'sWL',
    'nRays',
    'sGlass',
  ];

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function captureState(label = 'Edit') {
    const radios = {};
    document
      .querySelectorAll('input[type=radio]:checked')
      .forEach((r) => (radios[r.name] = r.id));
    const checks = {};
    document
      .querySelectorAll('input[type=checkbox]')
      .forEach((c) => (checks[c.id] = c.checked));
    const vals = {};
    ui.stateControlIds.forEach((id) => {
      const e = document.getElementById(id);
      if (e) vals[id] = e.value;
    });
    return {
      label,
      components: clone(model.components),
      selected: model.selectedComponentId,
      epd: model.epd,
      benchEpd: model.benchEpd,
      lensName: model.lensName,
      meta: clone(model.importMeta),
      radios,
      checks,
      vals,
    };
  }

  function pushSnapshot(s) {
    if (ui.uxRestoring || !s) return;
    ui.uxHistory.push(s);
    if (ui.uxHistory.length > 80) ui.uxHistory.shift();
    ui.uxRedo.length = 0;
    updateUndoButtons();
  }

  function pushUndo(label) {
    pushSnapshot(captureState(label));
  }

  function restoreState(s) {
    if (!s) return;
    ui.uxRestoring = true;
    session.suspendTrace = true;
    try {
      model.components = clone(s.components);
      model.selectedComponentId = s.selected;
      model.epd = s.epd;
      model.benchEpd = s.benchEpd ?? s.epd;
      model.lensName = s.lensName;
      Object.assign(model.importMeta, clone(s.meta));
      for (const [name, id] of Object.entries(s.radios || {})) {
        const e = document.getElementById(id);
        if (e) {
          e.checked = true;
          e.dispatchEvent(new Event('change'));
        }
      }
      for (const [id, v] of Object.entries(s.checks || {})) {
        const e = document.getElementById(id);
        if (e) {
          e.checked = v;
          e.dispatchEvent(new Event('change'));
        }
      }
      for (const [id, v] of Object.entries(s.vals || {})) {
        const e = document.getElementById(id);
        if (e) {
          e.value = v;
          e.dispatchEvent(new Event('input'));
        }
      }
      const isPt = document.getElementById('stPt').checked;
      document.getElementById('srcPos').classList.toggle('show', isPt);
      document.getElementById('collPos').classList.toggle('hide', isPt);
    } finally {
      session.suspendTrace = false;
      session.traceDirty = false;
    }
    ui.rebuildBench();
    ui.renderBenchList();
    ui.renderRuler();
    ui.updateAnalysisSummary();
    ui.uxRestoring = false;
    if (model.selectedComponentId === ui.SOURCE_ID) ui.openSourceInspector();
    else if (model.selectedComponentId)
      ui.openInspector(model.selectedComponentId);
    else ui.showDockEmpty();
  }

  function undo() {
    if (!ui.uxHistory.length) return;
    const cur = captureState('redo');
    const s = ui.uxHistory.pop();
    ui.uxRedo.push(cur);
    restoreState(s);
    updateUndoButtons();
    ui.benchToast(`Undo · ${s.label}`);
  }

  function redo() {
    if (!ui.uxRedo.length) return;
    const cur = captureState('undo');
    const s = ui.uxRedo.pop();
    ui.uxHistory.push(cur);
    restoreState(s);
    updateUndoButtons();
    ui.benchToast('Redo');
  }

  function updateUndoButtons() {
    const u = document.getElementById('uxUndo'),
      r = document.getElementById('uxRedo');
    if (u) u.disabled = !ui.uxHistory.length;
    if (r) r.disabled = !ui.uxRedo.length;
  }
  Object.assign(ui, {
    clone,
    captureState,
    pushSnapshot,
    pushUndo,
    restoreState,
    undo,
    redo,
    updateUndoButtons,
  });
  return function bindEvents() {};
}
