/**
 * Browser entry for `render-previews.mjs --life`: runs the real street-life
 * sim (src/map/life) on the roads MapLibre GL JS rendered, and draws it with
 * the same layer specs as the app (life sprites loaded one by one).
 */
import { LIFE_FRAMES, MAP_LIFE } from '@/config/mapLife';
import {
  allLifeSpriteNames,
  busyLevel,
  lifeGeoJSON,
  lifeLightFor,
  lifePitchBucket,
  lifeSymbolLayer,
  lifeViewRadiusM,
  lifeInputsFromFeatures,
  LIFE_QUERY_LAYERS,
  StreetLife,
  type LifeConditions,
} from '@/map/life';
import { getTimeOfDay } from '@/map/timeOfDay';

/** Must match LIFE_SPRITE_PTS_PER_METER in src/map/lifeSprites.ts (generated). */
const LIFE_PTS_PER_METER = 12;

interface GLMap {
  queryRenderedFeatures(opts: { layers: string[] }): GeoJSON.Feature[];
  getBounds(): { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number };
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  getBearing(): number;
  getPitch(): number;
  getContainer(): HTMLElement;
  addImage(name: string, img: ImageBitmap, opts: { pixelRatio: number }): void;
  hasImage(name: string): boolean;
  addSource(id: string, src: unknown): void;
  addLayer(layer: unknown, beforeId?: string): void;
  getLayer(id: string): unknown;
}

export async function addLife(
  map: GLMap,
  opts: { date: string; spriteBase: string; seed: number; seconds: number; beforeId?: string },
) {
  const date = new Date(opts.date);
  const c = map.getCenter();
  const tod = getTimeOfDay(date, c.lat, c.lng);
  const light = lifeLightFor(tod.weights);
  const hour =
    Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        hour12: false,
      }).format(date),
    ) % 24;
  // Midtown: busy by day, a lively-but-thinner late evening.
  const cond: LifeConditions = {
    hour,
    restDay: false,
    footTraffic: hour >= 22 || hour < 6 ? 110 : 330,
  };

  const features = map.queryRenderedFeatures({ layers: [...LIFE_QUERY_LAYERS] });
  const { roads, surface } = lifeInputsFromFeatures(features);
  const b = map.getBounds();
  const view = {
    bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
    center: [c.lng, c.lat] as const,
    radiusM: lifeViewRadiusM(map.getZoom(), c.lat, map.getContainer().clientHeight),
  };
  const life = new StreetLife(opts.seed);
  life.setConditions(cond);
  life.setRoads(roads, view, surface);
  const dt = 1 / MAP_LIFE.fps;
  for (let t = 0; t < opts.seconds; t += dt) life.step(dt);

  const pitch = lifePitchBucket(map.getPitch());
  const wanted = allLifeSpriteNames(LIFE_FRAMES).filter(
    (n) => n.endsWith(`-p${pitch}-${light}`) && !map.hasImage(n),
  );
  await Promise.all(
    wanted.map(async (n) => {
      const res = await fetch(`${opts.spriteBase}/${n}.png`);
      map.addImage(n, await createImageBitmap(await res.blob()), { pixelRatio: 2 });
    }),
  );

  const data = JSON.parse(
    lifeGeoJSON(life, { bearing: map.getBearing(), pitch: map.getPitch(), light }),
  ) as GeoJSON.FeatureCollection;
  map.addSource('life', { type: 'geojson', data });
  const band = { minZoom: MAP_LIFE.minZoom, fadeInEndZoom: MAP_LIFE.fadeInEndZoom };
  const sym = lifeSymbolLayer(c.lat, LIFE_PTS_PER_METER, band);
  map.addLayer({ id: 'life-sprites', type: 'symbol', source: 'life', ...sym }, opts.beforeId);

  return {
    light,
    hour,
    roads: roads.length,
    roadPieces: life.net?.roads.length ?? 0,
    targetPeople: life.targetPeople,
    people: life.people.length,
    busy: +busyLevel(cond).toFixed(2),
    radiusM: Math.round(view.radiusM),
  };
}
