import * as THREE from 'three';

import { SNACK_MACHINE_DIMENSIONS, type MachineDimensions } from '@/config/machines';

/**
 * Procedural low-poly vending machine (SPEC §3.3): real proportions, flat
 * shading, color from materials. Pure three.js (no React), so the same model
 * feeds the R3F close-up, the GLB export and the sprite renderer.
 *
 * The model faces +z (south) with its base at y = 0 and its center at x = z = 0.
 */

export interface VendingMachineOptions {
  accent: string;
  dims?: MachineDimensions;
  /** Rows × columns of product slots behind the glass. */
  rows?: number;
  cols?: number;
  /** Seeded product colors so sprites and close-ups agree. */
  productColors?: readonly string[];
}

export interface VendingMachineModel {
  group: THREE.Group;
  /** Materials whose emissive intensity follows the time of day. */
  emissive: { material: THREE.MeshStandardMaterial; base: number }[];
  /** Slot meshes, row-major, for restock interactions. */
  slots: THREE.Mesh[];
  dims: MachineDimensions;
}

const DEFAULT_PRODUCT_COLORS = [
  '#C9473A',
  '#E0B341',
  '#3E6FB0',
  '#4F8A5B',
  '#D9732B',
  '#8A4FA0',
  '#E8E1D0',
  '#2F2F33',
];

