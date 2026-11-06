/**
 * Procedural low-poly cars and pedestrians for the map's street life (SPEC
 * §3.3: real proportions, flat shading, color from materials, single-bevel
 * chamfers, no brands). Build-time only (bundled into the sprite renderer).
 *
 * Models face +z (south) with their base at y = 0 and their ground center at
 * x = z = 0, like the vending machine model.
 */
import * as THREE from 'three';

export interface LifeModel {
  group: THREE.Group;
  /** Materials that glow at night (lights, taxi sign), with their night intensity. */
  lamps: { material: THREE.MeshStandardMaterial; night: number; dayColor: string; nightColor: string }[];
  footprint: { w: number; d: number };
  triangles: number;
}

function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.08,
    flatShading: true,
    ...opts,
  });
}

/** Extrude a side profile (z along the car, y up) across the width (x). */
function profile(points: [number, number][], width: number, material: THREE.Material, bevel = 0.05) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  // (u, v, w) -> (x = W/2 - bevel - w, y = v, z = u); determinant +1 keeps the winding.
  const m = new THREE.Matrix4().set(0, 0, -1, width / 2 - bevel, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  geo.applyMatrix4(m);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

function countTris(g: THREE.Object3D): number {
  let n = 0;
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const geo = o.geometry as THREE.BufferGeometry;
      n += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    }
  });
  return n;
}

// ------------------------------------------------------------------ cars

export const CAR_PAINT: Record<string, string> = {
  graphite: '#3A3E44',
  silver: '#A7ABB0',
  white: '#E4E2DC',
  navy: '#2C3950',
  oxblood: '#6B2B2A',
  sage: '#86937E',
  slate: '#5A6875',
  sand: '#BFB198',
  yellow: '#D6B04A',
};

interface Body {
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  wheelR: number;
  lower: [number, number][];
  glass: [number, number][];
  roof: [number, number][] | null;
  /** Glass is extruded this much wider than the lower body (vans: flush sides). */
  glassInset: number;
  lightY: number;
}

const BODIES: Record<string, Body> = {
  sedan: {
    length: 4.6,
    width: 1.8,
    height: 1.45,
    wheelbase: 2.7,
    wheelR: 0.32,
    lower: [
      [-2.3, 0.3],
      [-2.3, 0.78],
      [-2.12, 0.93],
      [-1.5, 0.96],
      [1.05, 0.95],
      [2.12, 0.83],
      [2.3, 0.7],
      [2.3, 0.3],
    ],
    glass: [
      [-1.5, 0.94],
      [-0.95, 1.38],
      [0.5, 1.4],
      [1.1, 0.93],
    ],
    roof: [
      [-0.98, 1.36],
      [-0.86, 1.45],
      [0.44, 1.45],
      [0.56, 1.37],
    ],
    glassInset: 0.14,
    lightY: 0.7,
  },
  hatch: {
    length: 4.1,
    width: 1.78,
    height: 1.5,
    wheelbase: 2.55,
    wheelR: 0.31,
    lower: [
      [-2.05, 0.3],
      [-2.05, 0.96],
      [-1.95, 1.0],
      [0.95, 0.98],
      [1.9, 0.85],
      [2.05, 0.72],
      [2.05, 0.3],
    ],
    glass: [
      [-1.98, 0.97],
      [-1.82, 1.43],
      [0.3, 1.46],
      [1.0, 0.96],
    ],
    roof: [
      [-1.86, 1.41],
      [-1.76, 1.5],
      [0.26, 1.5],
      [0.4, 1.43],
    ],
    glassInset: 0.13,
    lightY: 0.74,
  },
  van: {
    length: 4.9,
    width: 1.95,
    height: 1.95,
    wheelbase: 3.0,
    wheelR: 0.34,
    lower: [
      [-2.45, 0.32],
      [-2.45, 1.88],
      [-2.36, 1.95],
      [1.0, 1.95],
      [1.68, 1.1],
      [2.38, 0.96],
      [2.45, 0.8],
      [2.45, 0.32],
    ],
    // Windshield + front side windows only (a panel van behind them).
    glass: [
      [0.2, 1.1],
      [0.2, 1.8],
      [1.04, 1.9],
      [1.73, 1.08],
    ],
    roof: null,
    glassInset: -0.012,
    lightY: 0.82,
  },
};

