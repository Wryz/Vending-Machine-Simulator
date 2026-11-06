/**
 * Procedural toy-figure pedestrians for the map's street life (SPEC §3.3:
 * round head, rounded bean body, stubby limbs, no hands, feet or hair; flat
 * shading, color from materials, no brands). Same part geometry as the
 * close-up crowd (src/three/life/people.ts), with a slightly bigger head so
 * the tiny sprites stay readable. Build-time only (bundled into the sprite
 * renderer).
 *
 * Models face +z (south) with their base at y = 0 and their ground center at
 * x = z = 0, like the vending machine model.
 */
import * as THREE from 'three';

import { PEDESTRIANS, PERSON_SHAPE } from '@/config/streetLife';
import { personGeometries } from '@/three/life/people';

export interface LifeModel {
  group: THREE.Group;
  footprint: { w: number; d: number };
  triangles: number;
}

function mat(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true });
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
  /** Short sleeves: arms in the skin color. */
  bareArms: boolean;
}

export const OUTFITS: Record<string, Outfit> = {
  coral: { top: '#F0785E', legs: '#3F5C93', skin: '#D9A884', bareArms: false },
  sky: { top: '#5EA6E6', legs: '#545B6C', skin: '#8A5A3C', bareArms: true },
  mint: { top: '#4FC39C', legs: '#3A3F4D', skin: '#D1A07A', bareArms: false },
  sun: { top: '#F4BE4A', legs: '#7A5C9E', skin: '#E5BFA0', bareArms: true },
};

/** Map sprites are a few pixels tall: a bigger head keeps them reading as people. */
const SPRITE_HEAD_SCALE = 1.18;

/**
 * A toy figure about 1.75 m tall. `frame`: 0 = passing pose (also standing),
 * 1 = left leg forward, 2 = right leg forward.
 */
export function createPerson(outfitId: string, frame: number): LifeModel {
  const o = OUTFITS[outfitId];
  if (!o) throw new Error(`unknown outfit ${outfitId}`);
  const S = PERSON_SHAPE;
  const geo = personGeometries(SPRITE_HEAD_SCALE);
  const top = mat(o.top);
  const skin = mat(o.skin);
  const legs = mat(o.legs);
  const arms = o.bareArms ? skin : top;
  const group = new THREE.Group();
  const upper = new THREE.Group();
  upper.position.y = S.legM;
  upper.add(new THREE.Mesh(geo.body, top), new THREE.Mesh(geo.head, skin));
  group.add(upper);

  const deg = Math.PI / 180;
  const dir = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  const legSwing = dir * PEDESTRIANS.legSwingDeg * deg;
  const armSwing = dir * PEDESTRIANS.armSwingDeg * deg;
  // A straight leg swung forward lifts the hips: sit the figure on its stance leg.
  group.position.y = S.legM * (Math.cos(legSwing) - 1);
  for (const side of [-1, 1]) {
    // Left leg (x > 0 for a figure facing +z is its left) forward on frame 1.
    const leg = new THREE.Mesh(geo.leg, legs);
    leg.position.set(side * S.hipXM, S.legM, 0);
    leg.rotation.x = side > 0 ? -legSwing : legSwing;
    group.add(leg);
    const arm = new THREE.Mesh(geo.arm, arms);
    arm.position.set(side * S.arm.shoulderXM, S.arm.shoulderYM - S.legM, 0);
    arm.rotation.order = 'YXZ';
    arm.rotation.x = side > 0 ? armSwing : -armSwing;
    arm.rotation.z = side * S.arm.splayRad;
    upper.add(arm);
  }
  group.traverse((m) => {
    if (m instanceof THREE.Mesh) m.castShadow = true;
  });
  const root = new THREE.Group();
  root.add(group);
  return {
    group: root,
    footprint: { w: 0.5, d: 0.35 },
    triangles: countTris(root),
  };
}
