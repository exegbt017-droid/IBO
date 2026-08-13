import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.clickables = new Map(); // Object3D -> callback

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = createSkyGradient();
    // Ajustada em frameToFit conforme a distancia real da camera, para a mata
    // ao fundo dar profundidade sem encobrir os animais da missao.
    this.scene.fog = new THREE.Fog(0x2c5a33, 12, 34);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 2.6, 6.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 11;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 1, -2);
    this.controls.update();

    this._addLights();

    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this.canvas.addEventListener("pointerdown", this._onPointerDown.bind(this));

    window.addEventListener("resize", () => this.resize());
    this.resize();

    this._updatables = [];
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _addLights() {
    const ambient = new THREE.HemisphereLight(0x9fd8a5, 0x1a2b17, 0.9);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
    sun.position.set(6, 9, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4a6fa5, 0.25);
    fill.position.set(-5, 4, -6);
    this.scene.add(fill);
  }

  addUpdatable(fn) {
    this._updatables.push(fn);
  }

  registerClickable(object3d, callback) {
    this.clickables.set(object3d, callback);
  }

  unregisterClickable(object3d) {
    this.clickables.delete(object3d);
  }

  _onPointerDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._pointer, this.camera);
    const targets = [...this.clickables.keys()];
    const hits = this._raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return;

    let hitObject = hits[0].object;
    while (hitObject && !this.clickables.has(hitObject)) {
      hitObject = hitObject.parent;
    }
    if (hitObject) this.clickables.get(hitObject)();
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this._framedPoints) this.frameToFit(this._framedPoints);
  }

  /**
   * Enquadra a camera para que todos os pontos de interesse (animais, Curupira)
   * caibam na tela. Em celular na vertical o campo de visao horizontal e bem
   * estreito, entao sem isso um animal posicionado mais para o lado ficaria
   * fora da tela e o participante nao conseguiria completar a missao.
   * Recalculado no resize, cobrindo tambem a rotacao do aparelho.
   */
  frameToFit(points, { margin = 1.25, minDistance = 4.5 } = {}) {
    if (!points || points.length === 0) return;
    this._framedPoints = points;

    const box = new THREE.Box3();
    points.forEach((p) => box.expandByPoint(new THREE.Vector3(p[0], p[1], p[2])));
    // Folga lateral para respiro e vertical para a altura do Curupira.
    box.expandByVector(new THREE.Vector3(0.8, 0.55, 0.8));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);

    const distV = size.y / 2 / Math.tan(vFov / 2);
    const distH = size.x / 2 / Math.tan(hFov / 2);
    const distance = Math.max(distV, distH) * margin + size.z / 2;
    const finalDistance = Math.max(distance, minDistance);

    // Alvo um pouco acima do chao: deixa os animais no terco inferior da tela,
    // longe do painel de missao que ocupa a base em celulares.
    this.controls.target.set(center.x, center.y + 0.75, center.z);
    this.controls.maxDistance = Math.max(this.controls.maxDistance, finalDistance * 1.6);
    this.camera.position.set(center.x, center.y + finalDistance * 0.3, center.z + finalDistance);
    this.camera.updateProjectionMatrix();

    this.scene.fog.near = finalDistance * 0.9;
    this.scene.fog.far = finalDistance + 26;
    this.controls.update();
  }

  _tick() {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    this._updatables.forEach((fn) => fn(delta, elapsed));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

/** Ceu em degrade: da luz filtrada pelas copas ate a penumbra do sub-bosque. */
function createSkyGradient() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#132b1d");
  gradient.addColorStop(0.45, "#1d3f27");
  gradient.addColorStop(0.75, "#2c5a33");
  gradient.addColorStop(1, "#3b6b3a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
