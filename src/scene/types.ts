export type CameraPresetKey = 'full' | 'window' | 'turret' | 'timing';

export type HousingMode = 'solid' | 'xray' | 'hidden';

export interface TelemetrySnapshot {
  angleDeg: number;
  phaseName: string;
  phaseProgress: number;
  ppm: number;
  totalCycles: number;
}
