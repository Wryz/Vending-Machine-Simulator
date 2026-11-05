/**
 * Browser-side three.js helpers shared by the sprite builder, the close-up
 * previews and the brand renders. Bundled with esbuild (see lib/harness.mjs);
 * never shipped in the app.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  FAMILY_ACCENT,
  getMachineType,
  type MachineFamily,
  type MachineTypeId,
} from '@/config/machines';
import type { Palette } from '@/config/timeOfDay';
import type { SceneLighting } from '@/three/lightingRig';
import { countTriangles, createVendingMachine } from '@/three/models/vendingMachine';

export interface ModelDef {
  /** Sprite/GLB name: `machine-{id}-…`. */
  id: string;
  accent: string;
  typeId: MachineTypeId;
  /** Rival (Brightvend) header sign color override. */
  headerColor?: string;
}

/** One representative machine type per family (SPEC §3.3). */
const FAMILY_REPRESENTATIVE: Record<MachineFamily, MachineTypeId> = {
  snacks: 'snack',
  drinks: 'cold-drinks',
  capsules: 'capsule', // SMALL dims
  tech: 'chargers',
  hotFood: 'hot-noodles',
  alcohol: 'beer-wine',
};

/** Brightvend, the rival: neutral light-gray body with a cyan header. */
export const RIVAL_BODY = '#C9CDD0';
export const RIVAL_ACCENT = '#2FB4C8';

export const MODEL_DEFS: ModelDef[] = [
  ...(Object.keys(FAMILY_REPRESENTATIVE) as MachineFamily[]).map((family) => ({
    id: family,
    accent: FAMILY_ACCENT[family],
    typeId: FAMILY_REPRESENTATIVE[family],
  })),
  { id: 'rival', accent: RIVAL_BODY, typeId: 'snack', headerColor: RIVAL_ACCENT },
];

export function getModelDef(id: string): ModelDef {
  const d = MODEL_DEFS.find((m) => m.id === id);
  if (!d) throw new Error(`unknown model ${id}`);
  return d;
}

/** Build the procedural source model (before GLB round-trip). */
export function buildSourceModel(def: ModelDef) {
  const type = getMachineType(def.typeId);
  const model = createVendingMachine({
    accent: def.accent,
    dims: type.dims,
    rows: type.grid.rows,
    cols: type.grid.cols,
  });
  model.group.name = `machine-${def.id}`;
  if (def.headerColor) {
    // The header material is only used by the header sign, so recolor it in place.
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name === 'header') {
        const m = o.material as THREE.MeshStandardMaterial;
        m.color.set(def.headerColor!);
        m.emissive.set(def.headerColor!).lerp(new THREE.Color('#FFFFFF'), 0.35);
      }
    });
  }
  return { model, type, triangles: countTriangles(model.group) };
}

export async function exportGLB(def: ModelDef): Promise<{ glb: ArrayBuffer; triangles: number }> {
  const { model, triangles } = buildSourceModel(def);
  // Export with full glow so emissive colors survive (intensity 0 would export
  // as black). The loader side re-derives the glow list from these.
  for (const e of model.emissive) e.material.emissiveIntensity = e.base;
  const glb = (await new GLTFExporter().parseAsync(model.group, { binary: true })) as ArrayBuffer;
  return { glb, triangles };
}

export interface LoadedMachine {
  group: THREE.Group;
  emissive: { material: THREE.MeshStandardMaterial; base: number }[];
  triangles: number;
  box: THREE.Box3;
}

export async function loadGLB(glb: ArrayBuffer): Promise<LoadedMachine> {
  const gltf = await new GLTFLoader().parseAsync(glb, '');
  const group = gltf.scene;
  const emissive: LoadedMachine['emissive'] = [];
  const seen = new Set<THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const m = o.material as THREE.MeshStandardMaterial;
    if (seen.has(m)) return;
    seen.add(m);
    m.flatShading = true;
    m.needsUpdate = true;
    const lum = m.emissive.r + m.emissive.g + m.emissive.b;
    if (lum > 0.01) emissive.push({ material: m, base: m.emissiveIntensity });
    if (o.name === 'glass') o.castShadow = false;
  });
  return {
    group,
    emissive,
    triangles: countTriangles(group),
    box: new THREE.Box3().setFromObject(group),
  };
}

export function setGlow(m: LoadedMachine, glow: number): void {
  for (const e of m.emissive) e.material.emissiveIntensity = e.base * glow;
}

