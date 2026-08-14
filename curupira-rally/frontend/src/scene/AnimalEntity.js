import * as THREE from "three";

/**
 * Instancia um animal na cena a partir dos dados de conteudo.
 *
 * Os modelos sao construidos em codigo, mas com os tracos que permitem
 * reconhecer a especie — os tufos brancos do sagui, as manchas em sela da
 * jiboia, a mancha alaranjada do pinguim-imperador. A atividade e de
 * identificacao: se o bicho nao for reconhecivel, a tarefa perde o sentido.
 *
 * Quando houver modelos .glb por especie, o Group retornado pode vir do
 * GLTFLoader sem mudar quem chama esta funcao.
 */
export function spawnAnimal(sceneManager, entry, onSelect) {
  const { animal, posicao } = entry;
  const group = buildAnimal(animal);
  group.position.set(posicao[0], posicao[1], posicao[2]);
  group.name = `animal-${animal.id}`;
  group.userData.animalId = animal.id;

  // Fica de frente para o participante, que observa desde a origem.
  group.rotation.y = Math.atan2(posicao[0], posicao[2]) + Math.PI;

  const marker = buildInvestigatedMarker(group);
  marker.visible = false;
  group.add(marker);
  group.userData.marker = marker;

  // Area de toque invisivel e folgada ao redor do animal: no celular, acertar
  // uma serpente fina rente ao chao com o dedo seria quase impossivel.
  group.add(buildTouchArea(group));

  sceneManager.scene.add(group);

  // Respiracao discreta, em vez de flutuar e girar: o animal deve parecer
  // pousado no chao do ambiente.
  const fase = posicao[0] * 1.7 + posicao[2];
  sceneManager.addUpdatable((_delta, t) => {
    group.scale.y = 1 + Math.sin(t * 1.8 + fase) * 0.018;
  });

  sceneManager.registerClickable(group, () => onSelect(entry));

  return group;
}

/** Anel de "ja investigado", dimensionado conforme o porte do animal. */
function buildInvestigatedMarker(group) {
  const caixa = new THREE.Box3().setFromObject(group);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const raio = Math.max(0.16, Math.max(tamanho.x, tamanho.z) * 0.7);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(raio, raio * 1.16, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.015;
  return marker;
}

function buildAnimal(animal) {
  const construtores = { sagui: buildSagui, serpente: buildSerpente, pinguim: buildPinguim };
  const construtor = construtores[animal.forma_placeholder] ?? buildGenerico;
  const modelo = construtor(animal.cor_placeholder);

  modelo.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  // Ajusta o modelo ao tamanho real da especie. Numa atividade de identificacao
  // a proporcao entre os bichos e conteudo: um pinguim-imperador tem mais de um
  // metro e um sagui cabe na mao, e a cena precisa mostrar isso.
  const grupo = new THREE.Group();
  if (animal.tamanho_m) {
    const caixa = new THREE.Box3().setFromObject(modelo);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const maior = Math.max(tamanho.x, tamanho.y, tamanho.z);
    if (maior > 0) modelo.scale.setScalar(animal.tamanho_m / maior);
  }
  grupo.add(modelo);
  return grupo;
}

function pelo(cor, aspereza = 0.95) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: aspereza, flatShading: false });
}

