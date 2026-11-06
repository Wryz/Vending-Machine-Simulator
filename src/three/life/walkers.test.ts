import { PEDESTRIANS } from '@/config/streetLife';

import { streetLayout } from './layout';
import {
  activeWalkerCount,
  emptyCycle,
  emptyWalker,
  legHeight,
  lerpAngle,
  SHIN_M,
  THIGH_M,
  walkCycle,
  walkerAt,
  walkerSlot,
  type WalkerState,
} from './walkers';

const layout = streetLayout(0.9);
const SEED = 12345;

function sample(t: number, seed = SEED): WalkerState[] {
  return Array.from({ length: PEDESTRIANS.max }, (_, i) =>
    walkerAt(emptyWalker(), seed, i, t, layout),
  );
}

describe('walkers', () => {
  it('is deterministic for a seed and time', () => {
    expect(sample(137.25)).toEqual(sample(137.25));
    expect(sample(137.25, 1)).not.toEqual(sample(137.25, 2));
  });

  it('keeps everyone on the sidewalk, between the machine and the curb', () => {
    for (let t = 0; t < 1200; t += 0.37) {
      for (const w of sample(t)) {
        if (!w.active) continue;
        expect(Math.abs(w.x)).toBeLessThanOrEqual(PEDESTRIANS.halfSpanM + 1e-6);
        expect(w.z).toBeGreaterThanOrEqual(layout.frontZ + 0.3);
        expect(w.z).toBeLessThanOrEqual(layout.curbZ - 0.5);
        expect(Number.isFinite(w.yaw)).toBe(true);
      }
    }
  });

  it('walks through nobody, customers included', () => {
    let pairs = 0;
    for (let t = 0; t < 3000; t += 0.2) {
      const ws = sample(t).filter((w) => w.active);
      for (let a = 0; a < ws.length; a++)
        for (let b = a + 1; b < ws.length; b++) {
          pairs++;
          expect(Math.hypot(ws[a].x - ws[b].x, ws[a].z - ws[b].z)).toBeGreaterThan(0.45);
        }
    }
    expect(pairs).toBeGreaterThan(100);
  });

  it('customers stop 2–4 s facing the machine, one at a time', () => {
    const dt = 0.05;
    const stops: number[] = [];
    let run = 0;
    for (let t = 0; t < 3000; t += dt) {
      const at = sample(t).filter((w) => w.active && w.atMachine);
      expect(at.length).toBeLessThanOrEqual(1);
      if (at.length) {
        run += dt;
        const w = at[0];
        expect(w.speed).toBe(0);
        expect(Math.abs(w.x - layout.standX)).toBeLessThan(1e-6);
        expect(Math.abs(w.z - layout.standZ)).toBeLessThan(1e-6);
        if (w.turn > 0.99)
          expect(Math.abs(lerpAngle(w.yaw, Math.PI, 1) - w.yaw)).toBeLessThan(0.05);
      } else if (run > 0) {
        stops.push(run);
        run = 0;
      }
    }
    expect(stops.length).toBeGreaterThan(5);
    for (const s of stops) {
      expect(s).toBeGreaterThan(1.9);
      expect(s).toBeLessThan(4.1);
    }
  });

  it('moves continuously and faces its direction of travel', () => {
    const a = emptyWalker();
    const b = emptyWalker();
    for (let i = 0; i < PEDESTRIANS.max; i++) {
      const dir = walkerSlot(i).dir;
      for (let t = 0; t < 400; t += 0.5) {
        walkerAt(a, SEED, i, t, layout);
        walkerAt(b, SEED, i, t + 0.05, layout);
        if (!a.active || !b.active || a.trip !== b.trip) continue;
        expect(Math.abs(b.x - a.x)).toBeLessThan(0.1);
        expect(Math.sign(b.x - a.x) || dir).toBe(dir);
        if (!a.atMachine) expect(Math.sin(a.yaw) * dir).toBeGreaterThan(0.5);
      }
    }
  });

  it('scales the number of people with crowd density', () => {
    expect(activeWalkerCount(0)).toBe(0);
    expect(activeWalkerCount(0.1)).toBe(1);
    expect(activeWalkerCount(1)).toBe(PEDESTRIANS.max);
    let prev = 0;
    for (let c = 0; c <= 1; c += 0.05) {
      const n = activeWalkerCount(c);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it('settles the walk cycle when standing and repeats every stride', () => {
    const c = walkCycle(emptyCycle(), 3.3, 0);
    expect([c.hipL, c.hipR, c.kneeL, c.kneeR, c.arm, c.bob].every((v) => v === 0)).toBe(true);
    for (let d = 0; d < 3; d += 0.05) {
      const a = { ...walkCycle(emptyCycle(), d, 1) };
      const b = walkCycle(emptyCycle(), d + PEDESTRIANS.strideM, 1);
      expect(b.hipL).toBeCloseTo(a.hipL, 6);
      expect(b.bob).toBeCloseTo(a.bob, 6);
      expect(a.hipR).toBeCloseTo(-a.hipL, 9);
      if (Math.abs(a.hipL) > 1e-3) expect(Math.sign(a.arm)).toBe(-Math.sign(a.hipL));
      expect(a.kneeL).toBeGreaterThanOrEqual(0);
      expect(a.kneeR).toBeGreaterThanOrEqual(0);
      // Only the swing leg bends.
      expect(Math.min(a.kneeL, a.kneeR)).toBe(0);
      // Natural, not bouncy: hips move a few centimeters at most.
      expect(a.bob).toBeLessThanOrEqual(0);
      expect(a.bob).toBeGreaterThan(-0.04);
    }
    expect(legHeight(0, 0)).toBeCloseTo(THIGH_M + SHIN_M);
  });
});
