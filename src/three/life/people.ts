import * as THREE from 'three';

import { PEDESTRIANS, PERSON_SHAPE } from '@/config/streetLife';

import { dynamicInstances, mirrorInstances } from './geometry';
import { hash01, pick } from './random';
import { emptyCycle, LEG_M, legHeight, walkCycle, type WalkerState } from './walkers';

/**
 * Simple toy-figure pedestrians (SPEC §3.3): a round head, a rounded bean
 * body and stubby rounded arms and legs, no hands, feet or hair; matte,
 * friendly clothing colors. One InstancedMesh per part (body, head, legs,
 * arms) for the whole crowd: 6 instances and ~180 triangles a person. Legs
 * swing straight from the hip. A second set of meshes shares the same
 * instance buffers to draw the shop-window reflection for free.
 */

const S = PERSON_SHAPE;
const HIP_Y = S.legM;
const ARM_L = S.arm.lengthM;
const WALK_LEAN = (3 * Math.PI) / 180;
const CROUCH = S.crouch;

const TOPS = [
  '#F0785E', // coral
  '#F4BE4A', // sunflower
  '#5EA6E6', // sky
  '#4FC39C', // mint
  '#A88AE0', // lilac
  '#E85A50', // tomato
  '#2FA6A0', // teal
  '#F6A673', // peach
  '#F2EBDA', // cream
  '#4E68BE', // cobalt
  '#EE8EB2', // pink
  '#8DC462', // leaf
];
const PANTS = ['#3F5C93', '#545B6C', '#C8A878', '#3A3F4D', '#7A5C9E', '#4E8060', '#6E8FB8'];
const SKIN = ['#F1D3BC', '#E5BFA0', '#D1A07A', '#B07B57', '#8A5A3C', '#5E3D2A'];

interface Look {
  scale: number;
  width: number;
  top: THREE.Color;
  pants: THREE.Color;
  skin: THREE.Color;
  arms: THREE.Color;
}

function lookFor(out: Look, look: number): Look {
  const s = Math.floor(look * 2 ** 31);
  const [h0, h1] = PEDESTRIANS.heightM;
  const [w0, w1] = PEDESTRIANS.shoulderScale;
  // Height and build loosely correlated (taller people a bit broader).
  const hr = hash01(s, 1);
  out.scale = (h0 + (h1 - h0) * hr) / S.refHeightM;
  out.width = w0 + (w1 - w0) * (0.6 * hr + 0.4 * hash01(s, 2));
  out.top.set(pick(TOPS, hash01(s, 3)));
  out.pants.set(pick(PANTS, hash01(s, 4)));
  out.skin.set(pick(SKIN, hash01(s, 5)));
  out.arms.copy(hash01(s, 6) < S.bareArmsShare ? out.skin : out.top);
  return out;
}

/** Non-indexed copy without zero-area triangles (lathe and capsule poles). */
function flatFaces(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.attributes.position;
  const keep: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-12) continue;
    for (let k = 0; k < 3; k++) keep.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  out.computeVertexNormals();
  if (src !== g) src.dispose();
  g.dispose();
  return out;
}

/** Squash of a limb's end cap: a blunt, rounded stub instead of a pointy cone. */
const TIP_SQUASH = 0.5;

/** Rounded limb hanging from its pivot (y = 0) down to its blunt tip at y = -length. */
function limb(radius: number, length: number, radial: number) {
  const tipY = -(length - radius * TIP_SQUASH); // center of the end cap
  const g = new THREE.CapsuleGeometry(radius, -tipY, 1, radial);
  g.translate(0, tipY / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < tipY) pos.setY(i, tipY + (y - tipY) * TIP_SQUASH);
  }
  return g;
}

/**
 * Part geometries in the person's frame at the reference height: body and
 * head relative to the hip pivot, legs and arms hanging from their pivots.
 * `headScale` enlarges the head (the tiny map sprites read better with it).
 */
