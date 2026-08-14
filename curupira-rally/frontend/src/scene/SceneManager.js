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
    // Sombra suave: dentro de uma sala a luz e difusa, e sombra dura entregaria
    // na hora que os personagens nao pertencem aquela foto.
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
    this.canvas.addEventListener("pointerup", this._onPointerUp.bind(this));

    window.addEventListener("resize", () => this.resize());
    this.resize();

    this._updatables = [];
    this.renderer.setAnimationLoop(() => this._tick());
  }

  /**
   * Adapta a cena a um ambiente de panorama: a foto e o proprio fundo, entao a
   * nevoa e o ceu de floresta sairiam por cima dela. A luz passa a ser neutra e
   * puxada da media de cores da foto, para que o Curupira e os animais parecam
   * iluminados pelo mesmo ambiente. A rotacao fica presa a abertura da imagem,
   * assim o participante nunca alcanca a borda.
   */
  applyPanoramaProfile(textura, fovHorizontal, alturaDosOlhos, fovVertical, giroInicial = 0, inclinacaoInicial = 0) {
    this.scene.fog = null;
    this._panorama = true;

    // A foto e a vista a partir do ponto exato onde o video foi gravado. Se a
    // camera sair desse ponto, o piso da imagem deixa de coincidir com o chao
    // onde os personagens pisam e eles parecem flutuar. Entao a camera fica
    // parada ali e o participante apenas olha em volta.
    this.controls.enabled = false;
    this.camera.position.set(0, alturaDosOlhos, 0);
    this.camera.fov = 68;
    this.camera.updateProjectionMatrix();

    this._coberturaH = fovHorizontal;
    this._coberturaV = fovVertical;
    const meiaVertical = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const meiaHorizontal = Math.atan(Math.tan(meiaVertical) * this.camera.aspect);
    this._limiteGiro = Math.max(0, fovHorizontal / 2 - meiaHorizontal);
    this._limiteInclinacao = Math.max(0, fovVertical / 2 - meiaVertical);

    this._configurarOlharEmVolta(giroInicial, inclinacaoInicial);

    const corMedia = mediaDaTextura(textura);
    this.scene.background = corMedia;

    this.scene.remove(this._hemisphere);
    this._hemisphere = new THREE.HemisphereLight(corMedia, corMedia.clone().multiplyScalar(0.45), 1.5);
    this.scene.add(this._hemisphere);

    // Luz de sala: pouca direcional, sombra curta e suave logo abaixo dos pes.
    this._sun.color.set(0xfff6e8);
    this._sun.intensity = 0.55;
    this._sun.position.set(2.5, 6, 2);
    this._sun.shadow.camera.left = -6;
    this._sun.shadow.camera.right = 6;
    this._sun.shadow.camera.top = 6;
    this._sun.shadow.camera.bottom = -6;
    this._sun.shadow.mapSize.set(2048, 2048);
    this._sun.shadow.radius = 3;
    this._sun.shadow.bias = -0.0012;
    this._sun.shadow.camera.updateProjectionMatrix();

    // Contraluz fria que destaca a silhueta contra a foto, sem clarear o corpo.
    this._fill.color.set(0xcfe0ff);
    this._fill.intensity = 0.5;
    this._fill.position.set(-3, 2.5, -4);
  }

  /** Arrastar gira a vista no lugar, dentro do trecho coberto pela foto. */
  _configurarOlharEmVolta(giroInicial = 0, inclinacaoInicial = 0) {
    // Giro positivo no conteudo significa "comeca olhando para a direita".
    this._giro = -giroInicial;
    // Leve mergulho inicial: sobe os personagens no quadro, longe do painel de
    // missao que ocupa a base da tela no celular.
    this._inclinacao = -inclinacaoInicial;
    let arrastando = false;
    let ultimo = { x: 0, y: 0 };

    const aplicar = () => {
      this._giro = THREE.MathUtils.clamp(this._giro, -this._limiteGiro, this._limiteGiro);
      this._inclinacao = THREE.MathUtils.clamp(
        this._inclinacao, -this._limiteInclinacao, this._limiteInclinacao
      );
      this.camera.rotation.set(this._inclinacao, this._giro, 0, "YXZ");
    };
    aplicar();

    this.canvas.addEventListener("pointerdown", (e) => {
      arrastando = true;
      ultimo = { x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!arrastando) return;
      const porPixel = THREE.MathUtils.degToRad(this.camera.fov) / this.canvas.clientHeight;
      this._giro -= (e.clientX - ultimo.x) * porPixel;
      this._inclinacao -= (e.clientY - ultimo.y) * porPixel;
      ultimo = { x: e.clientX, y: e.clientY };
      aplicar();
    });
    const soltar = () => { arrastando = false; };
    this.canvas.addEventListener("pointerup", soltar);
    this.canvas.addEventListener("pointercancel", soltar);
    window.addEventListener("resize", () => {
      const meiaVertical = THREE.MathUtils.degToRad(this.camera.fov) / 2;
      const meiaHorizontal = Math.atan(Math.tan(meiaVertical) * this.camera.aspect);
      this._limiteGiro = Math.max(0, this._coberturaH / 2 - meiaHorizontal);
      this._limiteInclinacao = Math.max(0, this._coberturaV / 2 - meiaVertical);
      aplicar();
    });
  }

  _addLights() {
    const ambient = new THREE.HemisphereLight(0x9fd8a5, 0x1a2b17, 0.9);
    this.scene.add(ambient);
    this._hemisphere = ambient;

    const sun = new THREE.DirectionalLight(0xfff2d0, 1.4);
    sun.position.set(6, 9, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    this.scene.add(sun);
    this._sun = sun;

    const fill = new THREE.DirectionalLight(0x4a6fa5, 0.25);
    fill.position.set(-5, 4, -6);
    this.scene.add(fill);
    this._fill = fill;
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
    // Registra onde comecou; o toque so vale como clique se nao virar arrasto
    // (arrastar e como o participante olha em volta).
    this._inicioToque = { x: event.clientX, y: event.clientY };
  }

  _onPointerUp(event) {
    const inicio = this._inicioToque;
    this._inicioToque = null;
    if (!inicio) return;
    if (Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y) > 8) return;

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
    // No panorama a camera fica fixa no ponto de captura da foto: reposiciona-la
    // quebraria o alinhamento entre a imagem e os personagens.
    if (this._panorama) return;
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
    const alturaRelativa = this._panorama ? 0.1 : 0.3;
    this.camera.position.set(center.x, center.y + finalDistance * alturaRelativa, center.z + finalDistance);
    this.camera.updateProjectionMatrix();

    // Ambiente de panorama nao usa nevoa: a foto e o proprio fundo.
    if (this.scene.fog) {
      this.scene.fog.near = finalDistance * 0.9;
      this.scene.fog.far = finalDistance + 26;
    }
    this.controls.update();
  }

  _tick() {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    this._updatables.forEach((fn) => fn(delta, elapsed));
    if (this.controls.enabled) this.controls.update();
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

/** Cor media da foto, usada para iluminar personagens com a luz do proprio ambiente. */
function mediaDaTextura(textura) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(textura.image, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);

  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2];
  }
  const n = data.length / 4;
  return new THREE.Color(r / n / 255, g / n / 255, b / n / 255);
}
