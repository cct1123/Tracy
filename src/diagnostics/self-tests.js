// Extracted from the supplied Tracy prototype; see docs/architecture.md.
import { sellmeier } from '../core/materials.js';
import { parseZMX } from '../io/zmx.js';
import {
  conicSD,
  sagSD,
  conicDomainRadius,
  intersect,
  surfNormal,
  snell,
  apertureTolerance,
  apertureOutside,
} from '../core/surfaces.js';
import { dot3, norm3, sourceBasis } from '../core/vector.js';
import { WL_VALS } from '../core/wavelengths.js';

export function installSelfTests({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function runOpticsSelfTests() {
    const results = [];
    const test = (name, fn) => {
      try {
        const detail = fn();
        results.push({ name, ok: true, detail: detail || '' });
      } catch (e) {
        results.push({ name, ok: false, detail: e.message || String(e) });
      }
    };
    const assert = (cond, msg) => {
      if (!cond) throw new Error(msg);
    };
    test('point source independent of lens position', () => {
      const a = optics
        .makePointSource(
          1,
          -2,
          -40,
          3,
          -4,
          0.35,
          25,
          WL_VALS.d,
          true,
          'pupil3d',
        )
        .map((r) => r.D.slice());
      const z = model.surfaces[0].z;
      model.surfaces[0].z = z + 17;
      const b = optics
        .makePointSource(
          1,
          -2,
          -40,
          3,
          -4,
          0.35,
          25,
          WL_VALS.d,
          true,
          'pupil3d',
        )
        .map((r) => r.D.slice());
      model.surfaces[0].z = z;
      let err = 0;
      for (let i = 0; i < a.length; i++)
        for (let k = 0; k < 3; k++)
          err = Math.max(err, Math.abs(a[i][k] - b[i][k]));
      assert(err < 1e-14, `direction changed ${err}`);
      return `max Δdir ${err.toExponential(1)}`;
    });
    test('point source respects NA cone', () => {
      const NA = 0.42,
        { C } = sourceBasis(5, -7),
        alpha = Math.asin(NA),
        rs = optics.makePointSource(
          0,
          0,
          -30,
          5,
          -7,
          NA,
          91,
          WL_VALS.d,
          true,
          'pupil3d',
        );
      let maxA = 0;
      for (const r of rs) {
        maxA = Math.max(
          maxA,
          Math.acos(Math.max(-1, Math.min(1, dot3(C, r.D)))),
        );
      }
      assert(maxA <= alpha + 1e-10, 'ray exceeds requested NA');
      assert(dot3(C, rs[0].D) > 1 - 1e-12, 'chief ray aim mismatch');
      return `half-angle ${((alpha * 180) / Math.PI).toFixed(2)}°`;
    });
    test('point source traces through both engines', () => {
      const rs = optics.makePointSource(
        0,
        0,
        -40,
        0,
        0,
        0.3,
        25,
        WL_VALS.d,
        true,
        'pupil3d',
      );
      let seq = 0,
        fres = 0;
      for (const r of rs) {
        assert(r.D.every(Number.isFinite), 'non-finite point direction');
        const a = optics.traceRay(r.O, r.D, WL_VALS.d);
        if (!a.vignetted && a.points.length === model.surfaces.length + 1)
          seq++;
        const b = optics.traceFresnel3D(r.O, r.D, WL_VALS.d, {
          ghosts: true,
          maxBounces: 3,
          minPower: 0.002,
        });
        if (b.primaryHit) fres++;
        for (const q of b.segments)
          assert(
            [...q.a, ...q.b, q.power].every(Number.isFinite),
            'non-finite Fresnel segment',
          );
      }
      assert(seq > 0, 'no sequential detector hits');
      assert(fres > 0, 'no Fresnel detector hits');
      return `${seq}/${rs.length} sequential · ${fres}/${rs.length} Fresnel`;
    });
    test('ZMX STOP keyword parsed', () => {
      const q = parseZMX(
        'ENPD 12\nSURF 0\nDISZ INFINITY\nSURF 1\nSTOP\nTYPE STANDARD\nCURV 0\nDISZ 10\nDIAM 6\nSURF 2\nTYPE STANDARD\nCURV 0\nDISZ 0\nDIAM 6',
      );
      assert(q.surfaces[0]?.isStop === true, 'STOP flag lost');
      assert(Math.abs(q.epd - 12) < 1e-12, 'ENPD lost');
      return 'STOP + ENPD retained';
    });
    test('ZMX PUPD EPD fallback has no hidden 25 mm default', () => {
      const q = parseZMX(
        'PUPD 0 9.5\nSURF 0\nDISZ INFINITY\nSURF 1\nSTOP\nDISZ 5\nDIAM 4\nSURF 2\nDISZ 0\nDIAM 4',
      );
      assert(Math.abs(q.epd - 9.5) < 1e-12, 'PUPD type 0 not used as EPD');
      assert(q.enpdSource === 'ZMX PUPD (EPD)', 'EPD source not tracked');
      const q2 = parseZMX(
        'PUPD 3 0\nSURF 0\nDISZ INFINITY\nSURF 1\nSTOP\nDISZ 5\nDIAM 4\nSURF 2\nDISZ 0\nDIAM 4',
      );
      assert(q2.epd === null, 'invented EPD when ENPD absent');
      return 'explicit PUPD or STOP-derived only';
    });
    test('Zemax UNIT conversion preserves optical scale', () => {
      const q = parseZMX(
        'UNIT CM\nENPD 2.5\nPUPD 0 2.5\nSURF 0\nDISZ INFINITY\nSURF 1\nTYPE EVENASPH\nCURV 0.02\nCONI -1\nPARM 2 1e-5\nDISZ 0.4\nGLAS N-BK7\nDIAM 1.25\nSURF 2\nTYPE STANDARD\nCURV 0\nDISZ 0\nDIAM 1.25',
      );
      assert(Math.abs(q.epd - 25) < 1e-12, 'ENPD unit conversion');
      assert(
        Math.abs(q.surfaces[0].thickness - 4) < 1e-12,
        'thickness conversion',
      );
      assert(Math.abs(q.surfaces[0].sd - 12.5) < 1e-12, 'diameter conversion');
      assert(
        Math.abs(q.surfaces[0].curvature - 0.002) < 1e-14,
        'curvature conversion',
      );
      assert(
        Math.abs(q.surfaces[0].parm[2] - 1e-8) < 1e-18,
        'asphere conversion',
      );
      return 'CM → mm';
    });
    test('finite Zemax object plane is not an optic', () => {
      const q = parseZMX(
        'ENPD 8\nSURF 0\nTYPE STANDARD\nCURV 0\nDISZ 125\nDIAM 0\nSURF 1\nTYPE STANDARD\nCURV 0.02\nDISZ 4\nGLAS N-BK7\nDIAM 12\nSURF 2\nTYPE STANDARD\nCURV -0.02\nDISZ 50\nDIAM 12\nSURF 3\nTYPE STANDARD\nCURV 0\nDISZ 0\nDIAM 12',
      );
      assert(Math.abs(q.objectDistance - 125) < 1e-12, 'object distance lost');
      assert(q.surfaces.length === 3, 'object surface retained as optic');
      assert(q.surfaces[0].num === 1, 'first physical surface wrong');
      return 'object z = −125 mm';
    });
    test('paraxial entrance pupil images stop', () => {
      const saveS = model.surfaces,
        saveE = model.epd,
        saveB = model.benchEpd;
      try {
        model.surfaces = [
          { z: 0, curvature: 0, conic: 0, parm: {}, glass: 'N-BK7', sd: 12.7 },
          {
            z: 10,
            curvature: 0,
            conic: 0,
            parm: {},
            glass: null,
            sd: 5,
            isStop: true,
            componentKind: 'aperture',
          },
          {
            z: 30,
            curvature: 0,
            conic: 0,
            parm: {},
            glass: null,
            sd: 12.7,
            componentKind: 'detector',
          },
        ];
        model.epd = 25;
        model.benchEpd = 25;
        const n = sellmeier('N-BK7', WL_VALS.d),
          e = optics.entrancePupil(WL_VALS.d),
          expected = 10 / n;
        assert(Math.abs(e.z - expected) < 2e-9, `ENP z ${e.z} vs ${expected}`);
        assert(Math.abs(e.diameter - 10) < 2e-9, `ENPD ${e.diameter}`);
        return `z ${e.z.toFixed(4)} mm`;
      } finally {
        model.surfaces = saveS;
        model.epd = saveE;
        model.benchEpd = saveB;
      }
    });
    test('collimated real-ray aiming reaches stop', () => {
      const saveS = model.surfaces,
        saveE = model.epd,
        saveB = model.benchEpd;
      try {
        model.surfaces = [
          {
            z: 0,
            curvature: 1 / 80,
            conic: 0,
            parm: {},
            glass: 'N-BK7',
            sd: 15,
          },
          { z: 8, curvature: -1 / 80, conic: 0, parm: {}, glass: null, sd: 15 },
          {
            z: 25,
            curvature: 0,
            conic: 0,
            parm: {},
            glass: null,
            sd: 6,
            isStop: true,
            componentKind: 'aperture',
          },
          {
            z: 60,
            curvature: 0,
            conic: 0,
            parm: {},
            glass: null,
            sd: 15,
            componentKind: 'detector',
          },
        ];
        model.epd = 12;
        model.benchEpd = 12;
        const rs = optics.makeCollimated(4, 3, 25, WL_VALS.d, true, 'pupil3d'),
          si = optics.stopSurfaceIndex().index,
          stop = model.surfaces[si];
        let worst = 0,
          ok = 0;
        for (const r of rs) {
          const h = optics.traceToSurfaceIndex(r.O, r.D, WL_VALS.d, si);
          assert(h, 'ray failed before stop');
          const u = r.normalizedPupil?.[0] || 0,
            v = r.normalizedPupil?.[1] || 0,
            err = Math.hypot(h.hit[0] - u * stop.sd, h.hit[1] - v * stop.sd);
          worst = Math.max(worst, err);
          if (r.rayAimed) ok++;
        }
        assert(worst < 2e-5, `stop aiming error ${worst}`);
        assert(ok >= rs.length - 1, 'aim solver did not converge');
        return `max stop error ${(worst * 1e6).toFixed(2)} nm`;
      } finally {
        model.surfaces = saveS;
        model.epd = saveE;
        model.benchEpd = saveB;
      }
    });
    test('critical-angle floating point guard', () => {
      const n1 = 1.5,
        n2 = 1,
        si = n2 / n1,
        ci = Math.sqrt(1 - si * si),
        D = [si, 0, ci],
        N = [0, 0, -1];
      const q = snell(D, N, n1, n2);
      assert(q && q.every(Number.isFinite), 'false TIR at critical boundary');
      return 'near-critical Snell finite';
    });
    test('far aperture miss remains blocking', () => {
      const saveS = model.surfaces;
      try {
        model.surfaces = [
          {
            z: 0,
            curvature: 0,
            conic: 0,
            parm: {},
            glass: null,
            sd: 1,
            isStop: true,
            componentKind: 'aperture',
          },
          {
            z: 20,
            curvature: 0,
            conic: 0,
            parm: {},
            glass: null,
            sd: 20,
            componentKind: 'detector',
          },
        ];
        const q = optics.traceFresnel3D([10, 0, -10], [0, 0, 1], WL_VALS.d, {
          ghosts: false,
        });
        assert(!q.primaryHit, 'ray bypassed finite aperture');
        return 'outside-stop ray blocked';
      } finally {
        model.surfaces = saveS;
      }
    });
    test('conic rim normal remains finite', () => {
      const surf = {
        z: 0,
        curvature: 1 / 20,
        conic: 0,
        parm: {},
        glass: null,
        sd: 20,
      };
      const r = conicDomainRadius(surf),
        q = conicSD(r, surf.curvature, surf.conic);
      assert(q && Number.isFinite(q.s), 'rim sag invalid');
      const h = [r, 0, q.s],
        N = surfNormal(h, surf, [0, 0, 1]);
      assert(N && N.every(Number.isFinite), 'rim normal non-finite');
      return `N=(${N.map((v) => v.toFixed(3)).join(',')})`;
    });
    test('asphere marginal intersections stay finite', () => {
      const surf = {
        z: 0,
        type: 'EVENASPH',
        curvature: 1 / 30,
        conic: -0.3,
        parm: { 2: 2e-7, 3: -5e-10 },
        glass: null,
        sd: 20,
      };
      let worst = 0;
      for (let i = 0; i <= 64; i++) {
        const x = surf.sd * (i / 64) * (1 - 1e-9),
          D = norm3([0.05, 0, 1]),
          O = [x - D[0] * 40, 0, -D[2] * 40],
          h = intersect(O, D, surf);
        assert(h, 'marginal asphere intersection lost');
        const q = sagSD(Math.hypot(h[0], h[1]), surf);
        assert(q, 'marginal asphere sag invalid');
        worst = Math.max(worst, Math.abs(h[2] - surf.z - q.s));
        const N = surfNormal(h, surf, D);
        assert(
          N && N.every(Number.isFinite),
          'marginal asphere normal invalid',
        );
      }
      assert(worst < 1e-8, `asphere edge residual ${worst}`);
      return `max residual ${(worst * 1e6).toFixed(3)} nm`;
    });
    test('marginal aperture boundary deterministic', () => {
      const s = { sd: 12.5 };
      assert(!apertureOutside([12.5, 0, 0], s), 'exact edge rejected');
      assert(
        apertureOutside([12.50001, 0, 0], s),
        'clear outside ray accepted',
      );
      return `tol ${(apertureTolerance(s) * 1e6).toFixed(3)} nm`;
    });
    test('fine z snap is stable', () => {
      const save = model.snapMm;
      model.snapMm = 0.1;
      const a = bench.snapZ(0.3),
        b = bench.snapZ(12.34);
      model.snapMm = save;
      assert(a === 0.3, '0.3 rounding drift');
      assert(b === 12.3, '0.1-mm grid mismatch');
      return `${a.toFixed(1)}, ${b.toFixed(1)} mm`;
    });
    test('large pupil bundle is finite and exact-count', () => {
      const ps = optics.pupilSamples(5001, 'pupil3d', 1);
      assert(ps.length === 5001, `count ${ps.length}`);
      for (let i = 0; i < ps.length; i += 97)
        assert(ps[i].every(Number.isFinite), 'non-finite pupil sample');
      const rs = optics.makePointSource(
        0,
        0,
        -40,
        0,
        0,
        0.7,
        5001,
        WL_VALS.d,
        false,
        'pupil3d',
      );
      assert(rs.length === 5001, `ray count ${rs.length}`);
      for (let i = 0; i < rs.length; i += 97)
        assert(rs[i].D.every(Number.isFinite), 'non-finite dense ray');
      return '5001 rays finite';
    });
    test('ray-count engine selector supports dense bundles', () => {
      const a = [...document.getElementById('nRays').options].map(
          (o) => o.value,
        ),
        expected = [
          '9',
          '25',
          '49',
          '97',
          '271',
          '601',
          '1201',
          '2501',
          '5001',
        ];
      assert(
        a.join(',') === expected.join(','),
        'engine ray-count options mismatch',
      );
      return a.join('/');
    });
    const pass = results.filter((r) => r.ok).length,
      el = document.getElementById('iDiag');
    if (el) {
      el.textContent = `${pass}/${results.length} PASS`;
      el.style.color = pass === results.length ? '#66ddbb' : '#ffaa66';
    }
    console.groupCollapsed(
      `Tracy optics diagnostics · ${pass}/${results.length}`,
    );
    console.table(results);
    console.groupEnd();
    return results;
  }
  Object.assign(ui, { runOpticsSelfTests });
  return function bindEvents() {};
}
