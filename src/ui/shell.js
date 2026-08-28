// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
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
  function buildShell() {
    const body = document.body,
      app = document.getElementById('app'),
      panel = document.getElementById('panel'),
      vp = document.getElementById('vp');
    const top = document.createElement('div');
    top.id = 'uxTopbar';
    top.innerHTML = `
    <div class="ux-brand"><strong>Soft <em>Ether</em></strong><small>Optical workbench</small></div>
    <div class="ux-divider"></div>
    <button class="ux-btn" id="uxOpen"><span class="ux-icon">⇧</span><span class="ux-text">Import Lens</span></button>
    <button class="ux-btn" id="uxProjectLoad" title="Load Soft Ether project · Ctrl/Cmd+O"><span class="ux-icon">↥</span><span class="ux-text">Load Project</span></button>
    <button class="ux-btn" id="uxProjectSave" title="Save Soft Ether project · Ctrl/Cmd+S"><span class="ux-icon">↧</span><span class="ux-text">Save Project</span></button>
    <button class="ux-btn" id="uxUndo" title="Undo · Ctrl/Cmd+Z"><span class="ux-icon">↶</span></button>
    <button class="ux-btn" id="uxRedo" title="Redo · Ctrl/Cmd+Shift+Z"><span class="ux-icon">↷</span></button>
    <div class="ux-divider"></div>
    <button class="ux-btn" data-pop="sourcePop"><span class="ux-icon">●</span><span class="ux-text">Source</span></button>
    <button class="ux-btn" data-pop="wavePop"><span class="ux-icon">λ</span><span id="uxWaveLabel">587.6 nm</span></button>
    <span class="ux-quicklabel">Engine</span><select class="ux-select" id="uxEngine"><option value="fresnel">Fresnel 3D</option><option value="sequential">Sequential</option></select>
    <span class="ux-quicklabel">Rays</span><select class="ux-select" id="uxRays"><option value="9">9</option><option value="25">25</option><option value="49">49</option><option value="97">97</option><option value="271">271</option><option value="601">601</option><option value="1201">1.2k</option><option value="2501">2.5k</option><option value="5001">5k</option></select>
    <span class="ux-quicklabel">Z snap</span><select class="ux-select" id="uxSnap" title="Axial placement grid"><option value="0.05">0.05 mm</option><option value="0.1" selected>0.10 mm</option><option value="0.25">0.25 mm</option><option value="0.5">0.50 mm</option><option value="1">1 mm</option><option value="5">5 mm</option></select>
    <div class="ux-spacer"></div>
    <button class="ux-btn" id="uxLayout">Layout</button><button class="ux-btn" id="ux3D">3D</button><button class="ux-btn" id="uxFront">Front</button><button class="ux-btn" id="uxFit">Fit</button>
    <button class="ux-btn" data-pop="viewPop"><span class="ux-icon">⚙</span><span class="ux-text">View</span></button>
    <button class="ux-btn" id="uxTheme" title="Switch day/night mode"><span class="theme-glyph">☾</span><span class="theme-copy">Night</span></button>
    <button class="ux-btn" id="uxLeft" title="Toggle library">◧</button><button class="ux-btn" id="uxRight" title="Toggle properties">◨</button>`;
    body.insertBefore(top, app);
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
    analysis.innerHTML = `<div class="analysis-head" id="analysisToggle"><span class="analysis-title">Analysis</span><span class="analysis-summary"><span>RMS <b id="aRms">—</b></span><span>Throughput <b id="aPower">—</b></span><span>Vignetted <b id="aVig">—</b></span></span><span class="analysis-caret">▾</span></div><div class="analysis-body"><div id="analysisSpotSlot"></div><div class="analysis-metrics"><div class="metric-card"><div class="mk">RMS spot radius</div><div class="mv" id="mRms">—</div></div><div class="metric-card"><div class="mk">Throughput</div><div class="mv" id="mPower">—</div></div><div class="metric-card"><div class="mk">Traced rays</div><div class="mv" id="mTraced">—</div></div><div class="metric-card"><div class="mk">Vignetted</div><div class="mv" id="mVig">—</div></div><div class="metric-note">All analysis values are recomputed from the current ray trace. RMS is evaluated from every primary detector hit even when the spot plot is hidden; Fresnel throughput is primary power delivered to the detector divided by emitted ray power. Spot colors follow ray wavelengths. The aberration panel now mirrors the image-plane spot styling: one shared plot window with the same grid language, restrained annotation, and wavelength-colored spots whose brightness and size are modulated by relative optical path difference referenced to the chief or nearest-axis ray for that wavelength.</div></div></div>`;
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
    if (sysSec) sysSec.classList.add('ux-hide-panel');
    const lib = document.getElementById('componentLibrary');
    const search = document.createElement('input');
    search.id = 'libSearch';
    search.placeholder = 'Search lenses & components…';
    lib.parentNode.insertBefore(search, lib);
  }

  function wireShell() {
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
          if (!open) p.classList.add('show');
        }),
    );
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.ux-pop') && !e.target.closest('[data-pop]'))
        document
          .querySelectorAll('.ux-pop.show')
          .forEach((x) => x.classList.remove('show'));
    });
    const app = document.getElementById('app');
    document.getElementById('uxLeft').onclick = () => {
      app.classList.toggle('left-collapsed');
      setTimeout(view.resize, 190);
    };
    document.getElementById('uxRight').onclick = () => {
      app.classList.toggle('right-collapsed');
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
    document.getElementById('analysisToggle').onclick = () =>
      document.getElementById('analysisDrawer').classList.toggle('collapsed');
    document
      .getElementById('libSearch')
      .addEventListener('input', (e) => ui.renderLibrary(e.target.value));
    document.addEventListener('keydown', (e) => {
      if (/input|select|textarea/i.test(e.target.tagName)) return;
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
        model.selectedComponentId &&
        model.selectedComponentId !== ui.SOURCE_ID
      ) {
        const c = model.components.find(
          (q) => q.id === model.selectedComponentId,
        );
        if (!c || c.locked) return;
        ui.pushUndo('Move component');
        const step = e.altKey
          ? Math.max(0.001, model.snapMm / 10)
          : e.shiftKey
            ? model.snapMm * 10
            : model.snapMm;
        c.z = bench.clampDraggedZ(
          c,
          c.z + (e.key === 'ArrowRight' ? step : -step),
        );
        ui.rebuildBench();
        ui.openInspector(c.id);
        e.preventDefault();
      }
    });
  }
  Object.assign(ui, { buildShell, wireShell });
  return function bindEvents() {};
}
