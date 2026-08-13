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
    this.scene.background = new THREE.Color(0x0d1a12);
    this.scene.fog = new THREE.Fog(0x0d1a12, 8, 26);

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
  }

  _tick() {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    this._updatables.forEach((fn) => fn(delta, elapsed));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
