import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { installRays } from '../src/rendering/rays.js';
import { WL_COLORS, wlToHex } from '../src/core/wavelengths.js';

const counts = [9, 25, 49, 97, 271, 601, 700, 701, 1201, 2501, 5001];
const points = [
  [0, 0, -10],
  [1, 2, 0],
  [0, 0, 10],
];
const path = {
  points,
  segments: points.slice(1).map((b, i) => ({
    a: points[i],
    b,
    power: 0.9,
    ghost: false,
  })),
};

function renderer(t) {
  const view = { vp: { clientWidth: 800, clientHeight: 600 }, lineMats: [] };
  installRays({ view });
  const groups = [];
  t.after(() => {
    for (const group of groups)
      for (const line of group.children) {
        line.geometry.dispose();
        line.material.dispose();
      }
  });
  return {
    sequential(paths, color, count, showVig = false, width = 1.35) {
      const group = view.buildRayLines(paths, color, width, showVig, count);
      groups.push(group);
      return group.children;
    },
    fresnel(paths, color, count, showGhost = false) {
      const group = view.buildSegmentLines(paths, color, showGhost, count);
      groups.push(group);
      return group.children;
    },
  };
}

function assertWavelengthColor(material, hex) {
  assert.equal(material.blending, THREE.NormalBlending);
  assert.equal(material.toneMapped, false);
  // With the renderer's sRGB output, the line must recover the UI palette
  // color without exposure changes or additive whitening at intersections.
  const output = material.color.clone().convertLinearToSRGB();
  const expected = new THREE.Color(hex);
  for (const channel of ['r', 'g', 'b'])
    assert.ok(Math.abs(output[channel] - expected[channel]) < 0.0001);
}

test('both engines keep wavelength colors and primary opacity at every ray count', (t) => {
  const draw = renderer(t);
  for (const color of [...Object.values(WL_COLORS), wlToHex(532)]) {
    for (const count of counts) {
      for (const engine of ['sequential', 'fresnel']) {
        const lines = draw[engine]([path], color, count);
        assert.equal(lines.length, 1, 'primary rays have no whitening halo');
        assertWavelengthColor(lines[0].material, color);
        assert.equal(lines[0].material.opacity, 1);
      }
      const [chief] = draw.sequential([path], color, 1, false, 2.3);
      assertWavelengthColor(chief.material, color);
      assert.equal(chief.material.opacity, 1);
    }
  }
});

test('dense rendering retains every primary segment and only narrows lines', (t) => {
  const draw = renderer(t);
  for (const engine of ['sequential', 'fresnel']) {
    let previousWidth = Infinity;
    for (const count of counts) {
      const paths = Array.from({ length: count }, () => path);
      const [line] = draw[engine](paths, WL_COLORS.d, count);
      assert.equal(line.geometry.attributes.instanceStart.count, count * 2);
      assert.equal(line.geometry.attributes.instanceEnd.count, count * 2);
      assert.ok(line.material.linewidth <= previousWidth);
      assert.ok(line.material.linewidth >= 0.45);
      previousWidth = line.material.linewidth;
    }
  }
});

test('ghost and vignetted rays keep a fixed faint color and respect visibility', (t) => {
  const draw = renderer(t);
  const sequential = [path, { points, vignetted: true }];
  const fresnel = [
    {
      segments: [
        ...path.segments,
        ...path.segments.map((segment) => ({ ...segment, ghost: true })),
      ],
    },
  ];
  const before = structuredClone({ sequential, fresnel });
  for (const count of counts) {
    for (const [engine, paths, opacity] of [
      ['sequential', sequential, 0.16],
      ['fresnel', fresnel, 0.22],
    ]) {
      const visible = draw[engine](paths, WL_COLORS.C, count, true);
      assert.equal(visible.length, 2);
      assertWavelengthColor(visible[1].material, WL_COLORS.C);
      assert.equal(visible[1].material.opacity, opacity);
      assert.equal(draw[engine](paths, WL_COLORS.C, count, false).length, 1);
      assert.equal(draw[engine]([], WL_COLORS.C, count, true).length, 0);
    }
  }
  assert.deepEqual({ sequential, fresnel }, before);
});
