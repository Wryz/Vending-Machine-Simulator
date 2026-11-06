import { CLOSEUP_MOTION } from '@/config/streetLife';

import { clampOrbit, dragOrbit, follow, idleCamera, orbitWeight, rotateY } from './camera';
import { isLeftHandTraffic, streetDensity } from './density';
import {
  coinGlintsMs,
  dropPose,
  flicker,
  pulse,
  restockPlan,
  slideProgress,
  soldSlots,
} from './interactions';

describe('restock plan', () => {
  it('staggers slots and caps the ticks', () => {
    const p = restockPlan(20);
    expect(p.delaysMs).toHaveLength(20);
    expect(p.ticksMs).toHaveLength(CLOSEUP_MOTION.restock.maxTicks);
    expect(p.ticksMs[0]).toBe(CLOSEUP_MOTION.restock.slideMs);
    expect(p.ticksMs[p.ticksMs.length - 1]).toBe(p.doneMs);
    for (let i = 1; i < p.ticksMs.length; i++)
      expect(p.ticksMs[i]).toBeGreaterThan(p.ticksMs[i - 1]);
    expect(restockPlan(3).ticksMs).toHaveLength(3);
    expect(restockPlan(0)).toEqual({ delaysMs: [], ticksMs: [], doneMs: 0 });
  });

  it('slides from the back of the coil into place', () => {
    expect(slideProgress(0, 100)).toBe(0);
    expect(slideProgress(100 + CLOSEUP_MOTION.restock.slideMs, 100)).toBe(1);
    expect(slideProgress(200, 100)).toBeGreaterThan(0.5);
  });
});

describe('sales, coins, broken, selection', () => {
  it('finds sold slots, one per unit, capped', () => {
    expect(soldSlots([5, 5, 5], [5, 3, 4])).toEqual([1, 1, 2]);
    expect(soldSlots([9, 9], [0, 0], 3)).toEqual([0, 0, 0]);
    expect(soldSlots([1, 2], [3, 2])).toEqual([]);
  });

  it('glints coins in order', () => {
    const g = coinGlintsMs();
    expect(g).toHaveLength(CLOSEUP_MOTION.coins.count);
    for (let i = 1; i < g.length; i++) expect(g[i]).toBeGreaterThan(g[i - 1]);
    expect(g[g.length - 1]).toBeLessThan(CLOSEUP_MOTION.coinTrayDelayMs);
  });

  it('flickers mostly on, sometimes off, deterministically', () => {
    let dim = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const v = flicker(i * 0.013);
      expect(v).toBe(flicker(i * 0.013));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      if (v < 0.5) dim++;
    }
    expect(dim / n).toBeGreaterThan(0.03);
    expect(dim / n).toBeLessThan(0.25);
  });

  it('pulses smoothly between 0 and 1', () => {
    expect(pulse(0)).toBeCloseTo(0);
    expect(pulse(CLOSEUP_MOTION.selectedPulseS / 2)).toBeCloseTo(1);
  });

  it('drops a product with gravity and lands', () => {
    const p = { dz: 0, dy: 0, tip: 0, falling: true };
    dropPose(p, 0, 1);
    expect(p.dy).toBe(0);
    dropPose(p, CLOSEUP_MOTION.drop.tipMs + 200, 1);
    expect(p.dy).toBeCloseTo(0.5 * 9.81 * 0.04, 5);
    dropPose(p, 5000, 1);
    expect(p.dy).toBe(1);
    expect(p.falling).toBe(false);
  });
});

describe('camera motion', () => {
  it('drifts gently only after the dolly settles', () => {
    const o = { yawDeg: 0, dy: 0 };
    expect(idleCamera(o, 0)).toEqual({ yawDeg: 0, dy: 0 });
    for (let t = 0; t < 60; t += 0.1) {
      idleCamera(o, t);
      expect(Math.abs(o.yawDeg)).toBeLessThanOrEqual(CLOSEUP_MOTION.idleYawDeg + 1e-9);
      expect(Math.abs(o.dy)).toBeLessThanOrEqual(CLOSEUP_MOTION.breatheM + 1e-9);
    }
  });

  it('clamps the drag orbit to ±35°', () => {
    expect(clampOrbit(80)).toBe(CLOSEUP_MOTION.orbitMaxDeg);
    expect(dragOrbit(0, -10000)).toBe(CLOSEUP_MOTION.orbitMaxDeg);
    expect(dragOrbit(0, 10000)).toBe(-CLOSEUP_MOTION.orbitMaxDeg);
    expect(dragOrbit(10, 0)).toBe(10);
  });

  it('follows smoothly and fades out toward the map', () => {
    expect(follow(0, 10, 0, 7)).toBe(0);
    expect(follow(0, 10, 10, 7)).toBeCloseTo(10);
    expect(orbitWeight(3.7)).toBe(1);
    expect(orbitWeight(50)).toBe(0);
    const r: [number, number] = [0, 0];
    rotateY(r, 0, 3, 90);
    expect(r[0]).toBeCloseTo(3);
    expect(r[1]).toBeCloseTo(0);
  });
});

describe('street density', () => {
  it('maps real traffic to 0..1, fewer people at quiet hours', () => {
    const quiet = streetDensity(10);
    const busy = streetDensity(400);
    expect(quiet.crowd).toBeLessThan(0.2);
    expect(busy.crowd).toBeGreaterThan(0.8);
    expect(streetDensity(1e6).crowd).toBe(1);
    expect(streetDensity(0).traffic).toBeGreaterThan(0);
    expect(streetDensity(400, 0.5).crowd).toBeLessThan(busy.crowd);
  });

  it('knows which side of the road cars drive on', () => {
    expect(isLeftHandTraffic('GB')).toBe(true);
    expect(isLeftHandTraffic('jp')).toBe(true);
    expect(isLeftHandTraffic('US')).toBe(false);
  });
});