export function personGeometries(headScale = 1) {
  const { bottomM, topM, radiusM: r, depth } = S.body;
  const h = topM - bottomM;
  const profile = [
    [0, 0],
    [0.72 * r, 0.05 * h],
    [r, 0.24 * h],
    [0.93 * r, 0.66 * h],
    [0.62 * r, 0.95 * h],
    [0, h],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(profile, 7);
  body.scale(1, 1, depth);
  body.translate(0, bottomM - HIP_Y, 0);
  const head = new THREE.IcosahedronGeometry(S.head.radiusM * headScale, 1);
  head.translate(0, S.head.centerYM - HIP_Y + (headScale - 1) * S.head.radiusM * 0.6, 0);
  return {
    body: flatFaces(body),
    head: flatFaces(head),
    leg: flatFaces(limb(S.legRadiusM, S.legM, 6)),
    arm: flatFaces(limb(S.arm.radiusM, ARM_L, 5)),
  };
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
  const g = personGeometries();
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const body = dynamicInstances(g.body, material, capacity, 'people-body');
  const head = dynamicInstances(g.head, material, capacity, 'people-head');
  const legs = dynamicInstances(g.leg, material, capacity * 2, 'people-legs');
  const arms = dynamicInstances(g.arm, material, capacity * 2, 'people-arms');
  const meshes = [body, head, legs, arms];
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
    arms: new THREE.Color(),
  }));
  const lookTrip = new Array<number>(capacity).fill(Number.NaN);
  const hands = Array.from({ length: capacity }, () => new THREE.Vector3());
  const cycle = emptyCycle();
  const root = new THREE.Matrix4();
  const upper = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const handLocal = new THREE.Vector3();

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
      // Squatting at the pickup bin blends over the (standing) walk pose.
      const hipL = lerp(cycle.hipL, CROUCH.hipRad, r);
      const hipR = lerp(cycle.hipR, CROUCH.hipRad, r);
      const splay = CROUCH.splayRad * r;
      const crouchDrop = legHeight(CROUCH.hipRad, CROUCH.splayRad) - LEG_M;
      const drop = lerp(cycle.bob, crouchDrop, r);
      const lean = WALK_LEAN * (w.speed > 0 ? 1 : 0.3) + r * CROUCH.leanRad;
      const sc = lk.scale;
      const back = r * CROUCH.stepBackM;
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
      compose(upper, 0, HIP_Y, 0, lean, 0, cycle.roll * (1 - r), 1, 1, 1);
      upper.premultiply(root);

      // Body and head.
      compose(m, 0, 0, 0, 0, 0, 0, lk.width, 1, 1);
      body.setMatrixAt(n, tmp.multiplyMatrices(upper, m));
      body.setColorAt(n, lk.top);
      // The head stays a little more upright than the leaning body.
      const headY = S.head.centerYM - HIP_Y;
      compose(m, 0, headY, 0, -lean * 0.35, 0, 0, 1, 1, 1);
      m.multiply(tmp.makeTranslation(0, -headY, 0));
      head.setMatrixAt(n, tmp.multiplyMatrices(upper, m));
      head.setColorAt(n, lk.skin);

      // Legs swing straight from the hip (+x is the walker's left).
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? 1 : -1;
        const hip = side === 0 ? hipL : hipR;
        compose(m, sign * S.hipXM * lk.width, HIP_Y, 0, -hip, 0, sign * splay, 1, 1, 1);
        legs.setMatrixAt(n * 2 + side, tmp.multiplyMatrices(root, m));
        legs.setColorAt(n * 2 + side, lk.pants);
      }
      // Arms swing against the legs; the right arm reaches down to the bin.
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? 1 : -1;
        const swing = side === 0 ? cycle.arm : -cycle.arm;
        const a = side === 1 ? lerp(swing, lean + 0.45, r) : lerp(swing, lean * 0.5, r);
        compose(
          m,
          sign * S.arm.shoulderXM * lk.width,
          S.arm.shoulderYM - HIP_Y,
          0,
          -a,
          0,
          sign * S.arm.splayRad * (1 - r * 0.6),
          1,
          1,
          1,
        );
        tmp.multiplyMatrices(upper, m);
        arms.setMatrixAt(n * 2 + side, tmp);
        arms.setColorAt(n * 2 + side, lk.arms);
        if (side === 1) hands[i].copy(handLocal.set(0, -ARM_L, 0)).applyMatrix4(tmp);
      }
      n++;
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    body.count = head.count = n;
    legs.count = arms.count = n * 2;
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
