export const TWO_PI = Math.PI * 2;
export const DEG2RAD = Math.PI / 180;

// Master camshaft geometry constants (positioned behind internal bulkhead wall)
export const CAM_X = -0.02;
export const CAM_Y = 0.85;
export const CAM_BASE_R = 0.062;
export const CAM_LIFT = 0.030;
export const ROLLER_R = 0.015;

// Cam 1: Pivoting Transfer Arm & Plunger (bottom-left rocker riding 6 o'clock lobe)
export const P1_X = -0.17;
export const P1_Y = 0.76;
export const L1_ARM = 0.15;
export const CAM1_Z = 0.01;

// Cam 2: Overhead 12:00 Folding Arm & 1:30 End-Tuckers (top-right rocker riding 12 o'clock lobe)
export const P2_X = 0.13;
export const P2_Y = 0.94;
export const L2_ARM = 0.15;
export const CAM2_Z = -0.04;

// Cam 3: Ejector Finger (right-side vertical rocker riding 3 o'clock lobe)
export const P3_X = 0.07;
export const P3_Y = 0.70;
export const L3_ARM = 0.15;
export const CAM3_Z = -0.09;

// 8-Station Wrapping Turret & Product Flow Coordinates
export const TURRET_STATIONS = 8;
export const STATION_STEP = TWO_PI / TURRET_STATIONS; // 45 deg per cycle

export const LINE_Y = 1.15;
export const LINE_Z = 0.16;

export const CUT_X = -0.285;
export const STAGE_X = -0.21;
export const PAPER_X = -0.158;

export const TURRET_X = 0.025;
export const TURRET_Y = 1.15;
export const TURRET_R = 0.152;

export const BELT_START_X = 0.34;
export const BELT_END_X = 1.28;
export const BELT_PITCH = 0.14;

export const CANDY_L = 0.042;
export const CANDY_H = 0.022;
export const CANDY_D = 0.028;

function smoothstep01(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return 0.5 * (1 - Math.cos(Math.PI * c));
}

function dwellRiseDwellReturn(
  phi: number,
  riseStart: number,
  riseEnd: number,
  retStart: number,
  retEnd: number
): number {
  const p = ((phi % TWO_PI) + TWO_PI) % TWO_PI;
  if (p < riseStart) return 0;
  if (p < riseEnd) return smoothstep01((p - riseStart) / (riseEnd - riseStart));
  if (p < retStart) return 1;
  if (p < retEnd) return 1 - smoothstep01((p - retStart) / (retEnd - retStart));
  return 0;
}

/**
 * Vertical Reciprocating Cut-Off Knife Block stroke (0 = raised, 1 = down cut).
 * Strokes downward across candy rope at CUT_X between 50 deg and 95 deg.
 */
export function getKnifeCutNorm(theta: number): number {
  return dwellRiseDwellReturn(
    theta,
    46 * DEG2RAD,
    66 * DEG2RAD,
    72 * DEG2RAD,
    98 * DEG2RAD
  );
}

/**
 * Cam 1: Pivoting Transfer Arm & Plunger lift (0..1).
 * Sweeps candy + cut wrapper blank into open 9:00 pincer jaws during turret dwell.
 */
export function getPlungerLiftNorm(theta: number): number {
  return dwellRiseDwellReturn(
    theta,
    100 * DEG2RAD,
    175 * DEG2RAD,
    190 * DEG2RAD,
    230 * DEG2RAD
  );
}

/**
 * Cam 2: 12:00 Overhead Folding Plunger Arm & 1:30 End-Tuckers lift (0..1).
 * Plunges down at 12:00 and creases end-folds at 1:30 while turret is locked.
 */
export function getTuckerLiftNorm(theta: number): number {
  return dwellRiseDwellReturn(
    theta,
    115 * DEG2RAD,
    165 * DEG2RAD,
    185 * DEG2RAD,
    225 * DEG2RAD
  );
}

/**
 * Cam 3: 3:00 Ejector Finger lift (0..1).
 * Pushes finished die-folded candy out of 3:00 pincer onto discharge belt.
 */
export function getEjectorLiftNorm(theta: number): number {
  return dwellRiseDwellReturn(
    theta,
    120 * DEG2RAD,
    180 * DEG2RAD,
    195 * DEG2RAD,
    230 * DEG2RAD
  );
}

/**
 * Paper Shear Blade actuation (0..1).
 */
export function getPaperShearLiftNorm(theta: number): number {
  return dwellRiseDwellReturn(
    theta,
    78 * DEG2RAD,
    92 * DEG2RAD,
    94 * DEG2RAD,
    112 * DEG2RAD
  );
}

/**
 * Turret 8-station intermittent indexing curve (0..1 per cycle -> 45 deg per cycle).
 */
export function getTurretIndexNorm(theta: number): number {
  const p = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
  const start = 235 * DEG2RAD;
  const end = 345 * DEG2RAD;
  if (p <= start) return 0;
  if (p >= end) return 1;
  const u = (p - start) / (end - start);
  return u - Math.sin(TWO_PI * u) / TWO_PI;
}

/**
 * Continuous candy rope and servo paper feed curve (0..1 per cycle).
 */
export function getFeedAdvanceNorm(theta: number): number {
  const p = ((theta % TWO_PI) + TWO_PI) % TWO_PI;
  const start = 0;
  const end = 52 * DEG2RAD;
  if (p <= start) return 0;
  if (p >= end) return 1;
  return smoothstep01((p - start) / (end - start));
}

export function getPhaseLabel(rad: number): string {
  const deg = ((((rad % TWO_PI) + TWO_PI) % TWO_PI) * 180) / Math.PI;
  if (deg < 50) return 'Rope & Web Feed';
  if (deg < 100) return 'Vertical Shear Cut';
  if (deg < 185) return 'Arm Sweep & 12:00 Fold';
  if (deg < 235) return 'Pincer Clamp & Dwell';
  if (deg < 345) return 'Turret Index (45°)';
  return 'Station Lock';
}

export function samplePitchRadius(
  localAngle: number,
  pitchRadiusLUT: Float32Array
): number {
  const a = ((localAngle % TWO_PI) + TWO_PI) % TWO_PI;
  const count = pitchRadiusLUT.length;
  const fIdx = (a / TWO_PI) * count;
  const i0 = Math.floor(fIdx) % count;
  const i1 = (i0 + 1) % count;
  const t = fIdx - Math.floor(fIdx);
  return pitchRadiusLUT[i0] * (1 - t) + pitchRadiusLUT[i1] * t;
}
