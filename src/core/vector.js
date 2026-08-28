// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.

export const FP_EPS = Number.EPSILON;

export function clamp1(x) {
  return Math.max(-1, Math.min(1, x));
}

export function finite3(v) {
  return Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
}

export function kahanAdd(state, x) {
  const y = x - state.c,
    t = state.s + y;
  state.c = t - state.s - y;
  state.s = t;
}

export function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function norm3(v) {
  if (!finite3(v)) return null;
  const l = Math.hypot(v[0], v[1], v[2]);
  if (!(l > 1e-300) || !Number.isFinite(l)) return null;
  return [v[0] / l, v[1] / l, v[2] / l];
}

export function sourceBasis(aimYDeg, aimXDeg) {
  const tx = Math.tan((aimXDeg * Math.PI) / 180),
    ty = Math.tan((aimYDeg * Math.PI) / 180),
    C = norm3([tx, ty, 1]) || [0, 0, 1],
    ref = Math.abs(C[2]) < 0.92 ? [0, 0, 1] : [0, 1, 0];
  const U = norm3([
      ref[1] * C[2] - ref[2] * C[1],
      ref[2] * C[0] - ref[0] * C[2],
      ref[0] * C[1] - ref[1] * C[0],
    ]) || [1, 0, 0],
    V = norm3([
      C[1] * U[2] - C[2] * U[1],
      C[2] * U[0] - C[0] * U[2],
      C[0] * U[1] - C[1] * U[0],
    ]) || [0, 1, 0];
  return { C, U, V };
}
