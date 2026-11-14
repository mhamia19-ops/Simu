import * as THREE from 'three';
import { HousingMode } from './types';
import {
  createBrushedSteelRoughnessMap,
  createCandyRopeTexture,
  createConveyorBeltTexture,
  createWarningDecalTexture,
  createWrapperWebTexture,
} from './textures';

export interface MachineMaterials {
  creamMat: THREE.MeshStandardMaterial;
  creamDarkMat: THREE.MeshStandardMaterial;
  darkTrimMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshPhysicalMaterial;
  darkSteelMat: THREE.MeshStandardMaterial;
  oliveAlloyMat: THREE.MeshStandardMaterial;
  whiteDrumMat: THREE.MeshStandardMaterial;
  heaterBronzeMat: THREE.MeshStandardMaterial;
  maroonHandleMat: THREE.MeshStandardMaterial;
  camGoldMat: THREE.MeshStandardMaterial;
  followerCyanMat: THREE.MeshStandardMaterial;
  brassMat: THREE.MeshStandardMaterial;
  rubberMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshPhysicalMaterial;
  acrylicDiscMat: THREE.MeshPhysicalMaterial;
  filmWebMat: THREE.MeshPhysicalMaterial;
  wrapperSheetMat: THREE.MeshPhysicalMaterial;
  filmRollMat: THREE.MeshStandardMaterial;
  candyRopeMat: THREE.MeshPhysicalMaterial;
  candyBlockMat: THREE.MeshPhysicalMaterial;
  beltMat: THREE.MeshStandardMaterial;
  warningDecalMat: THREE.MeshBasicMaterial;
  towerGreenMat: THREE.MeshStandardMaterial;
  towerAmberMat: THREE.MeshStandardMaterial;
  towerRedMat: THREE.MeshStandardMaterial;
  btnRedMat: THREE.MeshStandardMaterial;
  btnGreenMat: THREE.MeshStandardMaterial;
  btnAmberMat: THREE.MeshStandardMaterial;
  btnBlueMat: THREE.MeshStandardMaterial;
  estopYellowMat: THREE.MeshStandardMaterial;
  estopRedMat: THREE.MeshStandardMaterial;
  candyRopeTex: THREE.CanvasTexture;
  wrapperWebTex: THREE.CanvasTexture;
  beltTex: THREE.CanvasTexture;
  registerHousingObject: (obj: THREE.Object3D) => void;
  applyHousingMode: (mode: HousingMode) => void;
  dispose: () => void;
}

