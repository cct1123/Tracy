// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { wlToHex, WL_VALS } from '../core/wavelengths.js';

export function installControls({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function updateSlider(id, valId, fmt) {
    const el = document.getElementById(id);
    const vl = document.getElementById(valId);
    function upd() {
      const v = parseFloat(el.value);
      vl.textContent = fmt(v);
      const pct =
        (100 * (v - parseFloat(el.min))) /
        (parseFloat(el.max) - parseFloat(el.min));
      el.style.background = `linear-gradient(to right,rgba(160,128,240,.5) ${pct}%,rgba(255,255,255,.05) ${pct}%)`;
    }
    el.addEventListener('input', upd);
    upd();
  }

  function snapSrcAxis() {
    const prev = !!session.suspendTrace;
    session.suspendTrace = true;
    document.getElementById('sPX').value = 0;
    document.getElementById('sPY').value = 0;
    ['sPX', 'sPY'].forEach((id) =>
      document.getElementById(id).dispatchEvent(new Event('input')),
    );
    session.suspendTrace = prev;
    if (!prev) view.buildRays();
  }

  function updateSourceZRange() {
    const el = document.getElementById('sPZ');
    if (!el || !model.surfaces.length) return;
    const first = model.surfaces[0].z,
      objD = isFinite(model.importMeta.objectDistance)
        ? Math.abs(model.importMeta.objectDistance)
        : 0,
      span = Math.max(
        120,
        objD + 20,
        Math.abs(model.surfaces.at(-1).z - first) + 80,
      );
    el.min = Math.floor(first - span);
    el.max = Math.ceil(first - 0.5);
    if (+el.value < +el.min) el.value = el.min;
    if (+el.value > +el.max) el.value = first - 20;
    el.dispatchEvent(new Event('input'));
  }

  function snapSrcFront() {
    const first = model.surfaces[0].z,
      z = first - 20,
      el = document.getElementById('sPZ');
    updateSourceZRange();
    el.value = Math.max(+el.min, Math.min(+el.max, z));
    el.dispatchEvent(new Event('input'));
    snapSrcAxis();
  }

  const RAY_CTRL = [
    'sField',
    'sFieldX',
    'nRays',
    'cbChief',
    'cbVig',
    'cbF',
    'cbD',
    'cbC',
    'cbCustom',
    'sWL',
    'sPY',
    'sPZ',
    'sPX',
    'sPtDirY',
    'sPtDirX',
    'sPtNA',
  ];
  Object.assign(ui, {
    updateSlider,
    snapSrcAxis,
    updateSourceZRange,
    snapSrcFront,
  });
  return function bindEvents() {
    updateSlider('sField', 'vField', (v) => `${v.toFixed(2)}°`);
    updateSlider('sFieldX', 'vFieldX', (v) => `${v.toFixed(2)}°`);
    updateSlider('sPY', 'vPY', (v) => `${v >= 0 ? '' : ''} ${v.toFixed(1)} mm`);
    updateSlider('sPZ', 'vPZ', (v) => `${v.toFixed(1)} mm`);
    updateSlider('sPX', 'vPX', (v) => `${v.toFixed(1)} mm`);
    updateSlider('sPtDirY', 'vPtDirY', (v) => `${v.toFixed(1)}°`);
    updateSlider('sPtDirX', 'vPtDirX', (v) => `${v.toFixed(1)}°`);
    updateSlider('sPtNA', 'vPtNA', (v) => v.toFixed(2));
    updateSlider('sGlass', 'vGlass', (v) => `${Math.round(v * 100)}%`);
    updateSlider('sWL', 'vWL', (v) => {
      const hex = '#' + wlToHex(v).toString(16).padStart(6, '0');
      document.getElementById('vWL').style.color = hex;
      return `${Math.round(v)} nm`;
    });
    document.querySelectorAll('input[name="srcType"]').forEach((r) => {
      r.addEventListener('change', () => {
        const isPt = document.getElementById('stPt').checked;
        document.getElementById('srcPos').classList.toggle('show', isPt);
        document.getElementById('collPos').classList.toggle('hide', isPt);
        view.buildRays();
      });
    });
    document
      .getElementById('cbGlass')
      .addEventListener(
        'change',
        (e) => (view.glassGrp.visible = e.target.checked),
      );
    document
      .getElementById('cbSurf')
      .addEventListener(
        'change',
        (e) => (view.surfGrp.visible = e.target.checked),
      );
    document
      .getElementById('cbAxis')
      .addEventListener(
        'change',
        (e) => (view.axisGrp.visible = e.target.checked),
      );
    document
      .getElementById('cbAtm')
      .addEventListener(
        'change',
        (e) => (view.atmGrp.visible = e.target.checked),
      );
    document.getElementById('cbPupil').addEventListener('change', (e) => {
      view.pupilGrp.visible = e.target.checked;
      if (e.target.checked) view.updatePupilVisualization(WL_VALS.d);
    });
    RAY_CTRL.forEach((id) => {
      const el = document.getElementById(id);
      const ev = el.type === 'range' ? 'input' : 'change';
      el.addEventListener(ev, view.buildRays);
    });
    document
      .querySelectorAll('input[name="fanShape"]')
      .forEach((r) => r.addEventListener('change', view.buildRays));
    document
      .querySelectorAll('input[name="rayEngine"]')
      .forEach((r) => r.addEventListener('change', view.buildRays));
    document
      .getElementById('cbGhost')
      .addEventListener('change', view.buildRays);
    document.getElementById('cbSpot').addEventListener('change', () => {
      view.redrawSpot();
      view.redrawAberration();
      if (typeof session.onAnalysis === 'function')
        session.onAnalysis(session.lastAnalysis || null);
    });
    document
      .getElementById('cbPBR')
      .addEventListener('change', view.updateGlassMaterials);
    document
      .getElementById('sGlass')
      .addEventListener('input', view.updateGlassMaterials);
  };
}
