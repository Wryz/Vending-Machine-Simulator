import { LIFE_WALK_FRAMES, MAP_LIFE } from '@/config/mapLife';

import {
  allLifeSpriteNames,
  carActivity,
  lifeGeoJSON,
  lifeHeadingBucket,
  lifeIconSizeStops,
  lifeLightFor,
  lifeTargets,
  peopleActivity,
  residualRotation,
  RoadNetwork,
  roadsFromFeatures,
  screenAngle,
  StreetLife,
  trafficLevel,
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
 * A Manhattan-like grid ±600 m around the center: two-way avenues every
 * 260 m, alternating one-way streets every 80 m, each line split into
 * overlapping "tile pieces" like rendered vector-tile features are.
 */
function grid(): RoadInput[] {
  const roads: RoadInput[] = [];
  const piece = (a: [number, number], b: [number, number], kind: RoadInput['kind'], oneway: -1 | 0 | 1) => {
    // Split at x/y = ±150 m "tile edges" with 6 m of overlap.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const cuts = [0, 450 / 1200, 750 / 1200, 1];
    for (let i = 0; i < cuts.length - 1; i++) {
      const t0 = Math.max(0, cuts[i] - 3 / len);
      const t1 = Math.min(1, cuts[i + 1] + 3 / len);
      const p = (t: number): [number, number] => ll(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      // A slight kink mid-piece exercises vertex smoothing.
      const tm = (t0 + t1) / 2;
      const m = p(tm);
      roads.push({ coords: [p(t0), [m[0] + 0.5 / KX, m[1]], p(t1)], kind, oneway });
    }
  };
  for (let x = -520; x <= 520; x += 260) piece([x, -600], [x, 600], 'major', 0);
  let k = 0;
  for (let y = -560; y <= 560; y += 80) piece([-600, y], [600, y], 'minor', k++ % 2 ? 1 : -1);
  return roads;
}

const VIEW: LifeView = {
  bounds: { west: ll(-300, 0)[0], east: ll(300, 0)[0], south: ll(0, -300)[1], north: ll(0, 300)[1] },
  center: [LNG0, LAT0],
  radiusM: 400,
};

const BUSY: LifeConditions = { hour: 17.5, restDay: false, footTraffic: 320, weather: 'clear' };
const QUIET: LifeConditions = { hour: 3, restDay: false, footTraffic: 15, weather: 'clear' };

function run(seed: number, seconds: number, cond = BUSY, dt = 1 / 14) {
  const life = new StreetLife(seed);
  life.setConditions(cond);
  life.setRoads(grid(), VIEW);
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
    expect(carActivity(BUSY)).toBeGreaterThan(0.8);
    expect(carActivity(QUIET)).toBeLessThan(0.12);
    expect(peopleActivity(BUSY)).toBeGreaterThan(0.9);
    expect(peopleActivity(QUIET)).toBeLessThan(0.15);
    expect(trafficLevel(BUSY)).toBeGreaterThan(0.85);
    expect(trafficLevel(QUIET)).toBeLessThan(0.15);
  });

  it('rain lowers pedestrians more than cars', () => {
    const rain = { ...BUSY, weather: 'rain' as const };
    expect(peopleActivity(rain)).toBeLessThan(peopleActivity(BUSY) * 0.6);
    expect(carActivity(rain)).toBeGreaterThan(carActivity(BUSY) * 0.8);
  });

  it('targets scale with road length and respect the caps', () => {
    const small = lifeTargets(BUSY, { highway: 0, major: 300, minor: 600, service: 0 });
    const huge = lifeTargets(BUSY, { highway: 5000, major: 20000, minor: 40000, service: 0 });
    expect(small.cars).toBeGreaterThan(0);
    expect(small.people).toBeGreaterThan(small.cars);
    expect(huge.cars).toBe(MAP_LIFE.caps.cars);
    expect(huge.people).toBe(MAP_LIFE.caps.people);
  });
});

