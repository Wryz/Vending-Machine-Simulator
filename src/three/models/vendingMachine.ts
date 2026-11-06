import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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

/** Candy-bright product colors (seeded colors override these). */
const DEFAULT_PRODUCT_COLORS = [
  '#FF5A4E',
  '#FFC93C',
  '#3D8BFF',
  '#3CCB7F',
  '#FF8A3D',
  '#B57BFF',
  '#FFF1D6',
  '#FF7AB6',
];

/** Toy look: soft cream trim and candy keys instead of dark metal. */
const CREAM = '#FFF4E2';
const CREAM_SHADE = '#F1DFC4';
const INK = '#3A2A3F';
const KEY_COLORS = ['#FFC93C', '#5BE0A8', '#FF8FB8'];

function mat(
  color: string,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  // Matte and bright: no metal sheen, so it reads as a painted toy, not a real appliance.
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0,
    flatShading: true,
    ...opts,
  });
}

function place(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number],
  name?: string,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  if (name) m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A rounded (pillowy) box: `segments` 1 = a single chamfer, 2 = softer. */
function rbox(
  w: number,
  h: number,
  d: number,
  radius: number,
  material: THREE.Material,
  pos: [number, number, number],
  name?: string,
  segments = 1,
): THREE.Mesh {
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return place(new RoundedBoxGeometry(w, h, d, segments, r), material, pos, name);
}

/** A round key / knob facing +z. */
function disc(
  radius: number,
  depth: number,
  material: THREE.Material,
  pos: [number, number, number],
  name?: string,
  sides = 12,
): THREE.Mesh {
  const g = new THREE.CylinderGeometry(radius, radius, depth, sides, 1).rotateX(Math.PI / 2);
  return place(g, material, pos, name);
}

