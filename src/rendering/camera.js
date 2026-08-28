/** Camera presets missing from the reference prototype. */
export function installCameraViews({ state, view }) {
  function bounds() {
    const z0 = state.surfaces[0]?.z ?? 0;
    const z1 = state.surfaces.at(-1)?.z ?? 40;
    const radius = Math.max(10, ...state.surfaces.map((s) => s.sd || 0));
    const source = document.getElementById('stPt').checked
      ? +document.getElementById('sPZ').value
      : z0 - Math.max(20, state.epd);
    const lo = Math.min(source, z0),
      hi = Math.max(z1, z0 + 10);
    return { center: (lo + hi) / 2, span: hi - lo, radius };
  }
  function distance() {
    const b = bounds();
    const vertical = Math.max(
      b.radius * 2.7,
      b.span / Math.max(0.2, view.camera.aspect),
    );
    return {
      ...b,
      distance:
        (1.15 * vertical) / (2 * Math.tan((view.camera.fov * Math.PI) / 360)),
    };
  }
  function fitBench() {
    const b = distance();
    const direction = view.camera.position
      .clone()
      .sub(view.controls.target)
      .normalize();
    if (!direction.lengthSq()) direction.set(1, 0.5, -0.5).normalize();
    view.controls.target.set(0, 0, b.center);
    view.camera.position
      .copy(view.controls.target)
      .addScaledVector(direction, b.distance);
    view.camera.far = Math.max(1000, b.distance * 8 + b.span);
    view.camera.updateProjectionMatrix();
    view.controls.update();
  }
  function setLayoutView() {
    const b = distance();
    view.controls.target.set(0, 0, b.center);
    view.camera.up.set(0, 1, 0);
    view.camera.position.set(b.distance, 0, b.center);
    fitBench();
  }
  function setFrontView() {
    const b = distance();
    view.controls.target.set(0, 0, b.center);
    view.camera.up.set(0, 1, 0);
    view.camera.position.set(0, 0, b.center - b.distance);
    fitBench();
  }
  Object.assign(view, { fitBench, setLayoutView, setFrontView });
}
