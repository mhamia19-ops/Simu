import * as THREE from 'three';
import {
  CAM_BASE_R,
  CAM_LIFT,
  ROLLER_R,
  TURRET_R,
  TWO_PI,
} from './kinematics';

export function createGearGeometry(
  teeth: number,
  pitchRadius: number,
  thickness: number,
  boreRadius: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const addendum = ((pitchRadius * 2.0) / teeth) * 0.9;
  const dedendum = addendum * 1.15;
  const rOuter = pitchRadius + addendum;
  const rRoot = pitchRadius - dedendum;
  const step = TWO_PI / teeth;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.18;
    const a2 = a0 + step * 0.32;
    const a3 = a0 + step * 0.68;
    const a4 = a0 + step * 0.82;

    const p0x = Math.cos(a0) * rRoot;
    const p0y = Math.sin(a0) * rRoot;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * rRoot, Math.sin(a1) * rRoot);
    shape.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
    shape.lineTo(Math.cos(a3) * rOuter, Math.sin(a3) * rOuter);
    shape.lineTo(Math.cos(a4) * rRoot, Math.sin(a4) * rRoot);
  }
  shape.closePath();

  if (boreRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, boreRadius, 0, TWO_PI, true);
    shape.holes.push(hole);
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0015,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

export function buildCamWithLUT(
  liftFn: (phi: number) => number,
  angleOffsetRad: number,
  thickness: number,
  pitchSamples = 720
): { geometry: THREE.ExtrudeGeometry; pitchRadiusLUT: Float32Array } {
  const N = 360;
  const radiusAt = (phi: number) =>
    CAM_BASE_R + CAM_LIFT * liftFn(phi - angleOffsetRad);

  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const phi = (i / N) * TWO_PI;
    const r = radiusAt(phi);
    pts.push(new THREE.Vector2(Math.cos(phi) * r, Math.sin(phi) * r));
  }

  const pitchRadiusLUT = new Float32Array(pitchSamples);
  for (let i = 0; i < pitchSamples; i++) {
    const phi = (i / pitchSamples) * TWO_PI;
    const eps = 0.004;
    const r1 = radiusAt(phi - eps);
    const r2 = radiusAt(phi + eps);
    const r = radiusAt(phi);
    const dr = (r2 - r1) / (2 * eps);

    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    const dx = dr * Math.cos(phi) - r * Math.sin(phi);
    const dy = dr * Math.sin(phi) + r * Math.cos(phi);
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const px = x + ROLLER_R * nx;
    const py = y + ROLLER_R * ny;
    pitchRadiusLUT[i] = Math.hypot(px, py);
  }

  const shape = new THREE.Shape(pts);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.015, 0, TWO_PI, true);
  shape.holes.push(bore);

  for (let k = 0; k < 3; k++) {
    const ha = k * (TWO_PI / 3) + 0.35;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(ha) * 0.038, Math.sin(ha) * 0.038, 0.009, 0, TWO_PI, true);
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0015,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, -thickness / 2);
  return { geometry, pitchRadiusLUT };
}

/**
 * Thick machined split-finger pincer jaw half (mirrored upper/lower per radial station)
 * extending directly out from beneath the 8-nut turret ring with a stepped candy-gripping notch.
 */
export function createPincerJawHalfGeometry(side: 1 | -1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (side === 1) {
    shape.moveTo(-0.006, 0.002);
    shape.lineTo(0.050, 0.003);
    shape.lineTo(0.052, 0.0115);
    shape.lineTo(0.068, 0.0115);
    shape.lineTo(0.070, 0.0065);
    shape.lineTo(0.077, 0.0065);
    shape.lineTo(0.077, 0.0175);
    shape.lineTo(0.055, 0.0215);
    shape.lineTo(-0.006, 0.028);
  } else {
    shape.moveTo(-0.006, -0.002);
    shape.lineTo(-0.006, -0.028);
    shape.lineTo(0.055, -0.0215);
    shape.lineTo(0.077, -0.0175);
    shape.lineTo(0.077, -0.0065);
    shape.lineTo(0.070, -0.0065);
    shape.lineTo(0.068, -0.0115);
    shape.lineTo(0.052, -0.0115);
    shape.lineTo(0.050, -0.003);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.0016,
    bevelSize: 0.0012,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.016);
  return geo;
}

/**
 * Bright machined steel inner tip wear pad on each pincer jaw half.
 */
export function createPincerTipPadGeometry(side: 1 | -1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  if (side === 1) {
    shape.moveTo(0.052, 0.0115);
    shape.lineTo(0.068, 0.0115);
    shape.lineTo(0.070, 0.0065);
    shape.lineTo(0.077, 0.0065);
    shape.lineTo(0.077, 0.0145);
    shape.lineTo(0.052, 0.0155);
  } else {
    shape.moveTo(0.052, -0.0115);
    shape.lineTo(0.052, -0.0155);
    shape.lineTo(0.077, -0.0145);
    shape.lineTo(0.077, -0.0065);
    shape.lineTo(0.070, -0.0065);
    shape.lineTo(0.068, -0.0115);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.034,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.0008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.017);
  return geo;
}

/**
 * Brushed aluminum slotted outer folding arc plate (12:00 -> 3:00)
 * matching the exact top horizontal nose tab, circular bore, and curved slot in the video.
 */
