import { escapeHTML } from './dom.js';
// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { componentLength } from '../model/components.js';

export function installStatus({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function niceGridStep(span, target = 11) {
    const raw = Math.max(1e-6, span / target),
      p = Math.pow(10, Math.floor(Math.log10(raw))),
      q = raw / p;
    const n = q <= 1 ? 1 : q <= 2 ? 2 : q <= 2.5 ? 2.5 : q <= 5 ? 5 : 10;
    return n * p;
  }

  function renderRuler() {
    const track = document.getElementById('rulerTrack');
    if (!track) return;
    const pt = document.getElementById('stPt').checked,
      srcZ = pt ? +document.getElementById('sPZ').value : null,
      items = [
        ...model.components.map((c) => ({
          id: c.id,
          z: c.z,
          name: c.name,
          kind: c.kind,
        })),
      ];
    if (pt)
      items.push({ id: ui.SOURCE_ID, z: srcZ, name: 'Source', kind: 'source' });
    if (!items.length) return;
    let lo = Math.min(...items.map((x) => x.z)),
      hi = Math.max(
        ...items.map(
          (x) =>
            x.z +
            ((model.components.find((c) => c.id === x.id) &&
              componentLength(model.components.find((c) => c.id === x.id))) ||
              0),
        ),
      );
    let span = Math.max(10, hi - lo);
    lo -= span * 0.06;
    hi += span * 0.06;
    span = hi - lo;
    track.innerHTML = '';
    const major = niceGridStep(span, 12),
      minor = major / 5,
      first = Math.ceil(lo / minor) * minor;
    for (
      let z = first, n = 0;
      z <= hi + minor * 0.2 && n < 300;
      z += minor, n++
    ) {
      const majorTick = Math.abs(z / major - Math.round(z / major)) < 1e-7;
      const t = document.createElement('div');
      t.className = 'ruler-tick' + (majorTick ? ' major' : ' minor');
      t.style.left = ((z - lo) / span) * 100 + '%';
      if (majorTick)
        t.innerHTML = `<span>${Math.abs(z) < 1e-10 ? '0' : z.toFixed(major < 0.1 ? 2 : major < 1 ? 1 : 0)}</span>`;
      track.appendChild(t);
    }
    for (const it of items) {
      const m = document.createElement('div');
      m.className = `ruler-marker ${it.kind} ${model.selectedComponentId === it.id ? 'sel' : ''}`;
      m.style.left = ((it.z - lo) / span) * 100 + '%';
      m.dataset.id = it.id;
      m.innerHTML = `<label>${escapeHTML(it.name.length > 15 ? it.name.slice(0, 13) + '…' : it.name)}</label>`;
      m.onclick = () => ui.selectObject(it.id);
      track.appendChild(m);
    }
    const dist = document.getElementById('rulerDistances');
    dist.innerHTML = '';
    if (
      model.selectedComponentId &&
      model.selectedComponentId !== ui.SOURCE_ID
    ) {
      const ord = [...model.components].sort((a, b) => a.z - b.z),
        i = ord.findIndex((c) => c.id === model.selectedComponentId);
      if (i >= 0) {
        const c = ord[i],
          pairs = [];
        if (i > 0)
          pairs.push([
            ord[i - 1],
            c,
            (ord[i - 1].z + componentLength(ord[i - 1]) + c.z) / 2,
            c.z - (ord[i - 1].z + componentLength(ord[i - 1])),
          ]);
        if (i < ord.length - 1)
          pairs.push([
            c,
            ord[i + 1],
            (c.z + componentLength(c) + ord[i + 1].z) / 2,
            ord[i + 1].z - (c.z + componentLength(c)),
          ]);
        for (const [a, b, z, d] of pairs) {
          const q = document.createElement('span');
          q.className = 'ruler-distance';
          q.style.left = ((z - lo) / span) * 100 + '%';
          q.textContent = `${Math.max(0, d).toFixed(model.snapMm < 1 ? 2 : 1)} mm`;
          dist.appendChild(q);
        }
      }
    }
  }

  function updateAnalysisSummary(state = session.lastAnalysis || null) {
    const rms =
      state?.rmsText ?? document.getElementById('iRms')?.textContent ?? '—';
    const power =
      state?.throughputText ??
      document.getElementById('iPower')?.textContent ??
      '—';
    const vig =
      state?.vignetted ?? document.getElementById('iVig')?.textContent ?? '—';
    const traced =
      state?.traced ?? document.getElementById('iTraced')?.textContent ?? '—';
    [
      ['aRms', rms],
      ['mRms', rms],
      ['aPower', power],
      ['mPower', power],
      ['aVig', vig],
      ['mVig', vig],
      ['mTraced', traced],
    ].forEach(([id, v]) => {
      const e = document.getElementById(id);
      if (e) e.textContent = String(v);
    });
    updateStatusBar(state);
  }

  function updateStatusBar(state = session.lastAnalysis || null) {
    const stO = document.getElementById('stObjects');
    if (!stO) return;
    const ep = optics.entrancePupil(0.5875618);
    stO.innerHTML = `<b>${model.components.length + 1}</b> bench objects`;
    document.getElementById('stSurfaces').innerHTML =
      `<b>${model.surfaces.length}</b> surfaces`;
    document.getElementById('stPupil').innerHTML =
      `${ep.stopKind} · ENP <b>${ep.finite ? ep.z.toFixed(2) + ' mm' : '∞'}</b>`;
    const traced =
        state?.traced ?? document.getElementById('iTraced')?.textContent ?? '—',
      power =
        state?.throughputText ??
        document.getElementById('iPower')?.textContent ??
        '—';
    document.getElementById('stTrace').innerHTML =
      `<b>${traced}</b> rays · T <b>${power}</b>`;
    let sel =
      model.selectedComponentId === ui.SOURCE_ID
        ? ui.sourceName()
        : model.components.find((c) => c.id === model.selectedComponentId)
            ?.name || '';
    document.getElementById('stSelection').textContent = sel
      ? `Selected · ${sel}`
      : '';
    const wl = [];
    if (document.getElementById('cbF').checked) wl.push('F');
    if (document.getElementById('cbD').checked) wl.push('d');
    if (document.getElementById('cbC').checked) wl.push('C');
    if (document.getElementById('cbCustom').checked)
      wl.push(`${document.getElementById('sWL').value} nm`);
    document.getElementById('uxWaveLabel').textContent = wl.join('+') || 'd';
    document.getElementById('uxEngine').value = document.querySelector(
      'input[name="rayEngine"]:checked',
    ).value;
    document.getElementById('uxRays').value =
      document.getElementById('nRays').value;
  }

  session.onAnalysis = (state) => updateAnalysisSummary(state);

  const oldBuildRays = view.buildRays;

  view.buildRays = function () {
    const state = oldBuildRays();
    renderRuler();
    ui.renderBenchList();
    return state;
  };

  const oldRebuildBench = ui.rebuildBench;

  ui.rebuildBench = function () {
    oldRebuildBench();
    ui.applySceneTheme();
    renderRuler();
    updateAnalysisSummary();
  };

  const oldRefreshSystemInfo = ui.refreshSystemInfo;

  ui.refreshSystemInfo = function () {
    oldRefreshSystemInfo();
    updateStatusBar();
  };
  Object.assign(ui, {
    niceGridStep,
    renderRuler,
    updateAnalysisSummary,
    updateStatusBar,
  });
  return function bindEvents() {};
}
