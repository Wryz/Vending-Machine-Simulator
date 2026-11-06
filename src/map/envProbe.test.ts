import { PRESETS } from '@/config/timeOfDay';

import {
  distanceToPolygonsM,
  PARK_LAYER_IDS,
  probeEnvironment,
  probeFromFeatures,
  WATER_LAYER_ID,
  type PolygonInput,
} from './envProbe';
import { buildBaseLayers, type TileSchema } from './style';

const LAT = 52.37;
const LNG = 4.9;
const mPerDegLat = 110_574;
const mPerDegLng = 111_320 * Math.cos((LAT * Math.PI) / 180);

/** Axis-aligned rectangle in meters relative to the center. */
function rect(x0: number, y0: number, x1: number, y1: number): PolygonInput {
  const p = (x: number, y: number): [number, number] => [LNG + x / mPerDegLng, LAT + y / mPerDegLat];
  return { rings: [[p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1), p(x0, y0)]] };
}

const C: [number, number] = [LNG, LAT];

describe('distanceToPolygonsM', () => {
  it('is 0 inside a polygon', () => {
    expect(distanceToPolygonsM(C, [rect(-50, -50, 50, 50)], 500)).toBe(0);
  });

  it('measures the distance to the nearest edge in meters', () => {
    const d = distanceToPolygonsM(C, [rect(120, -40, 400, 40)], 500);
    expect(d).not.toBeNull();
    expect(Math.abs((d ?? 0) - 120)).toBeLessThan(1);
    // Diagonal corner: hypot(30, 40) = 50.
    const c = distanceToPolygonsM(C, [rect(30, 40, 90, 90)], 500) ?? -1;
    expect(Math.abs(c - 50)).toBeLessThan(0.5);
  });

  it('takes the nearest of several and ignores those out of range', () => {
    const polys = [rect(300, -10, 350, 10), rect(-10, -210, 10, -200)];
    expect(Math.abs((distanceToPolygonsM(C, polys, 500) ?? 0) - 200)).toBeLessThan(1);
    expect(distanceToPolygonsM(C, [rect(800, 0, 900, 50)], 500)).toBeNull();
    expect(distanceToPolygonsM(C, [], 500)).toBeNull();
  });

  it('counts a hole as outside', () => {
    const outer = rect(-200, -200, 200, 200).rings[0];
    const hole = rect(-60, -60, 60, 60).rings[0];
    const d = distanceToPolygonsM(C, [{ rings: [outer, hole] }], 500) ?? -1;
    expect(Math.abs(d - 60)).toBeLessThan(0.5);
  });

  it('treats tile-clipped pieces like the whole shape', () => {
    // A lake cut in two by a tile edge at x = 100: the clip edge never wins.
    const pieces = [rect(40, -300, 100, 300), rect(100, -300, 400, 300)];
    expect(Math.abs((distanceToPolygonsM(C, pieces, 500) ?? 0) - 40)).toBeLessThan(0.5);
  });

  it('is safe on odd input', () => {
    expect(distanceToPolygonsM([Number.NaN, LAT], [rect(-1, -1, 1, 1)], 500)).toBeNull();
    expect(distanceToPolygonsM(C, [rect(-1, -1, 1, 1)], 0)).toBeNull();
    expect(distanceToPolygonsM(C, [{ rings: [[], [[LNG, LAT]]] }], 500)).toBeNull();
  });
});

describe('probeEnvironment', () => {
  it('reports water and green separately', () => {
    const r = probeEnvironment(C, [rect(250, -100, 600, 100)], [rect(-20, -20, 20, 20)], 500);
    expect(Math.abs((r.waterDistM ?? 0) - 250)).toBeLessThan(1);
    expect(r.parkDistM).toBe(0);
    expect(probeEnvironment(C, [], [], 500)).toEqual({ waterDistM: null, parkDistM: null });
  });
});

describe('probeFromFeatures', () => {
  it('reads polygon and multipolygon features, skipping lines and points', () => {
    const coords = (p: PolygonInput) => p.rings.map((r) => r.map(([x, y]) => [x, y]));
    const poly = (p: PolygonInput): GeoJSON.Feature => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: coords(p) },
    });
    const multi: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: [coords(rect(900, 900, 950, 950)), coords(rect(150, -10, 200, 10))],
      },
    };
    const line: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [C, [LNG + 0.0001, LAT]] },
    };
    const r = probeFromFeatures(C, [multi, line], [poly(rect(-5, -5, 5, 5))], 500);
    expect(Math.abs((r.waterDistM ?? 0) - 150)).toBeLessThan(1);
    expect(r.parkDistM).toBe(0);
  });
});

describe('probe layers', () => {
  it('names fill layers that exist in each tile schema', () => {
    for (const schema of ['protomaps', 'openmaptiles'] as TileSchema[]) {
      const layers = buildBaseLayers(PRESETS.day, schema);
      for (const id of [WATER_LAYER_ID, ...PARK_LAYER_IDS[schema]]) {
        const l = layers.find((x) => x.id === id);
        expect(l?.type).toBe('fill');
      }
    }
  });
});