export function createSlottedFoldingArcGeometry(): THREE.ExtrudeGeometry {
  const rIn = TURRET_R - 0.006; // 0.146 (overlaps front of jaw tips just like video)
  const shape = new THREE.Shape();

  shape.moveTo(-0.016, rIn);
  shape.lineTo(-0.016, 0.180);
  shape.lineTo(0.058, 0.180);
  shape.lineTo(0.095, 0.194);
  shape.lineTo(0.158, 0.172);
  shape.lineTo(0.214, 0.112);
  shape.lineTo(0.228, 0.042);
  shape.lineTo(0.230, -0.004);
  shape.lineTo(rIn, -0.004);
  shape.absarc(0, 0, rIn, -0.025, 1.68, false);
  shape.closePath();

  // Round dowel/alignment hole at ~38 deg
  const pinHole = new THREE.Path();
  pinHole.absarc(Math.cos(0.66) * 0.176, Math.sin(0.66) * 0.176, 0.0042, 0, TWO_PI, true);
  shape.holes.push(pinHole);

  // Elongated curved adjustment slot
  const slotR1 = 0.194;
  const slotR2 = 0.201;
  const slotHole = new THREE.Path();
  slotHole.absarc(0, 0, slotR2, 0.14, 0.92, false);
  slotHole.absarc(0, 0, slotR1, 0.92, 0.14, true);
  slotHole.closePath();
  shape.holes.push(slotHole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.011,
    bevelEnabled: true,
    bevelThickness: 0.0014,
    bevelSize: 0.001,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.0055);
  return geo;
}

/**
 * Dark machined inner curved guide track (10:00 -> 1:30) cradling wrapped candy outer face.
 */
export function createInnerFoldingShoeGeometry(): THREE.ExtrudeGeometry {
  const rIn = TURRET_R + 0.021;
  const rOut = TURRET_R + 0.036;
  const aStart = 0.72;
  const aEnd = 2.75;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, aStart, aEnd, false);
  shape.absarc(0, 0, rIn, aEnd, aStart, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.001,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.013);
  return geo;
}

/**
 * Sleek curved stainless wrapper crescent chute between the left knife block and 9:00 jaw.
 */
export function createLeftCrescentGuideGeometry(): THREE.ExtrudeGeometry {
  const rIn = TURRET_R + 0.024;
  const rOut = TURRET_R + 0.033;
  const aStart = 2.38;
  const aEnd = 3.20;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, aStart, aEnd, false);
  shape.absarc(0, 0, rIn, aEnd, aStart, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.038,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.0008,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.019);
  return geo;
}

/**
 * Long tapered foreground sweeping transfer arm beam with lower bore hole (matching video).
 */
export function createTransferArmBeamGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.024, 0.0);
  shape.lineTo(0.024, 0.0);
  shape.lineTo(0.011, 0.455);
  shape.lineTo(-0.010, 0.455);
  shape.closePath();

  const bore = new THREE.Path();
  bore.absarc(0.004, 0.058, 0.011, 0, TWO_PI, true);
  shape.holes.push(bore);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0016,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -0.009);
  return geo;
}

/**
 * Partial dark toothed ratchet/gear arc visible behind the upper-right slotted arc plate.
 */
export function createCurvedRatchetSegmentGeometry(): THREE.ExtrudeGeometry {
  const rBase = 0.214;
  const rTip = 0.226;
  const rIn = 0.194;
  const teeth = 16;
  const aStart = 0.12;
  const aEnd = 0.88;
  const step = (aEnd - aStart) / teeth;

  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(aStart) * rIn, Math.sin(aStart) * rIn);
  for (let i = 0; i < teeth; i++) {
    const a0 = aStart + i * step;
    const a1 = a0 + step * 0.45;
    const a2 = a0 + step * 0.85;
    shape.lineTo(Math.cos(a0) * rBase, Math.sin(a0) * rBase);
    shape.lineTo(Math.cos(a1) * rTip, Math.sin(a1) * rTip);
    shape.lineTo(Math.cos(a2) * rBase, Math.sin(a2) * rBase);
  }
  shape.absarc(0, 0, rIn, aEnd, aStart, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.010,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -0.005);
  return geo;
}

export function createFrontDoorGeometry(): THREE.ExtrudeGeometry {
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-0.46, 0.2);
  doorShape.lineTo(0.24, 0.2);
  doorShape.lineTo(0.24, 1.44);
  doorShape.lineTo(-0.46, 1.44);
  doorShape.closePath();

  const winHole = new THREE.Path();
  winHole.moveTo(-0.28, 0.72);
  winHole.lineTo(-0.28, 1.38);
  winHole.lineTo(0.22, 1.38);
  winHole.lineTo(0.22, 0.72);
  winHole.closePath();
  doorShape.holes.push(winHole);

  return new THREE.ExtrudeGeometry(doorShape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
}

export function createOvalHousingGeometry(): THREE.ExtrudeGeometry {
  const ovalShape = new THREE.Shape();
  ovalShape.absarc(-0.08, 0, 0.12, Math.PI * 0.5, Math.PI * 1.5, false);
  ovalShape.absarc(0.08, 0, 0.12, -Math.PI * 0.5, Math.PI * 0.5, false);
  ovalShape.closePath();
  return new THREE.ExtrudeGeometry(ovalShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.004,
  });
}
