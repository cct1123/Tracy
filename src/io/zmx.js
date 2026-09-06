// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import {
  validateImportedSurface,
  validateSurfaceType,
} from './surface-schema.js';

export function parseZMX(text) {
  const lines = text.split(/\r?\n/);
  const raw = [];
  let cur = null,
    lensName = 'Untitled',
    enpd = null,
    enpdSource = null,
    pupilType = 0,
    pupilValue = null,
    rayAimRaw = null,
    unitName = 'MM',
    unitScale = 1;

  for (const line of lines) {
    const tr = line.trim();
    if (!tr) continue;
    const [k, ...rest] = tr.split(/\s+/);
    const K = k.toUpperCase();
    const pay = rest.join(' ');

    if (K === 'UNIT' && rest[0]) {
      unitName = String(rest[0]).toUpperCase();
      unitScale =
        { MM: 1, CM: 10, IN: 25.4, M: 1000, METER: 1000, METERS: 1000 }[
          unitName
        ] || 1;
      continue;
    }
    if (K === 'NAME') {
      lensName = pay || lensName;
      continue;
    }
    if (K === 'ENPD' && rest[0]) {
      const v = parseFloat(rest[0]);
      if (isFinite(v) && v > 0) {
        enpd = v;
        enpdSource = 'ZMX ENPD';
      }
      continue;
    }
    if (K === 'PUPD' && rest[0]) {
      pupilType = parseInt(rest[0]);
      const v = parseFloat(rest[1]);
      if (isFinite(v)) pupilValue = v;
      continue;
    }
    if (K === 'RAIM') {
      rayAimRaw = rest.map(Number);
      continue;
    }

    if (K === 'SURF') {
      if (cur) raw.push(cur);
      cur = {
        num: parseInt(rest[0]) || raw.length,
        type: 'STANDARD',
        curvature: 0,
        conic: 0,
        parm: {},
        glass: null,
        sd: 10,
        thickness: 0,
      };
      continue;
    }
    if (!cur) continue;

    switch (K) {
      case 'STOP':
        cur.isStop = true;
        break;
      case 'TYPE':
        cur.type = (rest[0] || 'STANDARD').toUpperCase();
        validateSurfaceType(cur);
        break;
      case 'CURV':
        cur.curvature = parseFloat(rest[0]) || 0;
        break;
      case 'CONI':
        cur.conic = parseFloat(rest[0]) || 0;
        break;
      case 'DISZ': {
        const v = rest[0] || '0';
        cur.thickness =
          v.toUpperCase() === 'INFINITY' ? Infinity : parseFloat(v) || 0;
        break;
      }
      case 'GLAS':
        cur.glass = rest[0] || null;
        break;
      case 'DIAM':
      case 'SDIA': {
        const v = parseFloat(rest[0]);
        if (isFinite(v) && v > 0) cur.sd = v;
        break;
      }
      case 'PARM': {
        const idx = parseInt(rest[0]),
          val = parseFloat(rest[1]) || 0;
        if (idx > 0) cur.parm[idx] = val;
        break;
      }
    }
  }
  if (cur) raw.push(cur);

  // Normalize all sequential lens geometry to millimetres. Curvature is inverse length;
  // even-asphere coefficients A_(2k) scale as length^(1-2k).
  if (unitScale !== 1) {
    if (enpd != null) enpd *= unitScale;
    if (pupilValue != null && [0, 3].includes(pupilType))
      pupilValue *= unitScale;
    for (const s of raw) {
      if (isFinite(s.thickness)) s.thickness *= unitScale;
      s.sd *= unitScale;
      s.curvature /= unitScale;
      for (const key of Object.keys(s.parm || {})) {
        const k = parseInt(key);
        s.parm[key] *= Math.pow(unitScale, 1 - 2 * k);
      }
    }
  }
  // If ENPD is not explicitly stored, PUPD type 0 is itself an entrance-pupil diameter.
  if (
    !(isFinite(enpd) && enpd > 0) &&
    pupilType === 0 &&
    isFinite(pupilValue) &&
    pupilValue > 0
  ) {
    enpd = pupilValue;
    enpdSource = 'ZMX PUPD (EPD)';
  }

  // In sequential Zemax, SURF 0 is the object plane even when its distance is finite.
  // It is metadata, not a physical refracting surface. Keep its conjugate distance.
  const hasObject = raw.length && raw[0].num === 0,
    objectDistance = hasObject ? raw[0].thickness : null;
  const phys = raw.slice(hasObject ? 1 : 0);

  let z = 0;
  for (const s of phys) {
    s.z = z;
    validateImportedSurface(s);
    if (isFinite(s.thickness)) z += s.thickness;
  }

  return {
    surfaces: phys,
    name: lensName,
    epd: enpd,
    objectDistance: isFinite(objectDistance) ? objectDistance : null,
    pupilType,
    pupilValue,
    rayAimRaw,
    unitName,
    unitScale,
    enpdSource,
  };
}
