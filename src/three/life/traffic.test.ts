import { CARS } from '@/config/streetLife';

import { streetLayout } from './layout';
import { carsAt, emptyCar, type CarState } from './traffic';

const layout = streetLayout(0.9);
const buf = (): CarState[] => Array.from({ length: CARS.capacity }, emptyCar);

describe('traffic', () => {
  it('is deterministic', () => {
    const a = buf();
    const b = buf();
    const na = carsAt(a, 7, 93.4, 0.7, layout, false);
    const nb = carsAt(b, 7, 93.4, 0.7, layout, false);
    expect(na).toBe(nb);
    expect(a.slice(0, na)).toEqual(b.slice(0, nb));
  });

  it('keeps cars in their lane, on the road, never overlapping', () => {
    const out = buf();
    let seen = 0;
    for (let t = 0; t < 2000; t += 0.2) {
      const n = carsAt(out, 99, t, 1, layout, false);
      expect(n).toBeLessThanOrEqual(4);
      seen += n;
      for (let i = 0; i < n; i++) {
        const c = out[i];
        expect(c.z).toBe(layout.carLaneZ[c.lane]);
        expect(c.z).toBeGreaterThan(layout.curbZ);
        expect(Math.abs(c.x)).toBeLessThanOrEqual(CARS.halfSpanM + 1e-6);
        for (let j = i + 1; j < n; j++)
          if (out[j].lane === c.lane) expect(Math.abs(out[j].x - c.x)).toBeGreaterThan(6);
      }
    }
    expect(seen).toBeGreaterThan(1000);
  });

  it('drives on the right (or left) and the lanes flow opposite ways', () => {
    const out = buf();
    for (const left of [false, true]) {
      for (let t = 0; t < 300; t += 0.5) {
        const n = carsAt(out, 3, t, 1, layout, left);
        for (let i = 0; i < n; i++) {
          // Near lane keeps the sidewalk (−z) on the driver's side of the kerb.
          const expected = (left ? 1 : -1) * (out[i].lane === 0 ? 1 : -1);
          expect(out[i].dir).toBe(expected);
        }
      }
    }
  });

  it('scales with traffic density and is empty at zero', () => {
    const out = buf();
    const avg = (traffic: number) => {
      let s = 0;
      for (let t = 0; t < 3000; t += 0.5) s += carsAt(out, 11, t, traffic, layout, false);
      return s / 6000;
    };
    expect(avg(0)).toBe(0);
    const low = avg(0.2);
    const mid = avg(0.5);
    const high = avg(1);
    expect(low).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });
});