/** Sagui-de-tufo-branco: pequeno, sentado, com os tufos auriculares que dao nome a especie. */
function buildSagui(cor) {
  const g = new THREE.Group();
  const corpoMat = pelo(cor ?? 0xc9a15a);
  const claro = pelo(0xe8e2d4);
  const escuro = pelo(0x4a3a2a, 0.8);

  const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.14, 6, 14), corpoMat);
  tronco.position.y = 0.19;
  tronco.scale.set(1, 1, 0.88);
  g.add(tronco);

  const peito = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), claro);
  peito.position.set(0, 0.17, 0.075);
  peito.scale.set(0.9, 1.1, 0.6);
  g.add(peito);

  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.096, 16, 14), corpoMat);
  cabeca.position.y = 0.36;
  g.add(cabeca);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), escuro);
  face.position.set(0, 0.345, 0.055);
  face.scale.set(0.92, 1, 0.7);
  g.add(face);

  // Marca branca na testa, tipica da especie.
  const testa = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), claro);
  testa.position.set(0, 0.415, 0.072);
  testa.scale.set(0.8, 1.1, 0.4);
  g.add(testa);

  for (const lado of [-1, 1]) {
    const olho = new THREE.Mesh(
      new THREE.SphereGeometry(0.017, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x120c06, roughness: 0.3 })
    );
    olho.position.set(lado * 0.036, 0.372, 0.105);
    g.add(olho);

    // Tufos auriculares brancos: o traco que nomeia o sagui-de-tufo-branco.
    const tufo = new THREE.Group();
    tufo.position.set(lado * 0.088, 0.375, 0);
    g.add(tufo);
    for (let i = 0; i < 7; i += 1) {
      const fio = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.11, 4), claro);
      fio.position.set(lado * 0.02 * i * 0.4, 0.02 * (i % 3), (i - 3) * 0.017);
      fio.rotation.set((i - 3) * 0.12, 0, lado * (0.6 + (i % 3) * 0.12));
      tufo.add(fio);
    }
  }

  for (const lado of [-1, 1]) {
    const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.11, 4, 8), corpoMat);
    braco.position.set(lado * 0.1, 0.16, 0.045);
    braco.rotation.set(0.5, 0, lado * 0.25);
    g.add(braco);

    const perna = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.1, 4, 8), corpoMat);
    perna.position.set(lado * 0.075, 0.075, 0.01);
    perna.rotation.x = 0.9;
    g.add(perna);
  }

  // Cauda longa e anelada, apoiada no chao.
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.16, -0.09),
    new THREE.Vector3(0.05, 0.07, -0.26),
    new THREE.Vector3(0.02, 0.035, -0.44),
    new THREE.Vector3(-0.1, 0.035, -0.54),
  ]);
  const cauda = new THREE.Mesh(new THREE.TubeGeometry(curva, 26, 0.028, 8, false), corpoMat);
  g.add(cauda);
  for (let i = 0; i < 5; i += 1) {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.011, 6, 12), escuro);
    const p = curva.getPoint(0.18 + i * 0.19);
    const tangente = curva.getTangent(0.18 + i * 0.19);
    anel.position.copy(p);
    anel.lookAt(p.clone().add(tangente));
    g.add(anel);
  }

  return g;
}

/**
 * Jiboia em repouso: corpo enrodilhado com o terco anterior erguido e a cabeca
 * voltada para quem observa. As selas escuras do dorso e a listra que cruza o
 * olho sao o que permite reconhecer a especie.
 */
function buildSerpente(cor) {
  const g = new THREE.Group();
  const base = pelo(cor ?? 0xb59a68, 0.7);
  const mancha = pelo(0x4a2c17, 0.65);

  // Novelo baixo e, saindo dele, o pescoco erguido: vista de cima um novelo
  // seria so um anel, e e a cabeca erguida que denuncia a serpente.
  const pontos = [];
  for (let i = 0; i <= 64; i += 1) {
    const u = i / 64;
    const ang = u * Math.PI * 2 * 1.9;
    const raio = 0.3 - u * 0.09;
    pontos.push(new THREE.Vector3(Math.cos(ang) * raio, 0.075 + u * 0.05, Math.sin(ang) * raio * 0.9));
  }
  pontos.push(new THREE.Vector3(0.06, 0.2, 0.12));
  pontos.push(new THREE.Vector3(0.02, 0.34, 0.2));
  pontos.push(new THREE.Vector3(-0.03, 0.44, 0.29));
  pontos.push(new THREE.Vector3(-0.02, 0.5, 0.38));

  const curva = new THREE.CatmullRomCurve3(pontos);
  const corpo = new THREE.Mesh(new THREE.TubeGeometry(curva, 170, 0.07, 14, false), base);
  corpo.geometry.computeVertexNormals();
  g.add(corpo);

  // Selas dorsais: manchas largas em cima, claras nas laterais.
  for (let i = 0; i < 15; i += 1) {
    const u = 0.03 + i * 0.062;
    if (u > 0.93) break;
    const p = curva.getPoint(u);
    const tangente = curva.getTangent(u);
    // Assentada sobre o dorso, e nao dentro dele: com pouco deslocamento a
    // mancha ficava submersa no corpo e o padrao sumia.
    const sela = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), mancha);
    sela.position.copy(p).addScaledVector(new THREE.Vector3(0, 1, 0), 0.042);
    sela.lookAt(p.clone().add(tangente));
    sela.scale.set(1.15, 0.34, 0.78);
    g.add(sela);
  }

  // Cabeca triangular no alto do S, encarando o participante.
  const fim = curva.getPoint(1);
  const cabeca = new THREE.Group();
  cabeca.position.copy(fim);
  g.add(cabeca);

  // Cabeca propositalmente um pouco maior que o natural: a distancia de jogo,
  // sem esse exagero ela desapareceria e o animal viraria um novelo anonimo.
  const cranio = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), base);
  cranio.scale.set(0.85, 0.6, 1.35);
  cabeca.add(cranio);

  const focinho = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), base);
  focinho.position.z = 0.108;
  focinho.scale.set(0.74, 0.5, 0.9);
  cabeca.add(focinho);

  const boca = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.11), mancha);
  boca.position.set(0, -0.04, 0.075);
  cabeca.add(boca);

  for (const lado of [-1, 1]) {
    // Listra escura atravessando o olho: marca da jiboia.
    const listra = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.034, 0.155), mancha);
    listra.position.set(lado * 0.076, 0.015, 0.012);
    listra.rotation.y = lado * 0.22;
    cabeca.add(listra);

    const olho = new THREE.Mesh(
      new THREE.SphereGeometry(0.027, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9a93f, roughness: 0.2 })
    );
    olho.position.set(lado * 0.071, 0.032, 0.06);
    cabeca.add(olho);

    const pupila = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x0f0a05 })
    );
    pupila.position.set(lado * 0.083, 0.034, 0.075);
    cabeca.add(pupila);
  }

  const lingua = new THREE.Mesh(
    new THREE.ConeGeometry(0.008, 0.075, 5),
    new THREE.MeshStandardMaterial({ color: 0x8f2233, roughness: 0.5 })
  );
  lingua.rotation.x = Math.PI / 2;
  lingua.position.set(0, -0.035, 0.185);
  cabeca.add(lingua);

  return g;
}

