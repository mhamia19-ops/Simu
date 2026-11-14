import {
  ChevronDown,
  ChevronUp,
  DoorClosed,
  DoorOpen,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from 'lucide-react';
import { CameraPresetKey, HousingMode, TelemetrySnapshot } from '../scene/types';

interface ControlDockProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isPaused: boolean;
  onTogglePlay: () => void;
  onStepFiveDeg: () => void;
  ppm: number;
  onChangePpm: (ppm: number) => void;
  cameraPreset: CameraPresetKey;
  onSelectCamera: (preset: CameraPresetKey) => void;
  housingMode: HousingMode;
  onSelectHousing: (mode: HousingMode) => void;
  doorsOpen: boolean;
  onToggleDoors: () => void;
  onResetCycles: () => void;
  telemetry: TelemetrySnapshot;
}

const CAMERA_OPTIONS: { key: CameraPresetKey; label: string }[] = [
  { key: 'full', label: 'Full Machine' },
  { key: 'window', label: 'Cam & Linkage Window' },
  { key: 'turret', label: 'Turret Folding Head' },
  { key: 'timing', label: 'Paper & Knife Timing' },
];

const HOUSING_OPTIONS: { key: HousingMode; label: string }[] = [
  { key: 'solid', label: 'Solid' },
  { key: 'xray', label: 'X-Ray' },
  { key: 'hidden', label: 'Hidden' },
];

const COMPONENT_LEGEND = [
  { label: 'Rotating Cams', swatch: 'bg-amber-400' },
  { label: 'Followers & Linkages', swatch: 'bg-cyan-400' },
  { label: 'Candy Rope / Pieces', swatch: 'bg-rose-400' },
  { label: 'Wrapper Film', swatch: 'bg-sky-200' },
];

export function ControlDock({
  isCollapsed,
  onToggleCollapse,
  isPaused,
  onTogglePlay,
  onStepFiveDeg,
  ppm,
  onChangePpm,
  cameraPreset,
  onSelectCamera,
  housingMode,
  onSelectHousing,
  doorsOpen,
  onToggleDoors,
  onResetCycles,
  telemetry,
}: ControlDockProps) {
  return (
    <div
      className={`fixed bottom-4 left-1/2 z-20 w-[min(1040px,96vw)] -translate-x-1/2 transition-transform duration-300 ease-out pointer-events-none ${
        isCollapsed ? 'translate-y-[calc(100%+16px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Handle Tab */}
      <div className="flex justify-center mb-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Show Controls' : 'Hide Controls'}
          className={`pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-t-lg text-xs font-medium text-slate-200 bg-slate-900/95 border border-slate-700/80 shadow-lg hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0 cursor-pointer ${
            isCollapsed ? '-translate-y-4 rounded-b-lg' : ''
          }`}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container (No backdrop-blur over WebGL) */}
      <div className="pointer-events-auto bg-slate-950/92 border border-slate-800 rounded-2xl shadow-2xl px-4 py-3 text-slate-100">
        {/* Top Row: Live Telemetry, Phase Bar & Color-Coded Component Legend */}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 pb-2.5 mb-2.5 border-b border-slate-800/90">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-slate-400">Output</span>
              <span className="font-mono-tabular text-base font-semibold text-white">
                {telemetry.ppm}
              </span>
              <span className="text-xs font-medium text-sky-400">PPM</span>
            </div>

            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Pieces</span>
              <span className="font-mono-tabular text-base font-semibold text-white">
                {telemetry.totalCycles}
              </span>
              <button
                type="button"
                onClick={onResetCycles}
                title="Reset Piece Counter"
                aria-label="Reset Piece Counter"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cam Angle & Active Phase Bar */}
          <div className="flex items-center gap-3 flex-1 min-w-[230px] max-w-sm">
            <div className="flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
              <span className="text-slate-400">Shaft</span>
              <span className="font-mono-tabular font-semibold text-white w-9 text-right">
                {telemetry.angleDeg}°
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-sky-400 w-36 truncate">
                {telemetry.phaseName}
              </span>
            </div>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-cyan-400 to-rose-400 rounded-full"
                style={{ width: `${Math.round(telemetry.phaseProgress * 100)}%` }}
              />
            </div>
          </div>

          {/* Color-Coded Component Legend (Clean inline text + static swatch, zero pills) */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-300">
            {COMPONENT_LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className={`w-2.5 h-2.5 rounded-xs ${item.swatch}`} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Row: Play/Pause, +5° Step, 0–1,000 PPM Speed, Camera Presets, Housing Visibility */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer ${
                isPaused
                  ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                  : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onStepFiveDeg}
              title="Advance Master Camshaft +5°"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
            >
              <StepForward className="w-3.5 h-3.5 text-amber-400" />
              <span>+5° Step</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              <label
                htmlFor="ppm-slider"
                className="text-xs font-medium text-slate-300 whitespace-nowrap"
              >
                Speed
              </label>
              <input
                id="ppm-slider"
                type="range"
                min={0}
                max={1000}
                step={5}
                value={ppm}
                onChange={(e) => onChangePpm(Number(e.target.value))}
                className="sim-range w-24 sm:w-28"
              />
              <span className="font-mono-tabular text-xs font-semibold text-sky-400 w-16 text-right whitespace-nowrap">
                {ppm} PPM
              </span>
            </div>
          </div>

          {/* Camera Presets */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto"
            role="group"
            aria-label="Camera Presets"
          >
            {CAMERA_OPTIONS.map((cam) => {
              const active = cameraPreset === cam.key;
              return (
                <button
                  key={cam.key}
                  type="button"
                  onClick={() => onSelectCamera(cam.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cam.label}
                </button>
              );
            })}
          </div>

          {/* Doors & Housing Visibility Mode */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDoors}
              aria-pressed={doorsOpen}
              title="Open or close front cabinet doors (D)"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                doorsOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300'
                  : 'bg-slate-900/90 text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {doorsOpen ? (
                <>
                  <DoorClosed className="w-3.5 h-3.5" />
                  <span>Close Doors</span>
                </>
              ) : (
                <>
                  <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Doors</span>
                </>
              )}
            </button>

            <div
              className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl"
              role="group"
              aria-label="Housing Visibility"
            >
              {HOUSING_OPTIONS.map((opt) => {
                const active = housingMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onSelectHousing(opt.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      active
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
