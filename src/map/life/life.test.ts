import { MAP_STYLE } from '@/config/map';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { LIFE_FRAMES, LIFE_POSES, LIFE_WALK_FRAMES, MAP_LIFE } from '@/config/mapLife';

import { metersPerPoint } from '../cameraMatch';
import { roadWidth } from '../style';

import {
  allLifeSpriteNames,
  LIFE_QUERY_LAYERS,
  lifeInputsFromFeatures,
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
  WaterIndex,
  type Customer,
  type LifeConditions,
  type LifeView,
  type VisitStage,
  type RoadInput,
  type WaterInput,
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

const ROAD_W = MAP_STYLE.roads.widthM;

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

  it('parks are alive but calmer than streets (one line per path)', () => {
    const park = peopleTarget(BUSY, { path: 1000 });
    const street = peopleTarget(BUSY, { minor: 1000 });
    expect(park).toBeGreaterThan(5);
    expect(park).toBeLessThan(street * 0.5);
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
        const [lo, hi] = MAP_LIFE.people.sidewalkOffsetM[net.roads[p.road].kind];
        expect(own.d).toBeGreaterThanOrEqual(lo - 0.05);
        expect(own.d).toBeLessThanOrEqual(hi + 0.05);
        // Clear of the drawn asphalt (major roads: including the casing).
        const half = net.roads[p.road].kind === 'major' ? ROAD_W.majorCasing / 2 : ROAD_W.minor / 2;
        expect(own.d).toBeGreaterThan(half + 0.5);
      }
      // Away from intersections, no road centerline is closer than the curb.
      let nearest = Infinity;
      for (let ri = 0; ri < net.roads.length; ri++)
        nearest = Math.min(nearest, distToRoad(net, ri, p.x, p.y).d);
      const ax = ((p.x % 260) + 260) % 260; // distance to the avenue grid
      const nearAvenue = Math.min(ax, 260 - ax) < 14;
      const sy = ((p.y % 80) + 80) % 80;
      const nearStreet = Math.min(sy, 80 - sy) < 12;
      if (!(nearAvenue && nearStreet)) expect(nearest).toBeGreaterThan(ROAD_W.minor / 2 + 0.5);
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
    const names = new Set(allLifeSpriteNames(LIFE_FRAMES));
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
      { type: 'Feature', geometry: line, properties: { class: 'path', subclass: 'footway' } },
      { type: 'Feature', geometry: line, properties: { class: 'path', subclass: 'pedestrian' } },
      { type: 'Feature', geometry: line, properties: { class: 'minor', brunnel: 'bridge' } },
      { type: 'Feature', geometry: line, properties: { class: 'service' } },
      { type: 'Feature', geometry: line, properties: { kind: 'major_road' } },
      { type: 'Feature', geometry: line, properties: { kind: 'path', kind_detail: 'footway' } },
      { type: 'Feature', geometry: line, properties: { kind: 'major_road', is_bridge: true } },
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
    // Service roads, motorways and bridges have no walkable sidewalks: dropped.
    expect(roads.map((r) => r.kind)).toEqual([
      'major',
      'minor',
      'path',
      'pedestrian',
      'major',
      'path',
    ]);
    // Duplicate tile features collapse into one road.
    const net = new RoadNetwork([roads[1], roads[1]], [LNG0, LAT0]);
    expect(net.roads.length).toBe(1);
  });

  it('splits rendered features into walkways, asphalt and water', () => {
    const line = { type: 'LineString' as const, coordinates: [ll(0, 0), ll(0, 50)] };
    const square = [ll(0, 0), ll(10, 0), ll(10, 10), ll(0, 10), ll(0, 0)];
    const { roads, surface } = lifeInputsFromFeatures([
      { type: 'Feature', geometry: line, properties: { class: 'motorway' } },
      { type: 'Feature', geometry: line, properties: { class: 'service' } },
      { type: 'Feature', geometry: line, properties: { class: 'minor', brunnel: 'bridge' } },
      { type: 'Feature', geometry: line, properties: { class: 'path' } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [square] }, properties: {} },
      {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: [[square], [square]] },
        properties: { class: 'lake' },
      },
    ]);
    expect(roads.map((r) => r.kind)).toEqual(['path']);
    // Bridges are still drawn asphalt; paths are not.
    expect(surface.asphalt!.map((r) => r.kind)).toEqual(['major', 'minor', 'minor']);
    expect(surface.water).toHaveLength(3);
    expect(LIFE_QUERY_LAYERS).toEqual(['roads-minor', 'roads-major', 'paths', 'water']);
  });
});

