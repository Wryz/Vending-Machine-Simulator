import { LIFE_WALK_FRAMES, MAP_LIFE } from '@/config/mapLife';

import {
  allLifeSpriteNames,
  busyLevel,
  cityActivity,
  lifeGeoJSON,
  lifeHeadingBucket,
  lifeIconSizeStops,
  lifeLightFor,
  peopleActivity,
  peopleTarget,
  RoadNetwork,
  roadsFromFeatures,
  StreetLife,
  type LifeConditions,
  type LifeView,
  type RoadInput,
} from './index';

const LNG0 = -73.984;
const LAT0 = 40.754;
const KX = 111_320 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 111_320;
const ll = (x: number, y: number): [number, number] => [LNG0 + x / KX, LAT0 + y / KY];

/**
 * A Manhattan-like grid ±600 m around the center: avenues every 260 m,
 * streets every 80 m, each line split into overlapping "tile pieces" like
 * rendered vector-tile features are.
 */
function grid(): RoadInput[] {
  const roads: RoadInput[] = [];
  const piece = (a: [number, number], b: [number, number], kind: RoadInput['kind']) => {
    // Split at x/y = ±150 m "tile edges" with 6 m of overlap.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const cuts = [0, 450 / 1200, 750 / 1200, 1];
    for (let i = 0; i < cuts.length - 1; i++) {
      const t0 = Math.max(0, cuts[i] - 3 / len);
      const t1 = Math.min(1, cuts[i + 1] + 3 / len);
      const p = (t: number): [number, number] =>
        ll(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      // A slight kink mid-piece exercises vertex smoothing.
      const tm = (t0 + t1) / 2;
      const m = p(tm);
      roads.push({ coords: [p(t0), [m[0] + 0.5 / KX, m[1]], p(t1)], kind });
    }
  };
  for (let x = -520; x <= 520; x += 260) piece([x, -600], [x, 600], 'major');
  for (let y = -560; y <= 560; y += 80) piece([-600, y], [600, y], 'minor');
  return roads;
}

const VIEW: LifeView = {
  bounds: {
    west: ll(-300, 0)[0],
    east: ll(300, 0)[0],
    south: ll(0, -300)[1],
    north: ll(0, 300)[1],
  },
  center: [LNG0, LAT0],
  radiusM: 400,
};

const BUSY: LifeConditions = { hour: 17.5, restDay: false, footTraffic: 320, weather: 'clear' };
const QUIET: LifeConditions = { hour: 3, restDay: false, footTraffic: 15, weather: 'clear' };

function run(seed: number, seconds: number, cond = BUSY, dt = 1 / 14, view = VIEW) {
  const life = new StreetLife(seed);
  life.setConditions(cond);
  life.setRoads(grid(), view);
  for (let t = 0; t < seconds; t += dt) life.step(dt);
  return life;
}

/** Distance from a point to a road's polyline, plus the side (cross sign). */
function distToRoad(net: RoadNetwork, ri: number, x: number, y: number) {
  const r = net.roads[ri];
  let best = Infinity;
  let side = 0;
  for (let i = 0; i < r.xs.length - 1; i++) {
    const ax = r.xs[i];
    const ay = r.ys[i];
    const dx = r.xs[i + 1] - ax;
    const dy = r.ys[i + 1] - ay;
    const l2 = dx * dx + dy * dy;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < best) {
      best = d;
      side = Math.sign((x - ax) * dy - (y - ay) * dx); // + = right of coord order
    }
  }
  return { d: best, side };
}

