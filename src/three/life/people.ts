import * as THREE from 'three';

import { PEDESTRIANS } from '@/config/streetLife';

import { dynamicInstances, mirrorInstances } from './geometry';
import { hash01, pick } from './random';
import { emptyCycle, legHeight, SHIN_M, THIGH_M, walkCycle, type WalkerState } from './walkers';

/**
 * Low-poly pedestrians (SPEC §3.3): real proportions, faceted, muted
 * clothes. One InstancedMesh per body part (torso, head, hair, limbs, shoes)
 * for the whole crowd, ~210 triangles a person; legs bend at the knee. A second set of meshes shares
 * the same instance buffers to draw the shop-window reflection for free.
 */

const REF_H = 1.75;
const HIP_Y = 0.92;
const HIP_X = 0.088;
const THIGH_R = 0.078;
const SHIN_R = 0.058;
const TORSO_H = 0.56;
const SHOULDER_Y = HIP_Y + TORSO_H - 0.045;
const SHOULDER_X = 0.188;
const ARM_L = 0.6;
const ARM_R = 0.048;
const HEAD_Y = 1.6;
const ARM_SPLAY = 0.07;
const WALK_LEAN = (3 * Math.PI) / 180;
/** Limb instances per person: thighs, shins, arms. */
const LIMBS = 6;
/** Crouching at the pickup bin: [hip, knee] per leg, torso lean, step back. */
const CROUCH = { hipL: 1.1, kneeL: 1.75, hipR: 0.95, kneeR: 1.7, lean: 0.5, stepBack: 0.12 };

const TOPS = [
  '#3B4A5C', // navy
  '#3A3D42', // charcoal
  '#5E6248', // olive
  '#A88B63', // camel
  '#6E3B3B', // oxblood
  '#5A6E85', // slate blue
  '#D8D2C4', // cream
  '#3F5446', // forest
  '#8A8C8E', // gray
  '#B39A55', // muted mustard
  '#E6E3DC', // white
  '#7B5E57', // brown
];
const PANTS = ['#2F3A4C', '#25272A', '#9C8F74', '#6B6E72', '#2B3242', '#4A4540', '#3E4A3E'];
const SKIN = ['#F1D3BC', '#E5BFA0', '#D1A07A', '#B07B57', '#8A5A3C', '#5E3D2A'];
const HAIR = ['#2A211C', '#3D2C21', '#5B4330', '#A88A5C', '#8F8F8F', '#1C1A19', '#6E3F2A'];
const SHOES = ['#2A2A2C', '#E8E5DF', '#5A4434', '#1E1F21', '#7A7C80'];

interface Look {
  scale: number;
  width: number;
  top: THREE.Color;
  pants: THREE.Color;
  skin: THREE.Color;
  hair: THREE.Color;
  shoes: THREE.Color;
}

function lookFor(out: Look, look: number): Look {
  const s = Math.floor(look * 2 ** 31);
  const [h0, h1] = PEDESTRIANS.heightM;
  const [w0, w1] = PEDESTRIANS.shoulderScale;
  // Height and build loosely correlated (taller people a bit broader).
  const hr = hash01(s, 1);
  out.scale = (h0 + (h1 - h0) * hr) / REF_H;
  out.width = w0 + (w1 - w0) * (0.6 * hr + 0.4 * hash01(s, 2));
  out.top.set(pick(TOPS, hash01(s, 3)));
  out.pants.set(pick(PANTS, hash01(s, 4)));
  out.skin.set(pick(SKIN, hash01(s, 5)));
  out.hair.set(pick(HAIR, hash01(s, 6)));
  out.shoes.set(pick(SHOES, hash01(s, 7)));
  return out;
}

