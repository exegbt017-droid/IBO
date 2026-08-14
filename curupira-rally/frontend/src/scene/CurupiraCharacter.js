import * as THREE from "three";

/**
 * O Curupira: guardiao da mata, de cabelos vermelhos como fogo e pes voltados
 * para tras. Modelado em codigo, com proporcoes de menino e feicao travessa —
 * ele e o fio condutor da narrativa, entao precisa ter presenca.
 *
 * A API (enter, talk, celebrate, point) e estavel de proposito: quando houver
 * um modelo .glb com esqueleto, a troca nao exige mudar quem o usa.
 */
export class CurupiraCharacter {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.group = new THREE.Group();
    this.group.name = "curupira";
    this._talking = false;
    this._entered = false;
    this._chamas = [];

    this._build();
    sceneManager.scene.add(this.group);
    sceneManager.addUpdatable(this._animate.bind(this));
  }

  _build() {
    const pele = new THREE.MeshStandardMaterial({ color: 0x9c6440, roughness: 0.85 });
    const folha = new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.9, flatShading: true });
    const escuro = new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.4 });

    const corpo = new THREE.Group();
    corpo.name = "corpo";
    this.corpo = corpo;
    this.group.add(corpo);

    // Tronco: peito mais largo afinando na cintura.
    const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.34, 6, 14), pele);
    tronco.position.y = 0.92;
    tronco.scale.set(1, 1, 0.82);
    tronco.castShadow = true;
    corpo.add(tronco);

    // Saiote de folhas, em vez de roupa lisa.
    for (let i = 0; i < 10; i += 1) {
      const angulo = (i / 10) * Math.PI * 2;
      const folhaMesh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 4), folha);
      folhaMesh.position.set(Math.sin(angulo) * 0.24, 0.62, Math.cos(angulo) * 0.2);
      folhaMesh.rotation.set(Math.PI + 0.25, angulo, 0);
      folhaMesh.castShadow = true;
      corpo.add(folhaMesh);
    }

    // Cabeca grande, proporcao de crianca.
    const cabeca = new THREE.Group();
    cabeca.position.y = 1.42;
    this.cabeca = cabeca;
    corpo.add(cabeca);

    const cranio = new THREE.Mesh(new THREE.SphereGeometry(0.245, 20, 18), pele);
    cranio.scale.set(1, 0.98, 0.94);
    cranio.castShadow = true;
    cabeca.add(cranio);

    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), pele);
    nariz.position.set(0, -0.02, 0.235);
    cabeca.add(nariz);

    for (const lado of [-1, 1]) {
      const olho = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), escuro);
      olho.position.set(lado * 0.093, 0.045, 0.212);
      cabeca.add(olho);

      const brilho = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      brilho.position.set(lado * 0.104, 0.062, 0.238);
      cabeca.add(brilho);

      // Sobrancelha inclinada: da o ar travesso.
      const sobrancelha = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.016, 0.02), escuro);
      sobrancelha.position.set(lado * 0.095, 0.108, 0.216);
      sobrancelha.rotation.z = lado * -0.28;
      cabeca.add(sobrancelha);

      const orelha = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 5), pele);
      orelha.position.set(lado * 0.235, 0.02, 0);
      orelha.rotation.set(0, 0, lado * -Math.PI / 2.4);
      cabeca.add(orelha);
    }

    this.boca = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      escuro
    );
    this.boca.position.set(0, -0.088, 0.208);
    this.boca.scale.set(1, 0.35, 0.5);
    cabeca.add(this.boca);

    this._buildCabelo(cabeca);
    this._buildBracos(corpo, pele);
    this._buildPernas(corpo, pele);

    this.group.position.set(0, 0, -12);
    this.group.visible = false;
  }

  /** Cabelo de fogo: labaredas que balancam, do vermelho ao amarelo nas pontas. */
  _buildCabelo(cabeca) {
    const cores = [0xc42b12, 0xe04a15, 0xf2711c, 0xffa22b];

    for (let i = 0; i < 18; i += 1) {
      const angulo = (i / 18) * Math.PI * 2 + (i % 2) * 0.18;
      const raio = 0.11 + (i % 3) * 0.055;
      const altura = 0.26 + ((i * 7) % 5) * 0.075;

      const chama = new THREE.Mesh(
        new THREE.ConeGeometry(0.062, altura, 5),
        new THREE.MeshStandardMaterial({
          color: cores[i % cores.length],
          roughness: 0.45,
          emissive: cores[i % cores.length],
          emissiveIntensity: 0.28,
          flatShading: true,
        })
      );
      chama.position.set(Math.sin(angulo) * raio, 0.2 + altura * 0.3, Math.cos(angulo) * raio * 0.85);
      chama.rotation.set(Math.cos(angulo) * 0.32, angulo, -Math.sin(angulo) * 0.32);
      chama.castShadow = true;

      chama.userData.base = chama.rotation.clone();
      chama.userData.fase = i * 0.7;
      this._chamas.push(chama);
      cabeca.add(chama);
    }
  }

  _buildBracos(corpo, pele) {
    this.bracos = [];
    for (const lado of [-1, 1]) {
      const ombro = new THREE.Group();
      ombro.position.set(lado * 0.27, 1.12, 0);
      ombro.rotation.z = lado * 0.22;
      corpo.add(ombro);

      const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.34, 5, 10), pele);
      braco.position.y = -0.22;
      braco.castShadow = true;
      ombro.add(braco);

      const mao = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), pele);
      mao.position.y = -0.44;
      mao.scale.set(1, 0.85, 0.7);
      mao.castShadow = true;
      ombro.add(mao);

      ombro.userData.lado = lado;
      this.bracos.push(ombro);
    }
  }

  /**
   * Pernas com os pes voltados para tras — a marca do Curupira. O pe aponta
   * para +Z enquanto o corpo encara -Z, invertendo tambem a pegada que ele deixa.
   */
  _buildPernas(corpo, pele) {
    for (const lado of [-1, 1]) {
      const perna = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.36, 5, 10), pele);
      perna.position.set(lado * 0.135, 0.42, 0);
      perna.castShadow = true;
      corpo.add(perna);

      const pe = new THREE.Group();
      pe.position.set(lado * 0.135, 0.07, 0);
      corpo.add(pe);

      const planta = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.16, 4, 10), pele);
      planta.rotation.x = Math.PI / 2;
      planta.position.z = -0.06; // calcanhar a frente, dedos atras
      planta.scale.set(1, 1, 0.62);
      planta.castShadow = true;
      pe.add(planta);

      // Dedos apontando para tras, deixando a inversao evidente.
      for (let d = -1; d <= 1; d += 1) {
        const dedo = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), pele);
        dedo.position.set(d * 0.042, -0.012, -0.15);
        pe.add(dedo);
      }
    }
  }

  /** `posicao` e o ponto onde ele para, vindo do conteudo do posto. */
  async enter(posicao = [0, 0, -3.5]) {
    if (this._entered) return;
    this._entered = true;
    this.group.visible = true;

    const destino = new THREE.Vector3(posicao[0], posicao[1], posicao[2]);

    // Entra pela lateral, fora do campo de visao, e atravessa o chao proximo:
    // assim o rastro de pegadas cruza a area visivel em vez de ficar la atras.
    const azimute = Math.atan2(destino.x, -destino.z);
    const distancia = Math.hypot(destino.x, destino.z);
    const azimuteEntrada = azimute + Math.sign(azimute || 1) * THREE.MathUtils.degToRad(38);
    this.group.position.set(
      Math.sin(azimuteEntrada) * distancia * 1.05,
      0,
      -Math.cos(azimuteEntrada) * distancia * 1.05
    );

    const inicio = this.group.position.clone();
    const duracao = 1.7;
    const t0 = performance.now();
    this._andando = true;
    let proximaPegada = 0;
    let ladoPegada = 1;

    return new Promise((resolve) => {
      const passo = () => {
        const t = Math.min(1, (performance.now() - t0) / (duracao * 1000));
        const suave = 1 - Math.pow(1 - t, 3);
        this.group.position.lerpVectors(inicio, destino, suave);
        // Chega caminhando e se vira para o participante, que esta na origem.
        this.group.lookAt(0, this.group.position.y, 0);

        if (suave >= proximaPegada) {
          this._deixarPegada(ladoPegada);
          ladoPegada *= -1;
          proximaPegada += 0.1;
        }

        if (t < 1) requestAnimationFrame(passo);
        else {
          this._andando = false;
          resolve();
        }
      };
      passo();
    });
  }

  /**
   * Marca uma pegada no chao apontando ao contrario do caminho percorrido.
   * E assim que a lenda descreve o Curupira confundindo quem o segue, e o unico
   * jeito de mostrar os pes invertidos a quem o ve de frente.
   */
  _deixarPegada(lado) {
    const pegada = new THREE.Group();

    const material = new THREE.MeshBasicMaterial({
      color: 0x2a1a0e,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    const planta = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16), material);
    planta.scale.set(1, 1.55, 1);
    pegada.add(planta);

    // Dedos do lado oposto ao da marcha: a pegada aponta para tras.
    for (let d = -1; d <= 1; d += 1) {
      const dedo = new THREE.Mesh(new THREE.CircleGeometry(0.019, 10), material);
      dedo.position.set(d * 0.032, 0.115, 0);
      pegada.add(dedo);
    }

    pegada.rotation.x = -Math.PI / 2;
    pegada.position.set(
      this.group.position.x + Math.cos(this.group.rotation.y) * lado * 0.16,
      0.012,
      this.group.position.z - Math.sin(this.group.rotation.y) * lado * 0.16
    );
    pegada.rotation.z = -this.group.rotation.y;
    pegada.renderOrder = 2;

    this.sceneManager.scene.add(pegada);

    // Somem devagar, deixando o rastro como lembranca e nao como sujeira.
    const nascimento = performance.now();
    this.sceneManager.addUpdatable(() => {
      const idade = (performance.now() - nascimento) / 1000;
      material.opacity = Math.max(0, 0.42 - Math.max(0, idade - 10) * 0.05);
      pegada.visible = material.opacity > 0.01;
    });
  }

  talk(falando) {
    this._talking = falando;
  }

  celebrate() {
    this._comemorarAte = performance.now() + 1200;
  }

  _animate(_delta, t) {
    if (!this._entered) return;

    // Respiracao e balanco leve mantem o personagem vivo mesmo parado.
    const respiro = Math.sin(t * 1.9) * 0.016;
    this.corpo.position.y = respiro;
    this.corpo.rotation.z = Math.sin(t * 0.9) * 0.014;

    if (this._andando) {
      // Passada: pernas nao articulam, entao o balanco do corpo sugere a marcha.
      this.corpo.rotation.z = Math.sin(t * 11) * 0.07;
      this.corpo.position.y = Math.abs(Math.sin(t * 11)) * 0.05;
    }

    // Labaredas do cabelo em movimento continuo.
    for (const chama of this._chamas) {
      const base = chama.userData.base;
      const onda = Math.sin(t * 3.1 + chama.userData.fase);
      chama.rotation.x = base.x + onda * 0.11;
      chama.rotation.z = base.z + Math.cos(t * 2.6 + chama.userData.fase) * 0.11;
      chama.scale.y = 1 + onda * 0.11;
    }

    if (this._talking) {
      this.cabeca.rotation.y = Math.sin(t * 5.2) * 0.09;
      this.cabeca.rotation.x = Math.sin(t * 3.7) * 0.045;
      this.boca.scale.y = 0.35 + Math.abs(Math.sin(t * 12)) * 0.5;
      this.bracos.forEach((ombro, i) => {
        ombro.rotation.x = Math.sin(t * 4.3 + i * 1.7) * 0.24;
      });
    } else {
      this.cabeca.rotation.y *= 0.92;
      this.cabeca.rotation.x *= 0.92;
      this.boca.scale.y += (0.35 - this.boca.scale.y) * 0.2;
      this.bracos.forEach((ombro, i) => {
        ombro.rotation.x = Math.sin(t * 1.5 + i) * 0.06;
      });
    }

    if (this._comemorarAte && performance.now() < this._comemorarAte) {
      this.corpo.position.y = Math.abs(Math.sin(t * 9)) * 0.16;
      this.corpo.rotation.y = Math.sin(t * 12) * 0.22;
      this.bracos.forEach((ombro) => {
        ombro.rotation.x = -2.1 + Math.sin(t * 14) * 0.3;
      });
    } else {
      this.corpo.rotation.y *= 0.9;
    }
  }
}
