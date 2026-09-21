// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { finite3, sourceBasis } from '../core/vector.js';

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

  function updatePupilVisualization(pupil = session.lastAnalysis?.pupil) {
    view.clearGroup(view.pupilGrp);
    view.pupilGrp.visible = model.simulation?.display.showPupil ?? true;
    if (!view.pupilGrp.visible) return;
    const e = typeof pupil === 'object' ? pupil : session.lastAnalysis?.pupil;
    if (!e) return;
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
    return ui.requestSimulation?.() || session.lastAnalysis || null;
  }

  function renderSimulation(result) {
    view.clearGroup(view.rayGrp);
    view.lineMats.length = 0;
    const source = result.source;
    view.updateSourceVisualization(
      source.type,
      source.xMm,
      source.yMm,
      source.zMm,
      source.aimYDeg,
      source.aimXDeg,
      source.na,
    );
    updatePupilVisualization(result.pupil);
    for (const group of result.paths || []) {
      if (result.engine === 'fresnel') {
        view.rayGrp.add(
          buildSegmentLines(
            group.paths,
            group.col,
            result.display.showGhosts,
            result.display.count,
          ),
        );
      } else {
        view.rayGrp.add(
          buildRayLines(
            group.paths.filter((p) => !p.chief),
            group.col,
            1.35,
            result.display.showVignetted,
            result.display.count,
          ),
        );
        view.rayGrp.add(
          buildRayLines(
            group.paths.filter((p) => p.chief),
            group.col,
            2.3,
            false,
            1,
          ),
        );
      }
    }
    view.drawSpot(result.hits);
    view.drawAberration([...result.hits, ...result.referenceHits]);
  }
  Object.assign(view, {
    buildRayLines,
    buildSegmentLines,
    updateSourceVisualization,
    updatePupilVisualization,
    buildRays,
    renderSimulation,
  });
  return function bindEvents() {};
}
