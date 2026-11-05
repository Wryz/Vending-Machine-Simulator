import { CURVE_KEYS_FOR_TEST } from './__fixtures__/curveKeys';
import { HOURLY_CURVES } from '@/config/curves';
import { RARITY_ODDS, COLLECTIONS } from '@/config/progression';
import { MACHINE_TYPES } from '@/config/machines';
import { PRODUCTS, getProduct } from '@/config/products';

import { curveAt, priceResponse, productWeatherFactor, competitionShare } from './demand';
import { distanceM, offsetPoint, orderStops, tourLengthM } from './geo';
import { hashString, nextRandom, poisson, happens } from './rng';
import { addDays, isHoliday, localTime, localToUtc, businessDays, businessHoursToMs } from './time';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = { rng: 42 };
    const b = { rng: 42 };
    const xs = Array.from({ length: 5 }, () => nextRandom(a));
    const ys = Array.from({ length: 5 }, () => nextRandom(b));
    expect(xs).toEqual(ys);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('poisson has roughly the right mean for small and large λ', () => {
    for (const lambda of [0.5, 4, 80]) {
      const s = { rng: 7 };
      let sum = 0;
      for (let i = 0; i < 4000; i++) sum += poisson(s, lambda);
      expect(sum / 4000).toBeGreaterThan(lambda * 0.93);
      expect(sum / 4000).toBeLessThan(lambda * 1.07);
    }
    expect(poisson({ rng: 1 }, 0)).toBe(0);
  });
  it('happens() follows 1 - e^-rt', () => {
    const s = { rng: 3 };
    let n = 0;
    for (let i = 0; i < 5000; i++) if (happens(s, 1, 0.5)) n++;
    expect(n / 5000).toBeCloseTo(1 - Math.exp(-0.5), 1);
    expect(happens(s, 0, 1)).toBe(false);
  });
  it('hashString is stable', () => {
    expect(hashString('coinline')).toBe(hashString('coinline'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('price response (SPEC §5.2)', () => {
  it('≈1.0 at 0.9×, ≈0.5 at 1.3×, ≈0.15 at 1.8×', () => {
    expect(priceResponse(0.9)).toBeCloseTo(1, 2);
    expect(priceResponse(1.3)).toBeGreaterThan(0.42);
    expect(priceResponse(1.3)).toBeLessThan(0.58);
    expect(priceResponse(1.8)).toBeGreaterThan(0.08);
    expect(priceResponse(1.8)).toBeLessThan(0.2);
  });
  it('is monotonic decreasing', () => {
    let prev = Infinity;
    for (let r = 0.5; r < 3; r += 0.1) {
      const v = priceResponse(r);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('curves', () => {
  it('every curve has 24 values in 0..1', () => {
    for (const k of CURVE_KEYS_FOR_TEST) {
      for (const c of [HOURLY_CURVES[k].weekday, HOURLY_CURVES[k].weekend]) {
        expect(c).toHaveLength(24);
        for (const v of c) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it('offices peak in the morning on weekdays and are quiet on weekends', () => {
    const o = HOURLY_CURVES.office;
    expect(curveAt(o.weekday, 8)).toBeGreaterThan(curveAt(o.weekday, 3) * 5);
    expect(curveAt(o.weekend, 8)).toBeLessThan(curveAt(o.weekday, 8) / 3);
  });
  it('nightlife peaks late, schools after class', () => {
    expect(curveAt(HOURLY_CURVES.nightlife.weekend, 23)).toBeGreaterThan(
      curveAt(HOURLY_CURVES.nightlife.weekend, 14),
    );
    expect(curveAt(HOURLY_CURVES.school.weekday, 15.5)).toBeGreaterThan(
      curveAt(HOURLY_CURVES.school.weekday, 10),
    );
  });
  it('interpolates across midnight', () => {
    const c = HOURLY_CURVES.nightlife.weekday;
    const v = curveAt(c, 23.5);
    expect(v).toBeGreaterThanOrEqual(Math.min(c[23], c[0]));
    expect(v).toBeLessThanOrEqual(Math.max(c[23], c[0]));
  });
});

describe('weather', () => {
  it('heat raises cold drinks, cold raises coffee, rain sells umbrellas', () => {
    const heat = { time: '', tempC: 34, condition: 'clear' as const, precipitation: 0 };
    const cold = { time: '', tempC: 0, condition: 'cloudy' as const, precipitation: 0 };
    const rain = { time: '', tempC: 15, condition: 'rain' as const, precipitation: 0.8 };
    expect(productWeatherFactor(getProduct('clearpeak-water'), heat)).toBeGreaterThan(1.5);
    expect(productWeatherFactor(getProduct('hot-coffee'), cold)).toBeGreaterThan(1.4);
    expect(productWeatherFactor(getProduct('umbrella'), rain)).toBeGreaterThan(5);
    expect(productWeatherFactor(getProduct('umbrella'), heat)).toBeLessThan(0.5);
    expect(productWeatherFactor(getProduct('kettle-crisp'), heat)).toBe(1);
    expect(productWeatherFactor(getProduct('kettle-crisp'), null)).toBe(1);
  });
});

describe('competition', () => {
  it('diminishes and caps', () => {
    expect(competitionShare(0)).toBe(0);
    expect(competitionShare(1)).toBeCloseTo(0.18);
    expect(competitionShare(2)).toBeGreaterThan(competitionShare(1));
    expect(competitionShare(50)).toBeLessThanOrEqual(0.7);
  });
});

describe('geo', () => {
  it('measures and offsets', () => {
    const a = { lat: 40.7, lng: -74 };
    const b = offsetPoint(a, 90, 1000);
    expect(distanceM(a, b)).toBeCloseTo(1000, -1);
    expect(tourLengthM(a, [b])).toBeCloseTo(2000, -1);
    const stops = [offsetPoint(a, 0, 3000), offsetPoint(a, 0, 1000), offsetPoint(a, 0, 2000)];
    expect(orderStops(a, stops).map((s) => Math.round(distanceM(a, s)))).toEqual([
      1000, 2000, 3000,
    ]);
  });
});

describe('time', () => {
  it('knows New York local time, weekday and offset', () => {
    const t = Date.UTC(2026, 5, 10, 16, 30); // Wed 12:30 EDT
    const lt = localTime(t, 'America/New_York', 'US');
    expect(lt.hour).toBeCloseTo(12.5);
    expect(lt.weekday).toBe(3);
    expect(lt.offsetMinutes).toBe(-240);
    expect(lt.restDay).toBe(false);
    expect(lt.dateKey).toBe('2026-06-10');
  });
  it('treats weekends and holidays as rest days', () => {
    expect(localTime(Date.UTC(2026, 5, 13, 16), 'America/New_York', 'US').restDay).toBe(true);
    expect(isHoliday('US', '2026-07-04')).toBe(true);
    expect(isHoliday('US', '2026-11-26')).toBe(true);
    expect(localTime(Date.UTC(2026, 6, 4, 16), 'America/New_York', 'US').restDay).toBe(true);
    expect(isHoliday('JP', '2026-05-05')).toBe(true);
    expect(isHoliday('XX', '2026-05-05')).toBe(false);
  });
  it('converts local hours to UTC', () => {
    expect(localToUtc('2026-06-10', 12, 'America/New_York', 'US')).toBe(Date.UTC(2026, 5, 10, 16));
    expect(localToUtc('2026-01-10', 9, 'Asia/Tokyo', 'JP')).toBe(Date.UTC(2026, 0, 10, 0));
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('runs the business clock 60× faster', () => {
    expect(businessDays(24 * 60_000)).toBeCloseTo(1);
    expect(businessHoursToMs(1)).toBe(60_000);
  });
});

describe('config sanity', () => {
  it('rarity odds sum to 1', () => {
    expect(Object.values(RARITY_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('collections have 12–24 items each and unique ids', () => {
    for (const s of COLLECTIONS) {
      expect(s.items.length).toBeGreaterThanOrEqual(12);
      expect(s.items.length).toBeLessThanOrEqual(24);
      expect(new Set(s.items.map((i) => i.id)).size).toBe(s.items.length);
    }
  });
  it('every product has a margin and every machine holds at least one product', () => {
    for (const p of PRODUCTS) expect(p.suggestedCents).toBeGreaterThan(p.wholesaleCents);
    for (const t of MACHINE_TYPES)
      expect(PRODUCTS.some((p) => t.holds.includes(p.family))).toBe(true);
  });
  it('commission range is 10–35% (SPEC §4.5)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VENUE_COMMISSION } = require('@/config/places') as typeof import('@/config/places');
    for (const v of Object.values(VENUE_COMMISSION)) {
      expect(v).toBeGreaterThanOrEqual(0.1);
      expect(v).toBeLessThanOrEqual(0.35);
    }
  });
});
