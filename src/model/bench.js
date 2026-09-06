// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import {
  cloneSurface,
  componentLength,
  componentLocalSurfaces,
} from './components.js';
import { BENCH_GAP_MM } from '../data/defaults.js';

export function createBench(model, optics = {}) {
  function newComponentId() {
    let id;
    do {
      id = `cmp-${model.componentSequence++}`;
    } while (model.components.some((component) => component.id === id));
    return id;
  }

  function createLibraryComponent(templateId, z) {
    const t = model.componentLibrary.find((x) => x.id === templateId);
    if (!t) return null;
    if (t.kind === 'detector') {
      const old = model.components.find((c) => c.kind === 'detector');
      if (old) {
        old.z = snapZ(z);
        old.params.diameter = t.params.diameter;
        ensureDetectorAfterOptics();
        return old;
      }
    }
    const c = {
      id: newComponentId(),
      kind: t.kind,
      template: t.id,
      name: t.name,
      z: snapZ(z),
      orientation: 1,
      params: JSON.parse(JSON.stringify(t.params || {})),
    };
    if (t.kind === 'imported') {
      c.surfaces = (t.surfaces || []).map(cloneSurface);
      c.importMeta = t.importMeta
        ? JSON.parse(JSON.stringify(t.importMeta))
        : null;
      c.sourceFile = t.sourceFile || null;
    }
    model.components.push(c);
    placeNewComponent(c);
    return c;
  }

  function snapZ(z) {
    const step = Math.max(0.001, Number(model.snapMm) || 0.1);
    // quotient rounding plus precision cleanup avoids 0.30000000000000004-style z values.
    const q = Math.round((Number(z) || 0) / step);
    const decimals = Math.min(9, Math.max(0, Math.ceil(-Math.log10(step)) + 2));
    return Number((q * step).toFixed(decimals));
  }

  function intervalsOverlap(a0, a1, b0, b1, g = BENCH_GAP_MM) {
    return a0 < b1 + g && a1 + g > b0;
  }

  function placeNewComponent(c) {
    if (c.kind === 'detector') {
      ensureDetectorAfterOptics();
      return;
    }
    let z = snapZ(c.z),
      len = componentLength(c);
    const others = model.components
      .filter((x) => x.id !== c.id && x.kind !== 'detector')
      .sort((a, b) => a.z - b.z);
    let guard = 0,
      moved = true;
    while (moved && guard++ < 32) {
      moved = false;
      for (const o of others) {
        if (intervalsOverlap(z, z + len, o.z, o.z + componentLength(o))) {
          z = snapZ(o.z + componentLength(o) + BENCH_GAP_MM);
          moved = true;
        }
      }
    }
    c.z = z;
    ensureDetectorAfterOptics();
  }

  function ensureDetectorAfterOptics() {
    let det = model.components.find((c) => c.kind === 'detector');
    const optics = model.components.filter((c) => c.kind !== 'detector');
    const last = optics.length
      ? Math.max(...optics.map((c) => c.z + componentLength(c)))
      : 20;
    if (!det) {
      det = {
        id: newComponentId(),
        kind: 'detector',
        template: 'det',
        name: 'Detector plane',
        z: snapZ(last + 30),
        params: { diameter: 25.4 },
      };
      model.components.push(det);
    }
    if (det.z < last + 5) det.z = snapZ(last + 30);
  }

  function clampDraggedZ(c, z) {
    z = snapZ(z);
    const ordered = model.components
        .filter((x) => x.id !== c.id)
        .sort((a, b) => a.z - b.z),
      len = componentLength(c);
    if (c.kind === 'detector') {
      const last = ordered
        .filter((x) => x.kind !== 'detector')
        .reduce((m, x) => Math.max(m, x.z + componentLength(x)), -Infinity);
      return Math.max(z, snapZ((isFinite(last) ? last : 0) + 5));
    }
    const currentOrder = [...model.components].sort((a, b) => a.z - b.z),
      idx = currentOrder.findIndex((x) => x.id === c.id);
    const prev = idx > 0 ? currentOrder[idx - 1] : null,
      next =
        idx >= 0 && idx < currentOrder.length - 1
          ? currentOrder[idx + 1]
          : null;
    let lo = -500,
      hi = 500;
    if (prev) lo = prev.z + componentLength(prev) + BENCH_GAP_MM;
    if (next) hi = next.z - len - BENCH_GAP_MM;
    return snapZ(Math.max(lo, Math.min(hi, z)));
  }

  function syncSurfacesFromComponents() {
    ensureDetectorAfterOptics();
    const ordered = [...model.components].sort((a, b) => a.z - b.z);
    const flat = [];
    for (const c of ordered) {
      for (const q of componentLocalSurfaces(c)) {
        const s = cloneSurface(q);
        s.z = c.z + (q.z || 0);
        s.componentId = c.id;
        s.componentKind = c.kind;
        flat.push(s);
      }
    }
    for (let i = 0; i < flat.length; i++) {
      flat[i].num = i + 1;
      flat[i].thickness = i < flat.length - 1 ? flat[i + 1].z - flat[i].z : 0;
    }
    model.surfaces = flat;
    const first = flat[0];
    if (first)
      model.epd =
        isFinite(model.benchEpd) && model.benchEpd > 0
          ? model.benchEpd
          : first.sd * 2;
    model.lensName =
      model.components
        .filter((c) => c.kind !== 'detector')
        .map((c) => c.name)
        .join(' + ') || 'Optical bench';
    return flat;
  }

  function initializeBenchFromSurfaces(surfaces, name, epd, meta = null) {
    model.components = [];
    const ss = surfaces.map(cloneSurface);
    const stop0 = ss.find((q) => q.isStop),
      fallbackD = stop0 ? 2 * (stop0.sd || 12.5) : 2 * (ss[0]?.sd || 12.5);
    model.benchEpd = isFinite(epd) && epd > 0 ? epd : fallbackD;
    if (meta) model.importMeta = { ...model.importMeta, ...meta };
    if (ss.length < 1) return;
    const detector = ss[ss.length - 1],
      optical = ss.slice(0, -1);
    if (optical.length) {
      const z0 = optical[0].z || 0;
      model.components.push({
        id: newComponentId(),
        kind: 'imported',
        template: 'imported',
        name: name || 'Imported lens',
        z: z0,
        orientation: 1,
        params: { diameter: 2 * Math.max(...optical.map((q) => q.sd || 12.5)) },
        importMeta: meta ? { ...meta, epd: model.benchEpd } : null,
        surfaces: optical.map((q) => ({
          ...cloneSurface(q),
          z: (q.z || 0) - z0,
        })),
      });
    }
    model.components.push({
      id: newComponentId(),
      kind: 'detector',
      template: 'det',
      name: 'Detector plane',
      z: detector.z || (optical.at(-1)?.z || 0) + 30,
      params: { diameter: 2 * (detector.sd || 12.5) },
    });
    syncSurfacesFromComponents();
  }

  return {
    newComponentId,
    createLibraryComponent,
    snapZ,
    intervalsOverlap,
    placeNewComponent,
    ensureDetectorAfterOptics,
    clampDraggedZ,
    syncSurfacesFromComponents,
    initializeBenchFromSurfaces,
  };
}
