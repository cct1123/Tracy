// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { WL_COLORS } from '../core/wavelengths.js';
import { analyzeSpot, analyzeAberration } from '../analysis/metrics.js';

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

  let LAST_ABERR_POINTS = [];

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
    const { mx, my, maxr } = metrics,
      span = Math.max(maxr * 1.25, 0.03),
      valid = metrics.valid;
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
        x = W / 2 + ((h.p[0] - mx) / span) * (W * 0.42),
        y = H / 2 - ((h.p[1] - my) / span) * (H * 0.42),
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
    return metrics;
  }

  function redrawSpot() {
    return drawSpot(LAST_SPOT_HITS, { cache: false });
  }

  function drawAberration(
    points,
    { cache = true, sourceType = null, fieldX = 0, fieldY = 0 } = {},
  ) {
    if (cache) LAST_ABERR_POINTS = Array.isArray(points) ? points.slice() : [];
    const metrics = analyzeAberration(
      Array.isArray(points) ? points : LAST_ABERR_POINTS,
    );
    const panel = document.getElementById('aberrPanel');
    if (panel) panel.style.display = 'block';
    const note =
      sourceType === 'collimated' &&
      Math.abs(fieldX) < 1e-8 &&
      Math.abs(fieldY) < 1e-8
        ? `PV ${metrics.opdPVText}`
        : `ΔOPL ${metrics.opdPVText}`;
    document.getElementById('aberrMetric').textContent = metrics.points
      ? note
      : '—';
    const W = aberrCanvas.width,
      H = aberrCanvas.height,
      ctx = aberrCtx;
    const day = document.documentElement.dataset.theme === 'day';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = day ? 'rgba(250,252,255,.98)' : 'rgba(8,6,24,.94)';
    ctx.fillRect(0, 0, W, H);

    // Match the image-plane spot plot styling first: same clean full-window grid,
    // same center axes, and minimal annotation.
    ctx.strokeStyle = day ? 'rgba(61,77,101,.08)' : 'rgba(200,175,255,.08)';
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
    ctx.strokeStyle = day ? 'rgba(61,77,101,.20)' : 'rgba(200,175,255,.22)';
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    if (!metrics.points) return metrics;

    const textCol = day ? 'rgba(70,83,102,.78)' : 'rgba(205,193,228,.78)';
    const ring = day ? 'rgba(61,77,101,.18)' : 'rgba(200,175,255,.18)';
    const axis = day ? 'rgba(61,77,101,.25)' : 'rgba(216,196,255,.24)';
    const cx = W / 2,
      cy = H / 2 - 8,
      R = Math.min(W, H) * 0.305;

    // Pupil guide rings in the same restrained technical language as the spot plot.
    ctx.strokeStyle = ring;
    ctx.lineWidth = 1;
    for (const rr of [1, 2 / 3, 1 / 3]) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = axis;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();

    const mapScale = metrics.globalOPDAbsMax || 1e-6;
    function baseRGB(hex) {
      hex = Number.isFinite(hex) ? hex >>> 0 : WL_COLORS.d;
      return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
    }
    function modRGBA(hex, t, a = 1) {
      const [r, g, b] = baseRGB(hex),
        s = Math.max(-1, Math.min(1, t));
      const lift = Math.max(0, s),
        drop = Math.max(0, -s);
      const rr = Math.round(r * (1 - 0.35 * drop) + 255 * (0.55 * lift));
      const gg = Math.round(g * (1 - 0.35 * drop) + 255 * (0.55 * lift));
      const bb = Math.round(b * (1 - 0.35 * drop) + 255 * (0.55 * lift));
      return `rgba(${Math.max(0, Math.min(255, rr))},${Math.max(0, Math.min(255, gg))},${Math.max(0, Math.min(255, bb))},${a})`;
    }

    // Overlay all wavelengths in one common pupil window, just like the spot plot.
    for (const g of metrics.groups) {
      for (const p of g.points) {
        const t = Math.max(-1, Math.min(1, p.opd / mapScale));
        const px = cx + p.uv[0] * R,
          py = cy - p.uv[1] * R;
        const glow = 1.6 + 3.4 * Math.abs(t);
        const rad = (p.chief ? 2.2 : 1.2) + 1.9 * Math.abs(t);
        ctx.fillStyle = modRGBA(g.col, t, 0.06 + 0.1 * Math.abs(t));
        ctx.beginPath();
        ctx.arc(px, py, glow, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = modRGBA(g.col, t, 0.58 + 0.3 * Math.abs(t));
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        if (p.chief) {
          ctx.strokeStyle = day
            ? 'rgba(38,45,58,.55)'
            : 'rgba(255,255,255,.50)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, rad + 1.7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Minimal bottom legend, aligned with the same understated annotation style.
    const lgx = 20,
      lgy = H - 18,
      lgw = W - 40,
      grad = ctx.createLinearGradient(lgx, 0, lgx + lgw, 0);
    grad.addColorStop(0, day ? 'rgba(66,78,96,.75)' : 'rgba(92,108,132,.78)');
    grad.addColorStop(
      0.5,
      day ? 'rgba(165,171,182,.78)' : 'rgba(168,172,188,.80)',
    );
    grad.addColorStop(
      1,
      day ? 'rgba(248,249,252,.95)' : 'rgba(246,240,255,.96)',
    );
    ctx.fillStyle = grad;
    ctx.fillRect(lgx, lgy - 8, lgw, 5);
    ctx.strokeStyle = day ? 'rgba(61,77,101,.08)' : 'rgba(200,175,255,.08)';
    ctx.strokeRect(lgx, lgy - 8, lgw, 5);
    ctx.fillStyle = textCol;
    ctx.font = "10px 'DM Mono', monospace";
    ctx.fillText('−ΔOPL', lgx, lgy + 10);
    ctx.fillText('0', lgx + lgw / 2 - 3, lgy + 10);
    ctx.fillText('+ΔOPL', lgx + lgw - 32, lgy + 10);
    return metrics;
  }

  function redrawAberration() {
    return drawAberration(LAST_ABERR_POINTS, {
      cache: false,
      sourceType: session.lastAnalysis?.source?.type,
      fieldX: session.lastAnalysis?.source?.fieldX || 0,
      fieldY: session.lastAnalysis?.source?.fieldY || 0,
    });
  }
  Object.assign(view, {
    drawSpot,
    redrawSpot,
    drawAberration,
    redrawAberration,
  });
  return function bindEvents() {};
}