function mat(
  color: string,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    flatShading: true,
    ...opts,
  });
}

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  pos: [number, number, number],
  name?: string,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(...pos);
  if (name) m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createVendingMachine(opts: VendingMachineOptions): VendingMachineModel {
  const dims = opts.dims ?? SNACK_MACHINE_DIMENSIONS;
  const rows = opts.rows ?? 6;
  const cols = opts.cols ?? 5;
  const colors = opts.productColors ?? DEFAULT_PRODUCT_COLORS;
  const { heightM: H, widthM: W, depthM: D } = dims;

  const group = new THREE.Group();
  group.name = 'vending-machine';
  const emissive: VendingMachineModel['emissive'] = [];
  const slots: THREE.Mesh[] = [];

  const body = mat(opts.accent, { roughness: 0.45, metalness: 0.25 });
  const trim = mat('#2A2D31', { roughness: 0.5, metalness: 0.4 });
  const steel = mat('#A9ADB1', { roughness: 0.35, metalness: 0.7 });
  const interior = mat('#E9E6DF', {
    emissive: new THREE.Color('#FFF1D6'),
    emissiveIntensity: 0,
    roughness: 0.8,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: '#BFD3DA',
    roughness: 0.08,
    metalness: 0.0,
    transparent: true,
    opacity: 0.22,
    flatShading: true,
  });
  const screen = mat('#0E1A1C', {
    emissive: new THREE.Color('#7FE0C8'),
    emissiveIntensity: 0,
    roughness: 0.2,
  });
  const header = mat('#F3F1EC', {
    emissive: new THREE.Color('#FFF6E8'),
    emissiveIntensity: 0,
    roughness: 0.5,
  });
  emissive.push(
    { material: interior, base: 1.1 },
    { material: screen, base: 1.6 },
    { material: header, base: 1.3 },
  );

  // Cabinet: a chamfered rear body recessed behind the front face, plus four
  // front panels framing an open window bay, so the lit interior and products
  // behind the glass are actually visible.
  const plinthH = 0.08;
  const recess = 0.14;
  const c = 0.03;
  {
    const sh = new THREE.Shape();
    const x = W / 2;
    const yf = -(D / 2 - recess);
    const yb = D / 2;
    sh.moveTo(-x, yf);
    sh.lineTo(x, yf);
    sh.lineTo(x, yb - c);
    sh.lineTo(x - c, yb);
    sh.lineTo(-x + c, yb);
    sh.lineTo(-x, yb - c);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: H - plinthH, bevelEnabled: false, steps: 1 });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    const cabinet = new THREE.Mesh(g, body);
    cabinet.position.y = plinthH;
    cabinet.name = 'cabinet';
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    group.add(cabinet);
  }
  group.add(box(W - 0.04, plinthH, D - 0.06, trim, [0, plinthH / 2, 0]));

  const frontZ = D / 2;
  // Window bay: left ~70% of the face.
  const bayW = W * 0.68;
  const bayX = -W / 2 + 0.04 + bayW / 2;
  const bayBottom = 0.52;
  const bayTop = H - 0.2;
  const bayH = bayTop - bayBottom;
  const bayY = bayBottom + bayH / 2;
  {
    const zc = D / 2 - recess / 2;
    const bayLeft = bayX - bayW / 2;
    const bayRight = bayX + bayW / 2;
    const panel = (x0: number, x1: number, y0: number, y1: number, name: string) =>
      group.add(box(x1 - x0, y1 - y0, recess, body, [(x0 + x1) / 2, (y0 + y1) / 2, zc], name));
    panel(-W / 2, bayLeft, plinthH, H, 'front-left');
    panel(bayRight, W / 2, plinthH, H, 'front-column');
    panel(bayLeft, bayRight, bayTop, H, 'front-top');
    panel(bayLeft, bayRight, plinthH, bayBottom, 'front-bottom');
  }
  group.add(box(bayW, bayH, 0.02, interior, [bayX, bayY, frontZ - 0.12], 'interior-back'));

  // Shelves + products (one block per slot keeps triangles low).
  const rowH = bayH / rows;
  const colW = bayW / cols;
  for (let r = 0; r < rows; r++) {
    const shelfY = bayBottom + r * rowH;
    group.add(box(bayW, 0.012, 0.1, steel, [bayX, shelfY + 0.006, frontZ - 0.07]));
    for (let c = 0; c < cols; c++) {
      const color = colors[(r * cols + c) % colors.length];
      const p = box(
        colW * 0.62,
        rowH * 0.62,
        0.06,
        mat(color, { roughness: 0.55 }),
        [bayX - bayW / 2 + colW * (c + 0.5), shelfY + 0.012 + rowH * 0.31, frontZ - 0.075],
        `slot-${r}-${c}`,
      );
      slots.push(p);
      group.add(p);
    }
  }
  // Glass + frame.
  const glassPane = box(bayW, bayH, 0.01, glass, [bayX, bayY, frontZ + 0.005], 'glass');
  glassPane.castShadow = false;
  group.add(glassPane);
  const f = 0.025;
  group.add(box(bayW + f * 2, f, 0.03, trim, [bayX, bayTop + f / 2, frontZ]));
  group.add(box(bayW + f * 2, f, 0.03, trim, [bayX, bayBottom - f / 2, frontZ]));
  group.add(box(f, bayH, 0.03, trim, [bayX - bayW / 2 - f / 2, bayY, frontZ]));
  group.add(box(f, bayH, 0.03, trim, [bayX + bayW / 2 + f / 2, bayY, frontZ]));

  // Control column on the right: screen, keypad, coin slot, note reader.
  const ctrlX = bayX + bayW / 2 + (W / 2 - (bayX + bayW / 2)) / 2;
  const ctrlW = W / 2 - (bayX + bayW / 2) - 0.03;
  group.add(box(ctrlW, 0.09, 0.012, screen, [ctrlX, H - 0.42, frontZ + 0.006], 'screen'));
  const keypad = mat('#D9D7D2', { roughness: 0.5 });
  for (let i = 0; i < 12; i++) {
    const kx = ctrlX - ctrlW / 3 + (i % 3) * (ctrlW / 3);
    const ky = H - 0.56 - Math.floor(i / 3) * 0.045;
    group.add(box(0.03, 0.03, 0.012, keypad, [kx, ky, frontZ + 0.006]));
  }
  group.add(box(ctrlW * 0.7, 0.05, 0.015, steel, [ctrlX, H - 0.8, frontZ + 0.008], 'coin-slot'));
  group.add(box(ctrlW * 0.8, 0.03, 0.02, trim, [ctrlX, H - 0.9, frontZ + 0.01], 'note-reader'));
  group.add(box(ctrlW * 0.6, 0.12, 0.02, steel, [ctrlX, 0.62, frontZ + 0.01], 'coin-return'));

  // Pickup bin: dark recess with a steel flap.
  group.add(box(bayW * 0.85, 0.2, 0.02, trim, [bayX, 0.3, frontZ + 0.002], 'pickup-recess'));
  group.add(box(bayW * 0.8, 0.16, 0.02, steel, [bayX, 0.3, frontZ + 0.012], 'pickup-flap'));

  // Header sign: lit band in the family accent's frame.
  group.add(box(W - 0.06, 0.12, 0.02, header, [0, H - 0.1, frontZ + 0.003], 'header'));

  return { group, emissive, slots, dims };
}

/** Apply a 0..1 time-of-day glow to the machine's emissive materials. */
export function setMachineGlow(model: VendingMachineModel, glow: number): void {
  for (const { material, base } of model.emissive) material.emissiveIntensity = base * glow;
}

export function countTriangles(object: THREE.Object3D): number {
  let tris = 0;
  object.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  return tris;
}
