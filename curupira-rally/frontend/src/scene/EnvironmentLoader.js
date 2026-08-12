import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

/**
 * Carrega o ambiente de um posto na cena.
 * - tipo "glb": carrega o .glb gerado pelo pipeline de reconstrucao 3D (fotogrametria offline).
 * - tipo "procedural": gera uma clareira de floresta simples (usado enquanto nao ha video real).
 * As duas fontes produzem o mesmo resultado do ponto de vista do resto do sistema: um Object3D
 * adicionado a cena, sobre o qual Curupira e os animais sao posicionados.
 */
export async function loadEnvironment(sceneManager, ambiente) {
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
