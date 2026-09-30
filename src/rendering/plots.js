// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { WL_COLORS } from '../core/wavelengths.js';
import { analyzeSpot } from '../analysis/metrics.js';
import {
  pupilMapData,
  pupilMapScale,
  pupilMapColor,
} from '../analysis/pupil-display.js';

export function installPlots({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  const spotCanvas = document.getElementById('spotCanvas');

  const spotCtx = spotCanvas.getContext('2d');

  const aberrCanvas = document.getElementById('aberrCanvas');

  const aberrCtx = aberrCanvas.getContext('2d');

  let LAST_SPOT_HITS = [];

  let lastPupilResult = null;

  function drawSpot(hits, { cache = true } = {}) {
    if (cache) LAST_SPOT_HITS = Array.isArray(hits) ? hits.slice() : [];
    const source = Array.isArray(hits) ? hits : LAST_SPOT_HITS,
      metrics = analyzeSpot(source);
    const panel = document.getElementById('spotPanel'),
      show = document.getElementById('cbSpot').checked;
    panel.style.display = show ? 'block' : 'none';
    document.getElementById('spotMetric').textContent = metrics.hits
      ? `RMS ${metrics.rmsText}`
      : '—';
    document.getElementById('iRms').textContent = metrics.rmsText;
    // Analysis is independent of whether the plot itself is visible.
    if (!show) return metrics;
    const W = spotCanvas.width,
      H = spotCanvas.height,
      ctx = spotCtx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle =
      document.documentElement.dataset.theme === 'day'
        ? 'rgba(250,252,255,.98)'
        : 'rgba(8,6,24,.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle =
      document.documentElement.dataset.theme === 'day'
        ? 'rgba(61,77,101,.08)'
        : 'rgba(200,175,255,.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i * W) / 8, 0);
      ctx.lineTo((i * W) / 8, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i * H) / 8);
      ctx.lineTo(W, (i * H) / 8);
      ctx.stroke();
    }
    ctx.strokeStyle =
      document.documentElement.dataset.theme === 'day'
        ? 'rgba(61,77,101,.20)'
        : 'rgba(200,175,255,.22)';
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    if (!metrics.hits) return metrics;
    const { mx, my } = metrics,
      valid = metrics.valid;
    const options = model.simulation?.analysis || {};
    const previous = options.overlay ? session.previousResult?.hits || [] : [];
    const comparison =
      options.scaleMode === 'shared'
        ? (session.comparisonResults || []).flatMap((r) => r.hits)
        : [];
    const extent = [...valid, ...previous, ...comparison].reduce(
      (max, h) => Math.max(max, Math.abs(h.p[0]), Math.abs(h.p[1])),
      0,
    );
    const span =
      options.scaleMode === 'locked' && options.spotSpanMm > 0
        ? options.spotSpanMm
        : Math.max(extent * 1.25, 0.03);
    session.plotSpotSpan = span;
    ctx.fillStyle =
      document.documentElement.dataset.theme === 'day' ? '#485465' : '#b9bed2';
    ctx.font = '10px monospace';
    ctx.fillText(`x,y (mm) · ±${span.toPrecision(3)}`, 7, 13);
    ctx.fillText(
      `centroid ${mx.toPrecision(3)}, ${my.toPrecision(3)} mm`,
      7,
      H - 5,
    );
    ctx.fillText('0', W / 2 + 3, H / 2 + 12);
    ctx.fillText(span.toPrecision(3), W - 60, H / 2 - 4);
    ctx.fillText((-span).toPrecision(3), 3, H / 2 - 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(W * 0.08, H * 0.08, W * 0.84, H * 0.84);
    ctx.clip();
    for (const h of previous) {
      ctx.strokeStyle = '#94a3b888';
      ctx.beginPath();
      ctx.arc(
        W / 2 + (h.p[0] / span) * W * 0.42,
        H / 2 - (h.p[1] / span) * H * 0.42,
        3,
        0,
        2 * Math.PI,
      );
      ctx.stroke();
    }
    // Metrics use every detector hit. Only plot pixels are deterministically
    // decimated at extreme density to prevent visual alpha saturation.
    const maxDraw = 5000,
      stride = Math.max(1, Math.ceil(valid.length / maxDraw));
    function hitRGBA(h, a) {
      const hex = Number.isFinite(h.col) ? h.col >>> 0 : WL_COLORS.d,
        r = (hex >> 16) & 255,
        g = (hex >> 8) & 255,
        b = hex & 255;
      return `rgba(${r},${g},${b},${a})`;
    }
    for (let hi = 0; hi < valid.length; hi += stride) {
      const h = valid[hi],
        x = W / 2 + (h.p[0] / span) * (W * 0.42),
        y = H / 2 - (h.p[1] / span) * (H * 0.42),
        a = Math.max(0.16, Math.min(0.92, h.power));
      ctx.fillStyle = hitRGBA(h, a);
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        h.ghost ? 1.0 : valid.length > 1200 ? 1.15 : 2.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
    return metrics;
  }

  function redrawSpot() {
    return drawSpot(LAST_SPOT_HITS, { cache: false });
  }

  function drawPupilMap(result, { cache = true } = {}) {
    if (cache) lastPupilResult = result;
    const options = model.simulation?.analysis || {};
    const data = pupilMapData(result, options);
    const panel = document.getElementById('aberrPanel');
    panel.dataset.status = data.reason ? 'unavailable' : 'ok';
    document.getElementById('pupilTitle').textContent = data.title;
    document.getElementById('aberrMetric').textContent = data.reason
      ? '—'
      : `RMS ${data.rms.toPrecision(4)} · PV ${data.pv.toPrecision(4)} ${data.unit}`;
    const status = document.getElementById('pupilStatus');
    status.textContent =
      data.reason ||
      `${(1000 * data.wavelengthUm).toFixed(2)} nm · ${data.points.length} surviving samples`;
    document.getElementById('pupilDefinition').textContent = data.reason
      ? 'Wavefront error requires a valid monochromatic reference. Relative OPL remains available as a separate path diagnostic.'
      : data.note;
    const W = aberrCanvas.width,
      H = aberrCanvas.height,
      ctx = aberrCtx;
    const day = document.documentElement.dataset.theme === 'day';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = day ? '#f8faff' : '#0b091d';
    ctx.fillRect(0, 0, W, H);
    const text = day ? '#45536b' : '#c4c2d5';
    const cx = W / 2,
      cy = H / 2 - 9,
      R = Math.min(W * 0.35, H * 0.35);
    ctx.lineWidth = 1;
    ctx.strokeStyle = day ? '#c3cbd9' : '#454157';
    for (const radius of [1, 0.5]) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = '11px monospace';
    ctx.fillText('Normalized pupil samples', 12, 17);
    ctx.fillText('u', cx + R + 14, cy + 4);
    ctx.fillText('v', cx - 3, cy - R - 9);
    ctx.fillText('−1', cx - R - 23, cy + 4);
    ctx.fillText('+1', cx + R + 5, cy + 19);
    ctx.fillText('0', cx + 4, cy + 13);
    if (data.reason) {
      aberrCanvas.setAttribute('aria-label', `${data.title}: ${data.reason}`);
      ctx.fillStyle = text;
      ctx.fillText('No valid pupil map', cx - 63, cy + 40);
      return data;
    }
    const previous = options.overlay
      ? pupilMapData(session.previousResult, options)
      : null;
    const comparison =
      options.scaleMode === 'shared'
        ? (session.comparisonResults || []).map((r) => pupilMapData(r, options))
        : [];
    if (previous) comparison.push(previous);
    const scale = pupilMapScale(data, comparison, options);
    if (options.pupilMetric === 'relative-opl') session.plotOPLSpan = scale;
    else
      session.plotWavefrontSpanNm =
        scale * (data.unit === 'waves' ? 1000 * data.wavelengthUm : 1);
    const radius = Math.max(
      1.5,
      Math.min(7, (R * 0.48) / Math.sqrt(data.points.length / Math.PI)),
    );
    // Plot only calculated samples; no extrapolation over vignetted pupil regions.
    for (const point of data.points) {
      ctx.fillStyle = pupilMapColor(point.value / scale);
      ctx.beginPath();
      ctx.arc(
        cx + point.uv[0] * R,
        cy - point.uv[1] * R,
        radius,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    }
    if (previous && !previous.reason && previous.signature === data.signature) {
      for (const point of previous.points) {
        ctx.strokeStyle = pupilMapColor(point.value / scale);
        ctx.beginPath();
        ctx.arc(
          cx + point.uv[0] * R,
          cy - point.uv[1] * R,
          radius + 2,
          0,
          2 * Math.PI,
        );
        ctx.stroke();
      }
      ctx.fillStyle = text;
      ctx.fillText('Outlines: previous result', 12, H - 45);
    }
    const left = 24,
      width = W - 48,
      y = H - 30;
    const gradient = ctx.createLinearGradient(left, 0, left + width, 0);
    for (const t of [0, 0.25, 0.5, 0.75, 1])
      gradient.addColorStop(t, pupilMapColor(t * 2 - 1));
    ctx.fillStyle = gradient;
    ctx.fillRect(left, y, width, 9);
    ctx.fillStyle = text;
    ctx.fillText(`−${scale.toPrecision(3)} ${data.unit}`, left, H - 7);
    ctx.textAlign = 'center';
    ctx.fillText('0', W / 2, H - 7);
    ctx.textAlign = 'right';
    ctx.fillText(`+${scale.toPrecision(3)} ${data.unit}`, W - left, H - 7);
    ctx.textAlign = 'left';
    aberrCanvas.setAttribute(
      'aria-label',
      `${data.title}, ${status.textContent}, RMS ${data.rms.toPrecision(4)} and peak to valley ${data.pv.toPrecision(4)} ${data.unit}`,
    );
    return data;
  }

  function redrawPupilMap() {
    return drawPupilMap(lastPupilResult, { cache: false });
  }
  Object.assign(view, { drawSpot, redrawSpot, drawPupilMap, redrawPupilMap });
  return function bindEvents() {};
}
