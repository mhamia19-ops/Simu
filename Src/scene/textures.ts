import * as THREE from 'three';
import {
  getEjectorLiftNorm,
  getPlungerLiftNorm,
  getTuckerLiftNorm,
} from './kinematics';

export interface HMITextureHandle {
  texture: THREE.CanvasTexture;
  redraw: (ppm: number, paused: boolean, cycles: number, deg: number) => void;
  dispose: () => void;
}

export function createHMITexture(maxAnisotropy: number): HMITextureHandle {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  function redraw(ppm: number, paused: boolean, cycles: number, deg: number) {
    ctx.fillStyle = '#e7e2d0';
    ctx.fillRect(0, 0, 512, 384);

    ctx.strokeStyle = '#c5bfb0';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 368);

    ctx.fillStyle = '#d93829';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SK', 28, 42);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('-BZW1000', 56, 42);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(24, 60, 260, 210);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(34, 70, 240, 190);

    ctx.fillStyle = paused ? '#f59e0b' : '#10b981';
    ctx.fillRect(42, 78, 224, 24);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(
      paused ? 'MODE: JOG / STANDBY' : 'MODE: AUTO CUT & WRAP',
      50,
      95
    );

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`SPEED : ${String(Math.round(ppm)).padStart(4, ' ')} PPM`, 46, 130);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`COUNT : ${String(cycles).padStart(6, '0')}`, 46, 155);
    ctx.fillText(`SHAFT : ${String(Math.round(deg)).padStart(3, ' ')} DEG`, 46, 180);

    // Multi-cam timing diagram
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(46, 196, 216, 52);

    const drawCurve = (fn: (t: number) => number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 216; i += 4) {
        const p = (i / 216) * Math.PI * 2;
        const yNorm = fn(p);
        const py = 242 - yNorm * 36;
        if (i === 0) ctx.moveTo(46 + i, py);
        else ctx.lineTo(46 + i, py);
      }
      ctx.stroke();
    };

    drawCurve(getPlungerLiftNorm, '#f59e0b');
    drawCurve(getTuckerLiftNorm, '#22d3ee');
    drawCurve(getEjectorLiftNorm, '#fb7185');

    const cursorX = 46 + ((deg % 360) / 360) * 216;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cursorX, 196);
    ctx.lineTo(cursorX, 248);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('CHENGDU SANKE · BZW-1000 CUT & WRAP', 24, 342);

    texture.needsUpdate = true;
  }

  return {
    texture,
    redraw,
    dispose: () => texture.dispose(),
  };
}

export function createTurretCenterCapTexture(
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(116, 108, 12, 128, 128, 128);
  grad.addColorStop(0, '#f8fafc');
  grad.addColorStop(0.7, '#e2e8f0');
  grad.addColorStop(1, '#bcc6d2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.14)';
  ctx.lineWidth = 1;
  for (let r = 16; r < 124; r += 7) {
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(128, 128);
  ctx.rotate(-0.56);
  ctx.fillStyle = '#526071';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BZW10437', 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSlottedArcLabelTexture(
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BZW1807-125', 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCandyRopeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fb7185';
  ctx.fillRect(0, 0, 256, 64);

  // Subtle diagonal confectionery swirl stripes to visualize linear feed
  ctx.fillStyle = '#fda4af';
  for (let x = -64; x < 320; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 12, 0);
    ctx.lineTo(x + 36, 64);
    ctx.lineTo(x + 24, 64);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWrapperWebTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
  ctx.fillRect(0, 0, 128, 256);

  // Registration eye-marks & crisp translucent film borders
  ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.fillRect(4, 0, 8, 256);
  ctx.fillRect(116, 0, 8, 256);

  ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
  for (let y = 0; y < 256; y += 64) {
    ctx.fillRect(16, y + 6, 14, 6);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createConveyorBeltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#475569';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 4, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWarningDecalTexture(
  maxAnisotropy: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(64, 12);
  c.height && ctx.lineTo(116, 112);
  ctx.lineTo(12, 112);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 64, 98);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.16)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBrushedSteelRoughnessMap(): THREE.DataTexture {
  const width = 256;
  const height = 256;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const streak = 195 + Math.floor(Math.sin(y * 0.85) * 18 + Math.cos(y * 2.3) * 12);
    for (let x = 0; x < width; x++) {
      const fine = Math.floor(Math.sin(x * 0.2 + y * 1.7) * 8);
      const val = Math.max(140, Math.min(255, streak + fine));
      const idx = (y * width + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  return tex;
}
