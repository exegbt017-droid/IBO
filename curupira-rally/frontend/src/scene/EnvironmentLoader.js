import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

/**
 * Carrega o ambiente de um posto na cena.
 * - tipo "panorama": foto panoramica do local real (gerada por tools/video_para_panorama.py)
 *   projetada em uma tela curva ao redor da cena. E o caminho padrao para os postos: um giro
 *   de camera no local ja basta para produzi-la.
 * - tipo "glb": malha 3D reconstruida por fotogrametria, quando houver video adequado.
 * - tipo "procedural": clareira gerada em codigo, usada quando nao ha material do local.
 * As tres fontes entregam a mesma coisa para o resto do sistema: um Object3D na cena, sobre o
 * qual o Curupira e os animais sao posicionados.
 */
export async function loadEnvironment(sceneManager, ambiente) {
  if (ambiente.tipo === "panorama" && ambiente.url) {
    return buildPanorama(sceneManager, ambiente);
  }

  if (ambiente.tipo === "glb" && ambiente.url) {
    const gltf = await loader.loadAsync(ambiente.url);
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    sceneManager.scene.add(gltf.scene);
    return gltf.scene;
  }

  return buildProceduralClearing(sceneManager);
}

// Raio da tela curva, em metros. Quanto mais proximo do tamanho real do
// ambiente, melhor o piso da foto se alinha com o chao onde os personagens
// pisam — com uma tela muito distante eles pareceriam flutuar.
const RAIO_PANORAMA = 13;
const ALTURA_DOS_OLHOS = 1.55;

/**
 * Projeta o panorama em um trecho de cilindro ao redor da cena.
 *
 * O panorama nasce de um giro da camera no local, entao ele cobre um arco — nao os 360 graus.
 * O arco e montado centrado na direcao inicial de visao e a rotacao do participante e limitada
 * a essa abertura, para que ele nunca alcance a borda da foto.
 */
async function buildPanorama(sceneManager, ambiente) {
  const textura = await new THREE.TextureLoader().loadAsync(ambiente.url);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = sceneManager.renderer.capabilities.getMaxAnisotropy();
  // A tela e vista por dentro (BackSide), o que inverteria a foto: desinverte.
  textura.wrapS = THREE.RepeatWrapping;
  textura.repeat.x = -1;
  textura.offset.x = 1;

  const fovH = THREE.MathUtils.degToRad(ambiente.fov_horizontal_graus ?? 120);
  const proporcao = textura.image.height / textura.image.width;
  const altura = 2 * RAIO_PANORAMA * Math.tan((fovH * proporcao) / 2);

  // No CylinderGeometry, theta=PI aponta para -Z, que e a direcao inicial da camera.
  const geometria = new THREE.CylinderGeometry(
    RAIO_PANORAMA, RAIO_PANORAMA, altura, 96, 1, true, Math.PI - fovH / 2, fovH
  );

  const material = new THREE.MeshBasicMaterial({ map: textura, side: THREE.BackSide, toneMapped: false });
  const tela = new THREE.Mesh(geometria, material);
  // O video foi gravado com a camera na altura dos olhos, entao o meio da foto
  // e a linha do horizonte: e nessa altura que a tela precisa ficar centrada.
  tela.position.y = ALTURA_DOS_OLHOS;

  const grupo = new THREE.Group();
  grupo.name = "panorama";
  grupo.add(tela);

  // A foto e uma casca ao redor da cena, entao o piso dela fica longe enquanto os
  // animais estao a poucos metros. Quem ancora os personagens no chao e a sombra:
  // este disco e invisivel e so recebe sombra, preservando a foto intacta.
  const chao = new THREE.Mesh(
    new THREE.CircleGeometry(7, 64),
    new THREE.ShadowMaterial({ opacity: 0.32 })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  grupo.add(chao);

  sceneManager.scene.add(grupo);
  sceneManager.applyPanoramaProfile(
    textura,
    fovH,
    ALTURA_DOS_OLHOS,
    fovH * proporcao,
    THREE.MathUtils.degToRad(ambiente.giro_inicial_graus ?? 0),
    THREE.MathUtils.degToRad(ambiente.inclinacao_inicial_graus ?? 8)
  );

  return grupo;
}

function buildProceduralClearing(sceneManager) {
  const group = new THREE.Group();
  group.name = "procedural-environment";

  const groundGeo = new THREE.CircleGeometry(14, 48);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2c4a24, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const pathGeo = new THREE.PlaneGeometry(1.6, 12);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x6b5335, roughness: 1 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, -3);
  path.receiveShadow = true;
  group.add(path);

  const treePositions = [
    [-4.5, 0, -3], [4.6, 0, -2.5], [-3.2, 0, -6.5], [3.4, 0, -7],
    [-6.2, 0, -0.5], [6.3, 0, -1], [0, 0, -9], [-5, 0, -8.5], [5.2, 0, -8.8],
  ];
  treePositions.forEach(([x, y, z], i) => {
    group.add(buildTree(x, y, z, 0.8 + (i % 3) * 0.15));
  });

  for (let i = 0; i < 40; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.5 + Math.random() * 10;
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.03, 0.35 + Math.random() * 0.25, 3),
      new THREE.MeshStandardMaterial({ color: 0x3d6b2e, roughness: 1 })
    );
    blade.position.set(Math.cos(angle) * radius, 0.18, -3 + Math.sin(angle) * radius);
    blade.rotation.y = Math.random() * Math.PI;
    group.add(blade);
  }

  sceneManager.scene.add(group);
  return group;
}

function buildTree(x, y, z, scale) {
  const tree = new THREE.Group();
  tree.position.set(x, y, z);
  tree.scale.setScalar(scale);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 })
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const canopyColors = [0x2f6b34, 0x357a3a, 0x2a5e2f];
  for (let i = 0; i < 3; i += 1) {
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.95 - i * 0.18, 0),
      new THREE.MeshStandardMaterial({ color: canopyColors[i], roughness: 0.9, flatShading: true })
    );
    canopy.position.set((Math.random() - 0.5) * 0.4, 2.1 + i * 0.55, (Math.random() - 0.5) * 0.4);
    canopy.castShadow = true;
    tree.add(canopy);
  }

  return tree;
}