export function createMachineMaterials(
  maxAnisotropy: number
): MachineMaterials {
  const housingMaterials: THREE.MeshStandardMaterial[] = [];
  const housingObjects: THREE.Object3D[] = [];
  const allDisposableMaterials: THREE.Material[] = [];

  const brushedMap = createBrushedSteelRoughnessMap();
  const warningTex = createWarningDecalTexture(maxAnisotropy);
  const candyRopeTex = createCandyRopeTexture(maxAnisotropy);
  const wrapperWebTex = createWrapperWebTexture(maxAnisotropy);
  const beltTex = createConveyorBeltTexture(maxAnisotropy);

  function makeHousingMat(
    color: number,
    roughness = 0.56,
    metalness = 0.08
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    mat.userData.origColor = color;
    housingMaterials.push(mat);
    allDisposableMaterials.push(mat);
    return mat;
  }

  function makeMechMat(
    color: number,
    roughness = 0.28,
    metalness = 0.82
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    allDisposableMaterials.push(mat);
    return mat;
  }

  function track<T extends THREE.Material>(mat: T): T {
    allDisposableMaterials.push(mat);
    return mat;
  }

  // Powder-coated industrial cream housing vs dark trim
  const creamMat = makeHousingMat(0xeae5d5, 0.54, 0.08);
  const creamDarkMat = makeHousingMat(0xd4cebc, 0.62, 0.1);
  const darkTrimMat = makeHousingMat(0x272a30, 0.65, 0.22);

  // Brushed stainless steel with anisotropic sheen
  const steelMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xcdd3da,
      roughness: 0.24,
      roughnessMap: brushedMap,
      metalness: 0.9,
      anisotropy: 0.7,
      anisotropyRotation: 0,
    })
  );

  const darkSteelMat = makeMechMat(0x3b424c, 0.42, 0.78);
  const oliveAlloyMat = makeMechMat(0xa9a48d, 0.36, 0.56);
  const whiteDrumMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe9edf2,
      roughness: 0.28,
      metalness: 0.08,
    })
  );
  const heaterBronzeMat = makeMechMat(0x7c5e47, 0.54, 0.62);
  const maroonHandleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x4b2429,
      roughness: 0.38,
      metalness: 0.06,
    })
  );
  const brassMat = makeMechMat(0xd4a348, 0.24, 0.88);
  const rubberMat = makeMechMat(0x1e2024, 0.88, 0.04);

  // Legend Color-Coded Component Materials:
  // 1. Rotating Cams -> Amber / Gold
  const camGoldMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x78350f,
      emissiveIntensity: 0.14,
      roughness: 0.22,
      metalness: 0.86,
    })
  );

  // 2. Cam Followers & Linkages -> Cyan / Steel
  const followerCyanMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x083344,
      emissiveIntensity: 0.15,
      roughness: 0.28,
      metalness: 0.74,
    })
  );

  // 3. Candy Rope & Pieces -> Coral / Pink
  const candyRopeMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: candyRopeTex,
      roughness: 0.34,
      metalness: 0.04,
      clearcoat: 0.45,
      clearcoatRoughness: 0.25,
    })
  );

  const candyBlockMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xfb7185,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.45,
      clearcoatRoughness: 0.25,
    })
  );

  // 4. Wrapper Film -> Translucent White / Blue
  const filmWebMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      map: wrapperWebTex,
      transparent: true,
      opacity: 0.65,
      roughness: 0.16,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const wrapperSheetMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.56,
      roughness: 0.18,
      metalness: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const filmRollMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.3,
      metalness: 0.18,
      transparent: true,
      opacity: 0.82,
    })
  );

  const glassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.2,
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      depthWrite: false,
    })
  );

  const acrylicDiscMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.32,
      roughness: 0.12,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );

  const beltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: beltTex,
      roughness: 0.78,
      metalness: 0.1,
    })
  );

  const warningDecalMat = track(
    new THREE.MeshBasicMaterial({
      map: warningTex,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const towerGreenMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    })
  );
  const towerAmberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.08,
      roughness: 0.2,
    })
  );
  const towerRedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.05,
      roughness: 0.2,
    })
  );

  const btnRedMat = track(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }));
  const btnGreenMat = track(new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 }));
  const btnAmberMat = track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }));
  const btnBlueMat = track(new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 }));
  const estopYellowMat = track(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.38 }));
  const estopRedMat = track(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28 }));

  function registerHousingObject(obj: THREE.Object3D) {
    housingObjects.push(obj);
  }

  function applyHousingMode(mode: HousingMode) {
    const isHidden = mode === 'hidden';
    housingObjects.forEach((obj) => {
      obj.visible = !isHidden;
    });

    housingMaterials.forEach((mat) => {
      if (mode === 'solid') {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mat.color.setHex(mat.userData.origColor as number);
      } else if (mode === 'xray') {
        mat.transparent = true;
        mat.opacity = 0.14;
        mat.depthWrite = false;
        mat.color.setHex(0x93c5fd);
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mat.color.setHex(mat.userData.origColor as number);
      }
      mat.needsUpdate = true;
    });
  }

  return {
    creamMat,
    creamDarkMat,
    darkTrimMat,
    steelMat,
    darkSteelMat,
    oliveAlloyMat,
    whiteDrumMat,
    heaterBronzeMat,
    maroonHandleMat,
    camGoldMat,
    followerCyanMat,
    brassMat,
    rubberMat,
    glassMat,
    acrylicDiscMat,
    filmWebMat,
    wrapperSheetMat,
    filmRollMat,
    candyRopeMat,
    candyBlockMat,
    beltMat,
    warningDecalMat,
    towerGreenMat,
    towerAmberMat,
    towerRedMat,
    btnRedMat,
    btnGreenMat,
    btnAmberMat,
    btnBlueMat,
    estopYellowMat,
    estopRedMat,
    candyRopeTex,
    wrapperWebTex,
    beltTex,
    registerHousingObject,
    applyHousingMode,
    dispose: () => {
      brushedMap.dispose();
      warningTex.dispose();
      candyRopeTex.dispose();
      wrapperWebTex.dispose();
      beltTex.dispose();
      allDisposableMaterials.forEach((m) => m.dispose());
    },
  };
}