/** Soft rectangular blob: a baked contact shadow / light pool texture. */
export function blobTexture(aspect: number, blurFrac = 0.18): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const blur = size * blurFrac;
  const w = aspect >= 1 ? size - blur * 2.6 : (size - blur * 2.6) * aspect;
  const h = aspect >= 1 ? (size - blur * 2.6) / aspect : size - blur * 2.6;
  g.filter = `blur(${blur / 2}px)`;
  g.fillStyle = '#fff';
  const r = Math.min(w, h) * 0.35;
  g.beginPath();
  g.roundRect((size - w) / 2, (size - h) / 2, w, h, r);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Contact shadow under a machine footprint (W × D), in the machine's local frame. */
export function contactShadow(W: number, D: number, opacity: number): THREE.Mesh {
  const pad = 0.42;
  const geo = new THREE.PlaneGeometry(W + pad, D + pad);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: '#000000',
    alphaMap: blobTexture((W + pad) / (D + pad), 0.16),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = 0.002;
  m.renderOrder = -1;
  m.name = 'contact-shadow';
  return m;
}

/** Warm light pool spilled on the ground in front of a lit machine (night). */
export function lightPool(W: number, D: number, opacity: number, color = '#FFE2B0'): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(W * 1.25, 0.7);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color,
    alphaMap: blobTexture((W * 1.25) / 0.7, 0.3),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0, 0.003, D / 2 + 0.25);
  m.renderOrder = -1;
  m.name = 'light-pool';
  return m;
}

export interface LightRig {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  glow: THREE.PointLight;
}

/** Apply `sceneLighting` output to a scene (mirrors what the R3F close-up does). */
export function addLights(
  scene: THREE.Scene,
  l: SceneLighting,
  opts: { glowAt?: THREE.Vector3; shadow?: boolean; distance?: number } = {},
): LightRig {
  const sun = new THREE.DirectionalLight(l.sunColor, l.sunIntensity);
  const d = opts.distance ?? 10;
  sun.position.set(l.sunDirection[0] * d, l.sunDirection[1] * d, l.sunDirection[2] * d);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  if (opts.shadow) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -4;
    s.right = 4;
    s.top = 4;
    s.bottom = -4;
    s.near = 0.5;
    s.far = d * 2 + 5;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
  }
  const hemi = new THREE.HemisphereLight(l.skyColor, l.groundColor, l.ambientIntensity);
  scene.add(hemi);
  const glow = new THREE.PointLight('#FFE6C2', l.glowLightIntensity, 4, 2);
  glow.position.copy(opts.glowAt ?? new THREE.Vector3(0, 1.2, 1.1));
  scene.add(glow);
  return { sun, hemi, glow };
}

export function rendererFor(
  canvas: HTMLCanvasElement | undefined,
  w: number,
  h: number,
  alpha: boolean,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    preserveDrawingBuffer: true,
    premultipliedAlpha: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Match R3F's defaults so sprites and close-ups agree.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** Downscale by halving (box filter) and return the 2D canvas. */
export function downsample(src: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  let cur: HTMLCanvasElement = src;
  let w = src.width;
  let h = src.height;
  while (factor > 1) {
    const step = factor % 2 === 0 ? 2 : factor;
    w = Math.round(w / step);
    h = Math.round(h / step);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, w, h);
    cur = c;
    factor /= step;
  }
  return cur;
}

/** Cheap bloom: blur the bright pixels and add them back (night fronts, SPEC §3.3). */
export function bloom(c: HTMLCanvasElement, threshold: number, radiusPx: number, strength: number) {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  const bright = document.createElement('canvas');
  bright.width = c.width;
  bright.height = c.height;
  const bg = bright.getContext('2d')!;
  const bi = bg.createImageData(c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3] / 255;
    const lum = (0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]) / 255;
    const k = Math.max(0, (lum - threshold) / (1 - threshold)) * a;
    bi.data[i] = img.data[i];
    bi.data[i + 1] = img.data[i + 1];
    bi.data[i + 2] = img.data[i + 2];
    bi.data[i + 3] = Math.round(255 * k);
  }
  bg.putImageData(bi, 0, 0);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = strength;
  g.filter = `blur(${radiusPx}px)`;
  g.drawImage(bright, 0, 0);
  g.restore();
}

export function canvasToB64(c: HTMLCanvasElement): string {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < d.length; i += CH) s += String.fromCharCode(...d.subarray(i, i + CH));
  return btoa(s);
}

export function bufToB64(buf: ArrayBuffer): string {
  const d = new Uint8Array(buf);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < d.length; i += CH) s += String.fromCharCode(...d.subarray(i, i + CH));
  return btoa(s);
}

export function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}

export type { Palette };
export { THREE };
