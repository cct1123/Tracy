// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import { sagSD, getSafeR } from '../core/surfaces.js';
import { sellmeier } from '../core/materials.js';
import {
  componentLength,
  componentRadius,
  airLikeGlass,
  componentHasOrientation,
  componentOrientation,
  componentLocalSurfaces,
} from '../model/components.js';
import * as THREE from 'three';

export function installGeometry({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  const GLASS_COLORS = [0xd0e4ff, 0xd8d0ff, 0xc8e8f8, 0xe0d4ff];

  view.glassMaterials = [];

  function pbrEnabled() {
    const e = document.getElementById('cbPBR');
    return !e || e.checked;
  }

  function glassOpacity() {
    const e = document.getElementById('sGlass');
    return e ? parseFloat(e.value) : 0.92;
  }

  function makeGlassMat(colorHex, ior = 1.52) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.035,
      metalness: 0,
      transmission: pbrEnabled() ? glassOpacity() : 0,
      transparent: true,
      opacity: pbrEnabled() ? 1 : 0.34,
      ior: Math.max(1.01, ior),
      clearcoat: 0.18,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.4,
    });
    view.glassMaterials.push(mat);
    return mat;
  }

  function updateGlassMaterials() {
    const p = pbrEnabled(),
      op = glassOpacity();
    view.glassMaterials.forEach((m) => {
      m.transmission = p ? op : 0;
      m.opacity = p ? 1 : 0.34;
      m.needsUpdate = true;
    });
  }

  function sagProfile(surf, NR) {
    const pts = [],
      SD = surf.sd || 12.5;
    for (let i = 0; i <= NR; i++) {
      const r = getSafeR((SD * i) / NR, surf);
      pts.push(new THREE.Vector2(r, surf.z + sagSD(r, surf).s));
    }
    return pts;
  }

  function buildSurfaceMesh(surf) {
    const geo = new THREE.LatheGeometry(sagProfile(surf, 72), 88);
    geo.applyMatrix4(view.ROT);
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({
      color:
        document.documentElement.dataset.theme === 'day' ? 0x8f9eb3 : 0xaabbdd,
      emissive:
        document.documentElement.dataset.theme === 'day' ? 0x000000 : 0x08061e,
      transparent: true,
      opacity: document.documentElement.dataset.theme === 'day' ? 0.11 : 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return new THREE.Mesh(geo, mat);
  }

  function buildRimLine(surf) {
    const SD = getSafeR(surf.sd || 12.5, surf),
      N = 128,
      v = [];
    const zRim = surf.z + sagSD(SD, surf).s;
    for (let i = 0; i <= N; i++) {
      const phi = (2 * Math.PI * i) / N;
      v.push(SD * Math.cos(phi), SD * Math.sin(phi), zRim);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color:
          document.documentElement.dataset.theme === 'day'
            ? 0x7f8ba0
            : 0x2a2060,
        transparent: true,
        opacity: document.documentElement.dataset.theme === 'day' ? 0.58 : 0.7,
      }),
    );
  }

  function buildGlassElement(s1, s2, colorIdx) {
    const SD = Math.max(s1.sd || 12.5, s2.sd || 12.5),
      NR = 72,
      pts = [];
    for (let i = 0; i <= NR; i++) {
      const r = getSafeR((SD * i) / NR, s1);
      pts.push(new THREE.Vector2(r, s1.z + sagSD(r, s1).s));
    }
    for (let i = NR; i >= 0; i--) {
      const r = getSafeR((SD * i) / NR, s2);
      pts.push(new THREE.Vector2(r, s2.z + sagSD(r, s2).s));
    }
    const geo = new THREE.LatheGeometry(pts, 88);
    geo.applyMatrix4(view.ROT);
    geo.computeVertexNormals();
    const col = GLASS_COLORS[colorIdx % GLASS_COLORS.length];
    const g = new THREE.Group();
    const ior = sellmeier(s1.glass || 'N-BK7', 0.5875618);
    g.add(new THREE.Mesh(geo, makeGlassMat(col, ior)));
    return g;
  }

  function buildAxisLine() {
    const z0 = model.surfaces[0].z - 10,
      z1 = model.surfaces[model.surfaces.length - 1].z + 12;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, z0, 0, 0, z1], 3),
    );
    const l = new THREE.Line(
      geo,
      new THREE.LineDashedMaterial({
        color:
          document.documentElement.dataset.theme === 'day'
            ? 0x98a3b5
            : 0x1e1850,
        dashSize: 4,
        gapSize: 3,
      }),
    );
    l.computeLineDistances();
    return l;
  }

  function buildImagePlane() {
    const s = model.surfaces[model.surfaces.length - 1];
    const geo = new THREE.CircleGeometry(s.sd || 12.5, 64);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, s.z));
    return new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color:
          document.documentElement.dataset.theme === 'day'
            ? 0xd8e0eb
            : 0x120d30,
        transparent: true,
        opacity: document.documentElement.dataset.theme === 'day' ? 0.32 : 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
  }

  function buildImagePlaneLocal(sd = 12.5) {
    const geo = new THREE.CircleGeometry(sd, 64);
    return new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color:
          document.documentElement.dataset.theme === 'day'
            ? 0xd2dbe8
            : 0x151036,
        transparent: true,
        opacity: document.documentElement.dataset.theme === 'day' ? 0.42 : 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
  }

  function makeLabelSprite(text) {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 72;
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.font = '28px DM Mono, monospace';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle =
      document.documentElement.dataset.theme === 'day'
        ? 'rgba(39,50,69,.88)'
        : 'rgba(218,210,244,.88)';
    x.fillText(text.slice(0, 24), 192, 36);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.86,
      }),
    );
    sp.scale.set(18, 3.4, 1);
    return sp;
  }

  function makePickProxy(c) {
    const r = componentRadius(c),
      len = Math.max(componentLength(c), 1.2);
    const geo = new THREE.CylinderGeometry(
      r * 1.06,
      r * 1.06,
      len,
      32,
      1,
      false,
    );
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, len / 2);
    const m = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.userData.componentId = c.id;
    mesh.userData.pickProxy = true;
    return mesh;
  }

  function makeSelectionRing(c) {
    const r = componentRadius(c) + 1.1,
      z = componentLength(c) / 2;
    const geo = new THREE.TorusGeometry(r, 0.13, 10, 72);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc8a8f0,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.z = z;
    ring.userData.selectionRing = true;
    ring.visible = c.id === model.selectedComponentId;
    return ring;
  }

  function setComponentNodeZ(id, z) {
    const nodes = view.componentSceneNodes.get(id);
    if (nodes) nodes.forEach((n) => (n.position.z = z));
  }

  function refreshSelectionRings() {
    view.pickGrp.traverse((o) => {
      if (o.userData?.selectionRing) {
        const id = o.parent?.userData?.componentId;
        o.visible = id === model.selectedComponentId;
      }
    });
    ui.renderBenchList();
  }

  function buildAtmosphere() {
    const N = 1200,
      pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 2] = Math.random() * 100 - 15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color:
        document.documentElement.dataset.theme === 'day' ? 0xaeb8c8 : 0x8870d0,
      size: 0.12,
      transparent: true,
      opacity: document.documentElement.dataset.theme === 'day' ? 0.09 : 0.28,
      sizeAttenuation: true,
      blending:
        document.documentElement.dataset.theme === 'day'
          ? THREE.NormalBlending
          : THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  function buildHaze() {
    const geo = new THREE.CircleGeometry(70, 48);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    const z = model.surfaces[model.surfaces.length - 1].z;
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, z));
    return new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color:
          document.documentElement.dataset.theme === 'day'
            ? 0xd5dfeb
            : 0x2810a0,
        transparent: true,
        opacity:
          document.documentElement.dataset.theme === 'day' ? 0.025 : 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending:
          document.documentElement.dataset.theme === 'day'
            ? THREE.NormalBlending
            : THREE.AdditiveBlending,
      }),
    );
  }

  function buildLens() {
    bench.syncSurfacesFromComponents();
    view.glassMaterials.length = 0;
    view.componentSceneNodes.clear();
    [
      view.glassGrp,
      view.surfGrp,
      view.axisGrp,
      view.atmGrp,
      view.pickGrp,
    ].forEach((g) => {
      clearGroup(g);
    });
    let ci = 0;
    for (const c of [...model.components].sort((a, b) => a.z - b.z)) {
      const local = componentLocalSurfaces(c);
      const gg = new THREE.Group(),
        sg = new THREE.Group(),
        pg = new THREE.Group();
      gg.position.z = c.z;
      sg.position.z = c.z;
      pg.position.z = c.z;
      pg.userData.componentId = c.id;
      view.componentSceneNodes.set(c.id, [gg, sg, pg]);
      view.glassGrp.add(gg);
      view.surfGrp.add(sg);
      view.pickGrp.add(pg);
      if (c.kind !== 'detector') {
        for (let i = 0; i < local.length - 1; i++) {
          const q = local[i];
          if (!airLikeGlass(q.glass))
            gg.add(buildGlassElement(q, local[i + 1], ci++));
        }
        for (const q of local) {
          const sm = buildSurfaceMesh(q),
            rim = buildRimLine(q);
          sm.userData.componentId = c.id;
          rim.userData.componentId = c.id;
          sg.add(sm);
          sg.add(rim);
        }
      } else {
        const q = local[0];
        const d = buildImagePlaneLocal(q.sd || 12.5);
        d.userData.componentId = c.id;
        sg.add(d);
        const rim = buildRimLine(q);
        rim.userData.componentId = c.id;
        sg.add(rim);
      }
      const orient = componentOrientation(c),
        orientable = componentHasOrientation(c);
      const label = makeLabelSprite(
        `${orientable ? (orient === 1 ? '→ ' : '← ') : ''}${c.name}`,
      );
      label.position.set(
        0,
        componentRadius(c) + 3,
        Math.max(0.2, componentLength(c) / 2),
      );
      label.userData.componentId = c.id;
      sg.add(label);
      if (orientable) {
        const len = Math.max(3, Math.min(8, componentLength(c) + 3)),
          org = new THREE.Vector3(
            0,
            componentRadius(c) + 1.2,
            Math.max(0.2, componentLength(c) / 2),
          );
        const dir = new THREE.Vector3(0, 0, orient);
        const ar = new THREE.ArrowHelper(dir, org, len, 0xc8a8f0, 0.8, 0.45);
        ar.userData.orientationMarker = true;
        sg.add(ar);
      }
      pg.add(makePickProxy(c));
      pg.add(makeSelectionRing(c));
    }
    view.axisGrp.add(buildAxisLine());
    view.atmGrp.add(buildAtmosphere());
    view.atmGrp.add(buildHaze());
    updateGlassMaterials();
    ui.refreshSystemInfo();
    refreshSelectionRings();
  }

  function clearGroup(g) {
    while (g.children.length) {
      const q = g.children[0];
      g.remove(q);
      q.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material))
            o.material.forEach((m) => m.dispose?.());
          else {
            o.material.map?.dispose?.();
            o.material.dispose?.();
          }
        }
      });
    }
  }
  Object.assign(view, {
    pbrEnabled,
    glassOpacity,
    makeGlassMat,
    updateGlassMaterials,
    sagProfile,
    buildSurfaceMesh,
    buildRimLine,
    buildGlassElement,
    buildAxisLine,
    buildImagePlane,
    buildImagePlaneLocal,
    makeLabelSprite,
    makePickProxy,
    makeSelectionRing,
    setComponentNodeZ,
    refreshSelectionRings,
    buildAtmosphere,
    buildHaze,
    buildLens,
    clearGroup,
  });
  return function bindEvents() {};
}
