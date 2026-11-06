import { CARS } from '@/config/streetLife';

import { nearLaneDir, type StreetLayout } from './layout';
import { hash01 } from './random';

/**
 * Cars on the road beyond the curb (pure, deterministic).
 *
 * Each lane runs on a fixed cycle; per cycle 0–2 cars enter (more with more
 * traffic) at least `minHeadwayS` apart, so a faster car can never catch a
 * slower one before both have left the street. A car takes less than one
 * cycle to cross, so only the current and previous cycles can be on screen.
 */

export type CarKind = 0 | 1 | 2; // sedan, hatchback, van

export interface CarState {
  /** Stable id while this car is on the street. */
  id: number;
  lane: 0 | 1;
  kind: CarKind;
  x: number;
  z: number;
  /** Travel direction along x. */
  dir: 1 | -1;
  speed: number;
  /** Distance driven (turns the wheels). */
  distance: number;
  /** 0..1 paint seed. */
  look: number;
}

export function emptyCar(): CarState {
  return { id: -1, lane: 0, kind: 0, x: 0, z: 0, dir: 1, speed: 0, distance: 0, look: 0 };
}

/** Cars entering lane `lane` during cycle `k` for a 0..1 traffic density. */
export function carsInCycle(seed: number, lane: number, k: number, traffic: number): number {
  const t = Math.min(1, Math.max(0, traffic));
  return Math.min(CARS.maxPerCycle, Math.floor(t * CARS.maxPerCycle + hash01(seed, lane, k, 7)));
}

function kindFor(r: number): CarKind {
  return r < 0.5 ? 0 : r < 0.82 ? 1 : 2;
}

/**
 * Fill `out` with the cars on the street at time `t` (seconds); returns how
 * many were written. Allocation-free when `out` is preallocated.
 */
export function carsAt(
  out: CarState[],
  seed: number,
  t: number,
  traffic: number,
  layout: StreetLayout,
  leftHandTraffic: boolean,
): number {
  const C = CARS;
  const span = C.halfSpanM * 2;
  let n = 0;
  const near = nearLaneDir(leftHandTraffic);
  for (let lane = 0 as 0 | 1; lane <= 1; lane = (lane + 1) as 0 | 1) {
    const dir = (lane === 0 ? near : -near) as 1 | -1;
    const phase = lane * C.cycleS * 0.5;
    const kNow = Math.floor((t - phase) / C.cycleS);
    for (let k = kNow - 1; k <= kNow; k++) {
      const count = carsInCycle(seed, lane, k, traffic);
      if (count === 0) continue;
      const slack = C.cycleS - count * C.minHeadwayS;
      const f0 = hash01(seed, lane, k, 10);
      const f1 = hash01(seed, lane, k, 11);
      const lo = Math.min(f0, f1);
      const hi = Math.max(f0, f1);
      const cycleStart = phase + k * C.cycleS;
      for (let j = 0; j < count; j++) {
        const f = count === 1 ? f0 : j === 0 ? lo : hi;
        const enter = cycleStart + f * slack + j * C.minHeadwayS;
        const speed =
          C.speedMps[0] + hash01(seed, lane, k * 4 + j, 12) * (C.speedMps[1] - C.speedMps[0]);
        const d = (t - enter) * speed;
        if (d < 0 || d > span || n >= out.length) continue;
        const c = out[n++];
        c.id = (k * 2 + lane) * 4 + j;
        c.lane = lane;
        c.kind = kindFor(hash01(seed, lane, k * 4 + j, 13));
        c.dir = dir;
        c.speed = speed;
        c.distance = d;
        c.x = -dir * C.halfSpanM + dir * d;
        c.z = layout.carLaneZ[lane];
        c.look = hash01(seed, lane, k * 4 + j, 14);
      }
    }
  }
  return n;
}
