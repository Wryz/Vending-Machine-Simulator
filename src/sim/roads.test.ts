import type { RoadNet } from '@/data/types';

import {
  buildRoadGraph,
  newGame,
  orderRestock,
  placeMachine,
  pointAlong,
  routeOnRoads,
  suggestRestock,
  withClone,
} from './index';
import { distanceM } from './geo';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

const Z = 15;
const RES = 512;
const N = 2 ** Z * RES;
const qx = (lng: number) => Math.round(((lng + 180) / 360) * N);
const qy = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.round(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * N);
};

/**
 * A U of streets around a block: west street up, north street across, east
 * street down. No street crosses the block, so a drive from its south-west to
 * its south-east corner must go round.
 */
function blockNet(at: { lat: number; lng: number }) {
  const d = 0.004; // ~440 m north, ~340 m east
  const sw = [qx(at.lng), qy(at.lat)];
  const nw = [qx(at.lng), qy(at.lat + d)];
  const ne = [qx(at.lng + d), qy(at.lat + d)];
  const se = [qx(at.lng + d), qy(at.lat)];
  const ox = Math.min(sw[0], ne[0]);
  const oy = Math.min(sw[1], ne[1]);
  const line = (a: number[], b: number[]) => [a[0] - ox, a[1] - oy, b[0] - a[0], b[1] - a[1]];
  const net: RoadNet = {
    schemaVersion: 1,
    z: Z,
    res: RES,
    ox,
    oy,
    lines: [line(sw, nw), line(nw, ne), line(ne, se)],
    cls: [2, 1, 2],
  };
  return { net, d };
}

describe('van routes', () => {
  const at = decentSpot();
  const { net, d } = blockNet(at);
  const g = buildRoadGraph(net);

  it('follow the streets around a block instead of cutting across it', () => {
    const a = { lat: at.lat, lng: at.lng };
    const b = { lat: at.lat, lng: at.lng + d };
    const r = routeOnRoads(g, a, b)!;
    expect(r).not.toBeNull();
    const straight = distanceM(a, b);
    // Up, across and down: well over twice the straight line.
    expect(r.lengthM).toBeGreaterThan(straight * 2.5);
    // It passes the block's north corners.
    const north = r.path.filter(([, lat]) => lat > at.lat + d * 0.9);
    expect(north.length).toBeGreaterThanOrEqual(2);
  });

  it('places the van along the route by share of the way', () => {
    const r = routeOnRoads(g, at, { lat: at.lat, lng: at.lng + d })!;
    const start = pointAlong(r.path, 0).at;
    const mid = pointAlong(r.path, 0.5).at;
    const end = pointAlong(r.path, 1).at;
    expect(start[1]).toBeCloseTo(at.lat, 4);
    // Halfway is on the north street.
    expect(mid[1]).toBeCloseTo(at.lat + d, 3);
    expect(end[0]).toBeCloseTo(at.lng + d, 4);
  });

  it('a delivery drives the street route, and longer roads take longer', () => {
    const world = {
      ...testWorld(),
      suppliers: [{ id: 'w1', name: '', kind: 'warehouse' as const, lat: at.lat, lng: at.lng + d }],
      route: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
        routeOnRoads(g, a, b),
    };
    const s = withClone(newGame({ cityId: 'new-york', now: NOON_NY, seed: 3 }), (x) =>
      placeMachine(x, world, {
        machineId: x.machines[0].id,
        ...at,
        heading: 180,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    const r = orderRestock(s, world, s.machines[0].id, suggestRestock(s, s.machines[0].id));
    if (!r.ok) throw new Error(r.error);
    expect(r.delivery.path!.length).toBeGreaterThan(3);
    expect(r.delivery.path!.some(([, lat]) => lat > at.lat + d * 0.9)).toBe(true);
    const straightWorld = { ...world, route: undefined };
    const s2 = withClone(newGame({ cityId: 'new-york', now: NOON_NY, seed: 3 }), (x) =>
      placeMachine(x, straightWorld, {
        machineId: x.machines[0].id,
        ...at,
        heading: 180,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    const r2 = orderRestock(
      s2,
      straightWorld,
      s2.machines[0].id,
      suggestRestock(s2, s2.machines[0].id),
    );
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.delivery.path).toHaveLength(2);
    expect(r.delivery.fuelCents).toBeGreaterThan(r2.delivery.fuelCents);
  });
});