describe('street life: density', () => {
  it('busy at rush hour, quiet at 3 am', () => {
    expect(cityActivity(BUSY)).toBeGreaterThan(0.8);
    expect(cityActivity(QUIET)).toBeLessThan(0.12);
    expect(peopleActivity(BUSY)).toBeGreaterThan(0.9);
    expect(peopleActivity(QUIET)).toBeLessThan(0.15);
    expect(busyLevel(BUSY)).toBeGreaterThan(0.85);
    expect(busyLevel(QUIET)).toBeLessThan(0.15);
  });

  it('rain empties the sidewalks more than it calms the city', () => {
    const rain = { ...BUSY, weather: 'rain' as const };
    expect(peopleActivity(rain)).toBeLessThan(peopleActivity(BUSY) * 0.6);
    expect(cityActivity(rain)).toBeGreaterThan(cityActivity(BUSY) * 0.8);
  });

  it('the target scales with street length and respects the cap', () => {
    const small = peopleTarget(BUSY, { major: 100, minor: 200 });
    const big = peopleTarget(BUSY, { major: 200, minor: 400 });
    const huge = peopleTarget(BUSY, { major: 20000, minor: 40000 });
    expect(small).toBeGreaterThan(10);
    expect(big).toBeGreaterThan(small * 1.8);
    expect(huge).toBe(MAP_LIFE.maxPeople);
  });
});

