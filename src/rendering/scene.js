// Extracted from the supplied Soft Ether prototype; see docs/architecture.md.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function installScene({
  state: model,
  bench,
  optics,
  view,
  ui,
  session,
}) {
  view.canvas = document.getElementById('c');

  view.vp = document.getElementById('vp');

  view.renderer = new THREE.WebGLRenderer({
    canvas: view.canvas,
    antialias: true,
    alpha: false,
  });

  view.scene = new THREE.Scene();

  view.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);

  view.controls = new OrbitControls(view.camera, view.renderer.domElement);

  function resetCam() {
    view.camera.position.set(55, 35, -25);
    view.controls.target.set(0, 0, 16);
    view.controls.update();
  }

  view.keyLight = new THREE.DirectionalLight(0xc8b8ff, 3.4);

  view.fillLight = new THREE.DirectionalLight(0xffe8c0, 1.15);

  view.rimLight = new THREE.DirectionalLight(0x80d8ff, 0.85);

  view.glassGrp = new THREE.Group();

  view.surfGrp = new THREE.Group();

  view.axisGrp = new THREE.Group();

  view.atmGrp = new THREE.Group();

  view.rayGrp = new THREE.Group();

  view.sourceGrp = new THREE.Group();

  view.pupilGrp = new THREE.Group();

  view.pickGrp = new THREE.Group();

  view.componentSceneNodes = new Map();

  view.ROT = new THREE.Matrix4().makeRotationX(Math.PI / 2);

  view.lineMats = [];
  Object.assign(view, { resetCam });
  return function bindEvents() {
    view.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    view.renderer.setClearColor(0x08071a, 1);
    view.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    view.renderer.toneMappingExposure = 1.18;
    view.renderer.outputEncoding = THREE.sRGBEncoding;
    view.renderer.physicallyCorrectLights = true;
    view.scene.fog = new THREE.FogExp2(0x0c0a22, 0.009);
    view.controls.enableDamping = true;
    view.controls.dampingFactor = 0.055;
    resetCam();
    view.keyLight.position.set(-30, 50, 20);
    view.scene.add(view.keyLight);
    view.fillLight.position.set(40, -20, -30);
    view.scene.add(view.fillLight);
    view.rimLight.position.set(10, 10, -60);
    view.scene.add(view.rimLight);
    view.scene.add(new THREE.AmbientLight(0x2010a0, 0.9));
    view.scene.add(view.glassGrp);
    view.scene.add(view.surfGrp);
    view.scene.add(view.axisGrp);
    view.scene.add(view.atmGrp);
    view.scene.add(view.rayGrp);
    view.scene.add(view.sourceGrp);
    view.scene.add(view.pupilGrp);
    view.scene.add(view.pickGrp);
  };
}
