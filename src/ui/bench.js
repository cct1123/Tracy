import { escapeHTML } from './dom.js';
// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { airLikeGlass, componentLength } from '../model/components.js';
import { GLASS_DB } from '../core/materials.js';
import * as THREE from 'three';

export function installBench({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function refreshSystemInfo() {
    bench.syncSurfacesFromComponents();
    const glasses = [
      ...new Set(
        model.surfaces.map((s) => s.glass).filter((g) => !airLikeGlass(g)),
      ),
    ];
    const ic = document.getElementById('iComponents');
    if (ic) ic.textContent = model.components.length;
    document.getElementById('iName').textContent = model.lensName;
    document.getElementById('iSurf').textContent = model.surfaces.length;
    const ep = optics.entrancePupil(0.5875618);
    document.getElementById('iEpd').textContent =
      (isFinite(ep.diameter) ? ep.diameter : model.epd).toFixed(2) + ' mm';
    document.getElementById('iStop').textContent = ep.stopKind;
    document.getElementById('iEnp').textContent = ep.finite
      ? `z ${ep.z.toFixed(2)} mm`
      : '∞';
    const apertureMeta = ep.apertureMeta || model.importMeta;
    const aperNames = [
        'ENPD',
        'Image F/#',
        'Object NA',
        'Float by stop',
        'Paraxial F/#',
        'Object cone',
      ],
      approx = apertureMeta.apertureApprox ? ' ≈' : '',
      src = apertureMeta.enpdSource ? ` · ${apertureMeta.enpdSource}` : '';
    document.getElementById('iAper').textContent =
      (aperNames[apertureMeta.pupilType] || `type ${apertureMeta.pupilType}`) +
      approx +
      src +
      (apertureMeta.unitName && apertureMeta.unitName !== 'MM'
        ? ` · ${apertureMeta.unitName}→mm`
        : '');
    document.getElementById('iGlass').textContent = glasses.join(' · ') || '—';
  }

  let toastTimer = null;

  function benchToast(msg) {
    const el = document.getElementById('benchToast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  function rebuildBench() {
    bench.syncSurfacesFromComponents();
    const prev = !!session.suspendTrace;
    session.suspendTrace = true;
    ui.updateSourceZRange();
    session.suspendTrace = prev;
    view.buildLens();
    if (!prev) view.buildRays();
    ui.refreshSystemInfo();
  }

  function glassOptions() {
    return Object.keys(GLASS_DB).sort();
  }

  function inspectorRow(label, key, value, unit = '', step = '0.1', list = '') {
    return `<div class="ins-row"><label>${label}</label><input data-prop="${key}" value="${escapeHTML(value)}" ${step ? `type="number" step="${step}"` : ''} ${list ? `list="${list}"` : ''}><span class="ins-unit">${unit}</span></div>`;
  }

  function openInspector(id, x = 18, y = 70) {
    const c = model.components.find((q) => q.id === id);
    if (!c) return;
    model.selectedComponentId = id;
    view.refreshSelectionRings();
    const box = document.getElementById('componentInspector');
    document.getElementById('insTitle').textContent = c.name;
    document.getElementById('insKind').textContent =
      c.kind === 'imported' ? 'imported ZMX assembly' : c.kind;
    document.getElementById('glassChoices').innerHTML = glassOptions()
      .map((g) => `<option value="${escapeHTML(g)}"></option>`)
      .join('');
    let h = '';
    h += inspectorRow('Name', 'name', c.name, '', '', '');
    h += inspectorRow('Axis z', 'z', c.z.toFixed(2), 'mm', '0.5');
    if (c.kind === 'single') {
      const p = c.params;
      h += inspectorRow('Diameter', 'diameter', p.diameter, 'mm', '0.1');
      h += inspectorRow('Radius R1', 'R1', p.R1, 'mm', '0.1');
      h += inspectorRow('Radius R2', 'R2', p.R2, 'mm', '0.1');
      h += inspectorRow('Thickness', 't', p.t, 'mm', '0.1');
      h += inspectorRow('Glass', 'glass', p.glass, '', '', 'glassChoices');
      h += `<div class="ins-note">Radius = 0 means a plane surface. Positive/negative signs follow the +z optical-axis convention.</div>`;
    } else if (c.kind === 'achromat') {
      const p = c.params;
      h += inspectorRow('Diameter', 'diameter', p.diameter, 'mm', '0.1');
      h += inspectorRow('Radius R1', 'R1', p.R1, 'mm', '0.1');
      h += inspectorRow('Radius R2', 'R2', p.R2, 'mm', '0.1');
      h += inspectorRow('Radius R3', 'R3', p.R3, 'mm', '0.1');
      h += inspectorRow('Crown t', 't1', p.t1, 'mm', '0.1');
      h += inspectorRow('Flint t', 't2', p.t2, 'mm', '0.1');
      h += inspectorRow('Glass 1', 'glass1', p.glass1, '', '', 'glassChoices');
      h += inspectorRow('Glass 2', 'glass2', p.glass2, '', '', 'glassChoices');
    } else if (c.kind === 'aperture' || c.kind === 'detector') {
      h += inspectorRow(
        c.kind === 'aperture' ? 'Clear Ø' : 'Diameter',
        'diameter',
        c.params.diameter,
        'mm',
        '0.1',
      );
    } else if (c.kind === 'imported') {
      h += inspectorRow('Diameter', 'diameter', c.params.diameter, 'mm', '0.1');
      h += `<div class="ins-note">Imported assembly · ${c.surfaces.length} optical surfaces. Diameter edits apply a common clear aperture; internal Zemax curvatures, aspheres, glass assignments and spacings remain intact.</div>`;
    }
    h += `<div class="ins-actions"><button class="btn bsm" data-action="duplicate">Duplicate</button><button class="btn bsm ins-danger" data-action="delete" ${c.kind === 'detector' ? 'disabled' : ''}>Delete</button></div>`;
    document.getElementById('insBody').innerHTML = h;
    const maxX = Math.max(8, view.vp.clientWidth - 294),
      maxY = Math.max(
        8,
        view.vp.clientHeight - Math.min(520, box.offsetHeight || 420) - 8,
      );
    box.style.left = `${Math.min(maxX, Math.max(8, x))}px`;
    box.style.top = `${Math.min(maxY, Math.max(8, y))}px`;
    box.classList.add('show');
    document
      .getElementById('insBody')
      .querySelectorAll('input[data-prop]')
      .forEach((inp) =>
        inp.addEventListener('change', () =>
          ui.applyInspectorValue(c, inp.dataset.prop, inp.value),
        ),
      );
    document
      .getElementById('insBody')
      .querySelector('[data-action="duplicate"]')
      .addEventListener('click', () => ui.duplicateComponent(c.id));
    const del = document
      .getElementById('insBody')
      .querySelector('[data-action="delete"]');
    if (!del.disabled)
      del.addEventListener('click', () => ui.deleteComponent(c.id));
  }

  function applyInspectorValue(c, key, val) {
    if (key === 'name') {
      c.name = String(val).trim() || c.name;
      document.getElementById('insTitle').textContent = c.name;
    } else if (key === 'z') {
      c.z = bench.clampDraggedZ(c, +val || 0);
    } else if (c.kind === 'imported' && key === 'diameter') {
      const d = Math.max(0.2, +val || 0.2);
      c.params.diameter = d;
      c.surfaces.forEach((q) => (q.sd = d / 2));
    } else if (c.params && key in c.params) {
      c.params[key] = ['glass', 'glass1', 'glass2'].includes(key)
        ? String(val).trim().toUpperCase()
        : +val;
    }
    bench.ensureDetectorAfterOptics();
    ui.rebuildBench();
    ui.openInspector(
      c.id,
      parseFloat(document.getElementById('componentInspector').style.left) ||
        18,
      parseFloat(document.getElementById('componentInspector').style.top) || 70,
    );
  }

  function duplicateComponent(id) {
    const c = model.components.find((q) => q.id === id);
    if (!c || c.kind === 'detector') return;
    const n = JSON.parse(JSON.stringify(c));
    n.id = bench.newComponentId();
    n.name = `${c.name} copy`;
    n.z = c.z + componentLength(c) + 6;
    model.components.push(n);
    bench.placeNewComponent(n);
    model.selectedComponentId = n.id;
    ui.rebuildBench();
    ui.openInspector(n.id, 18, 70);
    benchToast('Component duplicated');
  }

  function deleteComponent(id) {
    const c = model.components.find((q) => q.id === id);
    if (!c || c.kind === 'detector') return;
    model.components = model.components.filter((q) => q.id !== id);
    model.selectedComponentId = null;
    document.getElementById('componentInspector').classList.remove('show');
    bench.ensureDetectorAfterOptics();
    ui.rebuildBench();
    benchToast('Component removed');
  }

  ui.benchRaycaster = new THREE.Raycaster();

  ui.benchMouse = new THREE.Vector2();

  ui.dragComponent = null;

  ui.dragMoved = false;

  function pointerNDC(ev) {
    const r = view.canvas.getBoundingClientRect();
    ui.benchMouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ui.benchMouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    return r;
  }

  function hitComponent(ev) {
    pointerNDC(ev);
    ui.benchRaycaster.setFromCamera(ui.benchMouse, view.camera);
    const hits = ui.benchRaycaster.intersectObjects(
      view.pickGrp.children,
      true,
    );
    const h = hits.find((q) => q.object.userData?.pickProxy);
    return h
      ? model.components.find((c) => c.id === h.object.userData.componentId)
      : null;
  }

  function axisZFromPointer(ev) {
    pointerNDC(ev);
    ui.benchRaycaster.setFromCamera(ui.benchMouse, view.camera);
    const O = ui.benchRaycaster.ray.origin,
      D = ui.benchRaycaster.ray.direction,
      den = D.x * D.x + D.y * D.y;
    if (den < 1e-8) return view.controls.target.z;
    const t = -(O.x * D.x + O.y * D.y) / den;
    return O.z + t * D.z;
  }
  Object.assign(ui, {
    refreshSystemInfo,
    benchToast,
    rebuildBench,
    glassOptions,
    inspectorRow,
    openInspector,
    applyInspectorValue,
    duplicateComponent,
    deleteComponent,
    pointerNDC,
    hitComponent,
    axisZFromPointer,
  });
  return function bindEvents() {
    document
      .getElementById('insClose')
      .addEventListener('click', () =>
        document.getElementById('componentInspector').classList.remove('show'),
      );
    view.canvas.addEventListener(
      'pointerdown',
      (ev) => {
        const c = hitComponent(ev);
        if (!c || c.locked) return;
        ui.dragComponent = {
          c,
          startX: ev.clientX,
          startY: ev.clientY,
          startZ: c.z,
        };
        ui.dragMoved = false;
        model.selectedComponentId = c.id;
        view.refreshSelectionRings();
        view.controls.enabled = false;
        view.canvas.setPointerCapture?.(ev.pointerId);
        ev.preventDefault();
        ev.stopPropagation();
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointermove',
      (ev) => {
        if (!ui.dragComponent) return;
        const dx = ev.clientX - ui.dragComponent.startX,
          dy = ev.clientY - ui.dragComponent.startY;
        if (Math.hypot(dx, dy) > 3) ui.dragMoved = true;
        if (!ui.dragMoved) return;
        const nz = bench.clampDraggedZ(
          ui.dragComponent.c,
          axisZFromPointer(ev),
        );
        if (nz !== ui.dragComponent.c.z) {
          ui.dragComponent.c.z = nz;
          view.setComponentNodeZ(ui.dragComponent.c.id, nz);
          ui.renderBenchList();
        }
        ev.preventDefault();
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointerup',
      (ev) => {
        if (!ui.dragComponent) return;
        const c = ui.dragComponent.c,
          wasMoved = ui.dragMoved;
        ui.dragComponent = null;
        view.controls.enabled = true;
        view.canvas.releasePointerCapture?.(ev.pointerId);
        if (wasMoved) {
          ui.rebuildBench();
          benchToast(`${c.name} · z = ${c.z.toFixed(1)} mm`);
        }
        ev.preventDefault();
        ev.stopPropagation();
      },
      { capture: true },
    );
    view.canvas.addEventListener('dblclick', (ev) => {
      const c = hitComponent(ev);
      if (!c) return;
      const r = view.vp.getBoundingClientRect();
      ui.openInspector(c.id, ev.clientX - r.left + 10, ev.clientY - r.top + 10);
      ev.preventDefault();
      ev.stopPropagation();
    });
    view.vp.addEventListener('dragover', (ev) => {
      if (
        Array.from(ev.dataTransfer.types || []).includes(
          'application/x-tracy-component',
        )
      ) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'copy';
        document.getElementById('axisDropHint').classList.add('show');
      }
    });
    view.vp.addEventListener('drop', (ev) => {
      const tid = ev.dataTransfer.getData('application/x-tracy-component');
      if (!tid) return;
      ev.preventDefault();
      ev.stopPropagation();
      document.getElementById('axisDropHint').classList.remove('show');
      const c = bench.createLibraryComponent(tid, axisZFromPointer(ev));
      if (c) {
        model.selectedComponentId = c.id;
        ui.rebuildBench();
        const r = view.vp.getBoundingClientRect();
        ui.openInspector(
          c.id,
          ev.clientX - r.left + 10,
          ev.clientY - r.top + 10,
        );
        benchToast(`${c.name} added`);
      }
    });
  };
}
