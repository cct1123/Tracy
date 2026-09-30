// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import {
  componentHasOrientation,
  componentOrientation,
  setComponentOrientation,
} from '../model/components.js';

export function installShell({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  const narrowLayout = window.matchMedia('(max-width: 820px)');
  let wideDockState = null;

  function syncResponsiveDocks(narrow = narrowLayout.matches) {
    const app = document.getElementById('app');
    if (!app) return;
    if (narrow) {
      if (!wideDockState)
        wideDockState = {
          left: app.classList.contains('left-collapsed'),
          right: app.classList.contains('right-collapsed'),
        };
      app.classList.add('left-collapsed', 'right-collapsed');
    } else if (wideDockState) {
      app.classList.toggle('left-collapsed', wideDockState.left);
      app.classList.toggle('right-collapsed', wideDockState.right);
      wideDockState = null;
    }
  }

  function buildShell() {
    const body = document.body,
      app = document.getElementById('app'),
      panel = document.getElementById('panel'),
      vp = document.getElementById('vp');
    syncResponsiveDocks();
    const top = document.createElement('div');
    top.id = 'uxTopbar';
    top.innerHTML = `
    <div class="ux-brand"><strong>Tracy</strong><small>Optical workbench</small></div>
    <button class="ux-btn" id="uxLeft" aria-label="Toggle system and catalog" title="Toggle system and catalog">☰</button>
    <button class="ux-btn" id="uxRight" aria-label="Toggle properties" title="Toggle properties">◨</button>
    <nav class="toolbar-groups" aria-label="Workbench tools">
      <details class="toolbar-group" id="projectGroup"><summary>Project</summary><div class="toolbar-menu" id="projectTools">
        <label class="toolbar-field" for="projectName">Local project name<input id="projectName" maxlength="120" value="Untitled project"></label>
        <button class="ux-btn" id="uxLocalSave">Save named project</button>
        <label class="toolbar-field" for="localProjectList">Saved on this device<select id="localProjectList"><option value="">Choose a project…</option></select></label>
        <button class="ux-btn" id="uxLocalLoad">Open named project</button>
        <button class="ux-btn" id="uxNewProject">New local copy</button>
        <div class="toolbar-divider"></div>
        <button class="ux-btn" id="uxOpen">Import Lens · ZMX / ZAR</button>
        <button class="ux-btn" id="uxProjectLoad" title="Import JSON · Ctrl/Cmd+O">Import Project JSON</button>
        <button class="ux-btn" id="uxProjectSave" title="Export JSON · Ctrl/Cmd+S">Export Project JSON</button>
        <p class="mini-note">Autosave stays in this browser. Export JSON for a portable backup. Browser storage can be cleared or evicted; no project data is uploaded.</p>
      </div></details>
      <details class="toolbar-group"><summary>Source</summary><div class="toolbar-menu" id="sourceTools">
        <button class="ux-btn" data-pop="sourcePop">Source &amp; sampling</button>
        <button class="ux-btn" data-pop="wavePop">Wavelengths · <span id="uxWaveLabel">587.6 nm</span></button>
      </div></details>
      <details class="toolbar-group"><summary>Trace</summary><div class="toolbar-menu" id="traceTools">
        <label class="toolbar-field" for="uxEngine">Engine<select class="ux-select" id="uxEngine"><option value="fresnel">Uncoated Fresnel + Ghosts (Coaxial)</option><option value="sequential">Sequential geometric</option></select></label>
        <label class="toolbar-field" for="uxRays">Analysis samples per wavelength<select class="ux-select" id="uxRays"><option value="9">9</option><option value="25">25</option><option value="49">49</option><option value="97">97</option><option value="271">271</option><option value="601">601</option><option value="1201">1,201</option><option value="2501">2,501</option><option value="5001">5,001</option></select></label>
        <p class="mini-note">Geometric optics · scalar isotropic materials · no diffraction.</p>
      </div></details>
      <details class="toolbar-group"><summary>Analysis</summary><div class="toolbar-menu" id="analysisTools">
        <button class="ux-btn" id="uxAnalysis">Show analysis &amp; focus tools</button>
        <button class="ux-btn" id="uxFocus">Focus Scan</button>
        <button class="ux-btn" id="uxCompare">A/B system comparison</button>
      </div></details>
      <details class="toolbar-group"><summary>View</summary><div class="toolbar-menu" id="viewTools">
        <button class="ux-btn" id="uxLayout">Layout · 1</button><button class="ux-btn" id="ux3D">3D · 2</button><button class="ux-btn" id="uxFront">Front · 3</button><button class="ux-btn" id="uxFit">Fit · F</button>
        <button class="ux-btn" data-pop="viewPop">Geometry display settings</button>
        <label class="toolbar-field" for="uxSnap">Axial placement grid<select class="ux-select" id="uxSnap"><option value="0.05">0.05 mm</option><option value="0.1" selected>0.10 mm</option><option value="0.25">0.25 mm</option><option value="0.5">0.50 mm</option><option value="1">1 mm</option><option value="5">5 mm</option></select></label>
        <button class="ux-btn" id="uxTheme" title="Switch day/night mode"><span class="theme-glyph">☾</span><span class="theme-copy">Night</span></button>
      </div></details>
    </nav>
    <div class="ux-spacer"></div>
    <span id="projectSaveState" role="status" aria-live="polite">Local project</span>
    <button class="ux-btn" id="uxUndo" aria-label="Undo" title="Undo · Ctrl/Cmd+Z">↶</button>
    <button class="ux-btn" id="uxRedo" aria-label="Redo" title="Redo · Ctrl/Cmd+Shift+Z">↷</button>`;
    body.insertBefore(top, app);
    const updateToolbarHeight = () =>
      document.documentElement.style.setProperty(
        '--toolbar-height',
        `${top.getBoundingClientRect().height}px`,
      );
    new ResizeObserver(updateToolbarHeight).observe(top);
    updateToolbarHeight();
    const center = document.createElement('div');
    center.id = 'uxCenter';
    app.insertBefore(center, vp);
    center.appendChild(vp);
    const ruler = document.createElement('div');
    ruler.id = 'uxRuler';
    ruler.innerHTML =
      '<div class="ruler-title">Optical axis · z (mm)</div><div id="rulerTrack"></div><div id="rulerDistances"></div>';
    center.appendChild(ruler);
    const analysis = document.createElement('div');
    analysis.id = 'analysisDrawer';
    analysis.innerHTML = `<button type="button" class="analysis-head" id="analysisToggle" aria-expanded="true"><span class="analysis-title">Analysis</span><span class="analysis-summary"><span>RMS <b id="aRms">—</b></span><span>Sampled power <b id="aPower">—</b></span><span>Vignetted <b id="aVig">—</b></span></span><span class="analysis-caret">▾</span></button><div class="analysis-body"><div id="analysisSpotSlot"></div><div class="analysis-metrics"><div class="metric-card"><div class="mk">RMS spot radius</div><div class="mv" id="mRms">—</div></div><div class="metric-card"><div class="mk">Primary sampled-bundle power</div><div class="mv" id="mPower">—</div></div><div class="metric-card"><div class="mk">Analysis rays</div><div class="mv" id="mTraced">—</div></div><div class="metric-card"><div class="mk">Vignetted samples</div><div class="mv" id="mVig">—</div></div><div class="metric-note">Geometric optics · uncoated interfaces · isotropic scalar refractive index · no diffraction. RMS is the weighted detector spot radius about its centroid. Primary sampled-bundle power is normalized to generated source samples; it is not automatically total source-power collection. Chief/display rays have no statistical weight.</div></div><div id="engineeringPanel"></div></div>`;
    center.appendChild(analysis);
    const spot = document.getElementById('spotPanel');
    document.getElementById('analysisSpotSlot').appendChild(spot);
    const aberr = document.getElementById('aberrPanel');
    document.getElementById('analysisSpotSlot').appendChild(aberr);
    const right = document.createElement('aside');
    right.id = 'rightDock';
    right.innerHTML =
      '<div class="dock-head"><span class="dock-title">Properties</span><span style="font:8px DM Mono;color:var(--tlo)">select an object</span></div><div class="dock-empty" id="dockEmpty">Select a source, lens, aperture, or detector.<br><br>Drag objects along the optical axis.<br>Double-click an object to focus the camera.</div>';
    app.appendChild(right);
    right.appendChild(document.getElementById('componentInspector'));
    const status = document.createElement('div');
    status.id = 'uxStatus';
    status.innerHTML =
      '<span id="stObjects">—</span><span id="stSurfaces">—</span><span id="stPupil">—</span><span id="stTrace">—</span><span id="stSelection"></span>';
    body.appendChild(status);
    const tools = document.createElement('div');
    tools.className = 'ux-canvas-tools';
    tools.innerHTML =
      '<button class="ux-canvas-pill" id="canvasLayout">1 · Layout</button><button class="ux-canvas-pill" id="canvas3D">2 · 3D</button><button class="ux-canvas-pill" id="canvasFit">F · Fit</button>';
    vp.appendChild(tools);
    const hover = document.createElement('div');
    hover.id = 'uxHoverTip';
    vp.appendChild(hover);
    const dr = document.createElement('div');
    dr.id = 'dragReadout';
    vp.appendChild(dr);
    const ctx = document.createElement('div');
    ctx.id = 'uxContext';
    body.appendChild(ctx);
    const projectInput = document.createElement('input');
    projectInput.type = 'file';
    projectInput.id = 'projectFileIn';
    projectInput.accept = '.json,application/json';
    projectInput.style.display = 'none';
    body.appendChild(projectInput);

    // Keep only file + component library in the permanent left dock; move the rest into toolbar popovers.
    const sections = [...panel.querySelectorAll(':scope > .sec')];
    const byName = (n) =>
      sections.find((s) => s.querySelector('.slab')?.textContent.trim() === n);
    const sourceSec = byName('Light Source'),
      waveSec = byName('Wavelengths'),
      viewSec = byName('Geometry'),
      sysSec = byName('System');
    const mkPop = (id, sec, left) => {
      const pop = document.createElement('div');
      pop.className = 'ux-pop';
      pop.id = id;
      pop.style.left = left + 'px';
      body.appendChild(pop);
      if (sec) pop.appendChild(sec);
      return pop;
    };
    mkPop('sourcePop', sourceSec, 285);
    mkPop('wavePop', waveSec, 382);
    mkPop('viewPop', viewSec, Math.max(580, window.innerWidth - 320));
    const librarySec = byName('Component Library');
    const importSec = byName('Import Lens');
    const nav = document.createElement('div');
    nav.className = 'dock-tabs';
    nav.setAttribute('role', 'tablist');
    nav.innerHTML =
      '<button id="benchTab" role="tab" aria-selected="true" aria-controls="benchPane">System / Bench</button><button id="catalogTab" role="tab" aria-selected="false" aria-controls="catalogPane">Catalog</button>';
    panel.prepend(nav);
    panel.querySelector('.logo')?.remove();
    const benchPane = document.createElement('section');
    benchPane.id = 'benchPane';
    benchPane.setAttribute('role', 'tabpanel');
    benchPane.setAttribute('aria-labelledby', 'benchTab');
    benchPane.innerHTML =
      '<div class="sec"><div class="slab">Bench objects</div><p class="mini-note">Select to edit. Left/Right arrows move by the grid step; Shift = 0.1× (min 0.001 mm), Alt = 10×. Shift also slows dragging for fine positioning.</p></div>';
    benchPane.firstElementChild.appendChild(
      document.getElementById('benchList'),
    );
    if (sysSec) benchPane.appendChild(sysSec);
    const catalogPane = document.createElement('section');
    catalogPane.id = 'catalogPane';
    catalogPane.hidden = true;
    catalogPane.setAttribute('role', 'tabpanel');
    catalogPane.setAttribute('aria-labelledby', 'catalogTab');
    if (librarySec) catalogPane.appendChild(librarySec);
    if (importSec) catalogPane.appendChild(importSec);
    panel.append(benchPane, catalogPane);
    if (librarySec) {
      librarySec.querySelector('.bench-tip')?.remove();
      const orphanLabel = [...librarySec.children].find(
        (child) => child.textContent.trim() === 'Bench objects',
      );
      orphanLabel?.remove();
    }
    const lib = document.getElementById('componentLibrary');
    const insertion = document.createElement('div');
    insertion.className = 'insertion-controls';
    insertion.innerHTML =
      '<label for="insertionZ">Insert at z (mm)</label><input id="insertionZ" type="number" step="0.1" min="-500" max="500" value="20" required><p class="mini-note">Click or press Enter on a component to add it here. Existing objects keep their positions. Drag to place on the axis.</p>';
    lib.parentNode.insertBefore(insertion, lib);
    const search = document.createElement('input');
    search.id = 'libSearch';
    search.placeholder = 'Filter local components…';
    search.setAttribute('aria-label', 'Filter local components');
    lib.parentNode.insertBefore(search, lib);
    ui.buildCatalogControls?.(lib.parentNode, lib);
  }

  function wireShell() {
    const groups = [...document.querySelectorAll('.toolbar-group')];
    groups.forEach((group) =>
      group.addEventListener('toggle', () => {
        if (!group.open) return;
        groups
          .filter((other) => other !== group)
          .forEach((other) => {
            other.open = false;
          });
        const menu = group.querySelector('.toolbar-menu');
        const rect = group.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(320, window.innerWidth - 16) - 8))}px`;
        menu.style.top = `${document.getElementById('uxTopbar').getBoundingClientRect().bottom + 6}px`;
      }),
    );
    function showLeftPane(which) {
      for (const name of ['bench', 'catalog']) {
        document.getElementById(`${name}Pane`).hidden = name !== which;
        document
          .getElementById(`${name}Tab`)
          .setAttribute('aria-selected', String(name === which));
      }
      document.getElementById('app').classList.remove('left-collapsed');
      if (narrowLayout.matches)
        document.getElementById('app').classList.add('right-collapsed');
    }
    ui.showCatalog = () => showLeftPane('catalog');
    for (const name of ['bench', 'catalog']) {
      const tab = document.getElementById(`${name}Tab`);
      tab.onclick = () => showLeftPane(name);
      tab.onkeydown = (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const other = name === 'bench' ? 'catalog' : 'bench';
        showLeftPane(other);
        document.getElementById(`${other}Tab`).focus();
      };
    }
    document.getElementById('uxAnalysis').onclick = () => {
      document.getElementById('analysisDrawer').classList.remove('collapsed');
      document
        .getElementById('analysisToggle')
        .setAttribute('aria-expanded', 'true');
      groups.forEach((group) => {
        group.open = false;
      });
      document
        .getElementById('engineeringPanel')
        .scrollIntoView({ block: 'nearest' });
    };
    for (const [buttonId, panelId] of [
      ['uxFocus', 'focusTools'],
      ['uxCompare', 'comparisonTools'],
    ]) {
      document.getElementById(buttonId).onclick = () => {
        document.getElementById('uxAnalysis').click();
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.open = true;
          panel.scrollIntoView({ block: 'nearest' });
          panel.querySelector('summary')?.focus();
        }
      };
    }
    narrowLayout.addEventListener('change', (event) => {
      syncResponsiveDocks(event.matches);
      setTimeout(view.resize, 190);
    });
    document.getElementById('uxOpen').onclick = () =>
      document.getElementById('fileIn').click();
    document.getElementById('uxProjectLoad').onclick = () =>
      document.getElementById('projectFileIn').click();
    document.getElementById('uxProjectSave').onclick = ui.saveProjectJSON;
    document.getElementById('uxUndo').onclick = ui.undo;
    document.getElementById('uxRedo').onclick = ui.redo;
    document.getElementById('uxTheme').onclick = ui.toggleWorkbenchTheme;
    ui.syncThemeButton();
    document
      .getElementById('projectFileIn')
      .addEventListener('change', async function () {
        const f = this.files[0];
        if (f) await ui.loadProjectFile(f);
        this.value = '';
      });
    document.querySelectorAll('[data-pop]').forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const id = b.dataset.pop,
            p = document.getElementById(id),
            open = p.classList.contains('show');
          document
            .querySelectorAll('.ux-pop.show')
            .forEach((x) => x.classList.remove('show'));
          b.setAttribute('aria-expanded', String(!open));
          if (!open) {
            const left = b.getBoundingClientRect().left;
            groups.forEach((group) => {
              group.open = false;
            });
            p.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 300))}px`;
            p.style.top = `${document.getElementById('uxTopbar').getBoundingClientRect().bottom + 6}px`;
            p.classList.add('show');
            p.querySelector('input, button, select')?.focus();
          }
        }),
    );
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.toolbar-group'))
        groups.forEach((group) => {
          group.open = false;
        });
      if (!e.target.closest('.ux-pop') && !e.target.closest('[data-pop]'))
        document
          .querySelectorAll('.ux-pop.show')
          .forEach((x) => x.classList.remove('show'));
    });
    const app = document.getElementById('app');
    document.getElementById('uxLeft').onclick = () => {
      app.classList.toggle('left-collapsed');
      if (narrowLayout.matches && !app.classList.contains('left-collapsed'))
        app.classList.add('right-collapsed');
      setTimeout(view.resize, 190);
    };
    document.getElementById('uxRight').onclick = () => {
      app.classList.toggle('right-collapsed');
      if (narrowLayout.matches && !app.classList.contains('right-collapsed'))
        app.classList.add('left-collapsed');
      setTimeout(view.resize, 190);
    };
    const eng = document.getElementById('uxEngine');
    eng.value = document.querySelector('input[name="rayEngine"]:checked').value;
    eng.onchange = () => {
      const r = document.querySelector(
        `input[name="rayEngine"][value="${eng.value}"]`,
      );
      if (r) {
        r.checked = true;
        r.dispatchEvent(new Event('change'));
      }
    };
    const nr = document.getElementById('uxRays');
    nr.value = document.getElementById('nRays').value;
    nr.onchange = () => {
      document.getElementById('nRays').value = nr.value;
      document.getElementById('nRays').dispatchEvent(new Event('change'));
    };
    const snapSel = document.getElementById('uxSnap');
    snapSel.value = String(model.snapMm);
    snapSel.onchange = () => {
      model.snapMm = Math.max(0.001, +snapSel.value || 0.1);
      document.getElementById('axisDropHint').textContent =
        `Drop on axis · ${model.snapMm < 1 ? model.snapMm.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : model.snapMm} mm snap`;
      ui.renderRuler();
      ui.benchToast(`Z snap · ${model.snapMm} mm`);
    };
    const layout = () => view.setLayoutView(),
      d3 = () => view.resetCam(),
      front = () => view.setFrontView(),
      fit = () => view.fitBench();
    ['uxLayout', 'canvasLayout'].forEach(
      (id) => (document.getElementById(id).onclick = layout),
    );
    ['ux3D', 'canvas3D'].forEach(
      (id) => (document.getElementById(id).onclick = d3),
    );
    document.getElementById('uxFront').onclick = front;
    ['uxFit', 'canvasFit'].forEach(
      (id) => (document.getElementById(id).onclick = fit),
    );
    document.getElementById('analysisToggle').onclick = () => {
      const collapsed = document
        .getElementById('analysisDrawer')
        .classList.toggle('collapsed');
      document
        .getElementById('analysisToggle')
        .setAttribute('aria-expanded', String(!collapsed));
    };
    document
      .getElementById('libSearch')
      .addEventListener('input', (e) => ui.renderLibrary(e.target.value));
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        groups.forEach((group) => {
          if (group.open) {
            group.open = false;
            group.querySelector('summary').focus();
          }
        });
        document.querySelectorAll('.ux-pop.show').forEach((pop) => {
          pop.classList.remove('show');
          document.querySelector(`[data-pop="${pop.id}"]`)?.focus();
        });
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        ui.saveProjectJSON();
        return;
      }
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        document.getElementById('projectFileIn').click();
        return;
      }
      if (/input|select|textarea/i.test(e.target.tagName)) return;
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        model.selectedComponentId &&
        model.selectedComponentId !== ui.SOURCE_ID
      ) {
        e.preventDefault();
        ui.deleteComponent(model.selectedComponentId);
        ui.renderBenchList();
        ui.showDockEmpty();
        return;
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? ui.redo() : ui.undo();
        return;
      }
      if (e.key === '1') view.setLayoutView();
      else if (e.key === '2') view.resetCam();
      else if (e.key === '3') view.setFrontView();
      else if (e.key.toLowerCase() === 't') {
        ui.toggleWorkbenchTheme();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'f') view.fitBench();
      else if (
        e.key.toLowerCase() === 'r' &&
        model.selectedComponentId &&
        model.selectedComponentId !== ui.SOURCE_ID
      ) {
        const c = model.components.find(
          (q) => q.id === model.selectedComponentId,
        );
        if (c && componentHasOrientation(c)) {
          ui.pushUndo('Reverse component');
          setComponentOrientation(c, -componentOrientation(c));
          ui.rebuildBench();
          ui.openInspector(c.id);
          ui.benchToast(
            `${c.name} · ${componentOrientation(c) === 1 ? 'Forward' : 'Reversed'}`,
          );
          e.preventDefault();
        }
      } else if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        model.selectedComponentId
      ) {
        const sourceSelected = model.selectedComponentId === ui.SOURCE_ID;
        const c = model.components.find(
          (q) => q.id === model.selectedComponentId,
        );
        if (!sourceSelected && (!c || c.locked)) return;
        ui.pushUndo(sourceSelected ? 'Move source' : 'Move component');
        const step = e.shiftKey
          ? Math.max(0.001, model.snapMm / 10)
          : e.altKey
            ? model.snapMm * 10
            : model.snapMm;
        const delta = e.key === 'ArrowRight' ? step : -step;
        if (sourceSelected) {
          ui.setSourceZ(+document.getElementById('sPZ').value + delta);
          ui.openSourceInspector();
        } else {
          c.z = bench.snapZ(c.z + delta, 0);
          ui.rebuildBench();
          ui.openInspector(c.id);
        }
        e.preventDefault();
      }
    });
  }
  Object.assign(ui, { buildShell, wireShell, syncResponsiveDocks });
  return function bindEvents() {};
}