function geometries() {
  const torso = new THREE.CylinderGeometry(0.2, 0.152, TORSO_H, 6, 1);
  torso.rotateY(Math.PI / 6); // flat chest, not a ridge
  torso.scale(1, 1, 0.6);
  torso.translate(0, TORSO_H / 2, 0);
  const head = new THREE.DodecahedronGeometry(0.104);
  head.scale(0.9, 1.13, 0.98);
  // Hair shell: covers the crown, sides and back; the face stays clear in front.
  const hair = new THREE.DodecahedronGeometry(0.112);
  hair.scale(1, 1, 0.95);
  hair.translate(0, 0.018, -0.03);
  // Unit limb hanging from its top (pivot), tapered.
  const limb = new THREE.CylinderGeometry(1, 0.72, 1, 5, 1);
  limb.translate(0, -0.5, 0);
  const shoe = new THREE.BoxGeometry(0.098, 0.075, 0.25);
  shoe.translate(0, -0.0375, 0.045);
  for (const g of [torso, head, hair, limb, shoe]) {
    // Polyhedra are already non-indexed (toNonIndexed would return `g` itself).
    if (g.index) {
      const n = g.toNonIndexed();
      g.copy(n);
      n.dispose();
    }
    g.computeVertexNormals();
  }
  return { torso, head, hair, limb, shoe };
}

