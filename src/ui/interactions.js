import { escapeHTML } from './dom.js';
// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import {
  componentHasOrientation,
  componentOrientation,
  setComponentOrientation,
  componentLength,
  componentRadius,
} from '../model/components.js';
import { sourceBasis } from '../core/vector.js';
import * as THREE from 'three';

export function installInteractions({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  ui.renderLibrary = function (filter = '') {
    const el = document.getElementById('componentLibrary');
    if (!el) return;
    const q = String(filter || '')
        .toLowerCase()
        .trim(),
      groups = [
        ['Singlets', ['single']],
        ['Compound', ['achromat']],
        ['Imported', ['imported']],
        ['Apertures', ['aperture']],
        ['Sensors', ['detector']],
      ];
    let html = '';
    html += ui.renderCatalogLibrary?.(q) || '';
    for (const [title, kinds] of groups) {
      const rows = model.componentLibrary.filter(
        (t) =>
          kinds.includes(t.kind) &&
          (!q || `${t.name} ${t.meta} ${t.id}`.toLowerCase().includes(q)),
      );
      if (!rows.length) continue;
      html += `<div class="lib-group"><div class="lib-group-title">${title}</div><div class="lib-grid">${rows.map((t) => `<div class="lib-card" draggable="true" data-template="${escapeHTML(t.id)}" title="Drag ${escapeHTML(t.name)} onto the axis"><div class="lib-icon">${escapeHTML(t.icon)}</div><div><div class="lib-name">${escapeHTML(t.name)}</div><div class="lib-meta">${escapeHTML(t.meta)}</div></div></div>`).join('')}</div></div>`;
    }
    el.innerHTML =
      html || '<div class="mini-note lib-empty">No matching components.</div>';
    el.querySelectorAll('.lib-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData(
          'application/x-softether-component',
          card.dataset.template,
        );
        e.dataTransfer.effectAllowed = 'copy';
        document.getElementById('axisDropHint').classList.add('show');
      });
      card.addEventListener('dragend', () =>
        document.getElementById('axisDropHint').classList.remove('show'),
      );
    });
  };

  function sourceName() {
    return document.getElementById('stPt').checked
      ? 'Point source'
      : 'Collimated source';
  }

  ui.renderBenchList = function () {
    const el = document.getElementById('benchList');
    if (!el) return;
    const srcZ = document.getElementById('stPt').checked
      ? parseFloat(document.getElementById('sPZ').value)
      : null;
    let html = `<div class="bench-item ${model.selectedComponentId === ui.SOURCE_ID ? 'sel' : ''}" data-id="${ui.SOURCE_ID}"><span class="bench-dot" style="background:#ffc28a"></span><span class="bench-name">${sourceName()}</span><span class="bench-z">${srcZ == null ? '∞' : srcZ.toFixed(1) + ' mm'}</span></div>`;
    html += [...model.components]
      .sort((a, b) => a.z - b.z)
      .map(
        (c) =>
          `<div class="bench-item ${escapeHTML(c.id === model.selectedComponentId ? 'sel' : '')} ${c.kind === 'detector' ? 'detector' : c.kind === 'aperture' ? 'stop' : ''}" data-id="${escapeHTML(c.id)}"><span class="bench-dot"></span><span class="bench-name">${escapeHTML(c.name)}</span>${componentHasOrientation(c) ? `<span class="bench-orient" title="${componentOrientation(c) === 1 ? 'Forward' : 'Reversed'}">${componentOrientation(c) === 1 ? '→' : '←'}</span>` : ''}${c.locked ? '<span class="bench-lock">🔒</span>' : ''}<span class="bench-z">${c.z.toFixed(1)} mm</span></div>`,
      )
      .join('');
    el.innerHTML = html;
    el.querySelectorAll('.bench-item').forEach((x) =>
      x.addEventListener('click', () => selectObject(x.dataset.id)),
    );
    ui.renderRuler();
  };

  function selectObject(id) {
    model.selectedComponentId = id;
    view.refreshSelectionRings();
    ui.renderBenchList();
    if (id === ui.SOURCE_ID) openSourceInspector();
    else ui.openInspector(id);
    ui.updateStatusBar();
  }

  function showDockEmpty() {
    document.getElementById('componentInspector').classList.remove('show');
    document.getElementById('dockEmpty').style.display = 'block';
  }

  const oldOpenInspector = ui.openInspector;

  ui.openInspector = function (id, x = 18, y = 70) {
    if (id === ui.SOURCE_ID) return openSourceInspector();
    document.getElementById('dockEmpty').style.display = 'none';
    oldOpenInspector(id, x, y);
    const c = model.components.find((q) => q.id === id),
      body = document.getElementById('insBody');
    if (c && body && !body.querySelector('.ux-lockrow')) {
      const actions = body.querySelector('.ins-actions');
      if (componentHasOrientation(c)) {
        const orow = document.createElement('div');
        orow.className = 'ux-orientrow';
        const o = componentOrientation(c);
        orow.innerHTML = `<div class="ux-orientlabel">Orientation · beam travels +z</div><div class="ux-orientseg"><button data-o="1" class="${o === 1 ? 'active' : ''}">→ Forward</button><button data-o="-1" class="${o === -1 ? 'active' : ''}">← Reversed</button></div>`;
        body.insertBefore(orow, actions);
        orow.querySelectorAll('button').forEach(
          (b) =>
            (b.onclick = () => {
              const no = +b.dataset.o;
              if (no === componentOrientation(c)) return;
              ui.pushUndo('Reverse component');
              setComponentOrientation(c, no);
              ui.rebuildBench();
              ui.openInspector(c.id);
              ui.benchToast(`${c.name} · ${no === 1 ? 'Forward' : 'Reversed'}`);
            }),
        );
      }
      const row = document.createElement('div');
      row.className = 'ux-lockrow';
      row.innerHTML = `<span>Axial position</span><label class="ux-switch"><input type="checkbox" ${c.locked ? 'checked' : ''}> Lock z</label>`;
      body.insertBefore(row, actions);
      row.querySelector('input').onchange = (e) => {
        ui.pushUndo(e.target.checked ? 'Lock component' : 'Unlock component');
        c.locked = e.target.checked;
        ui.renderBenchList();
        view.refreshSelectionRings();
      };
    }
    ui.updateStatusBar();
  };

  function srcDockRow(label, id, unit, step = '.1') {
    const e = document.getElementById(id);
    return ui.inspectorRow(label, id, e.value, unit, step);
  }

  function openSourceInspector() {
    model.selectedComponentId = ui.SOURCE_ID;
    view.refreshSelectionRings();
    document.getElementById('dockEmpty').style.display = 'none';
    const box = document.getElementById('componentInspector');
    box.classList.add('show');
    document.getElementById('insTitle').textContent = sourceName();
    document.getElementById('insKind').textContent =
      'source · first-class bench object';
    const pt = document.getElementById('stPt').checked;
    let h = `<div class="source-type-row"><button data-st="collimated" class="${pt ? '' : 'active'}">Collimated</button><button data-st="point" class="${pt ? 'active' : ''}">Point</button></div>`;
    if (pt) {
      h +=
        '<div class="ins-section">Position</div>' +
        srcDockRow('X', 'sPX', 'mm') +
        srcDockRow('Y', 'sPY', 'mm') +
        srcDockRow('Z', 'sPZ', 'mm') +
        '<div class="ins-section">Direction</div>' +
        srcDockRow('Aim X', 'sPtDirX', '°') +
        srcDockRow('Aim Y', 'sPtDirY', '°') +
        '<div class="ins-section">Emission</div>' +
        srcDockRow('NA', 'sPtNA', '', '.01') +
        '<div class="source-dock-note">The point source emits a physical 3D cone. Moving optics does not retarget its rays.</div>';
    } else {
      h +=
        '<div class="ins-section">Field direction</div>' +
        srcDockRow('Field X', 'sFieldX', '°') +
        srcDockRow('Field Y', 'sField', '°') +
        '<div class="source-dock-note">Collimated rays are parallel at object space and are aimed to the physical system stop using the real-ray pupil solver.</div>';
    }
    document.getElementById('insBody').innerHTML = h;
    box.querySelectorAll('.source-type-row button').forEach(
      (b) =>
        (b.onclick = () => {
          ui.pushUndo('Change source type');
          const e = document.getElementById(
            b.dataset.st === 'point' ? 'stPt' : 'stColl',
          );
          e.checked = true;
          e.dispatchEvent(new Event('change'));
          openSourceInspector();
          ui.renderBenchList();
        }),
    );
    box.querySelectorAll('input[data-prop]').forEach(
      (inp) =>
        (inp.onchange = () => {
          ui.pushUndo('Edit source');
          const target = document.getElementById(inp.dataset.prop);
          target.value = inp.value;
          target.dispatchEvent(new Event('input'));
          ui.renderBenchList();
          ui.renderRuler();
          ui.updateStatusBar();
        }),
    );
    document.getElementById('insClose').onclick = showDockEmpty;
    ui.renderBenchList();
    ui.updateStatusBar();
  }

  const oldApplyInspectorValue = ui.applyInspectorValue;

  ui.applyInspectorValue = function (c, key, val) {
    ui.pushUndo(`Edit ${c.name}`);
    oldApplyInspectorValue(c, key, val);
    ui.renderRuler();
    ui.updateStatusBar();
  };

  const oldCreateLibraryComponent = bench.createLibraryComponent;

  bench.createLibraryComponent = function (id, z) {
    ui.pushUndo('Add component');
    return oldCreateLibraryComponent(id, z);
  };

  const oldDuplicateComponent = ui.duplicateComponent;

  ui.duplicateComponent = function (id) {
    ui.pushUndo('Duplicate component');
    return oldDuplicateComponent(id);
  };

  const oldDeleteComponent = ui.deleteComponent;

  ui.deleteComponent = function (id) {
    ui.pushUndo('Delete component');
    return oldDeleteComponent(id);
  };

  function focusComponent(c) {
    const z = c.z + componentLength(c) / 2,
      r = Math.max(8, componentRadius(c) * 2.8);
    view.controls.target.set(0, 0, z);
    view.camera.position.set(r, Math.max(7, r * 0.35), z - r * 0.4);
    view.controls.update();
  }

  const oldUpdateSourceVisualization = view.updateSourceVisualization;

  view.updateSourceVisualization = function (...a) {
    oldUpdateSourceVisualization(...a);
    if (a[0] === 'point') {
      const marker = view.sourceGrp.children.find(
        (o) => o.isMesh && o.geometry?.type === 'SphereGeometry',
      );
      if (marker) {
        marker.userData.sourcePick = true;
        marker.userData.componentId = ui.SOURCE_ID;
      }
    } else {
      const ep = optics.entrancePupil(0.5875618),
        z =
          (ep.finite ? ep.z : model.surfaces[0]?.z || 0) -
          Math.max(18, (isFinite(ep.diameter) ? ep.diameter : model.epd) * 0.8),
        r = Math.max(3, (isFinite(ep.diameter) ? ep.diameter : model.epd) / 2),
        fy = +document.getElementById('sField').value,
        fx = +document.getElementById('sFieldX').value,
        { C } = sourceBasis(fy, fx),
        dir = new THREE.Vector3(...C);
      const disk = new THREE.Mesh(
        new THREE.CircleGeometry(r, 48),
        new THREE.MeshBasicMaterial({
          color: 0x9bc9ff,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      disk.position.z = z;
      disk.userData.sourcePick = true;
      disk.userData.componentId = ui.SOURCE_ID;
      view.sourceGrp.add(disk);
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 64 }, (_, i) => {
            const q = (2 * Math.PI * i) / 64;
            return new THREE.Vector3(r * Math.cos(q), r * Math.sin(q), z);
          }),
        ),
        new THREE.LineBasicMaterial({
          color: 0x9bc9ff,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      );
      view.sourceGrp.add(ring);
      const ar = new THREE.ArrowHelper(
        dir,
        new THREE.Vector3(0, 0, z),
        Math.max(9, r * 0.9),
        0x9bc9ff,
        0.8,
        0.45,
      );
      view.sourceGrp.add(ar);
      const lab = view.makeLabelSprite('COLLIMATED SOURCE');
      lab.position.set(0, r + 2, z);
      view.sourceGrp.add(lab);
    }
  };

  function hitSource(ev) {
    ui.pointerNDC(ev);
    ui.benchRaycaster.setFromCamera(ui.benchMouse, view.camera);
    return (
      ui.benchRaycaster
        .intersectObjects(view.sourceGrp.children, true)
        .find((h) => h.object.userData?.sourcePick) || null
    );
  }

  function componentHoverText(c) {
    const d = c.params?.diameter || componentRadius(c) * 2,
      ori = componentHasOrientation(c)
        ? ` · ${componentOrientation(c) === 1 ? '→ Forward' : '← Reversed'}`
        : '';
    return `<b>${escapeHTML(c.name)}</b><span class="hv">z ${c.z.toFixed(2)} mm</span> · Ø${(+d).toFixed(1)} mm${ori}<br>${c.locked ? 'Locked · ' : ''}drag to reposition · double-click to focus`;
  }
  Object.assign(ui, {
    sourceName,
    selectObject,
    showDockEmpty,
    srcDockRow,
    openSourceInspector,
    focusComponent,
    hitSource,
    componentHoverText,
  });
  return function bindEvents() {
    view.canvas.addEventListener(
      'pointerdown',
      () => {
        if (ui.dragComponent && !ui.componentDragSnapshot)
          ui.componentDragSnapshot = ui.captureState('Move component');
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointerup',
      (ev) => {
        if (ui.dragMoved && ui.componentDragSnapshot)
          ui.pushSnapshot(ui.componentDragSnapshot);
        ui.componentDragSnapshot = null;
        if (!ui.dragMoved) {
          const c = ui.hitComponent(ev);
          if (c) selectObject(c.id);
        }
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'dblclick',
      (ev) => {
        const c = ui.hitComponent(ev);
        if (c) {
          focusComponent(c);
          selectObject(c.id);
        }
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointerdown',
      (ev) => {
        if (!hitSource(ev)) return;
        model.selectedComponentId = ui.SOURCE_ID;
        openSourceInspector();
        if (!document.getElementById('stPt').checked) {
          ev.preventDefault();
          return;
        }
        ui.sourceDrag = {
          start: ui.captureState('Move source'),
          z: +document.getElementById('sPZ').value,
          moved: false,
          pid: ev.pointerId,
        };
        view.controls.enabled = false;
        view.canvas.setPointerCapture?.(ev.pointerId);
        ev.preventDefault();
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointermove',
      (ev) => {
        if (!ui.sourceDrag) return;
        let z = ui.axisZFromPointer(ev),
          e = document.getElementById('sPZ');
        z = Math.max(+e.min, Math.min(+e.max, bench.snapZ(z)));
        if (Math.abs(z - ui.sourceDrag.z) > 0.001) ui.sourceDrag.moved = true;
        e.value = z;
        e.dispatchEvent(new Event('input'));
        ui.renderRuler();
        ui.renderBenchList();
        ev.preventDefault();
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointerup',
      (ev) => {
        if (!ui.sourceDrag) return;
        const d = ui.sourceDrag;
        ui.sourceDrag = null;
        view.controls.enabled = true;
        view.canvas.releasePointerCapture?.(ev.pointerId);
        if (d.moved) ui.pushSnapshot(d.start);
        openSourceInspector();
        ev.preventDefault();
      },
      { capture: true },
    );
    view.canvas.addEventListener(
      'pointermove',
      (ev) => {
        const tip = document.getElementById('uxHoverTip'),
          read = document.getElementById('dragReadout'),
          r = view.vp.getBoundingClientRect();
        if (ui.dragComponent && ui.dragMoved) {
          tip.style.display = 'none';
          const c = ui.dragComponent.c,
            ord = [...model.components].sort((a, b) => a.z - b.z),
            i = ord.findIndex((x) => x.id === c.id),
            left =
              i > 0 ? c.z - (ord[i - 1].z + componentLength(ord[i - 1])) : null,
            right =
              i < ord.length - 1
                ? ord[i + 1].z - (c.z + componentLength(c))
                : null;
          read.innerHTML = `${escapeHTML(c.name)} · <b>z ${c.z.toFixed(1)} mm</b>${left != null ? ` · ← ${Math.max(0, left).toFixed(1)}` : ''}${right != null ? ` · ${Math.max(0, right).toFixed(1)} →` : ''}`;
          read.style.left =
            Math.min(
              view.vp.clientWidth - 210,
              Math.max(8, ev.clientX - r.left + 12),
            ) + 'px';
          read.style.top =
            Math.min(
              view.vp.clientHeight - 50,
              Math.max(8, ev.clientY - r.top + 12),
            ) + 'px';
          read.style.display = 'block';
          return;
        }
        if (ui.sourceDrag) {
          tip.style.display = 'none';
          read.innerHTML = `Point source · <b>z ${(+document.getElementById('sPZ').value).toFixed(1)} mm</b>`;
          read.style.left =
            Math.min(
              view.vp.clientWidth - 180,
              Math.max(8, ev.clientX - r.left + 12),
            ) + 'px';
          read.style.top =
            Math.min(
              view.vp.clientHeight - 50,
              Math.max(8, ev.clientY - r.top + 12),
            ) + 'px';
          read.style.display = 'block';
          return;
        }
        read.style.display = 'none';
        const c = ui.hitComponent(ev),
          sh = hitSource(ev);
        if (c) {
          tip.innerHTML = componentHoverText(c);
          tip.style.left =
            Math.min(
              view.vp.clientWidth - 185,
              Math.max(8, ev.clientX - r.left + 12),
            ) + 'px';
          tip.style.top =
            Math.min(
              view.vp.clientHeight - 78,
              Math.max(8, ev.clientY - r.top + 12),
            ) + 'px';
          tip.style.display = 'block';
        } else if (sh) {
          tip.innerHTML = `<b>${sourceName()}</b>${document.getElementById('stPt').checked ? `<span class="hv">z ${(+document.getElementById('sPZ').value).toFixed(1)} mm</span><br>Drag axially · click to edit` : 'Parallel object-space rays<br>Click to edit field direction'}`;
          tip.style.left =
            Math.min(
              view.vp.clientWidth - 185,
              Math.max(8, ev.clientX - r.left + 12),
            ) + 'px';
          tip.style.top =
            Math.min(
              view.vp.clientHeight - 78,
              Math.max(8, ev.clientY - r.top + 12),
            ) + 'px';
          tip.style.display = 'block';
        } else tip.style.display = 'none';
      },
      { capture: false },
    );
    view.canvas.addEventListener('pointerleave', () => {
      document.getElementById('uxHoverTip').style.display = 'none';
      document.getElementById('dragReadout').style.display = 'none';
    });
    view.canvas.addEventListener(
      'pointerup',
      () => {
        document.getElementById('dragReadout').style.display = 'none';
      },
      { capture: false },
    );
    view.canvas.addEventListener('contextmenu', (ev) => {
      const c = ui.hitComponent(ev),
        src = hitSource(ev);
      if (!c && !src) return;
      ev.preventDefault();
      const menu = document.getElementById('uxContext');
      if (src) {
        menu.innerHTML =
          '<button class="ctx-item" data-a="edit">Edit source</button>';
        menu.querySelector('[data-a="edit"]').onclick = () => {
          openSourceInspector();
          menu.classList.remove('show');
        };
      } else {
        selectObject(c.id);
        menu.innerHTML = `<button class="ctx-item" data-a="edit">Edit properties</button><button class="ctx-item" data-a="reverse" ${componentHasOrientation(c) ? '' : 'disabled'}>${componentOrientation(c) === 1 ? 'Reverse orientation' : 'Set forward orientation'}</button><button class="ctx-item" data-a="dup" ${c.kind === 'detector' ? 'disabled' : ''}>Duplicate</button><button class="ctx-item" data-a="lock">${c.locked ? 'Unlock position' : 'Lock position'}</button><div class="ctx-sep"></div><button class="ctx-item danger" data-a="del" ${c.kind === 'detector' ? 'disabled' : ''}>Delete</button>`;
        menu.querySelector('[data-a="edit"]').onclick = () => {
          ui.openInspector(c.id);
          menu.classList.remove('show');
        };
        const rev = menu.querySelector('[data-a="reverse"]');
        if (rev && !rev.disabled)
          rev.onclick = () => {
            ui.pushUndo('Reverse component');
            setComponentOrientation(c, -componentOrientation(c));
            ui.rebuildBench();
            ui.openInspector(c.id);
            ui.benchToast(
              `${c.name} · ${componentOrientation(c) === 1 ? 'Forward' : 'Reversed'}`,
            );
            menu.classList.remove('show');
          };
        const dup = menu.querySelector('[data-a="dup"]');
        if (!dup.disabled)
          dup.onclick = () => {
            ui.duplicateComponent(c.id);
            menu.classList.remove('show');
          };
        menu.querySelector('[data-a="lock"]').onclick = () => {
          ui.pushUndo(c.locked ? 'Unlock component' : 'Lock component');
          c.locked = !c.locked;
          ui.renderBenchList();
          ui.openInspector(c.id);
          menu.classList.remove('show');
        };
        const del = menu.querySelector('[data-a="del"]');
        if (!del.disabled)
          del.onclick = () => {
            ui.deleteComponent(c.id);
            menu.classList.remove('show');
          };
      }
      menu.style.left = Math.min(window.innerWidth - 160, ev.clientX) + 'px';
      menu.style.top = Math.min(window.innerHeight - 150, ev.clientY) + 'px';
      menu.classList.add('show');
    });
    document.addEventListener('pointerdown', (e) => {
      const m = document.getElementById('uxContext');
      if (m && !e.target.closest('#uxContext')) m.classList.remove('show');
    });
  };
}
