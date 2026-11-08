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

import { LIFE_POSES, LIFE_WALK_FRAMES } from '@/config/mapLife';
import { PEDESTRIANS, PERSON_SHAPE } from '@/config/streetLife';
import { personGeometries } from '@/three/life/people';

export interface LifeModel {
  group: THREE.Group;
  footprint: { w: number; d: number };
  triangles: number;
}

function mat(color: string) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
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
 * 1 = left leg forward, 2 = right leg forward; then the machine-visit poses
 * (LIFE_POSES): 3 = crouched at the tray, right arm reaching down (the
 * close-up's squat, PERSON_SHAPE.crouch), 4 = pondering (right hand to the
 * chin, head tilted), 5 = leaning in to look at the glass.
 */
export function createPerson(outfitId: string, frame: number): LifeModel {
  const o = OUTFITS[outfitId];
  if (!o) throw new Error(`unknown outfit ${outfitId}`);
  const S = PERSON_SHAPE;
  const C = S.crouch;
  const geo = personGeometries(SPRITE_HEAD_SCALE);
  const top = mat(o.top);
  const skin = mat(o.skin);
  const legs = mat(o.legs);
  const arms = o.bareArms ? skin : top;
  const group = new THREE.Group();
  const upper = new THREE.Group();
  upper.position.y = S.legM;
  // The head pivots at its center (the geometry sits in hip space).
  const headY = S.head.centerYM - S.legM;
  const headPivot = new THREE.Group();
  headPivot.position.y = headY;
  const head = new THREE.Mesh(geo.head, skin);
  head.position.y = -headY;
  headPivot.add(head);
  upper.add(new THREE.Mesh(geo.body, top), headPivot);
  group.add(upper);

  const deg = Math.PI / 180;
  const crouch = frame === LIFE_POSES.crouch;
  const ponder = frame === LIFE_POSES.ponder;
  const lean = frame === LIFE_POSES.lean;
  const walk = frame >= 1 && frame < LIFE_WALK_FRAMES;
  const dir = !walk ? 0 : frame === 1 ? 1 : -1;
  const legSwing = dir * PEDESTRIANS.legSwingDeg * deg;
  const armSwing = dir * PEDESTRIANS.armSwingDeg * deg;
  // A straight leg swung forward lifts the hips: sit the figure on its stance leg.
  group.position.y = S.legM * (Math.cos(legSwing) - 1);
  let bodyLean = 0;
  if (crouch) {
    // Squat: legs forward and out, body leaning in, a small step back.
    group.position.y = S.legM * Math.cos(C.hipRad) * Math.cos(C.splayRad) - S.legM;
    group.position.z = -C.stepBackM;
    bodyLean = C.leanRad;
    headPivot.rotation.x = -bodyLean * 0.35;
  } else if (lean) {
    bodyLean = 0.2;
    headPivot.rotation.x = 0.12;
  } else if (ponder) {
    headPivot.rotation.order = 'YXZ';
    headPivot.rotation.z = 0.2;
    headPivot.rotation.x = 0.08;
  }
  upper.rotation.x = bodyLean;
  for (const side of [-1, 1]) {
    // Left leg (x > 0 for a figure facing +z is its left) forward on frame 1.
    const leg = new THREE.Mesh(geo.leg, legs);
    leg.position.set(side * S.hipXM, S.legM, 0);
    leg.rotation.order = 'YXZ';
    if (crouch) {
      leg.rotation.x = -C.hipRad;
      leg.rotation.z = side * C.splayRad;
    } else leg.rotation.x = side > 0 ? -legSwing : legSwing;
    group.add(leg);
    const arm = new THREE.Mesh(geo.arm, arms);
    arm.position.set(side * S.arm.shoulderXM, S.arm.shoulderYM - S.legM, 0);
    arm.rotation.order = 'YXZ';
    const right = side < 0;
    if (crouch) {
      // The right arm reaches down into the tray.
      arm.rotation.x = right ? -(bodyLean + 0.45) : -bodyLean * 0.5;
      arm.rotation.z = side * S.arm.splayRad * 0.4;
    } else if (ponder && right) {
      // Hand up to the chin.
      arm.rotation.x = -2.35;
      arm.rotation.z = 0.45;
    } else if (lean) {
      arm.rotation.x = -0.12;
      arm.rotation.z = side * S.arm.splayRad;
    } else {
      arm.rotation.x = side > 0 ? armSwing : -armSwing;
      arm.rotation.z = side * S.arm.splayRad;
    }
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