describe('street life: simulation', () => {
  it('is deterministic for a seed', () => {
    const a = run(7, 20);
    const b = run(7, 20);
    const c = run(8, 20);
    const snap = (l: StreetLife) =>
      [...l.cars, ...l.people].map((x) => `${x.id}:${x.lng.toFixed(7)},${x.lat.toFixed(7)}`).join('|');
    expect(snap(a)).toBe(snap(b));
    expect(snap(a)).not.toBe(snap(c));
    expect(a.cars.length).toBeGreaterThan(5);
    expect(a.people.length).toBeGreaterThan(10);
  });

  it('caps agents and is fuller at rush hour than at 3 am', () => {
    const busy = run(3, 30);
    const quiet = run(3, 30, QUIET);
    expect(busy.cars.length).toBeLessThanOrEqual(MAP_LIFE.caps.cars);
    expect(busy.people.length).toBeLessThanOrEqual(MAP_LIFE.caps.people);
    expect(busy.cars.length).toBeGreaterThan(quiet.cars.length * 2);
    expect(busy.people.length).toBeGreaterThan(quiet.people.length * 2);
  });

  it('cars drive on the right of the centerline, obey one-way streets and speed limits', () => {
    const life = run(11, 25);
    const net = life.net!;
    let checked = 0;
    for (const c of life.cars) {
      if (c.road < 0 || Math.hypot(c.bx, c.by) > 0.2) continue;
      const road = net.roads[c.road];
      const { d, side } = distToRoad(net, c.road, c.x, c.y);
      if (road.oneway) {
        expect(c.dir).toBe(road.oneway);
        expect(d).toBeLessThanOrEqual(MAP_LIFE.cars.onewaySpreadM[road.kind] + 0.3);
      } else {
        const [lo, hi] = MAP_LIFE.cars.laneOffsetM[road.kind];
        expect(d).toBeGreaterThanOrEqual(lo - 0.3);
        expect(d).toBeLessThanOrEqual(hi + 0.3);
        // Right-hand traffic: right of the coordinate order when dir = +1.
        expect(side).toBe(c.dir);
      }
      expect(c.cruise * 3.6).toBeGreaterThanOrEqual(15);
      expect(c.cruise * 3.6).toBeLessThanOrEqual(40);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
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
      for (const c of life.cars) {
        const p = prev.get(c.id);
        if (p) {
          const moved = Math.hypot(c.x - p.x, c.y - p.y);
          expect(moved).toBeLessThan((40 / 3.6) * dt * 1.5 + 0.6);
          let dh = Math.abs(c.heading - p.h);
          if (dh > 180) dh = 360 - dh;
          expect(dh).toBeLessThanOrEqual(MAP_LIFE.cars.turnRateDegPerS * dt + 1e-6);
          if (lastRoad.get(c.id) !== c.road) transfers++;
        }
        prev.set(c.id, { x: c.x, y: c.y, h: c.heading });
        roads.set(c.id, c.road);
      }
      for (const p of life.people) {
        const q = prev.get(p.id);
        if (q) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(1.5 * dt + 0.6);
        prev.set(p.id, { x: p.x, y: p.y, h: p.heading });
        expect(p.frame).toBeGreaterThanOrEqual(0);
        expect(p.frame).toBeLessThan(LIFE_WALK_FRAMES);
      }
      lastRoad = roads;
    }
    // Cars did continue onto other pieces / streets rather than all despawning.
    expect(transfers).toBeGreaterThan(10);
  });

  it('keeps the street when the view pans and roads are re-queried', () => {
    const life = run(9, 10);
    const before = new Map(life.cars.map((c) => [c.id, { lng: c.lng, lat: c.lat }]));
    const view2: LifeView = { ...VIEW, center: ll(30, 20) };
    life.setRoads(grid(), view2);
    const kept = life.cars.filter((c) => !c.dying && before.has(c.id));
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
    // Camera looking north: a car driving south faces the camera.
    expect(lifeHeadingBucket(180, 0)).toBe(0);
    expect(lifeHeadingBucket(270, 0)).toBe(2); // driving west = front to the viewer's left
    expect(lifeHeadingBucket(0, 0)).toBe(4);
    expect(lifeHeadingBucket(180 + 29, 29)).toBe(0); // independent of bearing
    expect(lifeHeadingBucket(22, 0)).toBe(4);
    expect(lifeHeadingBucket(23, 0)).toBe(5);
  });

  it('residual rotation is zero on bucket headings and turns the right way', () => {
    expect(residualRotation(180, 0, 30, 0, 30)).toBeCloseTo(0, 6);
    expect(residualRotation(270, 0, 60, 2, 60)).toBeCloseTo(0, 6);
    // A car heading 200° (a bit west of south) rendered as bucket 0 must
    // rotate clockwise on screen.
    expect(residualRotation(200, 0, 30, 0, 30)).toBeGreaterThan(0);
    expect(Math.abs(residualRotation(200, 0, 30, 0, 30))).toBeLessThanOrEqual(35);
    expect(screenAngle(90, 60)).toBeCloseTo(90, 6);
  });

  it('night sprites from mid-dusk to mid-dawn', () => {
    expect(lifeLightFor({ night: 0, dawn: 0, day: 1, dusk: 0 })).toBe('day');
    expect(lifeLightFor({ night: 0, dawn: 0, day: 0.3, dusk: 0.7 })).toBe('day');
    expect(lifeLightFor({ night: 0.2, dawn: 0, day: 0, dusk: 0.8 })).toBe('night');
    expect(lifeLightFor({ night: 1, dawn: 0, day: 0, dusk: 0 })).toBe('night');
  });

  it('writes valid GeoJSON with known sprite names and night headlight pools', () => {
    const life = run(4, 5);
    const names = new Set(allLifeSpriteNames(LIFE_WALK_FRAMES));
    for (const light of ['day', 'night'] as const) {
      const fc = JSON.parse(lifeGeoJSON(life, { bearing: -20, pitch: 55, light })) as GeoJSON.FeatureCollection;
      expect(fc.type).toBe('FeatureCollection');
      const sprites = fc.features.filter((f) => f.properties!.k !== 2);
      const beams = fc.features.filter((f) => f.properties!.k === 2);
      expect(sprites.length).toBeGreaterThan(10);
      for (const f of sprites) expect(names.has(f.properties!.i)).toBe(true);
      expect(beams.length > 0).toBe(light === 'night');
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

  it('reads OpenMapTiles and Protomaps road features', () => {
    const line = { type: 'LineString' as const, coordinates: [ll(0, 0), ll(0, 50)] };
    const roads = roadsFromFeatures([
      { type: 'Feature', geometry: line, properties: { class: 'primary', oneway: 1 } },
      { type: 'Feature', geometry: line, properties: { class: 'minor' } },
      { type: 'Feature', geometry: line, properties: { class: 'path' } },
      { type: 'Feature', geometry: line, properties: { kind: 'major_road' } },
      { type: 'Feature', geometry: line, properties: { kind: 'minor_road', kind_detail: 'service' } },
      {
        type: 'Feature',
        geometry: { type: 'MultiLineString', coordinates: [line.coordinates, line.coordinates] },
        properties: { class: 'motorway' },
      },
    ]);
    expect(roads.map((r) => r.kind)).toEqual(['major', 'minor', 'major', 'service', 'highway', 'highway']);
    expect(roads[0].oneway).toBe(1);
    // Duplicate tile features collapse into one road.
    const net = new RoadNetwork([roads[1], roads[1]], [LNG0, LAT0]);
    expect(net.roads.length).toBe(1);
  });
});