/**
 * Procedural toy-like vending machine: a chunky rounded cabinet on stubby
 * feet, a puffy lit sign on top, a bubbly window in a thick cream frame,
 * big candy-colored keys and round cans and snack bags behind the glass.
 * Pure three.js (no React), so the same model feeds the R3F close-up, the
 * GLB export and the sprite renderer.
 *
 * The model faces +z (south) with its base at y = 0 and its center at x = z = 0.
 * Part names (slot-r-c, glass, screen, coin-return, header, ...) are used by
 * the close-up's interactions and effects.
 */
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

  const body = mat(opts.accent, { roughness: 0.65 });
  const bodyShade = mat(new THREE.Color(opts.accent).multiplyScalar(0.72).getStyle());
  const cream = mat(CREAM);
  const creamShade = mat(CREAM_SHADE);
  const ink = mat(INK, { roughness: 0.6 });
  const interior = mat('#FFF7EA', {
    emissive: new THREE.Color('#FFF1D6'),
    emissiveIntensity: 0,
    roughness: 0.9,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: '#D8F1FF',
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.18,
    flatShading: true,
  });
  const screen = mat('#1E2A3A', {
    emissive: new THREE.Color('#8FF5D2'),
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const header = mat('#FFF7DA', {
    emissive: new THREE.Color('#FFF3C4'),
    emissiveIntensity: 0,
    roughness: 0.6,
  });
  emissive.push(
    { material: interior, base: 0.7 },
    { material: screen, base: 1.6 },
    { material: header, base: 1.3 },
  );

  // Stubby feet, then the chunky rounded cabinet.
  const feetH = 0.07;
  const bodyR = Math.min(0.11, W * 0.13);
  for (const [fx, fz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const foot = new THREE.CylinderGeometry(0.06, 0.075, feetH + 0.03, 8, 1);
    group.add(place(foot, ink, [fx * (W / 2 - 0.12), (feetH + 0.03) / 2, fz * (D / 2 - 0.12)]));
  }
  const capH = Math.min(0.24, H * 0.13);
  const bodyTop = H - capH * 0.55;
  group.add(
    rbox(W, bodyTop - feetH, D, bodyR, body, [0, feetH + (bodyTop - feetH) / 2, 0], 'cabinet', 2),
  );
  // Puffy sign on top, a little wider than the cabinet; its lit face is the header.
  group.add(rbox(W + 0.06, capH, D + 0.04, capH * 0.45, bodyShade, [0, H - capH / 2, 0], 'cap', 2));
  group.add(
    rbox(
      W - 0.08,
      capH * 0.66,
      0.05,
      capH * 0.3,
      header,
      [0, H - capH / 2, D / 2 + 0.01],
      'header',
      1,
    ),
  );

  const frontZ = D / 2;
  // Window bay on the left ~66% of the face, raised in a thick cream frame.
  const bayW = W * 0.6;
  const bayX = -W / 2 + 0.07 + bayW / 2 + 0.02;
  const bayBottom = 0.56;
  const bayTop = bodyTop - 0.1;
  const bayH = bayTop - bayBottom;
  const bayY = bayBottom + bayH / 2;
  const frameT = 0.055;
  const frameD = 0.1;
  // The frame is four chunky rounded bars, so the window stays open.
  const fz = frontZ + frameD / 2 - 0.04;
  const fr = frameT * 0.7;
  group.add(
    rbox(
      bayW + frameT * 2,
      frameT,
      frameD,
      fr,
      cream,
      [bayX, bayTop + frameT / 2, fz],
      'frame-top',
      1,
    ),
  );
  group.add(
    rbox(
      bayW + frameT * 2,
      frameT,
      frameD,
      fr,
      cream,
      [bayX, bayBottom - frameT / 2, fz],
      'frame-bottom',
      1,
    ),
  );
  group.add(
    rbox(
      frameT,
      bayH + frameT * 2,
      frameD,
      fr,
      cream,
      [bayX - bayW / 2 - frameT / 2, bayY, fz],
      'frame-left',
      1,
    ),
  );
  group.add(
    rbox(
      frameT,
      bayH + frameT * 2,
      frameD,
      fr,
      cream,
      [bayX + bayW / 2 + frameT / 2, bayY, fz],
      'frame-right',
      1,
    ),
  );
  group.add(
    place(
      new THREE.BoxGeometry(bayW, bayH, 0.01),
      interior,
      [bayX, bayY, frontZ + 0.016],
      'interior-back',
    ),
  );

  // Shelves + products: round cans and puffy snack bags, alternating.
  const rowH = bayH / rows;
  const colW = bayW / cols;
  const prodZ = frontZ + 0.045;
  for (let r = 0; r < rows; r++) {
    const shelfY = bayBottom + r * rowH;
    group.add(
      place(new THREE.BoxGeometry(bayW, 0.016, 0.06), creamShade, [bayX, shelfY + 0.008, prodZ]),
    );
    for (let c = 0; c < cols; c++) {
      const color = colors[(r * cols + c) % colors.length];
      const w = colW * 0.76;
      const h = rowH * 0.72;
      const pos: [number, number, number] = [
        bayX - bayW / 2 + colW * (c + 0.5),
        shelfY + 0.016 + h / 2,
        prodZ,
      ];
      const pm = mat(color, { roughness: 0.6 });
      const can = (r + c) % 2 === 0;
      const p = can
        ? place(new THREE.CylinderGeometry(w * 0.44, w * 0.44, h, 8, 1), pm, pos, `slot-${r}-${c}`)
        : rbox(w, h, 0.05, Math.min(w, h) * 0.3, pm, pos, `slot-${r}-${c}`, 1);
      slots.push(p);
      group.add(p);
    }
  }
  // Glass, a touch proud of the products, with a soft highlight streak.
  const glassPane = place(
    new THREE.BoxGeometry(bayW, bayH, 0.008),
    glass,
    [bayX, bayY, frontZ + 0.075],
    'glass',
  );
  glassPane.castShadow = false;
  group.add(glassPane);
  const streak = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0,
  });
  const shine = place(
    new THREE.PlaneGeometry(bayW * 0.12, bayH * 0.9),
    streak,
    [bayX - bayW * 0.28, bayY + bayH * 0.02, frontZ + 0.081],
    'glass-shine',
  );
  shine.rotation.z = -0.32;
  shine.castShadow = false;
  group.add(shine);

  // Control column on the right: rounded screen, big candy keys, coin plate.
  const colLeft = bayX + bayW / 2 + frameT;
  const ctrlX = (colLeft + W / 2) / 2;
  const ctrlW = W / 2 - colLeft - 0.05;
  group.add(
    rbox(ctrlW, 0.11, 0.04, 0.03, screen, [ctrlX, bayTop - 0.1, frontZ + 0.01], 'screen', 1),
  );
  const keyR = Math.min(0.03, ctrlW / 5);
  for (let i = 0; i < 6; i++) {
    const kx = ctrlX + (i % 2 === 0 ? -1 : 1) * keyR * 1.25;
    const ky = bayTop - 0.24 - Math.floor(i / 2) * keyR * 2.6;
    group.add(
      disc(keyR, 0.04, mat(KEY_COLORS[i % KEY_COLORS.length], { roughness: 0.5 }), [
        kx,
        ky,
        frontZ + 0.01,
      ]),
    );
  }
  // Coin slot: a round cream plate with a dark slot.
  const coinY = bayTop - 0.24 - 3 * keyR * 2.6 - 0.04;
  group.add(disc(ctrlW * 0.36, 0.04, cream, [ctrlX, coinY, frontZ + 0.01], 'coin-slot', 14));
  group.add(
    rbox(0.012, ctrlW * 0.34, 0.02, 0.005, ink, [ctrlX, coinY, frontZ + 0.03], 'coin-slit', 1),
  );
  group.add(
    rbox(
      ctrlW * 0.7,
      0.035,
      0.03,
      0.015,
      ink,
      [ctrlX, coinY - ctrlW * 0.5, frontZ + 0.01],
      'note-reader',
      1,
    ),
  );
  group.add(
    rbox(
      ctrlW * 0.62,
      0.13,
      0.04,
      0.035,
      creamShade,
      [ctrlX, 0.62, frontZ + 0.01],
      'coin-return',
      1,
    ),
  );

  // Pickup bin: a big rounded mouth with a cream flap.
  group.add(rbox(bayW * 0.9, 0.24, 0.04, 0.06, ink, [bayX, 0.3, frontZ + 0.0], 'pickup-recess'));
  group.add(
    rbox(bayW * 0.84, 0.18, 0.04, 0.05, cream, [bayX, 0.31, frontZ + 0.015], 'pickup-flap'),
  );

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