/** A water rectangle in local meters (lng/lat rings). */
const waterRect = (x0: number, y0: number, x1: number, y1: number): WaterInput => ({
  rings: [[ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1), ll(x0, y0)]],
});

describe('street life: sidewalks, paths and water', () => {
  it('the drawn roads stay inside the sidewalks at every zoom people show', () => {
    // Evaluate the exponential line-width stops (points) at a zoom.
    const widthAt = (expr: unknown[], z: number) => {
      const stops = expr.slice(3) as number[];
      for (let i = 0; i < stops.length - 2; i += 2) {
        const [z0, w0, z1, w1] = stops.slice(i, i + 4);
        if (z < z0 || z > z1) continue;
        const t = (2 ** (z - z0) - 1) / (2 ** (z1 - z0) - 1);
        return w0 + (w1 - w0) * t;
      }
      return stops[stops.length - 1];
    };
    for (const lat of [0, 40.75, 60]) {
      const minor = roadWidth([12, 0.5, 15, 3], ROAD_W.minor, lat) as unknown[];
      const casing = roadWidth([8, 0.8, 15, 7], ROAD_W.majorCasing, lat) as unknown[];
      for (let z = MAP_LIFE.minZoom; z <= 22; z += 0.25) {
        const m = metersPerPoint(z, lat);
        const minorHalf = (widthAt(minor, z) * m) / 2;
        const majorHalf = (widthAt(casing, z) * m) / 2;
        expect(minorHalf).toBeLessThan(MAP_LIFE.people.sidewalkOffsetM.minor[0] - 0.5);
        expect(majorHalf).toBeLessThan(MAP_LIFE.people.sidewalkOffsetM.major[0] - 0.5);
      }
    }
    expect(MAP_LIFE.fadeInEndZoom).toBeGreaterThan(MAP_LIFE.minZoom);
  });

  it('point-in-water handles holes, and tile-split pieces on their own', () => {
    const toLocal = (lng: number, lat: number): [number, number] => [
      (lng - LNG0) * KX,
      (lat - LAT0) * KY,
    ];
    const lake: WaterInput = {
      rings: [
        waterRect(0, 0, 100, 100).rings[0],
        // An island.
        waterRect(40, 40, 60, 60).rings[0],
      ],
    };
    // The same water twice (overlapping tile buffers) must not cancel out.
    const w = new WaterIndex([lake, waterRect(90, 0, 200, 100)], toLocal);
    expect(w.contains(20, 20)).toBe(true);
    expect(w.contains(50, 50)).toBe(false);
    expect(w.contains(95, 50)).toBe(true);
    expect(w.contains(150, 50)).toBe(true);
    expect(w.contains(-5, 50)).toBe(false);
    expect(w.contains(50, 130)).toBe(false);
  });

  it('nobody spawns or walks in water; customers start on dry land', () => {
    // A river 60 m wide across the grid at y = 100..160.
    const river = waterRect(-700, 100, 700, 160);
    const life = new StreetLife(11);
    life.setConditions(BUSY);
    life.setRoads(grid(), VIEW, { water: [river] });
    const dt = 1 / 14;
    let checked = 0;
    for (let t = 0; t < 60; t += dt) {
      life.step(dt);
      for (const p of life.people) {
        if (p.alpha <= 0) continue;

        expect(p.y < 100 || p.y > 160).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
    // A machine on the quay facing the river: the customer comes along the bank.
    const quay = ll(-11, 96);
    for (let i = 0; i < 6; i++) life.addCustomer(`q${i}`, quay[0], quay[1], 0);
    for (const c of life.customers) {
      expect(c.y).toBeLessThan(100);
      expect(c.exitY).toBeLessThan(100);
    }
  });

  it('keeps off a parallel carriageway (dual roads) and service roads', () => {
    // A dual carriageway: two one-way majors 14 m apart along x = ±7.
    const roads: RoadInput[] = [
      { coords: [ll(-7, -400), ll(-7, 400)], kind: 'major' },
      { coords: [ll(7, -400), ll(7, 400)], kind: 'major' },
    ];
    const life = new StreetLife(3);
    life.setConditions(BUSY);
    life.setRoads(roads, VIEW, {
      asphalt: [
        ...roads.map((r) => ({ coords: r.coords, kind: 'major' as const })),
        // A service road alongside, 10 m out from the west carriageway's sidewalk.
        { coords: [ll(-25, -400), ll(-25, 400)], kind: 'minor' },
      ],
    });
    const dt = 1 / 14;
    let checked = 0;
    for (let t = 0; t < 30; t += dt) {
      life.step(dt);
      for (const p of life.people) {
        if (p.alpha <= 0) continue;
        // Never in the median or on the service road's asphalt.
        expect(Math.abs(p.x)).toBeGreaterThan(7 + ROAD_W.majorCasing / 2);
        expect(Math.abs(p.x + 25)).toBeGreaterThan(ROAD_W.minor / 2);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('paths are walked down the middle, both ways, and stop at the curb', () => {
    const roads: RoadInput[] = [
      // A park path crossing the view, ending on a street at y = 200.
      { coords: [ll(-300, -50), ll(0, -50), ll(0, 200)], kind: 'path' },
      { coords: [ll(-400, 200), ll(400, 200)], kind: 'minor' },
    ];
    const life = new StreetLife(5);
    life.setConditions(BUSY);
    life.setRoads(roads, VIEW);
    const dt = 1 / 14;
    let onPath = 0;
    const dirs = new Set<number>();
    for (let t = 0; t < 120; t += dt) {
      life.step(dt);
      for (const p of life.people) {
        if (p.alpha <= 0 || p.road < 0 || Math.hypot(p.bx, p.by) > 0.3) continue;
        if (life.net!.roads[p.road].kind !== 'path') continue;
        const d = distToRoad(life.net!, p.road, p.x, p.y).d;
        expect(d).toBeLessThanOrEqual(MAP_LIFE.people.sidewalkOffsetM.path[1] + 0.05);
        // Never on the street's asphalt.
        expect(Math.abs(p.y - 200)).toBeGreaterThan(ROAD_W.minor / 2);
        dirs.add(p.dir);
        onPath++;
      }
    }
    expect(onPath).toBeGreaterThan(50);
    expect(dirs.size).toBe(2);
  });

  it('pedestrian streets are walked across their width', () => {
    const life = new StreetLife(8);
    life.setConditions(BUSY);
    life.setRoads([{ coords: [ll(0, -300), ll(0, 300)], kind: 'pedestrian' }], VIEW);
    for (let t = 0; t < 5; t += 0.1) life.step(0.1);
    const xs = life.people.map((p) => p.x);
    expect(xs.length).toBeGreaterThan(5);
    const [, hi] = MAP_LIFE.people.sidewalkOffsetM.pedestrian;
    for (const x of xs) expect(Math.abs(x)).toBeLessThanOrEqual(hi + 0.05);
    expect(Math.max(...xs.map(Math.abs))).toBeGreaterThan(hi * 0.5);
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

  it('walks up to the machine, looks, thinks, bends to buy, then leaves', () => {
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
    const V = MAP_LIFE.customers.visit;
    expect(arrivedAt).toBeGreaterThan(1 + V.lookSeconds[0] + V.thinkSeconds[0]);
    expect(arrivedAt).toBeLessThanOrEqual(
      MAP_LIFE.customers.maxWalkSeconds + V.lookSeconds[1] + V.thinkSeconds[1] + 0.3,
    );
    // At the machine: in front of it, facing it, bent down to the tray.
    expect(Math.hypot(c.x - c.mx, c.y - c.my)).toBeCloseTo(MAP_LIFE.customers.standM, 1);
    expect(c.hx * (c.mx - c.x) + c.hy * (c.my - c.y)).toBeGreaterThan(0);
    expect(c.stage).toBe('bend');
    expect(c.frame).toBe(LIFE_POSES.crouch);

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

describe('street life: machine visits', () => {
  const machine = ll(-9, 20);
  const dt = 1 / 14;
  const V = MAP_LIFE.customers.visit;
  const B = MAP_LIFE.browsers;

  interface Trace {
    stages: VisitStage[];
    /** Seconds spent in each stage (in order). */
    spans: number[];
    released: { stage: VisitStage; frame: number; t: number }[];
    bubbles: (string | null)[];
    gone: number;
  }

  /** Step until `c` is gone, recording its stages, bubbles and releases. */
  function trace(life: StreetLife, c: Customer, seconds = 40): Trace {
    const out: Trace = { stages: [c.stage], spans: [0], released: [], bubbles: [], gone: -1 };
    for (let t = 0; t < seconds; t += dt) {
      life.step(dt);
      for (const id of life.takeArrivals())
        if (id === c.saleId) out.released.push({ stage: c.stage, frame: c.frame, t });
      if (!life.customers.includes(c)) {
        out.gone = t;
        break;
      }
      if (c.stage !== out.stages[out.stages.length - 1]) {
        out.stages.push(c.stage);
        out.spans.push(0);
      }
      out.spans[out.spans.length - 1] += dt;
      if (out.bubbles[out.bubbles.length - 1] !== c.bubble) out.bubbles.push(c.bubble);
    }
    return out;
  }

  it('goes approach, look, think, bend, stand, leave, with configured timings', () => {
    const life = run(5, 1);
    life.addCustomer('sale-1', machine[0], machine[1], 270);
    const c = life.customers[0];
    const tr = trace(life, c);
    expect(tr.stages).toEqual(['approach', 'look', 'think', 'bend', 'stand', 'leave']);
    const [, look, think, bend, stand] = tr.spans;
    expect(look).toBeGreaterThanOrEqual(V.lookSeconds[0] - dt);
    expect(look).toBeLessThanOrEqual(V.lookSeconds[1] + dt);
    expect(think).toBeGreaterThanOrEqual(V.thinkSeconds[0] - dt);
    expect(think).toBeLessThanOrEqual(V.thinkSeconds[1] + dt);
    expect(bend).toBeCloseTo(V.bendSeconds, 0);
    expect(Math.abs(bend - V.bendSeconds)).toBeLessThanOrEqual(dt * 1.5);
    expect(Math.abs(stand - V.standSeconds)).toBeLessThanOrEqual(dt * 1.5);
    // The thought: "…" first, then what they buy; no bubble before or after.
    expect(tr.bubbles).toEqual([null, 'dots', c.glyph, null]);
    expect(tr.gone).toBeGreaterThan(0);
  });

  it('releases the sale exactly once, as they bend to the tray', () => {
    const life = run(6, 1);
    life.addCustomer('sale-1', machine[0], machine[1], 270);
    const c = life.customers[0];
    const tr = trace(life, c);
    expect(tr.released).toHaveLength(1);
    expect(tr.released[0].stage).toBe('bend');
    expect(tr.released[0].frame).toBe(LIFE_POSES.crouch);
  });

  it('looks with a lean-in sway and thinks with a hand to the chin', () => {
    const life = run(7, 1);
    life.addCustomer('sale-1', machine[0], machine[1], 270);
    const c = life.customers[0];
    const frames = new Map<VisitStage, Set<number>>();
    for (let t = 0; t < 20 && life.customers.includes(c); t += dt) {
      life.step(dt);
      if (!frames.has(c.stage)) frames.set(c.stage, new Set());
      frames.get(c.stage)!.add(c.frame);
    }
    expect([...frames.get('look')!].sort()).toEqual([LIFE_POSES.stand, LIFE_POSES.lean].sort());
    expect([...frames.get('think')!]).toEqual([LIFE_POSES.ponder]);
    expect([...frames.get('bend')!]).toEqual([LIFE_POSES.crouch]);
  });

  it('leaves a short way, fades out and is removed', () => {
    const life = run(5, 1);
    life.addCustomer('sale-1', machine[0], machine[1], 270);
    const c = life.customers[0];
    let leftAt: { x: number; y: number } | null = null;
    let prevAlpha = 1;
    let faded = false;
    for (let t = 0; t < 40 && life.customers.includes(c); t += dt) {
      life.step(dt);
      if (c.stage === 'leave' && !leftAt) leftAt = { x: c.x, y: c.y };
      if (c.dying) {
        expect(c.alpha).toBeLessThanOrEqual(prevAlpha);
        faded = true;
      }
      prevAlpha = c.alpha;
    }
    expect(faded).toBe(true);
    expect(life.customers).not.toContain(c);
    // They walked off before vanishing, but not far.
    expect(leftAt).not.toBeNull();
    const walked = Math.hypot(c.x - leftAt!.x, c.y - leftAt!.y);
    expect(walked).toBeGreaterThan(1);
    expect(walked).toBeLessThanOrEqual(MAP_LIFE.customers.exitM[1] + MAP_LIFE.customers.standM + 1);
  });

  it('a multi-item sale brings companions who each visit; each id is released once', () => {
    const life = run(5, 1);
    life.addCustomer('sale-2', machine[0], machine[1], 270);
    life.addCustomer('sale-2#1', machine[0], machine[1], 270);
    const [a, b] = life.customers;
    // Side by side at the machine.
    expect(Math.hypot(a.standX - b.standX, a.standY - b.standY)).toBeGreaterThan(0.5);
    const got: string[] = [];
    for (let t = 0; t < 40 && life.customers.length; t += dt) {
      life.step(dt);
      got.push(...life.takeArrivals());
    }
    expect(got.sort()).toEqual(['sale-2', 'sale-2#1']);
  });

  it('flush releases sales not yet taken (only those)', () => {
    const life = run(5, 1);
    life.addCustomer('early', machine[0], machine[1], 270);
    const c = life.customers[0];
    // Through the bend: the sale is out already.
    for (let t = 0; t < 30 && c.stage !== 'stand'; t += dt) life.step(dt);
    expect(life.takeArrivals()).toEqual(['early']);
    life.addCustomer('late', machine[0], machine[1], 270);
    life.step(dt);
    expect(life.flushCustomers()).toEqual(['late']);
  });

  it('draws a thought bubble over a thinking customer', () => {
    const life = run(5, 1);
    life.addCustomer('sale-1', machine[0], machine[1], 270);
    const c = life.customers[0];
    for (let t = 0; t < 30 && !(c.stage === 'think' && c.bubbleAlpha >= 1); t += dt) life.step(dt);
    const fc = JSON.parse(
      lifeGeoJSON(life, { bearing: 0, pitch: 55, light: 'night' }),
    ) as GeoJSON.FeatureCollection;
    const bubble = fc.features.filter((f) => String(f.properties!.i).startsWith('bub-'));
    expect(bubble).toHaveLength(1);
    expect(bubble[0].properties!.i).toBe('bub-dots-p60-night');
    expect(allLifeSpriteNames(LIFE_FRAMES)).toContain(bubble[0].properties!.i);
  });

  describe('window shoppers', () => {
    const near = { id: 'm1', lng: machine[0], lat: machine[1], heading: 270 };
    const far = { id: 'm2', lng: ll(5000, 0)[0], lat: ll(5000, 0)[1], heading: 0 };

    it('visit machines in view, look and think, and leave without a sale', () => {
      const life = run(11, 1);
      life.setMachines([near, far]);
      let shopper: Customer | undefined;
      for (let t = 0; t < 600 && !shopper; t += dt) {
        life.step(dt);
        shopper = life.customers.find((c) => c.saleId === null);
      }
      expect(shopper).toBeDefined();
      const [nx, ny] = life.net!.toLocal(near.lng, near.lat);
      expect(Math.hypot(shopper!.mx - nx, shopper!.my - ny)).toBeLessThan(0.01);
      expect(Math.hypot(shopper!.standX - nx, shopper!.standY - ny)).toBeCloseTo(
        MAP_LIFE.customers.standM,
        1,
      );
      const tr = trace(life, shopper!);
      expect(tr.stages).toEqual(['approach', 'look', 'think', 'leave']);
      expect(tr.bubbles).toEqual([null, 'dots', null]);
      expect(tr.gone).toBeGreaterThan(0);
      expect(life.takeArrivals()).toEqual([]);
      const [, look, think] = tr.spans;
      expect(look).toBeGreaterThanOrEqual(B.lookSeconds[0] - dt);
      expect(look).toBeLessThanOrEqual(B.lookSeconds[1] + dt);
      expect(think).toBeLessThanOrEqual(B.thinkSeconds[1] + dt);
    });

    it('are modest: rate per machine, capped, never at machines out of view', () => {
      const life = run(12, 1);
      life.setMachines([far]);
      for (let t = 0; t < 120; t += dt) life.step(dt);
      expect(life.customers).toHaveLength(0);

      const many = Array.from({ length: 30 }, (_, i) => ({
        id: `m${i}`,
        lng: ll(-9, -200 + i * 14)[0],
        lat: ll(-9, -200 + i * 14)[1],
        heading: 270,
      }));
      const busy = run(13, 1);
      busy.setMachines(many);
      let visits = 0;
      const seen = new Set<number>();
      for (let t = 0; t < 120; t += dt) {
        busy.step(dt);
        const shoppers = busy.customers.filter((c) => c.saleId === null);
        expect(shoppers.length).toBeLessThanOrEqual(B.max);
        for (const c of shoppers) if (!seen.has(c.id)) seen.add(c.id) && visits++;
      }
      // Never more than the configured rate allows (30 machines, 2 minutes).
      expect(visits).toBeGreaterThan(0);
      expect(visits).toBeLessThanOrEqual(Math.ceil(B.perMachinePerMinute * 30 * 2 * 1.5));
    });

    it("don't take a sale's place: sales still get customers", () => {
      const life = run(14, 1);
      life.setMachines([near]);
      for (let t = 0; t < 600 && !life.customers.length; t += dt) life.step(dt);
      for (let i = 0; i < MAP_LIFE.customers.max; i++)
        expect(life.addCustomer(`s${i}`, machine[0], machine[1], 270)).toBe(true);
    });
  });
});

describe('street life: sprite files', () => {
  it('every sprite the layer can ask for was generated', () => {
    const dir = path.join(__dirname, '../../../assets/sprites/life');
    const missing = allLifeSpriteNames(LIFE_FRAMES).filter(
      (n) => !existsSync(path.join(dir, `${n}.png`)),
    );
    expect(missing).toEqual([]);
  });
});
