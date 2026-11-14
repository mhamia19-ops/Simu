import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEG2RAD, getPhaseLabel, TWO_PI } from './kinematics';
import { createMachineAssembly, MachineAssembly } from './machineAssembly';
import { createContactShadowTexture } from './textures';
import { CameraPresetKey, HousingMode, TelemetrySnapshot } from './types';

// Reusable module-scope math helpers (Zero GC in render loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  full: { pos: [1.65, 1.88, 3.35], target: [-0.02, 1.24, 0.08] },
  window: { pos: [0.06, 1.08, 1.25], target: [-0.02, 1.08, 0.14] },
  turret: { pos: [0.10, 1.22, 0.82], target: [0.025, 1.15, 0.16] },
  timing: { pos: [-0.26, 1.22, 0.96], target: [-0.22, 1.14, 0.16] },
};

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface SimulationEngineOptions {
  container: HTMLElement;
  initialPpm: number;
  initialPaused: boolean;
  onTelemetry: (snapshot: TelemetrySnapshot) => void;
  onContextLost: (lost: boolean) => void;
}

export class SimulationEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private machine: MachineAssembly;
  private envRenderTarget: THREE.WebGLRenderTarget;
  private contactShadowTex: THREE.CanvasTexture;
  private staticGeometries: THREE.BufferGeometry[] = [];
  private staticMaterials: THREE.Material[] = [];

  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private lastTimestamp = 0;

  private ppm: number;
  private isPaused: boolean;
  private doorsOpen = false;
  private doorOpenProgress = 0;
  // Pre-seed 10 cycles so all 8-station turret pockets and discharge belt are populated immediately
  private masterTheta = 10 * TWO_PI;
  private totalCycles = 0;
  private lastHmiUpdate = 0;
  private lastUiTelemetryUpdate = 0;

  private activePresetTransition = false;
  private onTelemetry: (snapshot: TelemetrySnapshot) => void;
  private onContextLost: (lost: boolean) => void;

  constructor(options: SimulationEngineOptions) {
    this.container = options.container;
    this.ppm = options.initialPpm;
    this.isPaused = options.initialPaused;
    this.onTelemetry = options.onTelemetry;
    this.onContextLost = options.onContextLost;

    this.isSoftwareGl = detectSoftwareWebGL();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdbe3ec);
    this.scene.fog = new THREE.Fog(0xdbe3ec, 7.5, 18);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
    this.camera.position.set(...CAMERA_PRESETS.full.pos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(...CAMERA_PRESETS.full.target);
    this.controls.minDistance = 0.45;
    this.controls.maxDistance = 8.5;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.addEventListener('start', this.handleControlsStart);

    // Three-point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x64748b, 0.6);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.0);
    keyLight.position.set(3.2, 5.2, 4.0);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 14.0;
    const d = 2.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.32);
    fillLight.position.set(-4.0, 2.8, 2.5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.36);
    rimLight.position.set(-1.5, 4.0, -4.5);
    this.scene.add(rimLight);

    // Workshop Floor, Grounded Contact Shadow & Technical Grid
    const floorGeo = new THREE.PlaneGeometry(28, 28);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.staticGeometries.push(floorGeo);
    this.staticMaterials.push(floorMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.contactShadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(2.3, 1.8);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.staticGeometries.push(shadowPlaneGeo);
    this.staticMaterials.push(shadowPlaneMat);
    const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.004, 0.05);
    this.scene.add(contactShadow);

    const grid = new THREE.GridHelper(14, 28, 0x94a3b8, 0xb6c2cf);
    grid.position.y = 0.002;
    const gridMat = grid.material as THREE.Material;
    gridMat.opacity = 0.45;
    gridMat.transparent = true;
    this.staticGeometries.push(grid.geometry);
    this.staticMaterials.push(gridMat);
    this.scene.add(grid);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.machine = createMachineAssembly(maxAniso);
    this.machine.solveMechanism(this.masterTheta);
    this.machine.setTowerPausedState(this.isPaused);
    this.scene.add(this.machine.root);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleWebGLContextLost
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleWebGLContextRestored
    );
    window.addEventListener('resize', this.handleResize);

    this.lastTimestamp = performance.now();
    this.tick();
  }

  private handleControlsStart = () => {
    this.activePresetTransition = false;
  };

  private handleWebGLContextLost = (event: Event) => {
    event.preventDefault();
    this.onContextLost(true);
  };

  private handleWebGLContextRestored = () => {
    this.onContextLost(false);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setPpm(ppm: number) {
    this.ppm = ppm;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    this.machine.setTowerPausedState(paused);
    this.pushHmiAndTelemetry();
  }

  public stepDegrees(deltaDeg: number) {
    this.isPaused = true;
    this.machine.setTowerPausedState(true);
    const prevCycle = Math.floor(this.masterTheta / TWO_PI);
    this.masterTheta += deltaDeg * DEG2RAD;
    const nextCycle = Math.floor(this.masterTheta / TWO_PI);
    if (nextCycle > prevCycle) {
      this.totalCycles += nextCycle - prevCycle;
    }
    this.machine.solveMechanism(this.masterTheta);
    this.pushHmiAndTelemetry();
  }

  public setHousingMode(mode: HousingMode) {
    this.machine.materials.applyHousingMode(mode);
  }

  public setDoorsOpen(open: boolean) {
    this.doorsOpen = open;
  }

  public setCameraPreset(presetKey: CameraPresetKey) {
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;
    _camGoalPos.set(...preset.pos);
    _camGoalTarget.set(...preset.target);
    this.activePresetTransition = true;
  }

  public resetCycleCounter() {
    this.totalCycles = 0;
    this.pushHmiAndTelemetry();
  }

  private pushHmiAndTelemetry() {
    const currentPhase = ((this.masterTheta % TWO_PI) + TWO_PI) % TWO_PI;
    const deg = (currentPhase * 180) / Math.PI;
    this.machine.hmiTexture.redraw(
      this.isPaused ? 0 : this.ppm,
      this.isPaused,
      this.totalCycles,
      deg
    );
    this.onTelemetry({
      angleDeg: Math.round(deg),
      phaseName: getPhaseLabel(currentPhase),
      phaseProgress: currentPhase / TWO_PI,
      ppm: this.isPaused ? 0 : Math.round(this.ppm),
      totalCycles: this.totalCycles,
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = now;

    if (this.activePresetTransition) {
      const lambda = 6.0;
      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        _camGoalPos.x,
        lambda,
        dt
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        _camGoalPos.y,
        lambda,
        dt
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        _camGoalPos.z,
        lambda,
        dt
      );

      this.controls.target.x = THREE.MathUtils.damp(
        this.controls.target.x,
        _camGoalTarget.x,
        lambda,
        dt
      );
      this.controls.target.y = THREE.MathUtils.damp(
        this.controls.target.y,
        _camGoalTarget.y,
        lambda,
        dt
      );
      this.controls.target.z = THREE.MathUtils.damp(
        this.controls.target.z,
        _camGoalTarget.z,
        lambda,
        dt
      );

      if (
        this.camera.position.distanceTo(_camGoalPos) < 0.008 &&
        this.controls.target.distanceTo(_camGoalTarget) < 0.008
      ) {
        this.camera.position.copy(_camGoalPos);
        this.controls.target.copy(_camGoalTarget);
        this.activePresetTransition = false;
      }
    }

    if (!this.isPaused && this.ppm > 0) {
      const prevCycle = Math.floor(this.masterTheta / TWO_PI);
      // 1 cycle = 1 piece -> radPerSec = (ppm * 2π) / 60
      const radPerSec = (this.ppm * TWO_PI) / 60;
      this.masterTheta += radPerSec * dt;
      const nextCycle = Math.floor(this.masterTheta / TWO_PI);
      if (nextCycle > prevCycle) {
        this.totalCycles += nextCycle - prevCycle;
      }
    }

    const currentPhase = ((this.masterTheta % TWO_PI) + TWO_PI) % TWO_PI;

    // Smooth exponential damping for hinged cabinet doors
    const targetDoor = this.doorsOpen ? 1 : 0;
    if (Math.abs(this.doorOpenProgress - targetDoor) > 0.0005) {
      this.doorOpenProgress = THREE.MathUtils.damp(
        this.doorOpenProgress,
        targetDoor,
        7.5,
        dt
      );
      this.machine.setDoorOpenProgress(this.doorOpenProgress);
    } else if (this.doorOpenProgress !== targetDoor) {
      this.doorOpenProgress = targetDoor;
      this.machine.setDoorOpenProgress(this.doorOpenProgress);
    }

    this.machine.solveMechanism(this.masterTheta);

    const deg = (currentPhase * 180) / Math.PI;

    if (now - this.lastHmiUpdate > 120) {
      this.machine.hmiTexture.redraw(
        this.isPaused ? 0 : this.ppm,
        this.isPaused,
        this.totalCycles,
        deg
      );
      this.lastHmiUpdate = now;
    }

    if (now - this.lastUiTelemetryUpdate > 50) {
      this.onTelemetry({
        angleDeg: Math.round(deg),
        phaseName: getPhaseLabel(currentPhase),
        phaseProgress: currentPhase / TWO_PI,
        ppm: this.isPaused ? 0 : Math.round(this.ppm),
        totalCycles: this.totalCycles,
      });
      this.lastUiTelemetryUpdate = now;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    this.controls.removeEventListener('start', this.handleControlsStart);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleWebGLContextLost
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleWebGLContextRestored
    );

    this.controls.dispose();
    this.machine.dispose();
    this.envRenderTarget.dispose();
    this.contactShadowTex.dispose();
    this.staticGeometries.forEach((g) => g.dispose());
    this.staticMaterials.forEach((m) => m.dispose());
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
