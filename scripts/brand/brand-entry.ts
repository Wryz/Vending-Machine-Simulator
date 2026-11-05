/**
 * Browser entry for brand assets: the app icon (three.js render of the GLB
 * machine glowing at dusk) and the flat machine mark (2D canvas).
 */
import { bearingToVector } from '@/map/cameraMatch';

import {
  b64ToBuf,
  bloom,
  canvasToB64,
  contactShadow,
  downsample,
  lightPool,
  loadGLB,
  rendererFor,
  setGlow,
  THREE,
} from '../sprites/scene';

const INK = '#1B1F23';

/** 1024² app icon: one machine at 3/4 view, dusk glow, deep slate. Opaque. */
export async function renderIcon(glbB64: string, size: number) {
  const m = await loadGLB(b64ToBuf(glbB64));
  const dims = m.box.getSize(new THREE.Vector3());
  setGlow(m, 0.9);

  const scene = new THREE.Scene();
  const slate = new THREE.Color('#232B33');
  scene.background = slate;
  // Ground fades into the slate backdrop: no hard horizon.
  scene.fog = new THREE.Fog(slate, 6.5, 11);
  scene.add(m.group);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: '#2E363F', roughness: 0.6, metalness: 0.1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground, contactShadow(dims.x, dims.z, 0.55), lightPool(dims.x, dims.z, 0.1));

  // Dusk: low warm key from the west-southwest (behind-left), cool sky fill,
  // warm spill from the lit front.
  const key = new THREE.DirectionalLight('#FFB487', 1.6);
  const [kx, kz] = bearingToVector(235);
  key.position.set(kx * 8, 2.2, kz * 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  const hemi = new THREE.HemisphereLight('#6E7F95', '#1B1F23', 1.1);
  const glow = new THREE.PointLight('#FFE3BE', 2.6, 4, 2);
  glow.position.set(0, dims.y * 0.55, dims.z / 2 + 0.75);
  const rim = new THREE.DirectionalLight('#9FB2D6', 0.9);
  rim.position.set(6, 4, -6);
  scene.add(key, key.target, hemi, glow, rim);

  // 3/4 view from the south-southeast, slightly below the machine's top.
  const [cx, cz] = bearingToVector(148);
  const dist = 6.3;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(cx * dist, 1.3, cz * dist);
  // Aim a little right of center so the front + side read as one centered mass.
  camera.lookAt(0.2, dims.y * 0.5, -0.1);

  const ss = 2;
  const renderer = rendererFor(undefined, size * ss, size * ss, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.render(scene, camera);
  const c = downsample(renderer.domElement, ss);
  bloom(c, 0.66, size / 90, 0.6);
  // Soft vignette keeps the eye on the machine.
  const g = c.getContext('2d')!;
  const v = g.createRadialGradient(
    size / 2,
    size * 0.45,
    size * 0.25,
    size / 2,
    size / 2,
    size * 0.75,
  );
  v.addColorStop(0, 'rgba(15,18,22,0)');
  v.addColorStop(1, 'rgba(15,18,22,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, size, size);
  renderer.dispose();
  return canvasToB64(c);
}

/**
 * Flat machine mark: cabinet with the window bay, three shelves, header slot,
 * screen, coin slot and pickup flap cut out. `h` is the mark height in px.
 */
function drawMark(g: CanvasRenderingContext2D, cx: number, cy: number, h: number, color: string) {
  const w = h * 0.56;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const X = (f: number) => x0 + f * w;
  const Y = (f: number) => y0 + f * h;
  const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
    g.beginPath();
    g.roundRect(x, y, ww, hh, r);
    g.fill();
  };
  g.save();
  g.fillStyle = color;
  rr(x0, y0, w, h, h * 0.035);
  g.globalCompositeOperation = 'destination-out';
  // Header sign slot.
  rr(X(0.09), Y(0.045), w * 0.82, h * 0.045, h * 0.012);
  // Window bay.
  const bx = X(0.09);
  const by = Y(0.135);
  const bw = w * 0.6;
  const bh = h * 0.58;
  rr(bx, by, bw, bh, h * 0.014);
  // Control column: screen + coin slot.
  rr(X(0.76), Y(0.16), w * 0.15, h * 0.05, h * 0.008);
  rr(X(0.8), Y(0.27), w * 0.07, h * 0.1, h * 0.01);
  // Pickup flap.
  rr(X(0.12), Y(0.79), w * 0.54, h * 0.09, h * 0.012);
  g.globalCompositeOperation = 'source-over';
  // Shelves with products inside the bay.
  const rows = 3;
  const pad = bw * 0.1;
  for (let r = 0; r < rows; r++) {
    const shelfY = by + bh * ((r + 1) / rows) - bh * 0.07;
    g.fillRect(bx + pad * 0.5, shelfY, bw - pad, h * 0.018);
    const cols = 3;
    const pw = (bw - pad * 2) / cols;
    for (let c = 0; c < cols; c++) {
      rr(bx + pad + c * pw + pw * 0.18, shelfY - bh * 0.15, pw * 0.64, bh * 0.15, h * 0.006);
    }
  }
  g.restore();
}

export function renderMark(opts: {
  size: number;
  markHeight: number;
  color: string;
  background?: string;
}) {
  const c = document.createElement('canvas');
  c.width = opts.size;
  c.height = opts.size;
  const g = c.getContext('2d')!;
  if (opts.background) {
    g.fillStyle = opts.background;
    g.fillRect(0, 0, opts.size, opts.size);
  }
  // Draw on a scratch layer so cutouts don't punch through the background.
  const layer = document.createElement('canvas');
  layer.width = opts.size;
  layer.height = opts.size;
  drawMark(layer.getContext('2d')!, opts.size / 2, opts.size / 2, opts.markHeight, opts.color);
  g.drawImage(layer, 0, 0);
  return canvasToB64(c);
}

export function solid(size: number, color = INK) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, size, size);
  return canvasToB64(c);
}