export interface Crowd {
  group: THREE.Group;
  mirror: THREE.Group;
  /**
   * Pose everyone for this frame. `reach[i]` (0..1) bends walker `i` toward
   * the pickup bin. Returns the number of people drawn.
   */
  update(
    walkers: readonly WalkerState[],
    enabled: readonly boolean[],
    reach: ArrayLike<number>,
  ): number;
  /** Right-hand position of walker `i` from the last update (crowd-group space). */
  hand(i: number, out: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

export function createCrowd(capacity = PEDESTRIANS.max): Crowd {
  const g = geometries();
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.86,
    metalness: 0,
    flatShading: true,
  });
  const torso = dynamicInstances(g.torso, material, capacity, 'people-torso');
  const head = dynamicInstances(g.head, material, capacity, 'people-head');
  const hair = dynamicInstances(g.hair, material, capacity, 'people-hair');
  const limbs = dynamicInstances(g.limb, material, capacity * LIMBS, 'people-limbs');
  const shoes = dynamicInstances(g.shoe, material, capacity * 2, 'people-shoes');
  const meshes = [torso, head, hair, limbs, shoes];
  const white = new THREE.Color('#ffffff');
  for (const m of meshes) {
    for (let i = 0; i < m.instanceMatrix.count; i++) m.setColorAt(i, white);
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const group = new THREE.Group();
  group.name = 'people';
  group.add(...meshes);
  const mirror = new THREE.Group();
  mirror.name = 'people-mirror';
  const mirrors = meshes.map(mirrorInstances);
  mirror.add(...mirrors);

  // Preallocated per-frame scratch (no allocations in update).
  const looks: Look[] = Array.from({ length: capacity }, () => ({
    scale: 1,
    width: 1,
    top: new THREE.Color(),
    pants: new THREE.Color(),
    skin: new THREE.Color(),
    hair: new THREE.Color(),
    shoes: new THREE.Color(),
  }));
  const lookTrip = new Array<number>(capacity).fill(Number.NaN);
  const hands = Array.from({ length: capacity }, () => new THREE.Vector3());
  const cycle = emptyCycle();
  const root = new THREE.Matrix4();
  const upper = new THREE.Matrix4();
  const hipM = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const handLocal = new THREE.Vector3();
  const LEG = THIGH_M + SHIN_M;

  const compose = (
    out: THREE.Matrix4,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    p.set(x, y, z);
    q.setFromEuler(e.set(rx, ry, rz, 'YXZ'));
    s.set(sx, sy, sz);
    return out.compose(p, q, s);
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  function update(
    walkers: readonly WalkerState[],
    enabled: readonly boolean[],
    reach: ArrayLike<number>,
  ): number {
    let n = 0;
    for (let i = 0; i < Math.min(capacity, walkers.length); i++) {
      const w = walkers[i];
      if (!w.active || !enabled[i]) continue;
      const lk = looks[i];
      if (lookTrip[i] !== w.trip) {
        lookFor(lk, w.look);
        lookTrip[i] = w.trip;
      }
      walkCycle(cycle, w.distance, w.cruise > 0 ? w.speed / w.cruise : 0);
      const r = reach[i] ?? 0;
      // Crouching at the pickup bin blends over the (standing) walk pose.
      const hipL = lerp(cycle.hipL, CROUCH.hipL, r);
      const hipR = lerp(cycle.hipR, CROUCH.hipR, r);
      const kneeL = lerp(cycle.kneeL, CROUCH.kneeL, r);
      const kneeR = lerp(cycle.kneeR, CROUCH.kneeR, r);
      const crouchDrop = Math.max(legHeight(hipL, kneeL), legHeight(hipR, kneeR)) - LEG;
      const drop = lerp(cycle.bob, crouchDrop, r);
      const lean = WALK_LEAN * (w.speed > 0 ? 1 : 0.3) + r * CROUCH.lean;
      const sc = lk.scale;
      const back = r * CROUCH.stepBack;
      compose(
        root,
        w.x - Math.sin(w.yaw) * back,
        drop * sc,
        w.z - Math.cos(w.yaw) * back,
        0,
        w.yaw,
        0,
        sc,
        sc,
        sc,
      );
      compose(upper, 0, HIP_Y, 0, lean, 0, 0, 1, 1, 1);
      upper.premultiply(root);

      // Torso, head, hair.
      compose(m, 0, 0, 0, 0, 0, 0, lk.width, 1, 1);
      torso.setMatrixAt(n, tmp.multiplyMatrices(upper, m));
      torso.setColorAt(n, lk.top);
      compose(m, 0, HEAD_Y - HIP_Y, 0.012, -lean * 0.6, 0, 0, 1, 1, 1);
      tmp.multiplyMatrices(upper, m);
      head.setMatrixAt(n, tmp);
      hair.setMatrixAt(n, tmp);
      head.setColorAt(n, lk.skin);
      hair.setColorAt(n, lk.hair);

      // Legs: thigh from the hip, shin from the knee (+x is the walker's left).
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? 1 : -1;
        const hip = side === 0 ? hipL : hipR;
        const knee = side === 0 ? kneeL : kneeR;
        compose(hipM, sign * HIP_X * lk.width, HIP_Y, 0, -hip, 0, 0, 1, 1, 1);
        hipM.premultiply(root);
        m.makeScale(THIGH_R, THIGH_M, THIGH_R);
        limbs.setMatrixAt(n * LIMBS + side, tmp.multiplyMatrices(hipM, m));
        limbs.setColorAt(n * LIMBS + side, lk.pants);
        // Knee: down the thigh, then fold the shin back.
        compose(m, 0, -THIGH_M, 0, knee, 0, 0, 1, 1, 1);
        hipM.multiply(m);
        m.makeScale(SHIN_R, SHIN_M, SHIN_R);
        limbs.setMatrixAt(n * LIMBS + 2 + side, tmp.multiplyMatrices(hipM, m));
        limbs.setColorAt(n * LIMBS + 2 + side, lk.pants);
        // Shoe stays level-ish: undo most of the leg's net angle.
        compose(m, 0, -SHIN_M, 0, (hip - knee) * 0.85, 0, 0, 1, 1, 1);
        shoes.setMatrixAt(n * 2 + side, tmp.multiplyMatrices(hipM, m));
        shoes.setColorAt(n * 2 + side, lk.shoes);
      }
      // Arms swing against the legs; the right arm reaches down to the bin.
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? 1 : -1;
        const swing = side === 0 ? cycle.arm : -cycle.arm;
        const a = side === 1 ? lerp(swing, lean + 0.3, r) : lerp(swing, lean * 0.6, r);
        compose(
          m,
          sign * SHOULDER_X * lk.width,
          SHOULDER_Y - HIP_Y,
          0,
          -a,
          0,
          sign * ARM_SPLAY * (1 - r * 0.6),
          ARM_R,
          ARM_L,
          ARM_R,
        );
        tmp.multiplyMatrices(upper, m);
        limbs.setMatrixAt(n * LIMBS + 4 + side, tmp);
        limbs.setColorAt(n * LIMBS + 4 + side, lk.top);
        if (side === 1) hands[i].copy(handLocal.set(0, -1, 0)).applyMatrix4(tmp);
      }
      n++;
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    torso.count = head.count = hair.count = n;
    limbs.count = n * LIMBS;
    shoes.count = n * 2;
    mirrors.forEach((mm, j) => (mm.count = meshes[j].count));
    return n;
  }

  return {
    group,
    mirror,
    update,
    hand: (i, out) => out.copy(hands[i]),
    dispose() {
      for (const geo of Object.values(g)) geo.dispose();
      material.dispose();
    },
  };
}
