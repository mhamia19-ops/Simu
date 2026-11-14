import * as THREE from 'three';
import {
  buildCamWithLUT,
  createCurvedRatchetSegmentGeometry,
  createFrontDoorGeometry,
  createGearGeometry,
  createInnerFoldingShoeGeometry,
  createLeftCrescentGuideGeometry,
  createOvalHousingGeometry,
  createPincerJawHalfGeometry,
  createPincerTipPadGeometry,
  createSlottedFoldingArcGeometry,
  createTransferArmBeamGeometry,
} from './geometries';
import {
  BELT_END_X,
  BELT_PITCH,
  BELT_START_X,
  CAM1_Z,
  CAM2_Z,
  CAM3_Z,
  CAM_BASE_R,
  CAM_X,
  CAM_Y,
  CANDY_D,
  CANDY_H,
  CANDY_L,
  CUT_X,
  DEG2RAD,
  getEjectorLiftNorm,
  getFeedAdvanceNorm,
  getKnifeCutNorm,
  getPaperShearLiftNorm,
  getPlungerLiftNorm,
  getTuckerLiftNorm,
  getTurretIndexNorm,
  L1_ARM,
  L2_ARM,
  L3_ARM,
  LINE_Y,
  LINE_Z,
  P1_X,
  P1_Y,
  P2_X,
  P2_Y,
  P3_X,
  P3_Y,
  PAPER_X,
  ROLLER_R,
  samplePitchRadius,
  STAGE_X,
  STATION_STEP,
  TURRET_R,
  TURRET_STATIONS,
  TURRET_X,
  TURRET_Y,
  TWO_PI,
} from './kinematics';
import { createMachineMaterials, MachineMaterials } from './materials';
import {
  createHMITexture,
  createSlottedArcLabelTexture,
  createTurretCenterCapTexture,
  HMITextureHandle,
} from './textures';

export interface MachineAssembly {
  root: THREE.Group;
  materials: MachineMaterials;
  hmiTexture: HMITextureHandle;
  solveMechanism: (theta: number) => void;
  setDoorOpenProgress: (openNorm: number) => void;
  setTowerPausedState: (paused: boolean) => void;
  dispose: () => void;
}

interface CandyPieceSlot {
  group: THREE.Group;
  frontSheet: THREE.Mesh;
  topFlap: THREE.Group;
  botFlap: THREE.Group;
  rearTopFlap: THREE.Group;
  rearBotFlap: THREE.Group;
  leftEar: THREE.Group;
  rightEar: THREE.Group;
}

interface PincerStation {
  upperFinger: THREE.Group;
  lowerFinger: THREE.Group;
}

