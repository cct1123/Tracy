import { escapeHTML } from '../ui/dom.js';
// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { finite3, sourceBasis } from '../core/vector.js';
import { UNKNOWN_GLASS } from '../core/materials.js';
import { wlToHex, WL_COLORS, WL_VALS } from '../core/wavelengths.js';
import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';

export function installRays({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function rayWidthScale(rayCount) {
    const n = Math.max(1, rayCount || 1),
      q = Math.max(1, n / 49);
    return Math.max(0.55, 1 / Math.pow(q, 0.12));
  }

  function addRayLines(group, positions, color, opacity, width) {
    if (!positions.length) return;
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(new Float32Array(positions));
    const material = new LineMaterial({
      // Wavelength colors are sRGB UI colors. Bypass scene exposure/tone mapping
      // and additive glow so overlapping rays retain their wavelength color.
      color: new THREE.Color(color).convertSRGBToLinear(),
      toneMapped: false,
      transparent: true,
      opacity,
      linewidth: Math.max(0.45, width),
      resolution: new THREE.Vector2(view.vp.clientWidth, view.vp.clientHeight),
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    view.lineMats.push(material);
    group.add(new LineSegments2(geometry, material));
  }

  function buildRayLines(
    paths,
    color,
    width,
    showVig,
    totalRayCount = paths.length,
  ) {
    const core = [],
      vigV = [],
      scaledWidth = width * rayWidthScale(totalRayCount);
    for (const p of paths) {
      const isVig = p.vignetted;
      if (isVig && !showVig) continue;
      const target = isVig ? vigV : core;
      for (let i = 0; i < p.points.length - 1; i++) {
        const a = p.points[i],
          b = p.points[i + 1];
        if (!finite3(a) || !finite3(b)) continue;
        target.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      }
    }
    const grp = new THREE.Group();
    addRayLines(grp, core, color, 1, scaledWidth);
    addRayLines(grp, vigV, color, 0.16, scaledWidth * 0.65);
    return grp;
  }

  function buildSegmentLines(
    paths,
    color,
    showGhost,
    totalRayCount = paths.length,
  ) {
    const core = [],
      ghost = [],
      widthScale = rayWidthScale(totalRayCount);
    for (const p of paths)
      for (const q of p.segments || []) {
        const a = q.a,
          b = q.b;
        if (!finite3(a) || !finite3(b)) continue;
        const arr = q.ghost ? ghost : core;
        arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      }
    const grp = new THREE.Group();
    addRayLines(grp, core, color, 1, 1.35 * widthScale);
    if (showGhost) addRayLines(grp, ghost, color, 0.22, 0.7 * widthScale);
    return grp;
  }

  function updateSourceVisualization(srcType, sx, sy, sz, aimY, aimX, NA) {
    view.clearGroup(view.sourceGrp);
    if (srcType !== 'point') return;
    const P = new THREE.Vector3(sx, sy, sz),
      { C, U, V } = sourceBasis(aimY, aimX),
      cv = new THREE.Vector3(...C),
      uv = new THREE.Vector3(...U),
      vv = new THREE.Vector3(...V);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffd6a0,
        transparent: true,
        opacity: 0.95,
      }),
    );
    marker.position.copy(P);
    view.sourceGrp.add(marker);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffbb77,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    halo.position.copy(P);
    view.sourceGrp.add(halo);
    const alpha = Math.asin(Math.max(0, Math.min(0.999, +NA || 0))),
      L = Math.max(
        18,
        Math.min(45, Math.abs((model.surfaces[0]?.z || 0) - sz) * 0.7),
      ),
      rad = L * Math.tan(alpha),
      N = 36,
      verts = [];
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const a = (2 * Math.PI * i) / N,
        q = P.clone()
          .addScaledVector(cv, L)
          .addScaledVector(uv, rad * Math.cos(a))
          .addScaledVector(vv, rad * Math.sin(a));
      if (prev) {
        verts.push(prev.x, prev.y, prev.z, q.x, q.y, q.z);
      }
      if (i < N && i % 6 === 0) verts.push(P.x, P.y, P.z, q.x, q.y, q.z);
      prev = q;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    view.sourceGrp.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({
          color: 0xffc38a,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
        }),
      ),
    );
    const cend = P.clone().addScaledVector(cv, L);
    const cg = new THREE.BufferGeometry().setFromPoints([P, cend]);
    view.sourceGrp.add(
      new THREE.Line(
        cg,
        new THREE.LineDashedMaterial({
          color: 0xffddb0,
          dashSize: 1.2,
          gapSize: 0.8,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    view.sourceGrp.children.at(-1).computeLineDistances?.();
    const label = view.makeLabelSprite(`POINT · NA ${(+NA).toFixed(2)}`);
    label.position.copy(P).add(new THREE.Vector3(0, 2.2, 0));
    view.sourceGrp.add(label);
  }

  function updatePupilVisualization(wl = 0.5875618) {
    view.clearGroup(view.pupilGrp);
    const cb = document.getElementById('cbPupil');
    view.pupilGrp.visible = !cb || cb.checked;
    if (!view.pupilGrp.visible) return;
    const e = optics.entrancePupil(wl);
    if (!e.finite || !isFinite(e.diameter)) return;
    const r = e.diameter / 2,
      N = 72,
      v = [];
    for (let i = 0; i <= N; i++) {
      const a = (2 * Math.PI * i) / N;
      v.push(r * Math.cos(a), r * Math.sin(a), e.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const ring = new THREE.Line(
      g,
      new THREE.LineDashedMaterial({
        color: 0x8cc8ff,
        dashSize: 0.7,
        gapSize: 0.5,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    ring.computeLineDistances();
    view.pupilGrp.add(ring);
    const cross = new THREE.BufferGeometry();
    cross.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-r, 0, e.z, r, 0, e.z, 0, -r, e.z, 0, r, e.z],
        3,
      ),
    );
    view.pupilGrp.add(
      new THREE.LineSegments(
        cross,
        new THREE.LineBasicMaterial({
          color: 0x8cc8ff,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      ),
    );
    const lab = view.makeLabelSprite('ENTRANCE PUPIL');
    lab.position.set(0, r + 2, e.z);
    view.pupilGrp.add(lab);
  }

  function buildRays() {
    // During project/undo restoration many controls emit synthetic input/change
    // events. Defer those expensive traces and perform one authoritative rebuild
    // after the batch completes.
    if (session.suspendTrace) {
      session.traceDirty = true;
      return session.lastAnalysis || null;
    }
    session.traceDirty = false;
    UNKNOWN_GLASS.clear();
    view.clearGroup(view.rayGrp);
    view.lineMats.length = 0;
    const srcType = document.querySelector(
        'input[name="srcType"]:checked',
      ).value,
      fanShape = document.querySelector('input[name="fanShape"]:checked').value,
      rayEngine = document.querySelector(
        'input[name="rayEngine"]:checked',
      ).value;
    const fieldY = parseFloat(document.getElementById('sField').value),
      fieldX = parseFloat(document.getElementById('sFieldX').value),
      sPY = parseFloat(document.getElementById('sPY').value),
      sPZ = parseFloat(document.getElementById('sPZ').value),
      sPX = parseFloat(document.getElementById('sPX').value),
      ptDirY = parseFloat(document.getElementById('sPtDirY').value),
      ptDirX = parseFloat(document.getElementById('sPtDirX').value),
      ptNA = parseFloat(document.getElementById('sPtNA').value);
    const nRays = Math.max(
        1,
        Math.min(
          5001,
          parseInt(document.getElementById('nRays').value, 10) || 49,
        ),
      ),
      addChief = document.getElementById('cbChief').checked,
      showVig = document.getElementById('cbVig').checked,
      ghosts = document.getElementById('cbGhost').checked;
    view.updateSourceVisualization(
      srcType,
      sPX,
      sPY,
      sPZ,
      ptDirY,
      ptDirX,
      ptNA,
    );
    updatePupilVisualization(WL_VALS.d);
    const activeWLs = [];
    if (document.getElementById('cbF').checked)
      activeWLs.push({ key: 'F', wl: WL_VALS.F, col: WL_COLORS.F });
    if (document.getElementById('cbD').checked)
      activeWLs.push({ key: 'd', wl: WL_VALS.d, col: WL_COLORS.d });
    if (document.getElementById('cbC').checked)
      activeWLs.push({ key: 'C', wl: WL_VALS.C, col: WL_COLORS.C });
    if (document.getElementById('cbCustom').checked) {
      const nm = parseFloat(document.getElementById('sWL').value);
      activeWLs.push({ key: 'λ', wl: nm / 1000, col: wlToHex(nm) });
    }
    if (!activeWLs.length)
      activeWLs.push({ key: 'd', wl: WL_VALS.d, col: WL_COLORS.d });
    let totalTraced = 0,
      totalVig = 0,
      totalPower = 0,
      powerCount = 0,
      spotHits = [],
      aberrPoints = [];
    for (const { wl, col } of activeWLs) {
      const fanRays =
        srcType === 'collimated'
          ? optics.makeCollimated(fieldY, fieldX, nRays, wl, addChief, fanShape)
          : optics.makePointSource(
              sPX,
              sPY,
              sPZ,
              ptDirY,
              ptDirX,
              ptNA,
              nRays,
              wl,
              addChief,
              fanShape,
            );
      totalTraced += fanRays.length;
      if (rayEngine === 'fresnel') {
        // Dense bundles trace every primary ray. Ghost branches are sampled
        // deterministically above ~1k rays so 2.5k/5k bundles remain interactive
        // without changing the primary path, detector hit, or Fresnel throughput.
        const ghostBudget = 900,
          ghostStride =
            ghosts && fanRays.length > ghostBudget
              ? Math.ceil(fanRays.length / ghostBudget)
              : 1;
        const paths = fanRays.map((r, ri) => {
          const doGhost =
            ghosts && (ghostStride === 1 || ri % ghostStride === 0 || r.chief);
          const q = optics.traceFresnel3D(r.O, r.D, wl, {
            ghosts: doGhost,
            maxBounces: 4,
            minPower: 0.003,
          });
          q.chief = r.chief;
          q.rayMeta = r;
          return q;
        });
        view.rayGrp.add(buildSegmentLines(paths, col, ghosts, fanRays.length));
        for (const p of paths) {
          if (p.primaryHit) {
            totalPower += p.primaryHit.power;
            powerCount++;
            const base = p.rayMeta || {};
            const uv = base.normalizedPupil || base.angular || [0, 0];
            const rho = Math.min(1, Math.hypot(uv[0] || 0, uv[1] || 0));
            const hit = {
              ...p.primaryHit,
              wl,
              col,
              rho,
              chief: !!p.chief,
              uv,
              opl: p.primaryHit.opl,
            };
            spotHits.push(hit);
            aberrPoints.push(hit);
          } else totalVig++;
        }
      } else {
        const paths = fanRays.map((r) => {
          const q = optics.traceRay(r.O, r.D, wl);
          q.chief = r.chief;
          return q;
        });
        totalVig += paths.filter((p) => p.vignetted).length;
        view.rayGrp.add(
          buildRayLines(
            paths.filter((p) => !p.chief),
            col,
            1.35,
            showVig,
            fanRays.length,
          ),
        );
        view.rayGrp.add(
          buildRayLines(
            paths.filter((p) => p.chief),
            col,
            2.3,
            false,
            1,
          ),
        );
        paths.forEach((p, idx) => {
          if (!p.vignetted && p.points.length) {
            const base = fanRays[idx] || {};
            const uv = base.normalizedPupil || base.angular || [0, 0];
            const rho = Math.min(1, Math.hypot(uv[0] || 0, uv[1] || 0));
            const hit = {
              p: p.points[p.points.length - 1],
              power: 1,
              ghost: false,
              wl,
              col,
              rho,
              chief: !!p.chief,
              uv,
              opl: p.opl,
            };
            spotHits.push(hit);
            aberrPoints.push(hit);
            totalPower += 1;
            powerCount++;
          }
        });
      }
    }
    const throughput = totalTraced > 0 ? totalPower / totalTraced : 0,
      spotMetrics = view.drawSpot(spotHits),
      aberrMetrics = view.drawAberration(aberrPoints, {
        sourceType: srcType,
        fieldX,
        fieldY,
      }),
      analysis = {
        traced: totalTraced,
        vignetted: totalVig,
        detectorHits: powerCount,
        totalPower,
        throughput,
        throughputText: `${(100 * throughput).toFixed(1)}%`,
        rms: spotMetrics.rms,
        rmsText: spotMetrics.rmsText,
        centroid: spotMetrics.hits ? [spotMetrics.mx, spotMetrics.my] : null,
        spotHits: spotMetrics.hits,
        aberration: aberrMetrics,
        source: {
          type: srcType,
          x: sPX,
          y: sPY,
          z: sPZ,
          aimX: ptDirX,
          aimY: ptDirY,
          na: ptNA,
          fieldX,
          fieldY,
        },
        wavelengths: activeWLs.map((w) => ({
          key: w.key,
          wl: w.wl,
          col: w.col,
        })),
        engine: rayEngine,
        rayCount: nRays,
      };
    document.getElementById('iTraced').textContent = totalTraced;
    document.getElementById('iVig').textContent = totalVig;
    document.getElementById('iPower').textContent = analysis.throughputText;
    session.lastAnalysis = analysis;
    if (typeof session.onAnalysis === 'function') session.onAnalysis(analysis);
    const wlStr = activeWLs.map((w) => w.key).join('+'),
      srcStr =
        srcType === 'collimated'
          ? `field <span class="hi">(${fieldX.toFixed(2)}°, ${fieldY.toFixed(2)}°)</span>`
          : `point (<span class="hi">${sPX.toFixed(1)}, ${sPY.toFixed(1)}, ${sPZ.toFixed(1)}</span>) · aim (${ptDirX.toFixed(1)}°, ${ptDirY.toFixed(1)}°) · NA ${ptNA.toFixed(2)}`;
    document.getElementById('hudTxt').innerHTML =
      `${wlStr} · ${srcStr} · ${rayEngine === 'fresnel' ? 'Fresnel 3D' : 'sequential'}`;
    const ep = optics.entrancePupil(WL_VALS.d);
    document.getElementById('hudSrc').innerHTML =
      (srcType === 'point'
        ? `physical emission cone · source z = <span class="hi2">${sPZ.toFixed(1)} mm</span>`
        : `${nRays}${addChief ? '+1' : ''} pupil samples · ${ep.stopKind} · ENP ${ep.finite ? `z ${ep.z.toFixed(2)} mm` : '∞'}`) +
      (nRays > 1000 && rayEngine === 'fresnel' && ghosts
        ? ' · dense bundle: ghost branches sampled'
        : '');
    const w = document.getElementById('parseWarn');
    if (UNKNOWN_GLASS.size)
      w.innerHTML = `<div class="warn">⚠ Approx n=1.52 used for:<br>${escapeHTML([...UNKNOWN_GLASS].join(', '))}</div>`;
    else w.innerHTML = '';
    return analysis;
  }
  Object.assign(view, {
    buildRayLines,
    buildSegmentLines,
    updateSourceVisualization,
    updatePupilVisualization,
    buildRays,
  });
  return function bindEvents() {};
}
