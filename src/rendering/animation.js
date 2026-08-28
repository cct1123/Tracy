// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import * as THREE from 'three';

export function installAnimation({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  function resize() {
    const W = Math.max(1, view.vp.clientWidth),
      H = Math.max(1, view.vp.clientHeight);
    view.renderer.setSize(W, H, false);
    view.camera.aspect = W / H;
    view.camera.updateProjectionMatrix();
    const res = new THREE.Vector2(W, H);
    view.lineMats.forEach((m) => m.resolution.copy(res));
  }

  let tick = 0;
  let frame = null;
  function animate() {
    frame = requestAnimationFrame(animate);
    tick += 0.0008;
    if (view.atmGrp.children[0]) {
      view.atmGrp.children[0].rotation.y = Math.sin(tick) * 0.04;
      view.atmGrp.children[0].rotation.x = Math.sin(tick * 0.7) * 0.02;
    }
    view.controls.update();
    view.renderer.render(view.scene, view.camera);
  }
  function startAnimation() {
    if (frame === null) animate();
  }
  function stopAnimation() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }
  Object.assign(view, { resize, startAnimation, stopAnimation });
  return function bindEvents() {
    const observer = new ResizeObserver(resize);
    observer.observe(view.vp);
    window.addEventListener('pagehide', stopAnimation);
    window.addEventListener('pageshow', startAnimation);
  };
}
