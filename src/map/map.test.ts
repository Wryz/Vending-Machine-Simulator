import { FALLBACK_CITIES } from '@/config/cities';
import { PRESETS } from '@/config/timeOfDay';

import {
  bearingToVector,
  blendSceneCameras,
  closeupCamera,
  headingToRotationY,
  mapCameraToScene,
  metersPerPoint,
} from './cameraMatch';
import {
  bearingOffset,
  headingBucket,
  iconImageExpression,
  iconSizeStops,
  pitchBucket,
  relativeHeadingBucket,
  spriteLightFor,
  spriteName,
} from './machineSprites';
import { buildBaseLayers, buildBasemapSource, buildMapLight, buildMapStyle } from './style';
import { getSunState } from './sun';
import { blendPalettes, getTimeOfDay, mixColors, presetWeights } from './timeOfDay';

const NYC = FALLBACK_CITIES[0];
const TOKYO = FALLBACK_CITIES.find((c) => c.id === 'tokyo')!;

describe('time of day', () => {
  it('weights always sum to 1 and at most two presets are active', () => {
    for (let h = 0; h < 24; h += 0.5) {
      const tod = getTimeOfDay(new Date(Date.UTC(2026, 5, 10, h, (h % 1) * 60)), NYC.lat, NYC.lng);
      const sum = Object.values(tod.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
      expect(Object.values(tod.weights).filter((w) => w > 0).length).toBeLessThanOrEqual(2);
    }
  });
  it('NYC: day at local noon, night at local midnight, dawn rising, dusk setting', () => {
    expect(getTimeOfDay(new Date(Date.UTC(2026, 5, 10, 16)), NYC.lat, NYC.lng).dominant).toBe(
      'day',
    );
    expect(getTimeOfDay(new Date(Date.UTC(2026, 5, 11, 4)), NYC.lat, NYC.lng).dominant).toBe(
      'night',
    );
    const dawn = getTimeOfDay(new Date(Date.UTC(2026, 5, 10, 9, 20)), NYC.lat, NYC.lng); // ~05:20 EDT
    expect(dawn.weights.dawn).toBeGreaterThan(0);
    expect(dawn.weights.dusk).toBe(0);
    const dusk = getTimeOfDay(new Date(Date.UTC(2026, 5, 11, 0, 40)), NYC.lat, NYC.lng); // ~20:40 EDT
    expect(dusk.weights.dusk).toBeGreaterThan(0);
    expect(dusk.weights.dawn).toBe(0);
  });
  it('Tokyo is at night while it is day in Chicago (acceptance §13)', () => {
    const t = new Date(Date.UTC(2026, 5, 10, 17)); // 12:00 CDT, 02:00 JST
    const chicago = FALLBACK_CITIES.find((c) => c.id === 'chicago')!;
    expect(getTimeOfDay(t, chicago.lat, chicago.lng).dominant).toBe('day');
    expect(getTimeOfDay(t, TOKYO.lat, TOKYO.lng).dominant).toBe('night');
  });
  it('blends colors linearly', () => {
    expect(
      mixColors([
        ['#000000', 1],
        ['#FFFFFF', 1],
      ]),
    ).toBe('#808080');
    expect(() => mixColors([['#000000', 0]])).toThrow();
    const p = blendPalettes({ night: 0, dawn: 0, day: 1, dusk: 0 });
    expect(p.land).toBe(PRESETS.day.land);
    expect(presetWeights({ altitudeDeg: -30, bearingDeg: 0, rising: true }).night).toBe(1);
  });
  it('sun bearing is a compass bearing (south at noon in the northern hemisphere)', () => {
    const s = getSunState(new Date(Date.UTC(2026, 5, 10, 17)), NYC.lat, NYC.lng);
    expect(s.bearingDeg).toBeGreaterThan(120);
    expect(s.bearingDeg).toBeLessThan(240);
    expect(s.altitudeDeg).toBeGreaterThan(50);
  });
});

describe('map style', () => {
  const tod = getTimeOfDay(new Date(Date.UTC(2026, 5, 10, 16)), NYC.lat, NYC.lng);
  it('builds a valid-looking v8 style with our layers and no default POI icons', () => {
    const style = buildMapStyle({
      tiles: { kind: 'pmtiles', url: 'https://x/nyc.pmtiles' },
      palette: tod.palette,
      sun: tod.sun,
    });
    expect(style.version).toBe(8);
    expect((style.sources.basemap as { url: string }).url).toBe('pmtiles://https://x/nyc.pmtiles');
    const ids = style.layers.map((l) => l.id);
    expect(ids).toEqual(
      expect.arrayContaining(['background', 'earth', 'water', 'roads-major', 'buildings']),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(style.layers.some((l) => 'source-layer' in l && l['source-layer'] === 'pois')).toBe(
      false,
    );
    const buildings = style.layers.find((l) => l.id === 'buildings')!;
    expect(buildings.type).toBe('fill-extrusion');
  });
  it('supports the Worker XYZ route and sun-driven light', () => {
    const src = buildBasemapSource({
      kind: 'xyz',
      urlTemplate: 'https://api/tiles/nyc/{z}/{x}/{y}.mvt',
    });
    expect(src.tiles).toEqual(['https://api/tiles/nyc/{z}/{x}/{y}.mvt']);
    const light = buildMapLight(tod.sun, tod.palette);
    expect(light.anchor).toBe('map');
    expect((light.position as number[])[1]).toBeCloseTo(tod.sun.bearingDeg);
    const night = buildMapLight({ altitudeDeg: -20, bearingDeg: 10, rising: false }, PRESETS.night);
    expect((night.position as number[])[2]).toBe(30);
    expect(buildBaseLayers(PRESETS.night)[0].paint).toEqual({
      'background-color': PRESETS.night.water,
    });
  });
});

describe('camera matching', () => {
  it('meters per point halves with each zoom level', () => {
    expect(metersPerPoint(15, 0) / metersPerPoint(16, 0)).toBeCloseTo(2);
  });
  it('places the 3D camera behind the bearing at the map distance', () => {
    const c = mapCameraToScene({
      zoom: 20.5,
      pitch: 60,
      bearing: 0,
      latitude: 40.7,
      viewportHeight: 844,
    });
    expect(c.position[2]).toBeGreaterThan(0); // looking north -> camera to the south (+z)
    expect(Math.abs(c.position[0])).toBeLessThan(1e-9);
    const d = Math.hypot(...c.position);
    const expected =
      (844 / 2 / Math.tan(((c.fovDeg / 2) * Math.PI) / 180)) * metersPerPoint(20.5, 40.7);
    expect(d).toBeCloseTo(expected, 3);
    expect(c.position[1] / Math.hypot(c.position[0], c.position[2])).toBeCloseTo(
      Math.tan((30 * Math.PI) / 180),
      3,
    );
  });
  it('close-up stands in front of the machine and blends smoothly', () => {
    const cu = closeupCamera(90, 1.83, { distanceM: 2.6, eyeHeightM: 1.55, fovDeg: 40 });
    expect(cu.position[0]).toBeCloseTo(2.6); // faces east -> camera east of it
    const a = mapCameraToScene({
      zoom: 20,
      pitch: 60,
      bearing: 270,
      latitude: 40.7,
      viewportHeight: 800,
    });
    expect(blendSceneCameras(a, cu, 0)).toEqual(a);
    blendSceneCameras(a, cu, 1).position.forEach((v, i) =>
      expect(v).toBeCloseTo(cu.position[i], 6),
    );
    expect(bearingToVector(180)[1]).toBeCloseTo(1);
    expect(headingToRotationY(180)).toBeCloseTo(0);
  });
});

describe('machine sprites', () => {
  it('selects the front sprite when the camera looks at the front', () => {
    // Machine faces south (180); camera looking north (bearing 0) sees its front.
    expect(relativeHeadingBucket(180, 0)).toBe(0);
    expect(relativeHeadingBucket(180, 180)).toBe(4);
    expect(relativeHeadingBucket(270, 0)).toBe(2);
    expect(headingBucket(359)).toBe(0);
    expect(bearingOffset(0)).toBe(4);
  });
  it('names, pitches, lights and sizes', () => {
    expect(spriteName('snacks', 3, 60, 'night')).toBe('machine-snacks-h3-p60-night');
    expect(pitchBucket(10)).toBe(30);
    expect(pitchBucket(55)).toBe(60);
    expect(spriteLightFor('dawn')).toBe('dusk');
    const stops = iconSizeStops(40.7, 24, 0.3);
    expect(stops[0][1]).toBe(0.3);
    expect(stops[stops.length - 1][1]).toBeGreaterThan(stops[stops.length - 2][1]);
    expect(JSON.stringify(iconImageExpression(0, 60, 'day'))).toContain('-p60-day');
  });
});

describe('tile hosting', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { tileSourceFor } = require('./tiles') as typeof import('./tiles');
  it('defaults to OpenFreeMap (free, no key) with the OpenMapTiles schema', () => {
    expect(tileSourceFor('tokyo', { tilesUrl: '', tilesSchema: '' })).toEqual({
      kind: 'tilejson',
      url: 'https://tiles.openfreemap.org/planet',
      schema: 'openmaptiles',
    });
  });
  it('self-hosted PMTiles / XYZ overrides use the Protomaps schema', () => {
    expect(
      tileSourceFor('paris', {
        tilesUrl: 'https://data.example/pmtiles/{name}.pmtiles',
        tilesSchema: '',
      }),
    ).toEqual({
      kind: 'pmtiles',
      url: 'https://data.example/pmtiles/paris.pmtiles',
      schema: 'protomaps',
    });
    const xyz = tileSourceFor('area-85283473fffffff', {
      tilesUrl: 'https://d/tiles/{name}/{z}/{x}/{y}.mvt',
      tilesSchema: '',
    });
    expect(xyz).toEqual({
      kind: 'xyz',
      urlTemplate: 'https://d/tiles/planet/{z}/{x}/{y}.mvt',
      schema: 'protomaps',
    });
  });
  it('builds the same layer ids over OpenMapTiles, with OMT fields', () => {
    const tod = getTimeOfDay(new Date(Date.UTC(2026, 5, 10, 16)), NYC.lat, NYC.lng);
    const omt = buildMapStyle({
      tiles: tileSourceFor('new-york', { tilesUrl: '', tilesSchema: '' }),
      palette: tod.palette,
      sun: tod.sun,
    });
    const pm = buildMapStyle({
      tiles: { kind: 'pmtiles', url: 'x' },
      palette: tod.palette,
      sun: tod.sun,
    });
    const ids = (s: typeof omt) => new Set(s.layers.map((l) => l.id));
    for (const id of [
      'background',
      'water',
      'roads-minor',
      'roads-major',
      'buildings',
      'label-districts',
    ]) {
      expect(ids(omt).has(id)).toBe(true);
      expect(ids(pm).has(id)).toBe(true);
    }
    const b = omt.layers.find((l) => l.id === 'buildings') as {
      'source-layer': string;
      paint: Record<string, unknown>;
    };
    expect(b['source-layer']).toBe('building');
    expect(JSON.stringify(b.paint['fill-extrusion-height'])).toContain('render_height');
    expect((omt.sources.basemap as { attribution: string }).attribution).toContain('OpenFreeMap');
    expect(omt.glyphs).toContain('openfreemap');
  });
});
