import { PICKER } from '@/config/picker';

import { cityAt, flagOf, kmBetween, nearestCity, stripCities } from './cityIndex';
import type { CityIndexEntry } from './types';

const city = (
  r: string,
  n: string,
  a: number,
  o: number,
  p: number,
  d?: CityIndexEntry['d'],
): CityIndexEntry => ({ r, n, c: 'VN', z: 'Asia/Ho_Chi_Minh', a, o, p, ...(d ? { d } : {}) });

const INDEX: CityIndexEntry[] = [
  city('hanoi', 'Hanoi', 21.028, 105.854, 8_000_000),
  city('hanoi-n', 'Hanoi', 21.2, 105.85, 0, 'n'),
  city('haiphong', 'Haiphong', 20.86, 106.68, 2_000_000),
  city('namdinh', 'Nam Dinh', 20.43, 106.17, 350_000),
  city('hcmc', 'Ho Chi Minh City', 10.776, 106.7, 9_000_000),
  city('danang', 'Da Nang', 16.05, 108.2, 800_000),
  { ...city('tokyo', 'Tokyo', 35.69, 139.7, 14_000_000), c: 'JP' },
];

describe('city picker list', () => {
  const hanoi = { lat: 21.03, lng: 105.85 };

  it('lists what is near you, then your country, then only very big cities abroad', () => {
    const ids = stripCities(INDEX, hanoi).map((c) => c.r);
    // Local (≤ 300 km): cities and districts of any size, by distance.
    expect(ids.slice(0, 4)).toEqual(['hanoi', 'hanoi-n', 'namdinh', 'haiphong']);
    // Then the rest of Vietnam (Da Nang 800k is in), then Tokyo (14M) abroad.
    expect(ids.slice(4)).toEqual(['danang', 'hcmc', 'tokyo']);
  });

  it('leaves out smaller cities abroad and keeps the strip to 30', () => {
    const abroad = city('osaka', 'Osaka', 34.69, 135.5, 2_700_000);
    expect(stripCities([...INDEX, { ...abroad, c: 'JP' }], hanoi).map((c) => c.r)).not.toContain(
      'osaka',
    );
    const many = Array.from({ length: 400 }, (_, i) =>
      city(`c${i}`, `City ${i}`, 21 + i * 0.01, 105.85, 2_000_000),
    );
    const strip = stripCities(many, hanoi);
    expect(strip).toHaveLength(PICKER.maxCards);
    expect(strip.filter((c) => c.km <= PICKER.localKm).length).toBeLessThanOrEqual(
      PICKER.maxLocal + 20,
    );
  });

  it('snaps the crosshair to a close city or district', () => {
    expect(cityAt(INDEX, { lat: 21.19, lng: 105.86 })?.r).toBe('hanoi-n');
    expect(cityAt(INDEX, { lat: 0, lng: 0 })).toBeNull();
    expect(nearestCity(INDEX, { lat: 19, lng: 105.7 })?.r).toBe('namdinh');
  });

  it('measures real distances and draws flags', () => {
    expect(Math.round(kmBetween(hanoi, { lat: 10.776, lng: 106.7 }))).toBeGreaterThan(1100);
    expect(flagOf('VN')).toBe('🇻🇳');
    expect(flagOf('')).toBe('');
  });
});
