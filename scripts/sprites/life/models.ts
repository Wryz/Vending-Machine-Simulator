/**
 * Procedural low-poly pedestrians for the map's street life (SPEC
 * §3.3: real proportions, flat shading, color from materials, single-bevel
 * chamfers, no brands). Build-time only (bundled into the sprite renderer).
 *
 * Models face +z (south) with their base at y = 0 and their ground center at
 * x = z = 0, like the vending machine model.
 */
import * as THREE from 'three';

export interface LifeModel {
  group: THREE.Group;
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
  navy: {
    top: '#2F3B52',
    legs: '#3B3E44',
    skin: '#C9A38A',
    hair: '#2A2420',
    shoes: '#1E1E20',
    coat: true,
  },
  camel: {
    top: '#A9845A',
    legs: '#2E3035',
    skin: '#E0BEA2',
    hair: '#5A3E2B',
    shoes: '#3A2A22',
    coat: true,
  },
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
  return {
    group,
    footprint: { w: 0.5, d: 0.35 },
    triangles: countTris(group),
  };
}