/** Pinguim-imperador: porte ereto, dorso escuro, ventre claro e a mancha auricular alaranjada. */
function buildPinguim(cor) {
  const g = new THREE.Group();
  const dorso = pelo(cor ?? 0x1c1c26, 0.6);
  const ventre = pelo(0xf2efe4, 0.75);
  const laranja = new THREE.MeshStandardMaterial({ color: 0xf2a516, roughness: 0.5 });

  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 8, 18), dorso);
  corpo.position.y = 0.33;
  corpo.scale.set(1, 1, 0.86);
  g.add(corpo);

  const peito = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.26, 8, 16), ventre);
  peito.position.set(0, 0.32, 0.045);
  peito.scale.set(0.92, 1, 0.6);
  g.add(peito);

  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), dorso);
  cabeca.position.y = 0.63;
  cabeca.scale.set(1, 1.08, 0.95);
  g.add(cabeca);

  // Peito amarelado que desce do pescoco, escurecendo ate o branco do ventre.
  const gola = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), new THREE.MeshStandardMaterial({
    color: 0xf7e08a, roughness: 0.7,
  }));
  gola.position.set(0, 0.5, 0.052);
  gola.scale.set(0.8, 0.6, 0.5);
  g.add(gola);

  // Mancha auricular alaranjada em virgula: o traco decisivo do imperador.
  for (const lado of [-1, 1]) {
    const mancha = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), laranja);
    mancha.position.set(lado * 0.078, 0.605, 0.045);
    mancha.scale.set(0.5, 1.05, 0.72);
    mancha.rotation.z = lado * 0.2;
    g.add(mancha);

    const cauda = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), laranja);
    cauda.position.set(lado * 0.066, 0.53, 0.062);
    cauda.scale.set(0.45, 0.9, 0.5);
    g.add(cauda);

    const olho = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.25 })
    );
    olho.position.set(lado * 0.05, 0.655, 0.095);
    g.add(olho);

    // Nadadeiras coladas ao corpo.
    const nadadeira = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.2, 5, 10), dorso);
    nadadeira.position.set(lado * 0.155, 0.33, 0);
    nadadeira.rotation.z = lado * 0.16;
    nadadeira.scale.set(0.45, 1, 1);
    g.add(nadadeira);

    const pe = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.06, 4, 8), laranja);
    pe.position.set(lado * 0.06, 0.028, 0.045);
    pe.rotation.x = Math.PI / 2;
    pe.scale.set(1, 1, 0.55);
    g.add(pe);
  }

  const bico = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.15, 8), dorso);
  bico.rotation.x = Math.PI / 2;
  bico.position.set(0, 0.615, 0.155);
  g.add(bico);

  const bicoInferior = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.11, 8), laranja);
  bicoInferior.rotation.x = Math.PI / 2;
  bicoInferior.position.set(0, 0.593, 0.16);
  g.add(bicoInferior);

  return g;
}

function buildGenerico(cor) {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), pelo(cor ?? 0x999999));
  corpo.position.y = 0.24;
  g.add(corpo);
  return g;
}

/**
 * Esfera invisivel que cobre o animal com folga, servindo de alvo para o toque.
 * Invisivel por opacidade (e nao por `visible`), porque o raycaster ignora
 * objetos escondidos e ela precisa continuar sendo atingida.
 */
function buildTouchArea(group) {
  const caixa = new THREE.Box3().setFromObject(group);
  const esfera = caixa.getBoundingSphere(new THREE.Sphere());
  const centro = group.worldToLocal(esfera.center.clone());

  const area = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(esfera.radius * 1.3, 0.42), 12, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  area.position.copy(centro);
  area.renderOrder = -1;
  return area;
}
