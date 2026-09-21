import {
  createSimulationState,
  simulationSettings,
  defaultSimulationSettings,
} from '../model/simulation-state.js';
import { captureMaterialCatalog } from '../core/materials.js';
import { WL_VALS, WL_COLORS, wlToHex } from '../core/wavelengths.js';
import { createSimulationRunner } from '../core/worker-client.js';
import { escapeHTML } from './dom.js';

/** UI actions translate controls into canonical state; renderers only see results. */
export function installEngineering({ state: model, bench, view, ui, session }) {
  model.simulation = defaultSimulationSettings();
  const createWorker = () =>
    new Worker(new URL('../core/simulation-worker.js', import.meta.url), {
      type: 'module',
    });
  const runner = createSimulationRunner(createWorker),
    scanRunner = createSimulationRunner(createWorker);
  let timer = null,
    revision = 0,
    scanResult = null;
  let focusCustom = false,
    focusGeometry = '';
  const snapshots = { A: null, B: null };
  const $ = (id) => document.getElementById(id);
  const num = (id, fallback) => ($(id) ? Number($(id).value) : fallback);
  const checked = (id, fallback = false) => ($(id) ? $(id).checked : fallback);
  const radio = (name, fallback) =>
    document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  const pct = (v) => (v == null ? 'Not defined' : `${(100 * v).toFixed(2)}%`);
  function readSettings() {
    const prior = simulationSettings(model.simulation),
      s = prior.source;
    const spectrum = [
      ['F', 'cbF', 'weightF'],
      ['d', 'cbD', 'weightD'],
      ['C', 'cbC', 'weightC'],
    ].map(([key, id, weight]) => ({
      key,
      wavelengthUm: WL_VALS[key],
      color: WL_COLORS[key],
      enabled: checked(id),
      sourceWeight: num(weight, 1),
    }));
    const nm = num('sWL', 532);
    spectrum.push({
      key: 'custom',
      wavelengthUm: nm / 1000,
      color: wlToHex(nm),
      enabled: checked('cbCustom'),
      sourceWeight: num('weightCustom', 1),
    });
    return {
      ...prior,
      source: {
        ...s,
        type: radio('srcType', 'collimated'),
        fieldXDeg: num('sFieldX', 0),
        fieldYDeg: num('sField', 0),
        xMm: num('sPX', 0),
        yMm: num('sPY', 0),
        zMm: num('sPZ', -40),
        aimXDeg: num('sPtDirX', 0),
        aimYDeg: num('sPtDirY', 0),
        na: num('sPtNA', 0.3),
        distribution: $('pointDistribution')?.value || s.distribution,
        illumination: $('sourceIllumination')?.value || s.illumination,
        diameterMm: num('sourceDiameter', s.diameterMm),
        pupilZMm: num('sourcePlane', s.pupilZMm),
        gaussianSigma: num('sourceGaussian', s.gaussianSigma),
      },
      spectrum,
      sampling: {
        ...prior.sampling,
        count: num('nRays', 49),
        pattern: radio('fanShape', 'pupil3d'),
      },
      engine: {
        ...prior.engine,
        type: radio('rayEngine', 'sequential'),
        materialMode: $('materialMode')?.value || 'strict',
        ghosts: checked('cbGhost'),
      },
      display: {
        ...prior.display,
        count: num('displayRays', 97),
        showChief: checked('cbChief'),
        showVignetted: checked('cbVig'),
        showGhosts: checked('cbGhost'),
        showPupil: checked('cbPupil', true),
      },
      analysis: {
        ...prior.analysis,
        scaleMode: $('plotScaleMode')?.value || 'auto',
        spotSpanMm: num('spotScale', 1),
        oplSpanUm: num('oplScale', 1),
        overlay: checked('previousOverlay'),
        focusFromMm: num('focusFrom', prior.analysis.focusFromMm),
        focusToMm: num('focusTo', prior.analysis.focusToMm),
        focusSteps: num('focusSteps', 41),
      },
    };
  }
  function captureEngineeringState() {
    return structuredClone(readSettings());
  }
  function restoreEngineeringState(saved) {
    model.simulation = simulationSettings(saved || {});
    const s = model.simulation;
    const values = {
      pointDistribution: s.source.distribution,
      sourceIllumination: s.source.illumination,
      sourceDiameter: s.source.diameterMm,
      sourcePlane: s.source.pupilZMm,
      sourceGaussian: s.source.gaussianSigma,
      materialMode: s.engine.materialMode,
      displayRays: s.display.count,
      plotScaleMode: s.analysis.scaleMode,
      spotScale: s.analysis.spotSpanMm,
      oplScale: s.analysis.oplSpanUm,
    };
    const weightIds = {
      F: 'weightF',
      d: 'weightD',
      C: 'weightC',
      custom: 'weightCustom',
    };
    for (const w of s.spectrum)
      if (weightIds[w.key]) values[weightIds[w.key]] = w.sourceWeight;
    if (s.analysis.focusFromMm !== null)
      values.focusFrom = s.analysis.focusFromMm;
    if (s.analysis.focusToMm !== null) values.focusTo = s.analysis.focusToMm;
    focusCustom =
      s.analysis.focusFromMm !== null && s.analysis.focusToMm !== null;
    values.focusSteps = s.analysis.focusSteps;
    for (const [id, value] of Object.entries(values))
      if ($(id)) $(id).value = String(value);
    if ($('previousOverlay')) $('previousOverlay').checked = s.analysis.overlay;
  }
  function snapshotState() {
    model.simulation = readSettings();
    model.materialPolicy = model.simulation.engine.materialMode;
    return createSimulationState(
      model,
      model.simulation,
      captureMaterialCatalog(),
    );
  }
  function displayResult(result, state) {
    session.analysisPending = false;
    session.lastAnalysis = result;
    session.lastSimulationState = state;
    session.lastResultRevision = revision;
    document.documentElement.dataset.simulationStatus = result.status;
    view.renderSimulation(result);
    for (const [id, value] of [
      ['iTraced', result.traced],
      ['iVig', result.vignetted],
      ['iPower', result.throughputText],
      ['iRms', result.rmsText],
    ])
      if ($(id)) $(id).textContent = String(value);
    $('traceState').textContent =
      result.status === 'ok'
        ? `${result.traced} statistical samples · worker complete`
        : 'Quantitative result blocked';
    const problems = [...result.errors, ...result.warnings];
    $('fidelityBanner').hidden = !problems.length;
    $('fidelityBanner').textContent = problems.join(' ');
    $('fidelityBanner').classList.toggle('blocked', result.status !== 'ok');
    $('modelAssumptions').textContent = result.assumptions.join(' · ');
    $('relativeDefinition').textContent =
      'Relative OPL (µm) = 1000 × [Σ n(λ) ℓ − central-reference OPL(λ)] from each launch point to the detector. The reference is always calculated with zero weight. If blocked, the innermost surviving sample is used. This is not reference-sphere wavefront error.';
    $('powerBreakdown').innerHTML =
      `<span>Bundle survival <b>${pct(result.bundleSurvival)}</b></span><span>Primary sampled power <b>${pct(result.throughput)}</b></span><span>Fresnel factor among survivors <b>${result.engine === 'fresnel' ? pct(result.conditionalFresnelTransmission) : 'Not modeled'}</b></span><span>Collection of defined source <b>${pct(result.sourceCollection)}</b></span>`;
    $('spectralResults').innerHTML =
      '<thead><tr><th>λ (nm)</th><th>Normalized weight</th><th>RMS (mm)</th><th>Bundle power</th></tr></thead><tbody>' +
      result.perWavelength
        .map(
          (w) =>
            `<tr><td>${(w.wavelengthUm * 1000).toFixed(2)}</td><td>${(w.normalizedWeight * 100).toFixed(2)}%</td><td>${w.rms === null ? '—' : w.rms.toPrecision(5)}</td><td>${pct(w.throughput)}</td></tr>`,
        )
        .join('') +
      '</tbody>';
    if ($('hudTxt'))
      $('hudTxt').textContent =
        `${result.engine === 'fresnel' ? 'Uncoated Fresnel + Ghosts (Coaxial)' : 'Sequential geometric'} · ${state.source.type} · ${result.status}`;
    if ($('hudSrc'))
      $('hudSrc').textContent =
        `${state.sampling.count} analysis samples/λ · ≤${state.display.count} visible samples/λ · reference has zero weight`;
    session.onAnalysis?.(result);
    renderComparison();
  }
  function requestSimulation() {
    if (session.suspendTrace) {
      session.traceDirty = true;
      return session.lastAnalysis;
    }
    session.traceDirty = false;
    const id = ++revision;
    runner.cancel();
    scanRunner.cancel();
    clearTimeout(timer);
    if (session.lastAnalysis?.status === 'ok' && !session.analysisPending)
      session.previousResult = session.lastAnalysis;
    session.analysisPending = true;
    if ($('traceState'))
      $('traceState').textContent = 'Calculating… previous numbers are stale';
    document.documentElement.dataset.simulationStatus = 'pending';
    for (const metric of ['iRms', 'iPower', 'aRms', 'aPower', 'mRms', 'mPower'])
      if ($(metric)) $(metric).textContent = '…';
    scanResult = null;
    if ($('focusBest'))
      $('focusBest').textContent = 'Run a scan for the current settings.';
    if ($('moveBest')) $('moveBest').disabled = true;
    const geometry = JSON.stringify(model.components);
    if (!focusCustom && geometry !== focusGeometry && $('focusFrom')) {
      const detector = model.surfaces.at(-1).z;
      const after = (model.surfaces.at(-2)?.z ?? detector - 40) + 5;
      $('focusFrom').value = Math.max(after, detector - 20).toFixed(3);
      $('focusTo').value = Math.max(after + 20, detector + 20).toFixed(3);
    }
    focusGeometry = geometry;
    const state = snapshotState();
    timer = setTimeout(async () => {
      try {
        const result = await runner.run(state);
        if (!result || id !== revision) return;
        displayResult(result, state);
      } catch (error) {
        if (id !== revision) return;
        session.analysisPending = false;
        session.lastAnalysis = null;
        document.documentElement.dataset.simulationStatus = 'error';
        $('traceState').textContent = `Worker failed: ${error.message}`;
        $('fidelityBanner').hidden = false;
        $('fidelityBanner').textContent =
          'No current quantitative result. ' + error.message;
        view.clearGroup(view.rayGrp);
      }
    }, 60);
    return session.lastAnalysis;
  }
  async function runFocusScan() {
    const id = revision;
    $('focusBest').textContent = 'Scanning in worker…';
    $('runFocusScan').disabled = true;
    try {
      const state = snapshotState();
      const result = await scanRunner.run(state, 'focus', {
        fromMm: num('focusFrom', 0),
        toMm: num('focusTo', 100),
        steps: num('focusSteps', 41),
      });
      if (!result || id !== revision) return;
      scanResult = result;
      const best = result.best;
      $('focusBest').textContent = best
        ? `Lowest tested RMS ${(best.rmsMm * 1000).toFixed(3)} µm at z=${best.zMm.toFixed(3)} mm; grid step ${result.stepMm.toFixed(3)} mm. ${best.zMm === result.points[0].zMm || best.zMm === result.points.at(-1).zMm ? 'Minimum is at the interval boundary.' : ''}`
        : 'No rays reach the detector in this interval.';
      $('moveBest').disabled = !best;
      if (best) $('focusSelected').value = best.zMm;
      $('focusSettings').textContent =
        `${state.engine.type} · ${state.sampling.count} samples/λ · ${state.source.type}/${state.source.distribution} · ${state.spectrum
          .filter((w) => w.enabled)
          .map(
            (w) =>
              `${(1000 * w.wavelengthUm).toFixed(1)} nm × ${w.sourceWeight}`,
          )
          .join(
            ', ',
          )}. Power-weighted centroid RMS; detector clipping can change the sampled population. Inspect survival.`;
      $('focusData').innerHTML =
        '<thead><tr><th>z (mm)</th><th>RMS (mm)</th><th>Survival</th></tr></thead><tbody>' +
        result.points
          .map(
            (p) =>
              `<tr><td>${p.zMm.toFixed(4)}</td><td>${p.rmsMm === null ? '—' : p.rmsMm.toPrecision(5)}</td><td>${pct(p.bundleSurvival)}</td></tr>`,
          )
          .join('') +
        '</tbody>';
      drawFocus(result);
    } catch (error) {
      $('focusBest').textContent = error.message;
    } finally {
      $('runFocusScan').disabled = false;
    }
  }
  function drawFocus(result) {
    const canvas = $('focusCanvas'),
      ctx = canvas.getContext('2d'),
      W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#8297ad';
    ctx.font = '12px monospace';
    const points = result.points.filter((p) => p.rmsMm !== null);
    if (!points.length) return;
    const max = Math.max(...points.map((p) => p.rmsMm)) * 1.1 || 0.001,
      lo = result.points[0].zMm,
      hi = result.points.at(-1).zMm;
    ctx.strokeStyle = '#70889a';
    ctx.beginPath();
    ctx.moveTo(65, 12);
    ctx.lineTo(65, H - 28);
    ctx.lineTo(W - 15, H - 28);
    ctx.stroke();
    ctx.fillText(`RMS ${max.toPrecision(3)} mm`, 5, 12);
    ctx.fillText('0', 45, H - 28);
    ctx.fillText(`${lo.toFixed(2)} mm`, 65, H - 8);
    ctx.fillText(`${hi.toFixed(2)} mm`, W - 100, H - 8);
    ctx.strokeStyle = '#18aa92';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (const p of result.points) {
      if (p.rmsMm === null) {
        started = false;
        continue;
      }
      const x = 65 + ((p.zMm - lo) / (hi - lo)) * (W - 80),
        y = H - 28 - (p.rmsMm / max) * (H - 45);
      if (started) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      started = true;
    }
    ctx.stroke();
  }
  function moveDetector(z) {
    const detector = model.components.find((c) => c.kind === 'detector');
    const last = model.surfaces.at(-2)?.z || 0;
    if (!detector || !Number.isFinite(z) || z < last + 5) {
      ui.benchToast('Detector must be at least 5 mm after the last optic.');
      return;
    }
    ui.pushUndo('Move detector to focus');
    detector.z = z;
    ui.rebuildBench();
    ui.projectChanged?.();
  }
  function captureSnapshot(slot) {
    if (session.analysisPending || session.lastAnalysis?.status !== 'ok') {
      ui.benchToast('Wait for a valid current result.');
      return;
    }
    snapshots[slot] = {
      project: ui.captureProjectJSON(),
      state: structuredClone(session.lastSimulationState),
      result: structuredClone(session.lastAnalysis),
    };
    session.comparisonResults = Object.values(snapshots)
      .filter(Boolean)
      .map((s) => s.result);
    $('snapshot' + slot + 'State').textContent =
      `${slot} saved · RMS ${session.lastAnalysis.rmsText}`;
    renderComparison();
    view.redrawSpot();
    view.redrawAberration();
  }
  function renderComparison() {
    if (!snapshots.A || !snapshots.B) return;
    const A = snapshots.A,
      B = snapshots.B;
    const geometry = (s) =>
      s.state.components
        .filter((c) => c.kind !== 'detector')
        .map(
          (c) =>
            `${c.name}: z=${c.z} mm, orientation=${c.orientation || 1}, prescription=${JSON.stringify(c.kind === 'imported' ? c.surfaces : c.params)}`,
        )
        .join('; ');
    const rows = [
      ['Geometry', geometry(A), geometry(B)],
      ['Detector z (mm)', A.state.surfaces.at(-1).z, B.state.surfaces.at(-1).z],
      ['RMS radius', A.result.rmsText, B.result.rmsText],
      [
        'Bundle survival',
        pct(A.result.bundleSurvival),
        pct(B.result.bundleSurvival),
      ],
      [
        'Primary sampled power',
        pct(A.result.throughput),
        pct(B.result.throughput),
      ],
      [
        'Wavelength results',
        ...Object.values({ A, B }).map((s) =>
          s.result.perWavelength
            .map(
              (w) =>
                `${(1000 * w.wavelengthUm).toFixed(1)} nm: ${w.rmsText}, T ${pct(w.throughput)}, w ${w.normalizedWeight.toFixed(3)}`,
            )
            .join('; '),
        ),
      ],
    ];
    $('comparisonTable').innerHTML =
      '<thead><tr><th>Quantity</th><th>A</th><th>B</th></tr></thead><tbody>' +
      rows
        .map(
          (r) =>
            '<tr>' +
            r.map((v) => `<td>${escapeHTML(String(v))}</td>`).join('') +
            '</tr>',
        )
        .join('') +
      '</tbody>';
  }
  Object.assign(ui, {
    requestSimulation,
    captureEngineeringState,
    restoreEngineeringState,
  });
  return function bind() {
    const banner = document.createElement('div');
    banner.id = 'fidelityBanner';
    banner.setAttribute('role', 'status');
    banner.hidden = true;
    $('analysisToggle').after(banner);
    $('traceTools').insertAdjacentHTML(
      'beforeend',
      `<label class="toolbar-field">Materials<select id="materialMode"><option value="strict">Strict engineering</option><option value="exploratory">Exploratory fallback (approximate)</option></select></label><label class="toolbar-field">Visible samples per wavelength<input id="displayRays" type="number" min="0" max="5001" step="1" value="97"></label><p class="mini-note">Display count does not change calculated metrics.</p>`,
    );
    $('sourceTools').insertAdjacentHTML(
      'beforeend',
      `<label class="toolbar-field">Point distribution<select id="pointDistribution"><option value="uniform-solid-angle">Uniform solid angle (defined cone)</option><option value="uniform-angular">Uniform polar angle (defined cone)</option><option value="uniform-pupil">Uniform target pupil illumination</option></select></label><label class="toolbar-field">Collimated illumination<select id="sourceIllumination"><option value="entrance-pupil">Pupil-targeted diagnostic bundle</option><option value="fixed-disk">Fixed source disk (collection enabled)</option></select></label><label class="toolbar-field">Source / target disk diameter (mm)<input id="sourceDiameter" type="number" min="0.001" value="25.4" step="0.1"></label><label class="toolbar-field">Source / target disk plane z (mm)<input id="sourcePlane" type="number" value="-1" step="0.1"></label><label class="toolbar-field">Gaussian 1/e² radius / disk radius (0 = uniform)<input id="sourceGaussian" type="number" min="0" step="0.1" value="0"></label><p class="mini-note">Uniform pupil illumination describes power at the target plane. Fans and rings are diagnostic samples, not area quadrature. Cone collection refers to power emitted into the configured cone, not 4π emission.</p>`,
    );
    $('wavePop').insertAdjacentHTML(
      'beforeend',
      `<div class="spectral-weights"><b>Source spectral weights</b><p class="mini-note">F/d/C defaults are equal weights. Active weights are normalized in the analysis table.</p>${[
        ['F', '486.13'],
        ['D', '587.56'],
        ['C', '656.27'],
        ['Custom', 'custom'],
      ]
        .map(
          ([id, nm]) =>
            `<label>${nm} nm<input aria-label="${id} wavelength weight" id="weight${id}" type="number" min="0" step="0.1" value="1"></label>`,
        )
        .join('')}</div>`,
    );
    const detector = model.surfaces.at(-1).z;
    $('engineeringPanel').innerHTML =
      `<div id="traceState" role="status">Preparing worker…</div><p id="modelAssumptions" class="mini-note"></p><div id="powerBreakdown"></div><table id="spectralResults" class="engineering-table" aria-label="Per-wavelength results"></table><details><summary>Plot scales &amp; Relative OPL definition</summary><div class="engineering-row"><label>Scale<select id="plotScaleMode"><option value="auto">Auto Scale</option><option value="locked">Lock Scale</option><option value="shared">Shared A/B Scale</option></select></label><label>Spot half-span (mm)<input id="spotScale" type="number" min="0.000001" value="1" step="0.1"></label><label>OPL ±scale (µm)<input id="oplScale" type="number" min="0.000001" value="1" step="0.1"></label><label><input id="previousOverlay" type="checkbox">Previous-result overlay</label></div><p id="relativeDefinition" class="mini-note"></p></details><details id="focusTools"><summary>Focus Scan · RMS versus detector z</summary><div class="engineering-row"><label>From z (mm)<input id="focusFrom" type="number" value="${Math.max(model.surfaces.at(-2).z + 5, detector - 20)}"></label><label>To z (mm)<input id="focusTo" type="number" value="${detector + 20}"></label><label>Steps<input id="focusSteps" type="number" min="3" max="201" value="41"></label><button class="ux-btn" id="runFocusScan">Run Focus Scan</button><button class="ux-btn" id="cancelFocusScan">Cancel</button></div><p id="focusBest" role="status">Run a scan for the current settings.</p><p id="focusSettings" class="mini-note"></p><canvas id="focusCanvas" width="620" height="190" aria-label="RMS spot radius in mm versus detector z in mm"></canvas><div class="engineering-row"><button class="ux-btn" id="moveBest" disabled>Move detector to tested minimum</button><label>Selected z (mm)<input id="focusSelected" type="number" value="${detector}"></label><button class="ux-btn" id="moveSelected">Move detector to selected z</button></div><details><summary>Numeric scan samples and survival</summary><table id="focusData" class="engineering-table"></table></details></details><details id="comparisonTools"><summary>A/B system comparison</summary><div class="engineering-row"><button class="ux-btn" id="captureA">Capture A</button><span id="snapshotAState">A empty</span><button class="ux-btn" id="restoreA">Restore A</button><button class="ux-btn" id="captureB">Capture B</button><span id="snapshotBState">B empty</span><button class="ux-btn" id="restoreB">Restore B</button></div><table id="comparisonTable" class="engineering-table"></table><p class="mini-note">A/B snapshots last for this session. Choose Shared A/B Scale to compare plots with the same scale.</p></details>`;
    $('runFocusScan').addEventListener('click', runFocusScan);
    for (const id of ['focusFrom', 'focusTo', 'focusSteps'])
      $(id).addEventListener('change', () => {
        focusCustom = true;
        model.simulation = readSettings();
        ui.projectChanged?.();
      });
    $('cancelFocusScan').addEventListener('click', () => {
      scanRunner.cancel();
      $('focusBest').textContent = 'Scan cancelled.';
    });
    $('moveBest').addEventListener('click', () => {
      if (scanResult?.best) moveDetector(scanResult.best.zMm);
    });
    $('moveSelected').addEventListener('click', () =>
      moveDetector(num('focusSelected', NaN)),
    );
    for (const slot of ['A', 'B']) {
      $('capture' + slot).addEventListener('click', () =>
        captureSnapshot(slot),
      );
      $('restore' + slot).addEventListener('click', () => {
        if (snapshots[slot])
          ui.applyProjectJSON(snapshots[slot].project, `Snapshot ${slot}`);
      });
    }
    const physicalIds = [
      'pointDistribution',
      'sourceIllumination',
      'sourceDiameter',
      'sourcePlane',
      'sourceGaussian',
      'materialMode',
      'displayRays',
      'weightF',
      'weightD',
      'weightC',
      'weightCustom',
    ];
    ui.stateControlIds.push(
      ...physicalIds,
      'plotScaleMode',
      'spotScale',
      'oplScale',
    );
    for (const id of physicalIds)
      $(id).addEventListener('change', () => {
        requestSimulation();
        ui.projectChanged?.();
      });
    for (const id of [
      'plotScaleMode',
      'spotScale',
      'oplScale',
      'previousOverlay',
    ])
      $(id).addEventListener('change', () => {
        if (id === 'plotScaleMode' && $('plotScaleMode').value === 'locked') {
          $('spotScale').value = session.plotSpotSpan || 1;
          $('oplScale').value = session.plotOPLSpan || 1;
        }
        model.simulation = readSettings();
        view.redrawSpot();
        view.redrawAberration();
        ui.projectChanged?.();
      });
  };
}