const RUBBER = '#1B1C1F';
const TRIM = '#2A2C30';
const GLASS = '#1E2830';

export function createCar(bodyId: 'sedan' | 'hatch' | 'van' | 'taxi', paintHex: string): LifeModel {
  const b = BODIES[bodyId === 'taxi' ? 'sedan' : bodyId];
  const group = new THREE.Group();
  const paint = mat(paintHex, { roughness: 0.38, metalness: 0.25 });
  const glass = mat(GLASS, { roughness: 0.12, metalness: 0.4 });
  const trim = mat(TRIM, { roughness: 0.8 });
  const rubber = mat(RUBBER, { roughness: 0.9, metalness: 0 });

  group.add(profile(b.lower, b.width, paint, 0.06));
  const glassMesh = profile(b.glass, b.width - b.glassInset, glass, 0.04);
  group.add(glassMesh);
  if (b.roof) group.add(profile(b.roof, b.width - b.glassInset - 0.04, paint, 0.03));

  // Bumpers.
  group.add(box(b.width - 0.1, 0.16, 0.08, trim, 0, 0.36, b.length / 2 + 0.01));
  group.add(box(b.width - 0.1, 0.16, 0.08, trim, 0, 0.36, -b.length / 2 - 0.01));

  // Wheels (10-sided), axis across the car.
  const wheelGeo = new THREE.CylinderGeometry(b.wheelR, b.wheelR, 0.22, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, rubber);
      w.position.set(sx * (b.width / 2 - 0.13), b.wheelR, (sz * b.wheelbase) / 2);
      group.add(w);
    }

  // Lights: emissive at night (bloomed), plain lenses by day.
  const head = mat('#D9DCDD', { roughness: 0.2, emissive: '#FFF1D2', emissiveIntensity: 0 });
  const tail = mat('#7E2621', { roughness: 0.3, emissive: '#FF3A2A', emissiveIntensity: 0 });
  const lw = 0.34;
  for (const sx of [-1, 1]) {
    group.add(box(lw, 0.12, 0.06, head, sx * (b.width / 2 - 0.12 - lw / 2), b.lightY, b.length / 2));
    group.add(
      box(lw * 0.8, 0.12, 0.06, tail, sx * (b.width / 2 - 0.1 - lw * 0.4), b.lightY + 0.08, -b.length / 2),
    );
  }
  const lamps: LifeModel['lamps'] = [
    { material: head, night: 3.2, dayColor: '#D9DCDD', nightColor: '#FFF6E2' },
    { material: tail, night: 2.2, dayColor: '#7E2621', nightColor: '#FF4A36' },
  ];

  if (bodyId === 'taxi') {
    // Neutral roof sign (no text, no brand); warm glow at night.
    const sign = mat('#EDE7D4', { roughness: 0.4, emissive: '#FFE1A0', emissiveIntensity: 0 });
    group.add(box(0.62, 0.15, 0.22, sign, 0, 1.45 + 0.075, -0.2));
    lamps.push({ material: sign, night: 1.4, dayColor: '#EDE7D4', nightColor: '#FFE7B5' });
  }

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return {
    group,
    lamps,
    footprint: { w: b.width, d: b.length },
    triangles: countTris(group),
  };
}

/** `sedan-graphite` -> a car model. */
export function createCarModel(name: string): LifeModel {
  const [body, color] = name.split('-') as ['sedan' | 'hatch' | 'van' | 'taxi', string];
  const hex = CAR_PAINT[color];
  if (!hex) throw new Error(`unknown car paint ${color}`);
  return createCar(body, hex);
}

