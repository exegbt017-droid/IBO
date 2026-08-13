import * as THREE from "three";

/**
 * Curupira placeholder: geometria procedural (sem modelo .glb ainda).
 * Expoe uma API estavel (enter, idle, talk, celebrate) para que, quando houver
 * um modelo real com esqueleto/animacoes, a troca nao exija mudar quem o usa.
 */
export class CurupiraCharacter {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.group = new THREE.Group();
    this.group.name = "curupira";
    this._talking = false;
    this._entered = false;

    this._build();
    sceneManager.scene.add(this.group);
    sceneManager.addUpdatable(this._animate.bind(this));
  }

  _build() {
    const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.8 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x3d6b2e, roughness: 0.9 });
    const hair = new THREE.MeshStandardMaterial({ color: 0xd23b1f, roughness: 0.6, emissive: 0x330a00 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 4, 8), cloth);
    body.position.y = 1.05;
    body.castShadow = true;
    this.group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skin);
    head.position.y = 1.75;
    head.castShadow = true;
    this.group.add(head);
    this.head = head;

    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hair);
    hairMesh.position.y = 1.85;
    this.group.add(hairMesh);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 6), skin);
      arm.position.set(side * 0.42, 1.15, 0);
      arm.rotation.z = side * 0.35;
      this.group.add(arm);
    }

    // Pernas com os pes voltados para tras (marca registrada do Curupira):
    // o pe fica rotacionado 180 graus em relacao a direcao do corpo.
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 6), skin);
      leg.position.set(side * 0.15, 0.55, 0);
      this.group.add(leg);

      const foot = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 6), skin);
      foot.position.set(side * 0.15, 0.18, 0.02);
      foot.rotation.x = Math.PI / 2 + 0.15; // aponta para tras, nao para frente
      this.group.add(foot);
    }

    this.group.position.set(0, 0, -12);
    this.group.visible = false;
  }

  async enter(targetPosition = new THREE.Vector3(0, 0, -3.5)) {
    if (this._entered) return;
    this._entered = true;
    this.group.visible = true;

    const start = this.group.position.clone();
    const duration = 1.6;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = () => {
        const t = Math.min(1, (performance.now() - startTime) / (duration * 1000));
        const eased = 1 - Math.pow(1 - t, 3);
        this.group.position.lerpVectors(start, targetPosition, eased);
        this.group.lookAt(0, this.group.position.y, targetPosition.z + 5);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      step();
    });
  }

  talk(isTalking) {
    this._talking = isTalking;
  }

  celebrate() {
    this._celebrateUntil = performance.now() + 900;
  }

  _animate(_delta, elapsed) {
    if (!this._entered) return;
    const bob = Math.sin(elapsed * 2.4) * 0.03;
    this.group.position.y = bob;

    if (this._talking) {
      this.head.rotation.y = Math.sin(elapsed * 6) * 0.08;
    } else {
      this.head.rotation.y *= 0.9;
    }

    if (this._celebrateUntil && performance.now() < this._celebrateUntil) {
      this.group.rotation.y = Math.sin(elapsed * 14) * 0.15;
    } else {
      this.group.rotation.y *= 0.85;
    }
  }
}