function wrapAnglePi(a: number): number {
  let r = ((a + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  if (r < -Math.PI) r += TWO_PI;
  return r;
}

export function createMachineAssembly(maxAnisotropy: number): MachineAssembly {
  const root = new THREE.Group();
  const mechGroup = new THREE.Group();
  root.add(mechGroup);
  const materials = createMachineMaterials(maxAnisotropy);
  const hmiTexture = createHMITexture(maxAnisotropy);
  const turretCapTex = createTurretCenterCapTexture(maxAnisotropy);
  const slottedArcTex = createSlottedArcLabelTexture(maxAnisotropy);

  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  function trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    disposableGeometries.push(geo);
    return geo;
  }

  function addBox(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    cast = true,
    receive = true
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  function addCyl(
    parent: THREE.Object3D,
    rTop: number,
    rBot: number,
    len: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    axis: 'x' | 'y' | 'z' = 'y',
    segs = 24
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(rTop, rBot, len, segs)),
      mat
    );
    mesh.position.set(x, y, z);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // -------------------------------------------------------------------------
  // A. LEVELING FEET & STEEL CHASSIS SUB-FRAME (Always visible)
  // -------------------------------------------------------------------------
  const footCoords: [number, number][] = [
    [-0.39, -0.34],
    [0.39, -0.34],
    [-0.39, 0.34],
    [0.39, 0.34],
  ];
  footCoords.forEach(([fx, fz]) => {
    addCyl(root, 0.042, 0.052, 0.022, fx, 0.011, fz, materials.rubberMat, 'y', 20);
    addCyl(root, 0.012, 0.012, 0.08, fx, 0.06, fz, materials.steelMat, 'y', 12);
    addCyl(root, 0.022, 0.022, 0.016, fx, 0.075, fz, materials.darkSteelMat, 'y', 6);
  });

  addBox(root, 0.9, 0.03, 0.78, 0.0, 0.11, 0.0, materials.darkSteelMat);
  addBox(root, 0.9, 0.03, 0.78, 0.0, 0.66, 0.0, materials.darkSteelMat);
  [
    [-0.41, -0.35],
    [0.41, -0.35],
    [-0.41, 0.35],
    [0.41, 0.35],
  ].forEach(([cx, cz]) => {
    addBox(root, 0.035, 0.56, 0.035, cx, 0.385, cz, materials.darkSteelMat);
  });

  // Stainless Steel Discharge Catch Tray below front window
  const trayGroup = new THREE.Group();
  trayGroup.position.set(-0.02, 0.15, 0.5);
  root.add(trayGroup);
  addBox(trayGroup, 0.72, 0.016, 0.34, 0, 0, 0, materials.steelMat);
  addBox(trayGroup, 0.72, 0.045, 0.014, 0, 0.022, 0.165, materials.steelMat);
  addBox(trayGroup, 0.014, 0.045, 0.34, -0.353, 0.022, 0, materials.steelMat);
  addBox(trayGroup, 0.014, 0.045, 0.34, 0.353, 0.022, 0, materials.steelMat);
  addCyl(trayGroup, 0.007, 0.007, 0.12, 0, 0.026, 0.188, materials.steelMat, 'x', 12);
  addCyl(trayGroup, 0.006, 0.006, 0.02, -0.05, 0.026, 0.178, materials.steelMat, 'z', 10);
  addCyl(trayGroup, 0.006, 0.006, 0.02, 0.05, 0.026, 0.178, materials.steelMat, 'z', 10);

  // -------------------------------------------------------------------------
  // B. OUTER CABINET HOUSING & INTERNAL BULKHEAD (Solid / X-Ray / Hidden)
  // -------------------------------------------------------------------------
  const housingGroup = new THREE.Group();
  root.add(housingGroup);
  materials.registerHousingObject(housingGroup);

  addBox(housingGroup, 0.94, 0.56, 0.82, 0.0, 0.38, 0.0, materials.creamMat);

  const ventGroup = new THREE.Group();
  ventGroup.position.set(-0.472, 0.34, 0.24);
  housingGroup.add(ventGroup);
  addBox(ventGroup, 0.01, 0.16, 0.14, 0, 0, 0, materials.creamDarkMat);
  for (let i = -3; i <= 3; i++) {
    const slat = addBox(
      ventGroup,
      0.014,
      0.008,
      0.11,
      -0.004,
      i * 0.018,
      0,
      materials.darkSteelMat
    );
    slat.rotation.z = 0.45;
  }

  addBox(housingGroup, 0.94, 0.84, 0.44, 0.0, 1.08, -0.19, materials.creamMat);
  addBox(housingGroup, 0.04, 0.38, 0.44, -0.45, 0.85, 0.25, materials.creamMat);
  addBox(housingGroup, 0.04, 0.22, 0.44, -0.45, 1.38, 0.25, materials.creamMat);
  addBox(housingGroup, 0.04, 0.38, 0.44, 0.45, 0.85, 0.25, materials.creamMat);
  addBox(housingGroup, 0.04, 0.22, 0.44, 0.45, 1.38, 0.25, materials.creamMat);
  addBox(housingGroup, 0.94, 0.06, 0.44, 0.0, 1.47, 0.25, materials.creamMat);

  // Full cream/grey internal bulkhead wall behind the turret (matches video backdrop in Solid mode;
  // dissolves in X-Ray and hides in Hidden mode to expose the rear cambox & gear train).
  addBox(housingGroup, 0.62, 0.72, 0.016, -0.02, 1.05, 0.075, materials.creamMat);

  // Hinged Main Front Viewing Door (swings outward left on 3 barrel hinges)
  const frontDoorPivot = new THREE.Group();
  frontDoorPivot.position.set(-0.462, 0, 0.473);
  housingGroup.add(frontDoorPivot);

  const frontDoor = new THREE.Mesh(
    trackGeo(createFrontDoorGeometry()),
    materials.creamMat
  );
  frontDoor.position.set(0.462, 0, -0.018);
  frontDoor.castShadow = true;
  frontDoor.receiveShadow = true;
  frontDoorPivot.add(frontDoor);

  addBox(frontDoorPivot, 0.52, 0.016, 0.042, 0.432, 1.384, 0.0, materials.darkTrimMat);
  addBox(frontDoorPivot, 0.52, 0.016, 0.042, 0.432, 0.716, 0.0, materials.darkTrimMat);
  addBox(frontDoorPivot, 0.016, 0.68, 0.042, 0.178, 1.05, 0.0, materials.darkTrimMat);
  addBox(frontDoorPivot, 0.016, 0.68, 0.042, 0.686, 1.05, 0.0, materials.darkTrimMat);

  const windowPane = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.5, 0.66, 0.006)),
    materials.glassMat
  );
  windowPane.position.set(0.432, 1.05, 0.003);
  windowPane.renderOrder = 10;
  frontDoorPivot.add(windowPane);

  addCyl(frontDoorPivot, 0.014, 0.014, 0.016, 0.692, 0.96, 0.024, materials.darkSteelMat, 'z', 16);
  addBox(frontDoorPivot, 0.012, 0.055, 0.012, 0.692, 0.945, 0.036, materials.steelMat);

  [0.36, 0.82, 1.28].forEach((hy) => {
    addCyl(housingGroup, 0.012, 0.012, 0.08, -0.462, hy, 0.478, materials.steelMat, 'y', 12);
  });

  // Hinged Right Service Door (swings outward right on 2 barrel hinges)
  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(0.468, 0, 0.472);
  housingGroup.add(rightDoorPivot);

  addBox(rightDoorPivot, 0.228, 1.24, 0.036, -0.114, 0.82, -0.018, materials.creamMat);
  addBox(rightDoorPivot, 0.20, 0.01, 0.008, -0.114, 0.82, 0.002, materials.creamDarkMat);
  addCyl(rightDoorPivot, 0.013, 0.013, 0.014, -0.195, 0.96, 0.006, materials.darkSteelMat, 'z', 16);
  addBox(rightDoorPivot, 0.01, 0.042, 0.01, -0.195, 0.95, 0.016, materials.steelMat);

  [0.42, 1.24].forEach((hy) => {
    addCyl(housingGroup, 0.011, 0.011, 0.07, 0.468, hy, 0.475, materials.steelMat, 'y', 12);
  });

  const decal1 = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.055, 0.055)),
    materials.warningDecalMat
  );
  decal1.position.set(-0.472, 0.52, 0.25);
  decal1.rotation.y = -Math.PI / 2;
  housingGroup.add(decal1);

  addBox(housingGroup, 0.9, 0.9, 0.07, 0.0, 1.94, -0.15, materials.creamMat);

  // Structural Spine for Top Reels & Pendant (stays visible when outer panels hidden)
  addBox(root, 0.08, 0.92, 0.06, -0.22, 1.94, -0.15, materials.darkSteelMat);
  addBox(root, 0.08, 0.92, 0.06, 0.24, 1.94, -0.15, materials.darkSteelMat);
  addBox(root, 0.64, 0.06, 0.06, 0.0, 2.13, -0.15, materials.darkSteelMat);
  addBox(root, 0.64, 0.06, 0.06, 0.0, 1.62, -0.15, materials.darkSteelMat);

  // -------------------------------------------------------------------------
  // C. TOP DUAL-REEL UNWINDER, TENSION ROLLERS & SERVO PAPER FEED
  // -------------------------------------------------------------------------
  const towerGroup = new THREE.Group();
  towerGroup.position.set(0.02, 2.39, -0.15);
  root.add(towerGroup);
  addCyl(towerGroup, 0.012, 0.015, 0.14, 0, 0.07, 0, materials.steelMat);
  addCyl(towerGroup, 0.028, 0.032, 0.03, 0, 0.15, 0, materials.darkSteelMat);
  addCyl(towerGroup, 0.026, 0.026, 0.055, 0, 0.195, 0, materials.towerGreenMat);
  addCyl(towerGroup, 0.026, 0.026, 0.055, 0, 0.252, 0, materials.towerAmberMat);
  addCyl(towerGroup, 0.026, 0.026, 0.055, 0, 0.309, 0, materials.towerRedMat);
  addCyl(towerGroup, 0.028, 0.028, 0.018, 0, 0.345, 0, materials.creamDarkMat);

  const reels: THREE.Group[] = [];
  function createReelAssembly(rx: number, ry: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(rx, ry, -0.11);
    root.add(g);

    addCyl(g, 0.045, 0.045, 0.03, 0, 0, 0.015, materials.darkSteelMat, 'z', 20);

    const spinGroup = new THREE.Group();
    spinGroup.position.set(0, 0, 0.16);
    g.add(spinGroup);

    const flangeBack = addCyl(
      spinGroup,
      0.19,
      0.19,
      0.008,
      0,
      0,
      -0.065,
      materials.acrylicDiscMat,
      'z',
      36
    );
    flangeBack.renderOrder = 8;
    const flangeFront = addCyl(
      spinGroup,
      0.19,
      0.19,
      0.008,
      0,
      0,
      0.065,
      materials.acrylicDiscMat,
      'z',
      36
    );
    flangeFront.renderOrder = 9;

    addCyl(spinGroup, 0.145, 0.145, 0.12, 0, 0, 0, materials.filmRollMat, 'z', 32);
    addCyl(spinGroup, 0.036, 0.036, 0.21, 0, 0, 0.02, materials.darkSteelMat, 'z', 20);
    addCyl(spinGroup, 0.018, 0.018, 0.27, 0, 0, 0.04, materials.steelMat, 'z', 16);

    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const spoke = addBox(
        spinGroup,
        0.13,
        0.014,
        0.008,
        Math.cos(a) * 0.07,
        Math.sin(a) * 0.07,
        0.072,
        materials.darkSteelMat
      );
      spoke.rotation.z = a;
    }
    return spinGroup;
  }

  reels.push(createReelAssembly(-0.22, 2.13));
  reels.push(createReelAssembly(0.24, 2.13));

  const guideRollers: THREE.Group[] = [];
  const rollerPositions: [number, number][] = [
    [-0.31, 1.88],
    [-0.31, 1.74],
    [-0.22, 1.62],
    [-0.16, 1.94],
    [0.06, 1.94],
    [0.06, 1.72],
    [-0.16, 1.62],
    [0.31, 1.88],
    [0.31, 1.74],
  ];
  rollerPositions.forEach(([rx, ry]) => {
    const rg = new THREE.Group();
    rg.position.set(rx, ry, 0.06);
    root.add(rg);
    addCyl(rg, 0.016, 0.016, 0.18, 0, 0, 0, materials.steelMat, 'z', 18);
    addCyl(rg, 0.02, 0.02, 0.014, 0, 0, 0.095, materials.darkSteelMat, 'z', 14);
    addBox(rg, 0.028, 0.006, 0.006, 0, 0, 0.104, materials.followerCyanMat);
    guideRollers.push(rg);
  });

  addBox(root, 0.16, 0.07, 0.16, -0.04, 1.83, 0.04, materials.creamDarkMat);
  addBox(root, 0.12, 0.08, 0.17, -0.04, 1.73, 0.04, materials.creamDarkMat);

  const dancerPivot = new THREE.Group();
  dancerPivot.position.set(-0.28, 1.96, 0.08);
  root.add(dancerPivot);
  addBox(dancerPivot, 0.16, 0.016, 0.014, 0.07, 0, 0, materials.followerCyanMat);
  addCyl(dancerPivot, 0.016, 0.016, 0.14, 0.15, 0, 0.02, materials.steelMat, 'z', 16);

  const webCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, 2.0, LINE_Z),
    new THREE.Vector3(-0.31, 1.88, LINE_Z),
    new THREE.Vector3(-0.165, 1.95, LINE_Z),
    new THREE.Vector3(-0.16, 1.72, LINE_Z),
    new THREE.Vector3(PAPER_X, 1.48, LINE_Z),
    new THREE.Vector3(PAPER_X, 1.245, LINE_Z),
  ]);
  const webPts = webCurve.getPoints(36);
  const ribbonGeo = trackGeo(new THREE.BufferGeometry());
  const ribbonVerts: number[] = [];
  const ribbonUvs: number[] = [];
  const ribbonIndices: number[] = [];
  const halfW = 0.036;
  webPts.forEach((p, idx) => {
    const v = idx / (webPts.length - 1);
    ribbonVerts.push(p.x, p.y, p.z - halfW);
    ribbonVerts.push(p.x, p.y, p.z + halfW);
    ribbonUvs.push(0, v, 1, v);
    if (idx < webPts.length - 1) {
      const i0 = idx * 2;
      ribbonIndices.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  });
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVerts, 3));
  ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUvs, 2));
  ribbonGeo.setIndex(ribbonIndices);
  ribbonGeo.computeVertexNormals();
  const webRibbon = new THREE.Mesh(ribbonGeo, materials.filmWebMat);
  webRibbon.renderOrder = 6;
  root.add(webRibbon);

  // Servo Pinch Rollers above Paper Shear Station
  const pinchLeft = new THREE.Group();
  pinchLeft.position.set(PAPER_X - 0.017, 1.33, LINE_Z);
  root.add(pinchLeft);
  addCyl(pinchLeft, 0.015, 0.015, 0.095, 0, 0, 0, materials.steelMat, 'z', 18);
  addBox(pinchLeft, 0.026, 0.005, 0.098, 0, 0, 0, materials.followerCyanMat);

  const pinchRight = new THREE.Group();
  pinchRight.position.set(PAPER_X + 0.017, 1.33, LINE_Z);
  root.add(pinchRight);
  addCyl(pinchRight, 0.015, 0.015, 0.095, 0, 0, 0, materials.steelMat, 'z', 18);
  addBox(pinchRight, 0.026, 0.005, 0.098, 0, 0, 0, materials.followerCyanMat);

  // Upper-left large white guide drum & 11:00 black rubber roller on slotted aluminum block (matching video)
  addCyl(root, 0.074, 0.074, 0.10, TURRET_X - 0.34, TURRET_Y + 0.22, LINE_Z + 0.015, materials.whiteDrumMat, 'z', 32);
  addCyl(root, 0.014, 0.014, 0.11, TURRET_X - 0.34, TURRET_Y + 0.22, LINE_Z + 0.015, materials.steelMat, 'z', 16);

  // 11:00 Stepped aluminum block with horizontal slit + black rubber roller
  addBox(mechGroup, 0.105, 0.088, 0.016, TURRET_X - 0.075, TURRET_Y + 0.195, 0.095, materials.steelMat);
  addBox(mechGroup, 0.036, 0.004, 0.018, TURRET_X - 0.112, TURRET_Y + 0.195, 0.096, materials.darkSteelMat);
  addCyl(mechGroup, 0.028, 0.028, 0.048, TURRET_X - 0.068, TURRET_Y + 0.20, LINE_Z - 0.018, materials.rubberMat, 'z', 24);
  addCyl(mechGroup, 0.004, 0.004, 0.052, TURRET_X - 0.068, TURRET_Y + 0.20, LINE_Z - 0.015, materials.darkSteelMat, 'z', 12);

  // 10:30 Dark iron bracket with prominent horizontal hex bolt & nut
  addBox(mechGroup, 0.065, 0.078, 0.042, TURRET_X - 0.165, TURRET_Y + 0.175, LINE_Z + 0.004, materials.darkSteelMat);
  addCyl(mechGroup, 0.006, 0.006, 0.048, TURRET_X - 0.125, TURRET_Y + 0.148, LINE_Z + 0.012, materials.steelMat, 'x', 14);
  addCyl(mechGroup, 0.011, 0.011, 0.012, TURRET_X - 0.108, TURRET_Y + 0.148, LINE_Z + 0.012, materials.steelMat, 'x', 6);

  // 7:00 Black cam roller & 11:30 recessed roller on bulkhead + twin stacked lower-left rollers
  addCyl(mechGroup, 0.036, 0.036, 0.042, TURRET_X - 0.068, TURRET_Y - 0.155, 0.102, materials.rubberMat, 'z', 24);
  addCyl(mechGroup, 0.014, 0.014, 0.048, TURRET_X - 0.068, TURRET_Y - 0.155, 0.104, materials.darkSteelMat, 'z', 14);
  addCyl(mechGroup, 0.028, 0.028, 0.036, TURRET_X - 0.028, TURRET_Y + 0.152, 0.098, materials.rubberMat, 'z', 22);
  addCyl(mechGroup, 0.036, 0.036, 0.044, TURRET_X - 0.195, TURRET_Y - 0.175, 0.108, materials.rubberMat, 'z', 22);
  addCyl(mechGroup, 0.036, 0.036, 0.044, TURRET_X - 0.215, TURRET_Y - 0.255, 0.108, materials.rubberMat, 'z', 22);

  // 6:00 Recessed pocket boss & bottom-right circular inspection seam ring on bulkhead
  addBox(mechGroup, 0.088, 0.032, 0.028, TURRET_X - 0.045, TURRET_Y - 0.255, 0.092, materials.creamDarkMat);
  addCyl(mechGroup, 0.011, 0.011, 0.018, TURRET_X - 0.045, TURRET_Y - 0.238, 0.092, materials.darkSteelMat, 'z', 14);
  const seamRingGeo = trackGeo(new THREE.RingGeometry(0.108, 0.111, 48));
  const seamRing = new THREE.Mesh(seamRingGeo, materials.darkSteelMat);
  seamRing.position.set(TURRET_X + 0.15, TURRET_Y - 0.25, 0.084);
  mechGroup.add(seamRing);

  const webTailGeo = trackGeo(new THREE.PlaneGeometry(0.072, 1.0));
  const webTail = new THREE.Mesh(webTailGeo, materials.filmWebMat);
  webTail.rotation.y = Math.PI / 2;
  webTail.renderOrder = 6;
  root.add(webTail);

  addBox(root, 0.018, 0.016, 0.095, PAPER_X + 0.012, 1.245, LINE_Z, materials.darkSteelMat);
  const paperShearBlade = new THREE.Group();
  paperShearBlade.position.set(PAPER_X - 0.032, 1.245, LINE_Z);
  root.add(paperShearBlade);
  addBox(paperShearBlade, 0.032, 0.012, 0.088, 0, 0, 0, materials.steelMat);
  addBox(paperShearBlade, 0.016, 0.02, 0.096, -0.018, 0, 0, materials.followerCyanMat);

  const cutBlank = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.072, 0.092)),
    materials.wrapperSheetMat
  );
  cutBlank.position.set(PAPER_X, LINE_Y + 0.01, LINE_Z);
  cutBlank.rotation.y = Math.PI / 2;
  cutBlank.renderOrder = 7;
  root.add(cutBlank);

  // -------------------------------------------------------------------------
  // D. SWIVEL PENDANT ARM & HMI OPERATOR CONTROL PANEL
  // -------------------------------------------------------------------------
  const hmiArmGroup = new THREE.Group();
  root.add(hmiArmGroup);
  addCyl(hmiArmGroup, 0.032, 0.032, 0.2, -0.1, 2.48, -0.15, materials.creamMat);
  addBox(hmiArmGroup, 0.09, 0.05, 0.09, -0.1, 2.57, -0.15, materials.creamDarkMat);
  addCyl(hmiArmGroup, 0.028, 0.028, 0.48, -0.34, 2.57, -0.15, materials.creamMat, 'x');
  addCyl(hmiArmGroup, 0.028, 0.028, 0.28, -0.58, 2.57, -0.01, materials.creamMat, 'z');
  addBox(hmiArmGroup, 0.08, 0.06, 0.08, -0.58, 2.57, 0.13, materials.creamDarkMat);
  addCyl(hmiArmGroup, 0.028, 0.028, 0.36, -0.58, 2.38, 0.13, materials.creamMat);

  const hmiBox = new THREE.Group();
  hmiBox.position.set(-0.58, 2.04, 0.13);
  root.add(hmiBox);
  addBox(hmiBox, 0.42, 0.32, 0.12, 0, 0, 0, materials.creamMat);

  hmiTexture.redraw(120, false, 0, 0);
  const hmiFaceMat = new THREE.MeshStandardMaterial({
    map: hmiTexture.texture,
    roughness: 0.35,
  });
  disposableMaterials.push(hmiFaceMat);
  const hmiFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.39, 0.29)),
    hmiFaceMat
  );
  hmiFace.position.set(0, 0, 0.062);
  hmiBox.add(hmiFace);

  const btnGridMats = [
    [materials.btnRedMat, materials.btnGreenMat],
    [materials.btnGreenMat, materials.btnAmberMat],
    [materials.btnBlueMat, materials.btnRedMat],
  ];
  btnGridMats.forEach((row, r) => {
    row.forEach((mat, c) => {
      const bx = 0.095 + c * 0.055;
      const by = 0.085 - r * 0.052;
      addCyl(hmiBox, 0.013, 0.013, 0.014, bx, by, 0.066, mat, 'z', 16);
    });
  });

  addCyl(hmiBox, 0.024, 0.024, 0.008, 0.145, -0.09, 0.064, materials.estopYellowMat, 'z', 20);
  addCyl(hmiBox, 0.018, 0.014, 0.022, 0.145, -0.09, 0.074, materials.estopRedMat, 'z', 20);

  // -------------------------------------------------------------------------
  // E. LEFT INFEED: CANDY ROPE SIZING ROLLERS & VERTICAL RECIPROCATING KNIFE
  // -------------------------------------------------------------------------
  const leftInfeed = new THREE.Group();
  root.add(leftInfeed);
  addBox(leftInfeed, 0.85, 0.12, 0.24, -0.88, 1.04, LINE_Z, materials.creamMat);
  addBox(leftInfeed, 0.94, 0.014, 0.12, -0.78, LINE_Y - CANDY_H / 2 - 0.008, LINE_Z, materials.steelMat);
  addBox(leftInfeed, 0.86, 0.024, 0.008, -0.82, LINE_Y, LINE_Z - 0.022, materials.steelMat);
  addBox(leftInfeed, 0.86, 0.024, 0.008, -0.82, LINE_Y, LINE_Z + 0.022, materials.steelMat);

  const ovalGeo = trackGeo(createOvalHousingGeometry());
  const ovalHousing = new THREE.Mesh(ovalGeo, materials.steelMat);
  ovalHousing.position.set(-1.02, 1.13, 0.26);
  ovalHousing.rotation.z = 0.08;
  ovalHousing.castShadow = true;
  leftInfeed.add(ovalHousing);

  const ovalCover = new THREE.Mesh(ovalGeo, materials.acrylicDiscMat);
  ovalCover.scale.set(0.9, 0.9, 0.25);
  ovalCover.position.set(-1.02, 1.13, 0.325);
  ovalCover.rotation.z = 0.08;
  ovalCover.renderOrder = 8;
  leftInfeed.add(ovalCover);

  addBox(leftInfeed, 0.03, 0.26, 0.04, -1.26, 1.25, 0.08, materials.steelMat);
  addBox(leftInfeed, 0.03, 0.26, 0.04, -1.26, 1.25, 0.24, materials.steelMat);

  const sizingRollers: { mesh: THREE.Group; dir: number }[] = [];
  [-0.92, -0.60].forEach((sx) => {
    const topR = new THREE.Group();
    topR.position.set(sx, LINE_Y + 0.038, LINE_Z);
    leftInfeed.add(topR);
    addCyl(topR, 0.026, 0.026, 0.045, 0, 0, 0, materials.steelMat, 'z', 20);
    addBox(topR, 0.056, 0.005, 0.048, 0, 0, 0, materials.brassMat);
    sizingRollers.push({ mesh: topR, dir: -1 });

    const botR = new THREE.Group();
    botR.position.set(sx, LINE_Y - 0.038, LINE_Z);
    leftInfeed.add(botR);
    addCyl(botR, 0.026, 0.026, 0.045, 0, 0, 0, materials.steelMat, 'z', 20);
    addBox(botR, 0.056, 0.005, 0.048, 0, 0, 0, materials.brassMat);
    sizingRollers.push({ mesh: botR, dir: 1 });
  });

  const ROPE_LEN = 0.98;
  const candyRopeGeo = trackGeo(new THREE.BoxGeometry(ROPE_LEN, CANDY_H, CANDY_D));
  const candyRopeMesh = new THREE.Mesh(candyRopeGeo, materials.candyRopeMat);
  candyRopeMesh.position.set(CUT_X - ROPE_LEN / 2, LINE_Y, LINE_Z);
  candyRopeMesh.castShadow = true;
  candyRopeMesh.receiveShadow = true;
  root.add(candyRopeMesh);

  // Upper Stationary Chamfered Knife & Clamp Head Tower (exact match to left tower in video)
  const knifeHeadMount = new THREE.Group();
  knifeHeadMount.position.set(CUT_X - 0.022, LINE_Y + 0.072, LINE_Z + 0.012);
  root.add(knifeHeadMount);
  addBox(knifeHeadMount, 0.064, 0.062, 0.054, 0, 0, 0, materials.steelMat);
  // 2 recessed dowel/bolt bosses on upper head face + bent L-shaped chrome sensor rod
  addCyl(knifeHeadMount, 0.0075, 0.0075, 0.058, -0.018, 0.002, 0.002, materials.darkSteelMat, 'z', 14);
  addCyl(knifeHeadMount, 0.0075, 0.0075, 0.058, 0.018, 0.002, 0.002, materials.darkSteelMat, 'z', 14);
  addCyl(knifeHeadMount, 0.005, 0.005, 0.036, -0.028, 0.022, 0.018, materials.steelMat, 'x', 12);
  addCyl(knifeHeadMount, 0.005, 0.005, 0.044, -0.044, 0.042, 0.018, materials.steelMat, 'y', 12);
  // Forward-protruding stepped cylindrical bushing sleeve
  addCyl(knifeHeadMount, 0.016, 0.016, 0.024, 0.0, -0.034, 0.028, materials.steelMat, 'y', 18);
  addCyl(knifeHeadMount, 0.011, 0.011, 0.044, 0.0, -0.020, 0.028, materials.steelMat, 'y', 18);
  // Right-side stepped sheet-metal deflector flange
  addBox(knifeHeadMount, 0.010, 0.088, 0.046, 0.038, -0.052, 0.006, materials.darkSteelMat);
  // Lower anvil guide housing
  addBox(root, 0.018, 0.042, 0.054, CUT_X + 0.012, LINE_Y - 0.046, LINE_Z, materials.steelMat);

  // Curved Stainless Steel Wrapper Crescent Chute (guiding web between knife & 9:00 jaw)
  const leftCrescent = new THREE.Mesh(
    trackGeo(createLeftCrescentGuideGeometry()),
    materials.steelMat
  );
  leftCrescent.position.set(TURRET_X, TURRET_Y, LINE_Z);
  leftCrescent.castShadow = true;
  root.add(leftCrescent);

  // Reciprocating 3-Bolt Trapezoidal Shear Knife Block, Guide Shaft, Locking Collar & Blade
  const knifeBlockGroup = new THREE.Group();
  knifeBlockGroup.position.set(CUT_X, LINE_Y + 0.045, LINE_Z);
  root.add(knifeBlockGroup);
  addBox(knifeBlockGroup, 0.056, 0.038, 0.048, -0.022, 0.004, 0.024, materials.steelMat);
  // Inverted triangle of 3 socket-head cap screws on front face
  addCyl(knifeBlockGroup, 0.0065, 0.0065, 0.014, -0.038, 0.012, 0.046, materials.darkSteelMat, 'z', 14);
  addCyl(knifeBlockGroup, 0.0065, 0.0065, 0.014, -0.006, 0.012, 0.046, materials.darkSteelMat, 'z', 14);
  addCyl(knifeBlockGroup, 0.005, 0.005, 0.014, -0.022, -0.004, 0.046, materials.darkSteelMat, 'z', 14);
  // Vertical plunger rod + clamping collar with set-screw + dark vertical guillotine blade
  addCyl(knifeBlockGroup, 0.0065, 0.0065, 0.075, -0.022, -0.032, 0.024, materials.steelMat, 'y', 14);
  addCyl(knifeBlockGroup, 0.013, 0.013, 0.018, -0.022, -0.036, 0.024, materials.steelMat, 'y', 18);
  addBox(knifeBlockGroup, 0.026, 0.048, 0.034, -0.016, -0.068, 0.006, materials.darkSteelMat);
  addBox(knifeBlockGroup, 0.005, 0.044, 0.046, 0.0, -0.028, 0.0, materials.followerCyanMat);

  // -------------------------------------------------------------------------
  // F. RIGHT OUTFEED CONVEYOR & DISCHARGE CHUTE
  // -------------------------------------------------------------------------
  const rightOutfeed = new THREE.Group();
  root.add(rightOutfeed);
  addBox(rightOutfeed, 0.88, 0.14, 0.24, 0.83, 1.04, LINE_Z, materials.creamMat);
  addBox(rightOutfeed, 0.96, 0.018, 0.16, 0.83, LINE_Y - CANDY_H / 2 - 0.012, LINE_Z, materials.steelMat);
  const beltMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.94, 0.008, 0.09)),
    materials.beltMat
  );
  beltMesh.position.set(0.83, LINE_Y - CANDY_H / 2 - 0.003, LINE_Z);
  beltMesh.receiveShadow = true;
  rightOutfeed.add(beltMesh);

  addBox(rightOutfeed, 0.92, 0.022, 0.006, 0.80, LINE_Y, LINE_Z - 0.032, materials.steelMat);
  addBox(rightOutfeed, 0.92, 0.022, 0.006, 0.80, LINE_Y, LINE_Z + 0.032, materials.steelMat);

  addCyl(rightOutfeed, 0.032, 0.032, 0.02, 0.72, 1.05, 0.29, materials.darkSteelMat, 'z', 18);
  addBox(rightOutfeed, 0.26, 0.28, 0.26, 1.32, 0.94, LINE_Z, materials.steelMat);
  addBox(rightOutfeed, 0.09, 0.09, 0.06, 1.24, 0.94, 0.31, materials.creamDarkMat);
  addCyl(rightOutfeed, 0.018, 0.014, 0.02, 1.24, 0.94, 0.345, materials.estopRedMat, 'z', 16);

  // -------------------------------------------------------------------------
  // G. REAR CAMBOX (Hidden behind bulkhead in Solid; visible in X-Ray / Hidden)
  // -------------------------------------------------------------------------

  addBox(mechGroup, 0.56, 0.025, 0.38, 0.0, 0.69, 0.0, materials.darkSteelMat);
  addBox(mechGroup, 0.56, 0.025, 0.38, 0.0, 1.39, 0.0, materials.darkSteelMat);
  addCyl(mechGroup, 0.012, 0.012, 0.70, -0.22, 1.04, -0.14, materials.steelMat);
  addCyl(mechGroup, 0.012, 0.012, 0.70, 0.22, 1.04, -0.14, materials.steelMat);

  // Drive motor & 2:1 spur gear train behind bulkhead
  addCyl(mechGroup, 0.068, 0.068, 0.18, -0.18, 0.77, -0.18, materials.darkSteelMat, 'z', 20);
  const motorPinionX = CAM_X - 0.132;
  const motorPinionY = CAM_Y - 0.03;
  addCyl(mechGroup, 0.012, 0.012, 0.18, motorPinionX, motorPinionY, -0.18, materials.steelMat, 'z', 14);

  const gear1 = new THREE.Mesh(
    trackGeo(createGearGeometry(16, 0.044, 0.02, 0.012)),
    materials.brassMat
  );
  gear1.position.set(motorPinionX, motorPinionY, -0.18);
  gear1.castShadow = true;
  mechGroup.add(gear1);

  const gear2 = new THREE.Mesh(
    trackGeo(createGearGeometry(32, 0.088, 0.02, 0.015)),
    materials.steelMat
  );
  gear2.position.set(CAM_X, CAM_Y, -0.18);
  gear2.castShadow = true;
  mechGroup.add(gear2);

  // Master Camshaft running along Z behind the bulkhead
  addCyl(mechGroup, 0.015, 0.015, 0.32, CAM_X, CAM_Y, -0.08, materials.steelMat, 'z', 20);
  addBox(mechGroup, 0.065, 0.065, 0.022, CAM_X, CAM_Y, -0.22, materials.darkSteelMat);
  addBox(mechGroup, 0.065, 0.065, 0.022, CAM_X, CAM_Y, 0.055, materials.darkSteelMat);

  // Grooved Barrel Indexing Cam (Amber/Gold drum)
  const barrelCam = new THREE.Group();
  barrelCam.position.set(CAM_X, CAM_Y, -0.14);
  mechGroup.add(barrelCam);
  addCyl(barrelCam, 0.046, 0.046, 0.068, 0, 0, 0, materials.camGoldMat, 'z', 24);
  [-0.02, 0, 0.02].forEach((rz, idx) => {
    const rib = addCyl(barrelCam, 0.054, 0.054, 0.008, 0, 0, rz, materials.camGoldMat, 'z', 24);
    rib.rotation.x += idx * 0.06;
  });

  // --- CAM 1: Pivoting Transfer Arm & Plunger Plate Cam (Amber/Gold, Z = CAM1_Z = 0.01) ---
  const { geometry: cam1Geo, pitchRadiusLUT: cam1LUT } = buildCamWithLUT(
    getPlungerLiftNorm,
    -Math.PI / 2,
    0.02
  );
  trackGeo(cam1Geo);
  const cam1Mesh = new THREE.Mesh(cam1Geo, materials.camGoldMat);
  cam1Mesh.position.set(CAM_X, CAM_Y, CAM1_Z);
  cam1Mesh.castShadow = true;
  mechGroup.add(cam1Mesh);
  addCyl(cam1Mesh, 0.024, 0.024, 0.026, 0, 0, 0, materials.brassMat, 'z', 18);

  addCyl(mechGroup, 0.016, 0.016, 0.05, P1_X, P1_Y, CAM1_Z, materials.darkSteelMat, 'z', 16);
  const rocker1 = new THREE.Group();
  rocker1.position.set(P1_X, P1_Y, CAM1_Z);
  mechGroup.add(rocker1);
  addBox(rocker1, L1_ARM, 0.02, 0.012, L1_ARM / 2, 0, 0.016, materials.followerCyanMat);
  addCyl(rocker1, 0.016, 0.016, 0.02, 0, 0, 0.016, materials.followerCyanMat, 'z', 16);
  const roller1 = new THREE.Group();
  roller1.position.set(L1_ARM, 0, 0);
  rocker1.add(roller1);
  addCyl(roller1, ROLLER_R, ROLLER_R, 0.018, 0, 0, 0, materials.steelMat, 'z', 20);
  addCyl(roller1, 0.007, 0.007, 0.03, 0, 0, 0.008, materials.darkSteelMat, 'z', 12);

  const L1_UP = 0.39;
  addBox(rocker1, 0.02, L1_UP, 0.012, 0, L1_UP / 2, -0.016, materials.followerCyanMat);
  addCyl(rocker1, 0.008, 0.008, 0.028, 0, L1_UP, -0.016, materials.steelMat, 'z', 12);

  const plungerRod = new THREE.Group();
  mechGroup.add(plungerRod);
  const PLUNGER_LINK_L = 0.095;
  addBox(plungerRod, PLUNGER_LINK_L, 0.014, 0.01, PLUNGER_LINK_L / 2, 0, 0, materials.followerCyanMat);

  // Foreground Sweeping Tapered Transfer Arm (exact match to vertical lever in slow-mo video)
  const TRANSFER_PIVOT_X = -0.195;
  const TRANSFER_PIVOT_Y = 0.72;
  const transferArmPivot = new THREE.Group();
  transferArmPivot.position.set(TRANSFER_PIVOT_X, TRANSFER_PIVOT_Y, LINE_Z + 0.054);
  mechGroup.add(transferArmPivot);
  const transferArmBeam = new THREE.Mesh(
    trackGeo(createTransferArmBeamGeometry()),
    materials.steelMat
  );
  transferArmBeam.castShadow = true;
  transferArmBeam.receiveShadow = true;
  transferArmPivot.add(transferArmBeam);
  addCyl(transferArmPivot, 0.015, 0.015, 0.026, 0, 0, 0, materials.darkSteelMat, 'z', 16);
  // Pusher paddle shoe at tip (Y = 1.15 -> local Y = 0.43) reaching back to LINE_Z
  addBox(transferArmPivot, 0.018, 0.022, 0.058, 0.010, 0.432, -0.028, materials.steelMat);
  addBox(transferArmPivot, 0.007, 0.022, 0.026, 0.019, 0.432, -0.054, materials.followerCyanMat);

  // --- CAM 2: 12:00 Overhead Folding Arm & 1:30 End-Tuckers Cam (Z = CAM2_Z = -0.04) ---
  const { geometry: cam2Geo, pitchRadiusLUT: cam2LUT } = buildCamWithLUT(
    getTuckerLiftNorm,
    Math.PI / 2,
    0.02
  );
  trackGeo(cam2Geo);
  const cam2Mesh = new THREE.Mesh(cam2Geo, materials.camGoldMat);
  cam2Mesh.position.set(CAM_X, CAM_Y, CAM2_Z);
  cam2Mesh.castShadow = true;
  mechGroup.add(cam2Mesh);
  addCyl(cam2Mesh, 0.024, 0.024, 0.026, 0, 0, 0, materials.brassMat, 'z', 18);

  addCyl(mechGroup, 0.015, 0.015, 0.05, P2_X, P2_Y, CAM2_Z, materials.darkSteelMat, 'z', 16);
  const rocker2 = new THREE.Group();
  rocker2.position.set(P2_X, P2_Y, CAM2_Z);
  mechGroup.add(rocker2);
  addBox(rocker2, L2_ARM, 0.018, 0.012, -L2_ARM / 2, 0, 0.016, materials.followerCyanMat);
  addCyl(rocker2, 0.015, 0.015, 0.02, 0, 0, 0.016, materials.followerCyanMat, 'z', 14);
  const roller2 = new THREE.Group();
  roller2.position.set(-L2_ARM, 0, 0);
  rocker2.add(roller2);
  addCyl(roller2, ROLLER_R, ROLLER_R, 0.018, 0, 0, 0, materials.steelMat, 'z', 20);
  addCyl(roller2, 0.007, 0.007, 0.028, 0, 0, 0.008, materials.darkSteelMat, 'z', 12);

  const tuckerPushrod = new THREE.Group();
  mechGroup.add(tuckerPushrod);
  addBox(tuckerPushrod, 0.013, 0.30, 0.01, 0, 0.15, 0, materials.followerCyanMat);

  // 12:00 Pivoting Overhead Folding Plunger Arm (strokes down into 12:00 jaw entrance)
  const overheadPlungerPivot = new THREE.Group();
  overheadPlungerPivot.position.set(TURRET_X + 0.075, TURRET_Y + 0.285, LINE_Z + 0.025);
  mechGroup.add(overheadPlungerPivot);
  addCyl(overheadPlungerPivot, 0.014, 0.014, 0.036, 0, 0, 0, materials.darkSteelMat, 'z', 16);
  addBox(overheadPlungerPivot, 0.024, 0.13, 0.022, -0.036, -0.048, 0, materials.steelMat).rotation.z = -0.52;
  addBox(overheadPlungerPivot, 0.014, 0.10, 0.012, -0.034, -0.045, 0.014, materials.followerCyanMat).rotation.z = -0.52;
  addBox(overheadPlungerPivot, 0.034, 0.016, 0.034, -0.068, -0.102, -0.020, materials.steelMat);
  addBox(overheadPlungerPivot, 0.024, 0.008, 0.038, -0.068, -0.112, -0.020, materials.followerCyanMat);

  // Upper-Right Angled Dual-Bolt Slide Block, Striker Foot, Rear Ratchet, Tension Rod & Latch Pawl
  const station3A = Math.PI / 4;
  const station3X = TURRET_X + TURRET_R * Math.cos(station3A);
  const station3Y = TURRET_Y + TURRET_R * Math.sin(station3A);

  const tuckerMount = new THREE.Group();
  tuckerMount.position.set(station3X + 0.062, station3Y + 0.088, LINE_Z + 0.022);
  tuckerMount.rotation.z = -0.56;
  mechGroup.add(tuckerMount);
  addBox(tuckerMount, 0.046, 0.095, 0.026, 0, 0, 0, materials.steelMat);
  addBox(tuckerMount, 0.032, 0.048, 0.012, 0, 0.018, 0.012, materials.creamDarkMat);
  addCyl(tuckerMount, 0.0075, 0.0075, 0.024, -0.008, 0.024, 0.016, materials.darkSteelMat, 'z', 14);
  addCyl(tuckerMount, 0.0075, 0.0075, 0.024, 0.008, 0.012, 0.016, materials.darkSteelMat, 'z', 14);
  // Chamfered striker block pointing down-left toward 1:30
  addBox(tuckerMount, 0.034, 0.020, 0.024, -0.012, -0.048, -0.004, materials.steelMat);
  // Threaded tension rod & top-right curved latch/pawl hook
  addCyl(tuckerMount, 0.006, 0.006, 0.075, 0.056, -0.010, -0.006, materials.darkSteelMat, 'x', 12);
  addBox(tuckerMount, 0.028, 0.012, 0.010, 0.048, 0.042, 0.008, materials.steelMat).rotation.z = 0.45;
  addCyl(tuckerMount, 0.005, 0.005, 0.016, 0.038, 0.042, 0.010, materials.darkSteelMat, 'z', 12);

  const tuckerFront = new THREE.Group();
  tuckerFront.position.set(station3X, station3Y, LINE_Z + 0.048);
  mechGroup.add(tuckerFront);
  addBox(tuckerFront, 0.026, 0.020, 0.028, 0, 0, 0, materials.followerCyanMat);
  addBox(tuckerFront, 0.016, 0.012, 0.02, 0, 0, -0.02, materials.steelMat);

  const tuckerRear = new THREE.Group();
  tuckerRear.position.set(station3X, station3Y, LINE_Z - 0.048);
  mechGroup.add(tuckerRear);
  addBox(tuckerRear, 0.026, 0.020, 0.028, 0, 0, 0, materials.followerCyanMat);
  addBox(tuckerRear, 0.016, 0.012, 0.02, 0, 0, 0.02, materials.steelMat);

  // Stationary Curved Folding Hardware (10:00 -> 3:00 around turret, layered in Z exactly like video)
  const innerShoe = new THREE.Mesh(
    trackGeo(createInnerFoldingShoeGeometry()),
    materials.darkSteelMat
  );
  innerShoe.position.set(TURRET_X, TURRET_Y, LINE_Z);
  mechGroup.add(innerShoe);

  const curvedRatchet = new THREE.Mesh(
    trackGeo(createCurvedRatchetSegmentGeometry()),
    materials.darkSteelMat
  );
  curvedRatchet.position.set(TURRET_X, TURRET_Y, LINE_Z + 0.012);
  mechGroup.add(curvedRatchet);

  const slottedArcPlate = new THREE.Mesh(
    trackGeo(createSlottedFoldingArcGeometry()),
    materials.steelMat
  );
  slottedArcPlate.position.set(TURRET_X, TURRET_Y, LINE_Z + 0.026);
  slottedArcPlate.castShadow = true;
  slottedArcPlate.receiveShadow = true;
  mechGroup.add(slottedArcPlate);

  // Outer right mounting hex bolt + washer + dowel pins on BZW1807-125 slotted arc plate
  addCyl(mechGroup, 0.011, 0.011, 0.004, TURRET_X + 0.198, TURRET_Y + 0.095, LINE_Z + 0.032, materials.steelMat, 'z', 16);
  const arcClampBolt = addCyl(mechGroup, 0.008, 0.008, 0.014, TURRET_X + 0.198, TURRET_Y + 0.095, LINE_Z + 0.036, materials.steelMat, 'z', 6);
  arcClampBolt.rotation.z = 0.25;
  addCyl(mechGroup, 0.0035, 0.0035, 0.016, TURRET_X + 0.214, TURRET_Y + 0.088, LINE_Z + 0.031, materials.darkSteelMat, 'z', 12);
  addCyl(mechGroup, 0.0035, 0.0035, 0.016, TURRET_X + 0.196, TURRET_Y + 0.125, LINE_Z + 0.031, materials.darkSteelMat, 'z', 12);

  // Engraved "BZW1807-125" stamp along slotted arc plate
  const arcStampMat = new THREE.MeshBasicMaterial({
    map: slottedArcTex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposableMaterials.push(arcStampMat);
  const arcStampMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.068, 0.017)),
    arcStampMat
  );
  arcStampMesh.position.set(TURRET_X + 0.168, TURRET_Y + 0.125, LINE_Z + 0.033);
  arcStampMesh.rotation.z = -1.02;
  mechGroup.add(arcStampMesh);

  // Sliding slot-follower pin & curved linkage inside BZW1807-125 slot
  const slotPinPivot = new THREE.Group();
  slotPinPivot.position.set(TURRET_X, TURRET_Y, LINE_Z + 0.032);
  mechGroup.add(slotPinPivot);
  addCyl(slotPinPivot, 0.0055, 0.0055, 0.022, 0.197, 0, 0, materials.darkSteelMat, 'z', 14);
  addBox(slotPinPivot, 0.012, 0.068, 0.008, 0.198, 0.034, 0.004, materials.steelMat);

  // --- 3:00 STATION: BRONZE HEATER BLOCK, UPPER CLAMP STACK, FLEX CONDUIT & MAROON HANDLE ---
  const station3HeaterGroup = new THREE.Group();
  station3HeaterGroup.position.set(0.312, LINE_Y + 0.036, LINE_Z);
  root.add(station3HeaterGroup);
  // Heat-tinted oxidized bronze main heater block + stepped front-left notch & right socket screw boss
  addBox(station3HeaterGroup, 0.124, 0.052, 0.056, 0.0, 0.0, 0.0, materials.heaterBronzeMat);
  addBox(station3HeaterGroup, 0.044, 0.034, 0.058, 0.036, 0.008, 0.004, materials.heaterBronzeMat);
  addCyl(station3HeaterGroup, 0.008, 0.008, 0.014, 0.034, 0.010, 0.032, materials.steelMat, 'z', 14);
  addCyl(station3HeaterGroup, 0.004, 0.004, 0.016, 0.034, 0.010, 0.033, materials.darkSteelMat, 'z', 6);
  // Layered steel & aluminum upper clamping plates
  addBox(station3HeaterGroup, 0.118, 0.014, 0.054, 0.002, 0.033, 0.0, materials.darkSteelMat);
  addBox(station3HeaterGroup, 0.112, 0.016, 0.050, 0.004, 0.048, 0.0, materials.steelMat);
  addCyl(station3HeaterGroup, 0.012, 0.012, 0.022, 0.012, 0.068, 0.004, materials.steelMat, 'z', 16);
  addCyl(station3HeaterGroup, 0.008, 0.008, 0.075, -0.024, 0.088, 0.006, materials.steelMat, 'z', 12).rotation.z = 0.65;
  // Diagonal dark maroon insulated handle grip angling up-right
  const maroonHandle = addCyl(station3HeaterGroup, 0.012, 0.009, 0.115, 0.056, 0.115, 0.018, materials.maroonHandleMat, 'y', 16);
  maroonHandle.rotation.z = -0.52;
  // Flexible braided stainless-steel hose/conduit curving upward from swivel boss
  const flexConduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.014, 0.074, 0.0),
    new THREE.Vector3(0.018, 0.135, -0.004),
    new THREE.Vector3(0.038, 0.195, -0.012),
  ]);
  const flexConduitMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(flexConduitCurve, 18, 0.0075, 10, false)),
    materials.steelMat
  );
  flexConduitMesh.castShadow = true;
  station3HeaterGroup.add(flexConduitMesh);

  // Lower stationary guide shelf, inner 2-bolt anchor block & horizontal rear drive shaft
  addBox(root, 0.068, 0.022, 0.048, 0.236, LINE_Y - 0.020, LINE_Z, materials.steelMat);
  addBox(root, 0.058, 0.056, 0.046, 0.256, LINE_Y - 0.062, LINE_Z - 0.002, materials.darkSteelMat);
  addCyl(root, 0.0075, 0.0075, 0.012, 0.246, LINE_Y - 0.052, LINE_Z + 0.023, materials.steelMat, 'z', 14);
  addCyl(root, 0.0075, 0.0075, 0.012, 0.266, LINE_Y - 0.072, LINE_Z + 0.023, materials.steelMat, 'z', 14);
  addCyl(root, 0.014, 0.014, 0.15, 0.335, LINE_Y - 0.105, LINE_Z - 0.022, materials.steelMat, 'x', 16);

  // --- CAM 3: 3:00 Ejector Carriage Plate Cam (Amber/Gold, Z = CAM3_Z = -0.09) ---
  const { geometry: cam3Geo, pitchRadiusLUT: cam3LUT } = buildCamWithLUT(
    getEjectorLiftNorm,
    0,
    0.02
  );
  trackGeo(cam3Geo);
  const cam3Mesh = new THREE.Mesh(cam3Geo, materials.camGoldMat);
  cam3Mesh.position.set(CAM_X, CAM_Y, CAM3_Z);
  cam3Mesh.castShadow = true;
  mechGroup.add(cam3Mesh);
  addCyl(cam3Mesh, 0.024, 0.024, 0.026, 0, 0, 0, materials.brassMat, 'z', 18);

  addCyl(mechGroup, 0.015, 0.015, 0.05, P3_X, P3_Y, CAM3_Z, materials.darkSteelMat, 'z', 16);
  const rocker3 = new THREE.Group();
  rocker3.position.set(P3_X, P3_Y, CAM3_Z);
  mechGroup.add(rocker3);
  addBox(rocker3, 0.018, L3_ARM, 0.012, 0, L3_ARM / 2, 0.016, materials.followerCyanMat);
  addCyl(rocker3, 0.015, 0.015, 0.02, 0, 0, 0.016, materials.followerCyanMat, 'z', 14);
  const roller3 = new THREE.Group();
  roller3.position.set(0, L3_ARM, 0);
  rocker3.add(roller3);
  addCyl(roller3, ROLLER_R, ROLLER_R, 0.018, 0, 0, 0, materials.steelMat, 'z', 20);
  addCyl(roller3, 0.007, 0.007, 0.028, 0, 0, 0.008, materials.darkSteelMat, 'z', 12);

  const L3_UP = 0.45;
  addBox(rocker3, 0.018, L3_UP, 0.01, 0, L3_UP / 2, -0.014, materials.followerCyanMat);
  addCyl(rocker3, 0.008, 0.008, 0.024, 0, L3_UP, -0.014, materials.steelMat, 'z', 12);

  // Prominent Stepped Reciprocating Horizontal Aluminum Carriage with 2 Bottom Socket Screws
  const ejectorCarriage = new THREE.Group();
  ejectorCarriage.position.set(0.305, LINE_Y - 0.002, LINE_Z + 0.012);
  mechGroup.add(ejectorCarriage);
  // Top thin horizontal stripping tongue sliding beneath bronze block into 3:00 jaw
  addBox(ejectorCarriage, 0.126, 0.011, 0.044, 0.016, 0.0, -0.006, materials.steelMat);
  addBox(ejectorCarriage, 0.014, 0.011, 0.046, -0.046, 0.0, -0.006, materials.followerCyanMat);
  // Stepped upper shoulder & vertical hanging block with 2 recessed bottom socket bolts
  addBox(ejectorCarriage, 0.114, 0.018, 0.048, 0.046, -0.015, 0.0, materials.steelMat);
  addBox(ejectorCarriage, 0.056, 0.132, 0.044, 0.044, -0.088, 0.012, materials.steelMat);
  addCyl(ejectorCarriage, 0.0075, 0.0075, 0.010, 0.030, -0.140, 0.033, materials.darkSteelMat, 'z', 14);
  addCyl(ejectorCarriage, 0.0075, 0.0075, 0.010, 0.058, -0.140, 0.033, materials.darkSteelMat, 'z', 14);
  addCyl(ejectorCarriage, 0.0038, 0.0038, 0.012, 0.030, -0.140, 0.034, materials.steelMat, 'z', 6);
  addCyl(ejectorCarriage, 0.0038, 0.0038, 0.012, 0.058, -0.140, 0.034, materials.steelMat, 'z', 6);

  // --- 8-STATION "BZW10437" ACTIVE SPLIT-JAW PINCER TURRET WHEEL ---
  const turretGroup = new THREE.Group();
  turretGroup.position.set(TURRET_X, TURRET_Y, LINE_Z);
  mechGroup.add(turretGroup);

  const jawUpperGeo = trackGeo(createPincerJawHalfGeometry(1));
  const jawLowerGeo = trackGeo(createPincerJawHalfGeometry(-1));
  const tipPadUpperGeo = trackGeo(createPincerTipPadGeometry(1));
  const tipPadLowerGeo = trackGeo(createPincerTipPadGeometry(-1));
  const pincerStations: PincerStation[] = [];

  for (let i = 0; i < TURRET_STATIONS; i++) {
    const a = i * STATION_STEP;

    const jawHub = new THREE.Group();
    jawHub.position.set(Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0.0);
    jawHub.rotation.z = a;
    turretGroup.add(jawHub);

    const upperFinger = new THREE.Group();
    jawHub.add(upperFinger);
    const uMesh = new THREE.Mesh(jawUpperGeo, materials.oliveAlloyMat);
    uMesh.castShadow = true;
    uMesh.receiveShadow = true;
    upperFinger.add(uMesh);
    const uPad = new THREE.Mesh(tipPadUpperGeo, materials.steelMat);
    upperFinger.add(uPad);

    const lowerFinger = new THREE.Group();
    jawHub.add(lowerFinger);
    const lMesh = new THREE.Mesh(jawLowerGeo, materials.oliveAlloyMat);
    lMesh.castShadow = true;
    lMesh.receiveShadow = true;
    lowerFinger.add(lMesh);
    const lPad = new THREE.Mesh(tipPadLowerGeo, materials.steelMat);
    lowerFinger.add(lPad);

    pincerStations.push({ upperFinger, lowerFinger });
  }

  // Iconic Olive-Alloy 8-Hex-Nut Carrier Plate & Bright "BZW10437" Center Cap
  addCyl(turretGroup, 0.098, 0.098, 0.016, 0, 0, 0.016, materials.oliveAlloyMat, 'z', 48);
  addCyl(turretGroup, 0.02, 0.02, 0.24, 0, 0, -0.09, materials.steelMat, 'z', 18);

  for (let i = 0; i < TURRET_STATIONS; i++) {
    const nutA = i * STATION_STEP;
    const nx = Math.cos(nutA) * 0.068;
    const ny = Math.sin(nutA) * 0.068;
    // Dark recessed pocket + machined hex nut + threaded center stud
    addCyl(turretGroup, 0.0155, 0.0155, 0.005, nx, ny, 0.023, materials.darkSteelMat, 'z', 18);
    const hexNut = addCyl(turretGroup, 0.012, 0.012, 0.009, nx, ny, 0.025, materials.steelMat, 'z', 6);
    hexNut.rotation.z = nutA;
    addCyl(turretGroup, 0.005, 0.005, 0.011, nx, ny, 0.026, materials.darkSteelMat, 'z', 12);

    // 8 Outer socket-head cap screws between the nut pockets
    const boltA = nutA + STATION_STEP * 0.5;
    const bx = Math.cos(boltA) * 0.087;
    const by = Math.sin(boltA) * 0.087;
    addCyl(turretGroup, 0.0052, 0.0052, 0.006, bx, by, 0.024, materials.steelMat, 'z', 12);
    addCyl(turretGroup, 0.0026, 0.0026, 0.007, bx, by, 0.025, materials.darkSteelMat, 'z', 6);
  }

  // 2 small index pin holes matching real turret plate
  [1.18, 4.32].forEach((ha) => {
    addCyl(turretGroup, 0.003, 0.003, 0.006, Math.cos(ha) * 0.053, Math.sin(ha) * 0.053, 0.023, materials.darkSteelMat, 'z', 10);
  });

  const centerCapMat = new THREE.MeshStandardMaterial({
    map: turretCapTex,
    roughness: 0.24,
    metalness: 0.65,
  });
  disposableMaterials.push(centerCapMat);
  const centerCapDisc = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.006, 36)),
    centerCapMat
  );
  centerCapDisc.rotation.x = Math.PI / 2;
  centerCapDisc.position.set(0, 0, 0.025);
  turretGroup.add(centerCapDisc);

  // 4 small perimeter socket screws securing the BZW10437 cap disc
  for (let k = 0; k < 4; k++) {
    const ca = k * (Math.PI / 2) + Math.PI / 4;
    addCyl(turretGroup, 0.0024, 0.0024, 0.005, Math.cos(ca) * 0.043, Math.sin(ca) * 0.043, 0.027, materials.steelMat, 'z', 10);
  }

  // -------------------------------------------------------------------------
  // H. CANDY PIECE & ARTICULATED 6-PANEL DIE-FOLD WRAPPER POOL (14 Slots)
  // -------------------------------------------------------------------------
  const SLOT_COUNT = 14;
  const piecePool: CandyPieceSlot[] = [];

  const candyGeo = trackGeo(new THREE.BoxGeometry(CANDY_L, CANDY_H, CANDY_D));
  const frontSheetGeo = trackGeo(new THREE.PlaneGeometry(CANDY_D + 0.004, CANDY_H + 0.004));
  const flapLongGeo = trackGeo(new THREE.PlaneGeometry(CANDY_D + 0.004, CANDY_L));
  const flapShortGeo = trackGeo(new THREE.PlaneGeometry(CANDY_D + 0.004, CANDY_H * 0.55));
  const earGeo = trackGeo(new THREE.PlaneGeometry(CANDY_L + 0.002, CANDY_H + 0.002));

  for (let i = 0; i < SLOT_COUNT; i++) {
    const group = new THREE.Group();
    root.add(group);

    const candyMesh = new THREE.Mesh(candyGeo, materials.candyBlockMat);
    candyMesh.castShadow = true;
    candyMesh.receiveShadow = true;
    group.add(candyMesh);

    const frontSheet = new THREE.Mesh(frontSheetGeo, materials.wrapperSheetMat);
    frontSheet.position.set(CANDY_L / 2 + 0.001, 0, 0);
    frontSheet.rotation.y = Math.PI / 2;
    frontSheet.renderOrder = 7;
    group.add(frontSheet);

    const topFlap = new THREE.Group();
    topFlap.position.set(CANDY_L / 2, CANDY_H / 2 + 0.001, 0);
    group.add(topFlap);
    const topFlapMesh = new THREE.Mesh(flapLongGeo, materials.wrapperSheetMat);
    topFlapMesh.rotation.x = Math.PI / 2;
    topFlapMesh.position.set(-CANDY_L / 2, 0, 0);
    topFlapMesh.renderOrder = 7;
    topFlap.add(topFlapMesh);

    const botFlap = new THREE.Group();
    botFlap.position.set(CANDY_L / 2, -CANDY_H / 2 - 0.001, 0);
    group.add(botFlap);
    const botFlapMesh = new THREE.Mesh(flapLongGeo, materials.wrapperSheetMat);
    botFlapMesh.rotation.x = -Math.PI / 2;
    botFlapMesh.position.set(-CANDY_L / 2, 0, 0);
    botFlapMesh.renderOrder = 7;
    botFlap.add(botFlapMesh);

    const rearTopFlap = new THREE.Group();
    rearTopFlap.position.set(-CANDY_L / 2, CANDY_H / 2 + 0.001, 0);
    group.add(rearTopFlap);
    const rTopMesh = new THREE.Mesh(flapShortGeo, materials.wrapperSheetMat);
    rTopMesh.rotation.x = Math.PI / 2;
    rTopMesh.position.set(-CANDY_H * 0.27, 0, 0);
    rTopMesh.renderOrder = 7;
    rearTopFlap.add(rTopMesh);

    const rearBotFlap = new THREE.Group();
    rearBotFlap.position.set(-CANDY_L / 2, -CANDY_H / 2 - 0.001, 0);
    group.add(rearBotFlap);
    const rBotMesh = new THREE.Mesh(flapShortGeo, materials.wrapperSheetMat);
    rBotMesh.rotation.x = -Math.PI / 2;
    rBotMesh.position.set(-CANDY_H * 0.27, 0, 0);
    rBotMesh.renderOrder = 7;
    rearBotFlap.add(rBotMesh);

    const leftEar = new THREE.Group();
    leftEar.position.set(0, 0, CANDY_D / 2 + 0.001);
    group.add(leftEar);
    const lEarMesh = new THREE.Mesh(earGeo, materials.wrapperSheetMat);
    lEarMesh.renderOrder = 7;
    leftEar.add(lEarMesh);

    const rightEar = new THREE.Group();
    rightEar.position.set(0, 0, -CANDY_D / 2 - 0.001);
    group.add(rightEar);
    const rEarMesh = new THREE.Mesh(earGeo, materials.wrapperSheetMat);
    rEarMesh.renderOrder = 7;
    rightEar.add(rEarMesh);

    piecePool.push({
      group,
      frontSheet,
      topFlap,
      botFlap,
      rearTopFlap,
      rearBotFlap,
      leftEar,
      rightEar,
    });
  }

  // -------------------------------------------------------------------------
  // KINEMATICS SOLVER (Pure deterministic function of continuous theta)
  // -------------------------------------------------------------------------
  function solveBisectionFollower(
    loInit: number,
    hiInit: number,
    getCoords: (ang: number) => [number, number],
    theta: number,
    lut: Float32Array
  ): number {
    let lo = loInit;
    let hi = hiInit;
    const dLo = Math.hypot(
      getCoords(lo)[0] - CAM_X,
      getCoords(lo)[1] - CAM_Y
    );
    const dHi = Math.hypot(
      getCoords(hi)[0] - CAM_X,
      getCoords(hi)[1] - CAM_Y
    );
    const increasing = dHi > dLo;

    for (let iter = 0; iter < 14; iter++) {
      const mid = 0.5 * (lo + hi);
      const [rx, ry] = getCoords(mid);
      const dx = rx - CAM_X;
      const dy = ry - CAM_Y;
      const dist = Math.hypot(dx, dy);
      const worldAngle = Math.atan2(dy, dx);
      const localAngle = worldAngle + theta;
      const targetDist = samplePitchRadius(localAngle, lut);
      if (increasing) {
        if (dist < targetDist) lo = mid;
        else hi = mid;
      } else {
        if (dist < targetDist) hi = mid;
        else lo = mid;
      }
    }
    return 0.5 * (lo + hi);
  }

  function solveMechanism(theta: number) {
    const cycleIndex = Math.floor(theta / TWO_PI);
    const phase = theta - cycleIndex * TWO_PI;

    // 1. Rotate Master Camshaft, Cams & Spur Gear Train behind bulkhead
    cam1Mesh.rotation.z = -theta;
    cam2Mesh.rotation.z = -theta;
    cam3Mesh.rotation.z = -theta;
    barrelCam.rotation.z = -theta;
    gear2.rotation.z = -theta;
    gear1.rotation.z = 2.0 * theta + Math.PI / 16;

    // 2. Solve Cam 1 (Transfer Arm & Plunger) Rocker & Foreground Sweeping Arm
    const alpha1 = solveBisectionFollower(
      -0.25,
      0.25,
      (a) => [P1_X + L1_ARM * Math.cos(a), P1_Y + L1_ARM * Math.sin(a)],
      theta,
      cam1LUT
    );
    rocker1.rotation.z = alpha1;
    roller1.rotation.z = theta * (CAM_BASE_R / ROLLER_R);

    const plungerLift = getPlungerLiftNorm(phase);
    // Pivoting foreground transfer arm swings from cocked left (+0.16 rad) into 9:00 pincer (-0.09 rad)
    transferArmPivot.rotation.z = 0.16 - plungerLift * 0.25;

    const r1TipX = P1_X + L1_UP * Math.cos(Math.PI / 2 + alpha1);
    const r1TipY = P1_Y + L1_UP * Math.sin(Math.PI / 2 + alpha1);
    const targetArmX = STAGE_X + plungerLift * 0.08;
    plungerRod.position.set(r1TipX, r1TipY, CAM1_Z - 0.016);
    plungerRod.rotation.z = Math.atan2(LINE_Y - r1TipY, targetArmX - r1TipX);
    const pDist = Math.hypot(targetArmX - r1TipX, LINE_Y - r1TipY);
    plungerRod.scale.x = Math.max(0.2, pDist / PLUNGER_LINK_L);

    // 3. Solve Cam 2 (12:00 Overhead Plunger Arm & 1:30 End-Tuckers)
    const alpha2 = solveBisectionFollower(
      -0.25,
      0.25,
      (b) => [P2_X - L2_ARM * Math.cos(b), P2_Y + L2_ARM * Math.sin(b)],
      theta,
      cam2LUT
    );
    rocker2.rotation.z = -alpha2;
    roller2.rotation.z = theta * (CAM_BASE_R / ROLLER_R);

    const tuckerLift = getTuckerLiftNorm(phase);
    const r2PinX = P2_X - 0.09 * Math.cos(alpha2);
    const r2PinY = P2_Y + 0.09 * Math.sin(alpha2);
    tuckerPushrod.position.set(r2PinX, r2PinY, CAM2_Z - 0.01);
    tuckerPushrod.scale.y = 0.94 + tuckerLift * 0.14;

    // 12:00 Overhead Plunger Arm strokes down into 12:00 jaw entrance
    overheadPlungerPivot.rotation.z = 0.16 - tuckerLift * 0.24;
    overheadPlungerPivot.position.y = TURRET_Y + 0.292 - tuckerLift * 0.018;

    // 1:30 Front & Rear End-Tuckers close axially & BZW1807-125 slot pin tracks
    tuckerFront.position.z = LINE_Z + 0.056 - tuckerLift * 0.036;
    tuckerRear.position.z = LINE_Z - 0.056 + tuckerLift * 0.036;
    slotPinPivot.rotation.z = 0.42 + tuckerLift * 0.14;

    // 4. Solve Cam 3 (3:00 Reciprocating Horizontal Aluminum Ejector Carriage)
    const alpha3 = solveBisectionFollower(
      -0.25,
      0.25,
      (g) => [P3_X + L3_ARM * Math.sin(g), P3_Y + L3_ARM * Math.cos(g)],
      theta,
      cam3LUT
    );
    rocker3.rotation.z = -alpha3;
    roller3.rotation.z = theta * (CAM_BASE_R / ROLLER_R);

    const ejectorLift = getEjectorLiftNorm(phase);
    // Retracted right (+0.305) during turret index; shuttles left (+0.236) across 3:00 jaw
    ejectorCarriage.position.x = 0.305 - ejectorLift * 0.069;

    // 5. Turret 8-Station Intermittent Indexing & Active Split-Finger Pincer Jaws
    const indexNorm = getTurretIndexNorm(phase);
    const turretAngle = -(cycleIndex + indexNorm) * STATION_STEP;
    turretGroup.rotation.z = turretAngle;

    const clampCloseU = THREE.MathUtils.clamp(
      (phase - 175 * DEG2RAD) / (35 * DEG2RAD),
      0,
      1
    );
    const ejectOpenU =
      phase >= 115 * DEG2RAD && phase <= 220 * DEG2RAD
        ? getEjectorLiftNorm(phase)
        : 0;

    for (let i = 0; i < TURRET_STATIONS; i++) {
      const worldA = wrapAnglePi(i * STATION_STEP + turretAngle);
      let jawAngle = 0.03; // closed empty return (4:30..7:30)

      const distFrom9 = Math.abs(Math.abs(worldA) - Math.PI);
      const distFrom3 = Math.abs(worldA);

      if (distFrom9 < 0.36) {
        // 9:00 Load Station: open wide to receive candy, then clamp shut before index
        jawAngle = THREE.MathUtils.lerp(0.24, 0.095, clampCloseU);
      } else if (distFrom3 < 0.36) {
        // 3:00 Eject Station: release open as ejector clears piece, then close empty
        jawAngle = THREE.MathUtils.lerp(0.095, 0.22, ejectOpenU);
      } else if (worldA > 0.35 && worldA < Math.PI - 0.35) {
        // Upper wrapping arc (10:30, 12:00, 1:30): clamped firmly onto candy
        jawAngle = 0.095;
      }

      pincerStations[i].upperFinger.rotation.z = jawAngle;
      pincerStations[i].lowerFinger.rotation.z = -jawAngle;
    }

    // 6. Left Infeed: Candy Rope Feed & Vertical Reciprocating Cut-Off Shear Block
    const feedNorm = getFeedAdvanceNorm(phase);
    const ropeAdv = feedNorm * CANDY_L;
    const cutRad = 66 * DEG2RAD;

    const knifeLift = getKnifeCutNorm(phase);
    knifeBlockGroup.position.y = LINE_Y + 0.048 - knifeLift * 0.052;

    const tipPastCut = phase < cutRad ? ropeAdv : 0;
    candyRopeMesh.position.x = CUT_X - ROPE_LEN / 2 + tipPastCut;
    materials.candyRopeTex.offset.x = -(cycleIndex + feedNorm) * 0.35;

    sizingRollers.forEach(({ mesh, dir }) => {
      mesh.rotation.z = dir * (cycleIndex + feedNorm) * 2.2;
    });

    // 7. Top Dual-Reel Unwinder, Servo Paper Feed & Blank Shear
    const webAdvance = cycleIndex + feedNorm;
    reels[0].rotation.z = -webAdvance * 0.42;
    reels[1].rotation.z = -webAdvance * 0.42;
    guideRollers.forEach((r) => {
      r.rotation.z = -webAdvance * 1.4;
    });
    dancerPivot.rotation.z = -0.1 + plungerLift * 0.18;

    const pinchSpin = webAdvance * 2.8;
    pinchLeft.rotation.z = -pinchSpin;
    pinchRight.rotation.z = pinchSpin;
    materials.wrapperWebTex.offset.y = -webAdvance * 0.6;

    const shearLift = getPaperShearLiftNorm(phase);
    paperShearBlade.position.x = PAPER_X - 0.032 + shearLift * 0.038;

    const shearCutRad = 82 * DEG2RAD;
    if (phase < shearCutRad) {
      const tailLen = 0.015 + feedNorm * 0.105;
      webTail.visible = true;
      webTail.scale.y = tailLen;
      webTail.position.set(PAPER_X, 1.245 - tailLen / 2, LINE_Z);
      cutBlank.visible = false;
    } else {
      webTail.visible = false;
      cutBlank.visible = plungerLift < 0.48;
      cutBlank.scale.set(1, 1, 1);
    }

    // 8. Discharge Conveyor Belt UV Scroll
    materials.beltTex.offset.x = -(theta / TWO_PI) * 0.45;

    // 9. Update All 14 Candy & Articulated Die-Fold Wrapper Slots
    for (let s = 0; s < SLOT_COUNT; s++) {
      const slot = piecePool[s];
      const m = cycleIndex - s;

      let px = 0;
      let py = LINE_Y;
      let rotZ = 0;
      let visible = true;

      let showWrapper = false;
      let uFold = 0;
      let rearFold = 0;
      let earFold = 0;

      if (s === 0) {
        if (phase < cutRad) {
          visible = false;
        } else {
          const cutXCenter = CUT_X + CANDY_L / 2;
          const settleU = Math.min(1, (phase - cutRad) / (28 * DEG2RAD));
          const settledX = THREE.MathUtils.lerp(cutXCenter, STAGE_X, settleU);

          if (plungerLift <= 0.01) {
            px = settledX;
          } else {
            px = THREE.MathUtils.lerp(STAGE_X, TURRET_X - TURRET_R, plungerLift);
          }

          if (px > PAPER_X - 0.01) {
            showWrapper = true;
            uFold = THREE.MathUtils.clamp((px - (PAPER_X - 0.01)) / 0.055, 0, 1);
          }

          if (indexNorm > 0) {
            const worldA = Math.PI - indexNorm * STATION_STEP;
            px = TURRET_X + Math.cos(worldA) * TURRET_R;
            py = TURRET_Y + Math.sin(worldA) * TURRET_R;
            rotZ = worldA - Math.PI;
            showWrapper = true;
            uFold = 1;
          }
        }
      } else if (s === 1) {
        // Station 1 (10:30 -> 12:00): Clamped in pincer entering curved arc rail
        const worldA = Math.PI - (1 + indexNorm) * STATION_STEP;
        px = TURRET_X + Math.cos(worldA) * TURRET_R;
        py = TURRET_Y + Math.sin(worldA) * TURRET_R;
        rotZ = worldA - Math.PI;
        showWrapper = true;
        uFold = 1;
        rearFold = 0.45 + 0.35 * indexNorm;
      } else if (s === 2) {
        // Station 2 (12:00 -> 1:30): Overhead plunger arm creases seam flat into curved arc
        const worldA = Math.PI - (2 + indexNorm) * STATION_STEP;
        px = TURRET_X + Math.cos(worldA) * TURRET_R;
        py = TURRET_Y + Math.sin(worldA) * TURRET_R;
        rotZ = worldA - Math.PI;
        showWrapper = true;
        uFold = 1;
        rearFold = Math.max(0.8 + 0.2 * tuckerLift, indexNorm > 0 ? 1 : 0.8);
        earFold = 0.25 * indexNorm;
      } else if (s === 3) {
        // Station 3 (1:30 -> 3:00): Side Tuckers die-crease front & rear end ears flat
        const worldA = Math.PI - (3 + indexNorm) * STATION_STEP;
        px = TURRET_X + Math.cos(worldA) * TURRET_R;
        py = TURRET_Y + Math.sin(worldA) * TURRET_R;
        rotZ = worldA - Math.PI;
        showWrapper = true;
        uFold = 1;
        rearFold = 1;
        earFold = Math.max(0.25 + 0.75 * tuckerLift, indexNorm > 0 ? 1 : 0.25);
      } else if (s === 4) {
        // Station 4 (3:00 o'clock): Ejector finger pushes die-folded piece onto discharge belt
        const ejectStartX = TURRET_X + TURRET_R;
        if (phase < 120 * DEG2RAD) {
          px = ejectStartX;
        } else if (phase < 185 * DEG2RAD) {
          px = THREE.MathUtils.lerp(ejectStartX, BELT_START_X + 0.025, ejectorLift);
        } else {
          const postU = (phase - 185 * DEG2RAD) / (TWO_PI - 185 * DEG2RAD);
          px = THREE.MathUtils.lerp(BELT_START_X + 0.025, BELT_START_X + BELT_PITCH, postU);
        }
        py = LINE_Y;
        rotZ = 0;
        showWrapper = true;
        uFold = 1;
        rearFold = 1;
        earFold = 1;
      } else {
        // Single-file die-folded candies traveling along the right-hand conveyor belt
        const beltCycleOffset = s - 4 + phase / TWO_PI;
        px = BELT_START_X + beltCycleOffset * BELT_PITCH;
        if (px > BELT_END_X) {
          const dropU = Math.min(1, (px - BELT_END_X) / 0.12);
          py = LINE_Y - dropU * dropU * 0.22;
          rotZ = -dropU * 0.6;
          if (dropU >= 0.99) visible = false;
        } else {
          py = LINE_Y;
          rotZ = 0;
        }
        showWrapper = true;
        uFold = 1;
        rearFold = 1;
        earFold = 1;
      }

      if (m < 0) visible = false;

      slot.group.visible = visible;
      if (!visible) continue;

      slot.group.position.set(px, py, LINE_Z);
      slot.group.rotation.z = rotZ;

      slot.frontSheet.visible = showWrapper;
      slot.topFlap.visible = showWrapper;
      slot.botFlap.visible = showWrapper;
      slot.rearTopFlap.visible = showWrapper && uFold > 0.85;
      slot.rearBotFlap.visible = showWrapper && uFold > 0.85;
      slot.leftEar.visible = showWrapper && uFold > 0.5;
      slot.rightEar.visible = showWrapper && uFold > 0.5;

      if (showWrapper) {
        slot.topFlap.rotation.z = -(1 - uFold) * (Math.PI / 2);
        slot.botFlap.rotation.z = (1 - uFold) * (Math.PI / 2);

        slot.rearTopFlap.rotation.z = rearFold * (Math.PI / 2);
        slot.rearBotFlap.rotation.z = -rearFold * (Math.PI / 2);

        const earScale = 1 - earFold * 0.18;
        slot.leftEar.scale.set(earScale, earScale, 1);
        slot.rightEar.scale.set(earScale, earScale, 1);
        slot.leftEar.position.z = CANDY_D / 2 + 0.008 - earFold * 0.0065;
        slot.rightEar.position.z = -CANDY_D / 2 - 0.008 + earFold * 0.0065;
      }
    }
  }

  function setDoorOpenProgress(openNorm: number) {
    const clamped = Math.max(0, Math.min(1, openNorm));
    frontDoorPivot.rotation.y = -clamped * 1.88;
    rightDoorPivot.rotation.y = clamped * 1.82;
  }

  function setTowerPausedState(paused: boolean) {
    if (paused) {
      materials.towerGreenMat.emissiveIntensity = 0.06;
      materials.towerAmberMat.emissiveIntensity = 0.85;
    } else {
      materials.towerGreenMat.emissiveIntensity = 0.8;
      materials.towerAmberMat.emissiveIntensity = 0.08;
    }
  }

  return {
    root,
    materials,
    hmiTexture,
    solveMechanism,
    setDoorOpenProgress,
    setTowerPausedState,
    dispose: () => {
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      hmiTexture.dispose();
      turretCapTex.dispose();
      slottedArcTex.dispose();
      materials.dispose();
    },
  };
}