// ---------------------------------------------------------------- people

interface Outfit {
  top: string;
  legs: string;
  skin: string;
  hair: string;
  shoes: string;
  /** Long coat (to mid-thigh) vs a jacket. */
  coat: boolean;
  bag?: string;
}

export const OUTFITS: Record<string, Outfit> = {
  navy: { top: '#2F3B52', legs: '#3B3E44', skin: '#C9A38A', hair: '#2A2420', shoes: '#1E1E20', coat: true },
  camel: { top: '#A9845A', legs: '#2E3035', skin: '#E0BEA2', hair: '#5A3E2B', shoes: '#3A2A22', coat: true },
  olive: {
    top: '#5E6648',
    legs: '#4A5A72',
    skin: '#8C5E44',
    hair: '#1D1917',
    shoes: '#D8D6D0',
    coat: false,
    bag: '#2B2D30',
  },
  charcoal: {
    top: '#4A4C52',
    legs: '#25262A',
    skin: '#D7AF91',
    hair: '#8A7B6A',
    shoes: '#1E1E20',
    coat: false,
  },
};

/**
 * A pedestrian about 1.75 m tall. `frame`: 0 = passing pose (also standing),
 * 1 = left leg forward, 2 = right leg forward.
 */
export function createPerson(outfitId: string, frame: number): LifeModel {
  const o = OUTFITS[outfitId];
  if (!o) throw new Error(`unknown outfit ${outfitId}`);
  const group = new THREE.Group();
  const top = mat(o.top, { roughness: 0.85, metalness: 0 });
  const legs = mat(o.legs, { roughness: 0.85, metalness: 0 });
  const skin = mat(o.skin, { roughness: 0.7, metalness: 0 });
  const hair = mat(o.hair, { roughness: 0.9, metalness: 0 });
  const shoes = mat(o.shoes, { roughness: 0.7, metalness: 0 });

  const hipY = 0.88;
  const swing = frame === 0 ? 0 : (frame === 1 ? 1 : -1) * 0.42; // ~24°
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.09, hipY, 0);
    leg.add(box(0.13, 0.8, 0.15, legs, 0, -0.42, 0));
    leg.add(box(0.12, 0.08, 0.26, shoes, 0, -0.84, 0.05));
    // Left leg (x > 0 for a figure facing +z is its left) forward on frame 1.
    leg.rotation.x = side > 0 ? -swing : swing;
    group.add(leg);
  }
  const torsoBottom = o.coat ? 0.62 : 0.84;
  const torsoTop = 1.46;
  const torso = box(0.4, torsoTop - torsoBottom, 0.23, top, 0, (torsoTop + torsoBottom) / 2, 0);
  torso.scale.set(1, 1, 1);
  group.add(torso);
  // Shoulders: a slightly narrower cap so the torso reads tapered.
  group.add(box(0.36, 0.06, 0.2, top, 0, torsoTop + 0.03, 0));
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.25, 1.44, 0);
    arm.add(box(0.09, 0.56, 0.11, top, 0, -0.28, 0));
    arm.add(box(0.08, 0.09, 0.09, skin, 0, -0.6, 0));
    arm.rotation.x = (side > 0 ? swing : -swing) * 0.7;
    group.add(arm);
  }
  group.add(box(0.09, 0.08, 0.09, skin, 0, 1.53, 0));
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.115, 0), skin);
  head.position.set(0, 1.64, 0.01);
  group.add(head);
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.122, 0), hair);
  cap.scale.set(1, 0.7, 1);
  cap.position.set(0, 1.69, -0.02);
  group.add(cap);
  if (o.bag) group.add(box(0.3, 0.38, 0.14, mat(o.bag, { roughness: 0.8 }), 0, 1.16, -0.18));
  group.traverse((m) => {
    if (m instanceof THREE.Mesh) m.castShadow = true;
  });
  return { group, lamps: [], footprint: { w: 0.5, d: 0.35 }, triangles: countTris(group) };
}
