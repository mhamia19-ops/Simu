import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { SimulationEngine } from './scene/SimulationEngine';
import {
  CameraPresetKey,
  HousingMode,
  TelemetrySnapshot,
} from './scene/types';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SimulationEngine | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [ppm, setPpm] = useState(120);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('full');
  const [housingMode, setHousingMode] = useState<HousingMode>('solid');
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    angleDeg: 0,
    phaseName: 'Rope & Web Feed',
    phaseProgress: 0,
    ppm: 120,
    totalCycles: 0,
  });

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SimulationEngine({
      container: mount,
      initialPpm: 120,
      initialPaused: false,
      onTelemetry: (snap) => setTelemetry(snap),
      onContextLost: (lost) => setContextLost(lost),
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      engineRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const handleStepFiveDeg = useCallback(() => {
    setIsPaused(true);
    engineRef.current?.stepDegrees(5);
  }, []);

  const handleChangePpm = useCallback((nextPpm: number) => {
    setPpm(nextPpm);
    engineRef.current?.setPpm(nextPpm);
  }, []);

  const handleSelectCamera = useCallback((preset: CameraPresetKey) => {
    setCameraPreset(preset);
    engineRef.current?.setCameraPreset(preset);
  }, []);

  const handleSelectHousing = useCallback((mode: HousingMode) => {
    setHousingMode(mode);
    engineRef.current?.setHousingMode(mode);
  }, []);

  const handleToggleDoors = useCallback(() => {
    setDoorsOpen((prev) => {
      const next = !prev;
      engineRef.current?.setDoorsOpen(next);
      return next;
    });
    setHousingMode((prevMode) => {
      if (prevMode === 'hidden') {
        engineRef.current?.setHousingMode('solid');
        return 'solid';
      }
      return prevMode;
    });
  }, []);

  const handleResetCycles = useCallback(() => {
    engineRef.current?.resetCycleCounter();
    setTelemetry((prev) => ({ ...prev, totalCycles: 0 }));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight' || e.key === '.') {
        e.preventDefault();
        handleStepFiveDeg();
      } else if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        handleToggleDoors();
      } else if (e.key === '1') {
        handleSelectCamera('full');
      } else if (e.key === '2') {
        handleSelectCamera('window');
      } else if (e.key === '3') {
        handleSelectCamera('turret');
      } else if (e.key === '4') {
        handleSelectCamera('timing');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleStepFiveDeg, handleSelectCamera, handleToggleDoors]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#dbe3ec] select-none">
      {/* Isolated WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {/* Minimal Top-Left Specification Header (Static, Zero Pulsing Dots, Zero Pills) */}
      <header className="fixed top-4 left-4 z-10 max-w-sm bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 shadow-lg pointer-events-auto">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h1 className="text-sm font-bold tracking-tight text-white">
            Chengdu Sanke BZW-1000
          </h1>
          <span
            className={`text-xs font-semibold whitespace-nowrap ${
              isPaused ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {isPaused ? 'Paused' : 'Running'}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          High-speed confectionery cut-and-wrap kinematic simulation · Reciprocating shear knife, servo film feed &amp; 8-station pincer turret.
        </p>
      </header>

      {/* WebGL Context Lost Fallback Overlay */}
      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-6">
          <div className="max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">
              3D Graphics Context Suspended
            </h2>
            <p className="text-sm text-slate-400">
              WebGL rendering was temporarily interrupted by the browser. Reload the page if the viewport does not automatically resume.
            </p>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <ControlDock
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
        isPaused={isPaused}
        onTogglePlay={handleTogglePlay}
        onStepFiveDeg={handleStepFiveDeg}
        ppm={ppm}
        onChangePpm={handleChangePpm}
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
        housingMode={housingMode}
        onSelectHousing={handleSelectHousing}
        doorsOpen={doorsOpen}
        onToggleDoors={handleToggleDoors}
        onResetCycles={handleResetCycles}
        telemetry={telemetry}
      />
    </div>
  );
}
