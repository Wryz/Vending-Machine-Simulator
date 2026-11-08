import { latLngToCell } from 'h3-js';

import { assignHoods, districtOf, evaluateSpot, newGame, ringOf, type HoodPoint, type World } from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';
import { offsetPoint } from './geo';

const start = { lat: 40.7128, lng: -74.006 };
const at = (bearing: number, km: number) => offsetPoint(start, bearing, km * 1000);
const pt = (n: string, p: { lat: number; lng: number }, k: HoodPoint['k'] = 'n'): HoodPoint => ({
  n,
  a: p.lat,
  o: p.lng,
  k,
});
const cell = (p: { lat: number; lng: number }) => ({ id: latLngToCell(p.lat, p.lng, 9), ...p });

describe('neighbourhood districts', () => {
  const names = [
    pt('Home', at(0, 0.3)),
    pt('Near', at(90, 1.0)),
    pt('Middle', at(180, 2.0)),
    pt('Far', at(270, 4.0)),
    pt('Edge', at(45, 8)),
    pt('Extra', at(135, 3)),
    pt('Quarter', at(10, 0.5), 'm'),
  ];

  it('opens each neighbourhood in the ring its name sits in; the start one is always open', () => {
    const cells = [cell(start), cell(at(90, 1.1)), cell(at(180, 2.1)), cell(at(270, 3.9))];
    const map = assignHoods(names, cells, start, cells[0].id)!;
    const byName = Object.fromEntries(map.hoods.map((h) => [h.name, h.district]));
    expect(byName.Home).toBe(1);
    expect(byName.Near).toBe(1);
    expect(byName.Middle).toBe(2);
    expect(byName.Far).toBe(3);
    expect(byName.Edge).toBe(ringOf(8));
    // Six fine names: the overlapping quarter is ignored.
    expect(byName.Quarter).toBeUndefined();
    expect(map.hoods[map.cellHood.get(cells[2].id)!].name).toBe('Middle');
  });

  it('the start neighbourhood is open even when its name sits outside ring 1', () => {
    const far = [pt('Big park', at(0, 1.6)), ...names.slice(1, 6)];
    const home = cell(start);
    const map = assignHoods(far, [home], start, home.id)!;
    expect(map.hoods[map.cellHood.get(home.id)!].district).toBe(1);
  });

  it('cells far from every name keep the ring rule; no names means no map', () => {
    const lonely = cell(at(0, 20));
    const map = assignHoods(names, [lonely], start, lonely.id)!;
    expect(map.cellHood.has(lonely.id)).toBe(false);
    expect(assignHoods([], [lonely], start, lonely.id)).toBeNull();
  });

  it('placement follows the neighbourhood, and the spot card names it', () => {
    const base = testWorld();
    const spot = decentSpot();
    const here = base.cellOf(spot.lat, spot.lng);
    // A name 3 km out owns the spot's cell: it opens in chapter 4 (ring 3), not ring 1.
    const world: World = {
      ...base,
      hoods: {
        hoods: [{ name: 'Faraway', lat: spot.lat, lng: spot.lng, district: 3 }],
        cellHood: new Map([[here, 0]]),
      },
    };
    expect(districtOf(world, spot)).toBe(3);
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    const r = evaluateSpot(s, world, spot, 'used-snack', NOON_NY);
    expect(r.districtLocked).toBe(true);
    expect(r.hood).toBe('Faraway');
    expect(r.districtChapter).toBe(4);
  });
});