describe('street life: simulation', () => {
  it('is deterministic for a seed', () => {
    const a = run(7, 20);
    const b = run(7, 20);
    const c = run(8, 20);
    const snap = (l: StreetLife) =>
      l.people.map((x) => `${x.id}:${x.lng.toFixed(7)},${x.lat.toFixed(7)}`).join('|');
    expect(snap(a)).toBe(snap(b));
    expect(snap(a)).not.toBe(snap(c));
    expect(a.people.length).toBeGreaterThan(10);
  });

  it('caps people and is fuller at rush hour than at 3 am', () => {
    const big = run(3, 30);
    expect(big.people.length).toBeLessThanOrEqual(MAP_LIFE.maxPeople);
    const near = { ...VIEW, radiusM: 160 };
    const busy = run(3, 30, BUSY, 1 / 14, near);
    const quiet = run(3, 30, QUIET, 1 / 14, near);
    expect(busy.people.length).toBeLessThanOrEqual(MAP_LIFE.maxPeople);
    expect(busy.people.length).toBeGreaterThan(quiet.people.length * 2);
  });

  it('people stay on the sidewalks, never in the roadway', () => {
    const life = run(5, 40);
    const net = life.net!;
    let checked = 0;
    for (const p of life.people) {
      if (p.road < 0) continue;
      const own = distToRoad(net, p.road, p.x, p.y);
      if (Math.hypot(p.bx, p.by) < 0.3) {
        expect(own.d).toBeGreaterThanOrEqual(5);
        expect(own.d).toBeLessThanOrEqual(9.8);
      }
      // Away from intersections, no road centerline is closer than the curb.
      let nearest = Infinity;
      for (let ri = 0; ri < net.roads.length; ri++)
        nearest = Math.min(nearest, distToRoad(net, ri, p.x, p.y).d);
      const ax = ((p.x % 260) + 260) % 260; // distance to the avenue grid
      const nearAvenue = Math.min(ax, 260 - ax) < 14;
      const sy = ((p.y % 80) + 80) % 80;
      const nearStreet = Math.min(sy, 80 - sy) < 12;
      if (!(nearAvenue && nearStreet)) expect(nearest).toBeGreaterThanOrEqual(4.5);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('moves smoothly: no teleports across tile pieces, limited turn rate', () => {
    const life = new StreetLife(21);
    life.setConditions(BUSY);
    life.setRoads(grid(), VIEW);
    const dt = 1 / 14;
    const prev = new Map<number, { x: number; y: number; h: number }>();
    let transfers = 0;
    let lastRoad = new Map<number, number>();
    for (let i = 0; i < 14 * 40; i++) {
      life.step(dt);
      const roads = new Map<number, number>();
      for (const p of life.people) {
        const q = prev.get(p.id);
        if (q) {
          expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(1.5 * dt + 0.6);
          let dh = Math.abs(p.heading - q.h);
          if (dh > 180) dh = 360 - dh;
          expect(dh).toBeLessThanOrEqual(400 * dt + 1e-6);
          if (lastRoad.has(p.id) && lastRoad.get(p.id) !== p.road) transfers++;
        }
        prev.set(p.id, { x: p.x, y: p.y, h: p.heading });
        roads.set(p.id, p.road);
        expect(p.frame).toBeGreaterThanOrEqual(0);
        expect(p.frame).toBeLessThan(LIFE_WALK_FRAMES);
      }
      lastRoad = roads;
    }
    // People did continue onto other pieces / streets rather than all despawning.
    expect(transfers).toBeGreaterThan(3);
  });

  it('keeps the street when the view pans and roads are re-queried', () => {
    const life = run(9, 10);
    const before = new Map(life.people.map((p) => [p.id, { lng: p.lng, lat: p.lat }]));
    const view2: LifeView = { ...VIEW, center: ll(30, 20) };
    life.setRoads(grid(), view2);
    const kept = life.people.filter((p) => !p.dying && before.has(p.id));
    expect(kept.length).toBeGreaterThan(before.size * 0.8);
    for (const c of kept) {
      const b = before.get(c.id)!;
      expect(Math.abs(c.lng - b.lng) * KX).toBeLessThan(0.01);
      expect(Math.abs(c.lat - b.lat) * KY).toBeLessThan(0.01);
    }
    life.step(1 / 14);
  });
});

describe('street life: sprites and output', () => {
  it('heading buckets match the machine convention (0 = facing the camera)', () => {
    // Camera looking north: someone walking south faces the camera.
    expect(lifeHeadingBucket(180, 0)).toBe(0);
    expect(lifeHeadingBucket(270, 0)).toBe(2); // walking west = front to the viewer's left
    expect(lifeHeadingBucket(0, 0)).toBe(4);
    expect(lifeHeadingBucket(180 + 29, 29)).toBe(0); // independent of bearing
    expect(lifeHeadingBucket(22, 0)).toBe(4);
    expect(lifeHeadingBucket(23, 0)).toBe(5);
  });

  it('night sprites from mid-dusk to mid-dawn', () => {
    expect(lifeLightFor({ night: 0, dawn: 0, day: 1, dusk: 0 })).toBe('day');
    expect(lifeLightFor({ night: 0, dawn: 0, day: 0.3, dusk: 0.7 })).toBe('day');
    expect(lifeLightFor({ night: 0.2, dawn: 0, day: 0, dusk: 0.8 })).toBe('night');
    expect(lifeLightFor({ night: 1, dawn: 0, day: 0, dusk: 0 })).toBe('night');
  });

  it('writes valid GeoJSON with known sprite names', () => {
    const life = run(4, 5);
    const names = new Set(allLifeSpriteNames(LIFE_WALK_FRAMES));
    for (const light of ['day', 'night'] as const) {
      const fc = JSON.parse(
        lifeGeoJSON(life, { bearing: -20, pitch: 55, light }),
      ) as GeoJSON.FeatureCollection;
      expect(fc.type).toBe('FeatureCollection');
      expect(fc.features.length).toBeGreaterThan(10);
      for (const f of fc.features) {
        expect(names.has(f.properties!.i)).toBe(true);
        expect(f.properties!.i.endsWith(`-${light}`)).toBe(true);
      }
    }
  });

  it('true-scale icon sizes double per zoom level', () => {
    const s = lifeIconSizeStops(LAT0, 12);
    const at = (z: number) => s[s.indexOf(z) + 1];
    expect(at(18) / at(17)).toBeCloseTo(2, 6);
    // 12 pt/m sprites reach 1:1 around zoom 19.4 at New York's latitude.
    expect(at(19)).toBeLessThan(1);
    expect(at(20)).toBeGreaterThan(1);
  });

  it('reads streets from OpenMapTiles and Protomaps road features', () => {
    const line = { type: 'LineString' as const, coordinates: [ll(0, 0), ll(0, 50)] };
    const roads = roadsFromFeatures([
      { type: 'Feature', geometry: line, properties: { class: 'primary' } },
      { type: 'Feature', geometry: line, properties: { class: 'minor' } },
      { type: 'Feature', geometry: line, properties: { class: 'path' } },
      { type: 'Feature', geometry: line, properties: { kind: 'major_road' } },
      {
        type: 'Feature',
        geometry: line,
        properties: { kind: 'minor_road', kind_detail: 'service' },
      },
      {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [line.coordinates, line.coordinates] },
        properties: { class: 'motorway' },
      },
    ]);
    // Paths, service roads and motorways have no sidewalks: dropped.
    expect(roads.map((r) => r.kind)).toEqual(['major', 'minor', 'major']);
    // Duplicate tile features collapse into one road.
    const net = new RoadNetwork([roads[1], roads[1]], [LNG0, LAT0]);
    expect(net.roads.length).toBe(1);
  });
});

describe('street life: customers', () => {
  // A machine on the sidewalk of the avenue at x = 0, facing the street (west).
  const machine = ll(-9, 20);

  function withCustomer(seed = 5) {
    const life = run(seed, 1);
    expect(life.addCustomer('sale-1', machine[0], machine[1], 270)).toBe(true);
    return life;
  }

  it('walks up to the machine, buys, then leaves', () => {
    const life = withCustomer();
    const c = life.customers[0];
    const start = Math.hypot(c.x - c.mx, c.y - c.my);
    expect(start).toBeGreaterThan(5);
    expect(life.takeArrivals()).toEqual([]);

    let arrivedAt = -1;
    const dt = 1 / 14;
    for (let t = 0; t < 30 && arrivedAt < 0; t += dt) {
      life.step(dt);
      if (life.takeArrivals().includes('sale-1')) arrivedAt = t;
    }
    expect(arrivedAt).toBeGreaterThan(1);
    expect(arrivedAt).toBeLessThanOrEqual(MAP_LIFE.customers.maxWalkSeconds + 0.2);
    // At the machine: in front of it, facing it, standing still.
    expect(Math.hypot(c.x - c.mx, c.y - c.my)).toBeCloseTo(MAP_LIFE.customers.standM, 1);
    expect(c.hx * (c.mx - c.x) + c.hy * (c.my - c.y)).toBeGreaterThan(0);
    expect(c.frame).toBe(0);

    // Then they walk off and fade out; each sale is released once.
    for (let t = 0; t < 30; t += dt) life.step(dt);
    expect(life.takeArrivals()).toEqual([]);
    expect(life.customers).toHaveLength(0);
  });

  it('releases sales still on the way when street life stops', () => {
    const life = withCustomer();
    life.step(0.1);
    expect(life.flushCustomers()).toEqual(['sale-1']);
    expect(life.customers).toHaveLength(0);
  });

  it('caps how many walk at once and needs roads', () => {
    const life = run(9, 1);
    for (let i = 0; i < MAP_LIFE.customers.max; i++)
      expect(life.addCustomer(`s${i}`, machine[0], machine[1], 270)).toBe(true);
    expect(life.addCustomer('one-too-many', machine[0], machine[1], 270)).toBe(false);
    expect(new StreetLife(1).addCustomer('x', machine[0], machine[1], 0)).toBe(false);
  });

  it('draws customers with the people', () => {
    const life = withCustomer();
    for (let t = 0; t < 1; t += 0.1) life.step(0.1);
    const fc = JSON.parse(
      lifeGeoJSON(life, { bearing: 0, pitch: 45, light: 'day' }),
    ) as GeoJSON.FeatureCollection;
    const visible = [...life.people, ...life.customers].filter((p) => p.alpha > 0.01).length;
    expect(life.customers[0].alpha).toBeGreaterThan(0.01);
    expect(fc.features.length).toBe(visible);
  });
});
