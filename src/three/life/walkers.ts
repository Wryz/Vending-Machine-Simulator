import { PEDESTRIANS } from '@/config/streetLife';

import type { StreetLayout } from './layout';
import { hash01 } from './random';

/**
 * Pedestrians on the sidewalk in front of the machine (pure, deterministic).
 *
 * Each walker slot `i` has a fixed direction, sub-lane and speed, and repeats
 * a trip every `periodS` with a jittered start: enter at one end of the
 * street, walk to the other, vanish, come back later as a different person
 * (`trip` changes, so does `look`). Sharing a speed inside a sub-lane means
 * nobody walks through anybody. Customer slots sometimes detour to the
 * machine, slow down, stand facing it for 2–4 s and walk on.
 *
 * Positions are in the machine's local frame (see layout.ts). Yaw follows
 * three.js `rotation.y` for a model facing +z: facing = (sin yaw, cos yaw).
 */

export interface WalkerState {
  /** On the street at this instant. */
  active: boolean;
  x: number;
  z: number;
  yaw: number;
  /** Current speed (m/s); 0 while standing at the machine. */
  speed: number;
  /** Cruise speed of this walker (m/s). */
  cruise: number;
  /** Distance walked this trip (drives the walk cycle). */
  distance: number;
  /** Standing at the machine. */
  atMachine: boolean;
  /** 0..1 how far they have turned to face the machine. */
  turn: number;
  /** Seconds left standing at the machine (0 when not stopped). */
  stopLeft: number;
  /** Trip counter: a new trip is a new person. */
  trip: number;
  /** 0..1 appearance seed for this trip. */
  look: number;
}

export function emptyWalker(): WalkerState {
  return {
    active: false,
    x: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    cruise: 0,
    distance: 0,
    atMachine: false,
    turn: 0,
    stopLeft: 0,
    trip: -1,
    look: 0,
  };
}

export interface WalkerSlot {
  dir: 1 | -1;
  subLane: number;
  speed: number;
  phaseS: number;
  canStop: boolean;
}

export function walkerSlot(i: number): WalkerSlot {
  const P = PEDESTRIANS;
  const subLane = Math.floor(i / 2) % P.subLaneM.length;
  const dir = i % 2 === 0 ? 1 : -1;
  return {
    dir,
    subLane,
    speed: dir > 0 ? P.speedsMps.east : P.speedsMps.west,
    phaseS: (i * P.periodS) / P.max,
    canStop: (P.customer.slots as readonly number[]).includes(i),
  };
}

/** How many walker slots are in use for a 0..1 crowd density. */
export function activeWalkerCount(crowd: number): number {
  const c = Math.min(1, Math.max(0, crowd));
  if (c <= 0.02) return 0;
  return Math.max(1, Math.min(PEDESTRIANS.max, Math.round(c * PEDESTRIANS.max)));
}

const smooth = (u: number) => {
  const c = Math.min(1, Math.max(0, u));
  return c * c * (3 - 2 * c);
};

/** Shortest-path angle interpolation. */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function tripStart(seed: number, i: number, k: number): number {
  const P = PEDESTRIANS;
  return walkerSlot(i).phaseS + k * P.periodS + hash01(seed, i, k, 1) * P.startJitterS;
}

/** Earliest trip start after `start` among walkers going the same way (same speed). */
function nextStartAfter(seed: number, i: number, k: number, start: number): number {
  const P = PEDESTRIANS;
  let best = Infinity;
  for (let j = i % 2; j < P.max; j += 2) {
    for (let kk = k - 1; kk <= k + 1; kk++) {
      if (j === i && kk === k) continue;
      const s = tripStart(seed, j, kk);
      if (s > start && s < best) best = s;
    }
  }
  return best;
}

