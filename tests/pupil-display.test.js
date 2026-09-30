import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pupilMapData,
  pupilMapScale,
  pupilMapColor,
} from '../src/analysis/pupil-display.js';

const result = {
  status: 'ok',
  wavelengths: [{ key: 'd', wavelengthUm: 0.5 }],
  wavefront: {
    status: 'ok',
    wavelengthKey: 'd',
    wavelengthUm: 0.5,
    tiltRemoved: false,
    weighting: 'Equal sampled pupil area',
    points: [{ uv: [0, 0], wfeNm: -250, wfeWaves: -0.5 }],
    rmsNm: 125,
    pvNm: 500,
    rmsWaves: 0.25,
    pvWaves: 1,
    maxAbsNm: 250,
  },
};

test('wavefront display and locked scale convert nanometres to waves at selected wavelength', () => {
  const options = {
    wavefrontUnits: 'waves',
    wavefrontSpanNm: 1000,
    scaleMode: 'locked',
  };
  const map = pupilMapData(result, options);
  assert.equal(map.rms, 0.25);
  assert.equal(map.pv, 1);
  assert.equal(map.points[0].value, -0.5);
  assert.equal(map.maxAbs, 0.5);
  assert.equal(pupilMapScale(map, [], options), 2);
  assert.equal(pupilMapData(result).points[0].value, -250);
});

test('shared pupil scale never mixes wavelengths or removal conventions', () => {
  const map = pupilMapData(result);
  const same = { ...map, maxAbs: 600 };
  const different = { ...map, signature: 'wfe:F:0.486:false', maxAbs: 10000 };
  assert.equal(pupilMapScale(map, [same, different]), 600);
  assert.ok(pupilMapData(result, { wavefrontRemoveTilt: true }).reason);
  assert.ok(pupilMapData(result, { wavefrontWavelengthKey: 'F' }).reason);
  assert.ok(pupilMapData(null).reason);
});

test('relative OPL diagnostic selects one wavelength and retains its distinct units and reference', () => {
  const raw = {
    ...result,
    relativeOPL: {
      groups: [
        { wl: 0.486, points: [], minOpd: -100, maxOpd: 100 },
        {
          wl: 0.5,
          points: [{ uv: [0, 0], opd: 3 }],
          minOpd: -2,
          maxOpd: 3,
          opdRms: 2,
          referenceKind: 'central reference',
        },
      ],
    },
  };
  const map = pupilMapData(raw, { pupilMetric: 'relative-opl' });
  assert.equal(map.unit, 'µm');
  assert.equal(map.pv, 5);
  assert.equal(map.points[0].value, 3);
  assert.match(map.note, /not wavefront error/);
});

test('signed pupil colour map has matching neutral and bounded positive/negative endpoints', () => {
  assert.equal(pupilMapColor(0), 'rgb(241,241,232)');
  assert.equal(pupilMapColor(-1), pupilMapColor(-2));
  assert.equal(pupilMapColor(1), pupilMapColor(2));
  assert.notEqual(pupilMapColor(-1), pupilMapColor(1));
});
