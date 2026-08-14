import * as THREE from "three";

/**
 * Instancia um animal na cena a partir dos dados de conteudo (posicao + forma/cor placeholder).
 * Quando houver um modelo .glb real por especie, o objeto retornado (um THREE.Group) pode ser
 * substituido pelo resultado do GLTFLoader sem mudar quem chama esta funcao.
 */
export function spawnAnimal(sceneManager, entry, onSelect) {
  const { animal, posicao } = entry;
  const group = buildPlaceholder(animal.forma_placeholder, animal.cor_placeholder);
  group.position.set(posicao[0], posicao[1], posicao[2]);
  group.name = `animal-${animal.id}`;
  group.userData.animalId = animal.id;

  const marker = buildInvestigatedMarker();
  marker.visible = false;
  group.add(marker);
  group.userData.marker = marker;

  // Area de toque invisivel e folgada ao redor do animal: no celular, acertar
  // uma serpente fina rente ao chao com o dedo seria quase impossivel.
  group.add(buildTouchArea(group));

  sceneManager.scene.add(group);
  sceneManager.addUpdatable((_delta, elapsed) => {
    group.position.y = posicao[1] + Math.sin(elapsed * 1.6 + posicao[0]) * 0.08;
    group.rotation.y = elapsed * 0.5;
  });

  sceneManager.registerClickable(group, () => onSelect(entry));

  return group;
}

function buildInvestigatedMarker() {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.65, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.02;
  return marker;
}

function buildPlaceholder(forma, colorHex) {
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
  const group = new THREE.Group();

  if (forma === "primata") {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.28, 4, 8), material);
    body.position.y = 0.5;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), material);
    head.position.y = 0.85;
    group.add(head);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), material);
      ear.position.set(side * 0.16, 0.9, 0);
      group.add(ear);
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16, Math.PI * 1.4), material);
    tail.position.set(0, 0.35, -0.2);
    tail.rotation.x = Math.PI / 2;
    group.add(tail);
  } else if (forma === "serpente") {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.5, 0.12, 0),
      new THREE.Vector3(-0.15, 0.12, 0.25),
      new THREE.Vector3(0.2, 0.12, -0.2),
      new THREE.Vector3(0.55, 0.12, 0.1),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.09, 8, false), material);
    group.add(tube);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), material);
    head.position.set(0.58, 0.12, 0.1);
    group.add(head);
  } else if (forma === "ave") {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 12), material);
    body.rotation.x = Math.PI;
    body.position.y = 0.45;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), material);
    head.position.y = 0.8;
    group.add(head);
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf4a600 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.79, 0.15);
    group.add(beak);
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    belly.position.set(0, 0.42, 0.12);
    group.add(belly);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), material);
    body.position.y = 0.5;
    group.add(body);
  }

  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  return group;
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
    new THREE.SphereGeometry(Math.max(esfera.radius * 1.35, 0.45), 12, 10),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  area.position.copy(centro);
  area.renderOrder = -1;
  return area;
}