/** Fill `out` with walker `i` at time `t` (seconds). Allocation-free. */
export function walkerAt(
  out: WalkerState,
  seed: number,
  i: number,
  t: number,
  layout: StreetLayout,
): WalkerState {
  const P = PEDESTRIANS;
  const C = P.customer;
  const slot = walkerSlot(i);
  const v = slot.speed;
  const dir = slot.dir;
  const L = P.halfSpanM;
  const k = Math.floor((t - slot.phaseS) / P.periodS);
  const start = tripStart(seed, i, k);
  const tau = t - start;
  const a = C.easeM;
  let stopS = 0;
  if (slot.canStop && hash01(seed, i, k, 2) < C.chance) {
    stopS = C.stopS[0] + hash01(seed, i, k, 3) * (C.stopS[1] - C.stopS[0]);
    // Only stop if the next walker behind won't catch up inside the detour.
    const delay = stopS + (2 * a) / v + (2 * C.detourM) / v + 1;
    if (nextStartAfter(seed, i, k, start) - start < delay) stopS = 0;
  }
  const stops = stopS > 0;
  const duration = stops ? (2 * L) / v + (2 * a) / v + stopS : (2 * L) / v;

  out.trip = k;
  out.look = hash01(seed, i, k, 4);
  out.cruise = v;
  out.atMachine = false;
  out.turn = 0;
  out.stopLeft = 0;
  if (tau < 0 || tau > duration) {
    out.active = false;
    out.speed = 0;
    out.distance = 0;
    return out;
  }
  out.active = true;
  const laneZ = (dir > 0 ? layout.walkEastZ : layout.walkWestZ) + P.subLaneM[slot.subLane];
  const x0 = -dir * L;

  let x: number;
  let speed = v;
  let distance: number;
  if (!stops) {
    distance = v * tau;
    x = x0 + dir * distance;
  } else {
    const xs = layout.standX;
    const dA = Math.abs(xs - x0) - a;
    const tA = dA / v;
    const tB = (2 * a) / v;
    const tC = stopS;
    const tD = tB;
    if (tau < tA) {
      distance = v * tau;
    } else if (tau < tA + tB) {
      const u = tau - tA;
      distance = dA + v * u - (v * u * u) / (2 * tB);
      speed = v * (1 - u / tB);
    } else if (tau < tA + tB + tC) {
      const u = tau - tA - tB;
      distance = dA + a;
      speed = 0;
      out.atMachine = true;
      out.stopLeft = tC - u;
      out.turn = smooth(u / C.turnS) * smooth((tC - u) / C.turnS);
    } else if (tau < tA + tB + tC + tD) {
      const u = tau - tA - tB - tC;
      distance = dA + a + (v * u * u) / (2 * tD);
      speed = v * (u / tD);
    } else {
      distance = dA + 2 * a + v * (tau - tA - tB - tC - tD);
    }
    x = x0 + dir * distance;
  }

  // Lateral detour toward the stand point (customers only).
  let z = laneZ;
  let dzdx = 0;
  if (stops) {
    const R = C.detourM;
    const off = x - layout.standX;
    const u = 1 - Math.min(1, Math.abs(off) / R);
    if (u > 0) {
      const delta = layout.standZ - laneZ;
      z = laneZ + delta * u * u * (3 - 2 * u);
      dzdx = (delta * 6 * u * (1 - u) * -Math.sign(off)) / R;
    }
  }
  const walkYaw = Math.atan2(dir, dir * dzdx);
  out.x = x;
  out.z = z;
  out.speed = speed;
  out.distance = distance;
  // Face the machine (-z, yaw = π) while standing.
  out.yaw = out.turn > 0 ? lerpAngle(walkYaw, Math.PI, out.turn) : walkYaw;
  return out;
}

export interface WalkCycle {
  /** Leg swing (radians, + = left leg forward). */
  leg: number;
  /** Arm swing (radians, opposite to the same-side leg). */
  arm: number;
  /** Vertical body offset (m). */
  bob: number;
}

/**
 * Walk cycle from distance walked (no foot skating) and speed fraction
 * (amplitude settles to a neutral stance as they stop). Natural, not bouncy:
 * highest at mid-stance, lowest at double support.
 */
export function walkCycle(out: WalkCycle, distance: number, speedFrac: number): WalkCycle {
  const P = PEDESTRIANS;
  const amp = Math.min(1, Math.max(0, speedFrac * 1.4));
  const phase = (distance / P.strideM) * Math.PI * 2;
  const s = Math.sin(phase);
  out.leg = ((P.legSwingDeg * Math.PI) / 180) * s * amp;
  out.arm = ((-P.armSwingDeg * Math.PI) / 180) * s * amp;
  out.bob = P.bobM * 0.5 * Math.cos(2 * phase) * amp;
  return out;
}
