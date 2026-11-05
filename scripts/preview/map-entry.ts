/**
 * Browser entry for the map preview: our real style builder + time-of-day
 * code, rendered by MapLibre GL JS (loaded from unpkg by the page).
 */
import { MACHINE_SPRITES } from '@/config/map';
import { iconImageExpression, spriteLightFor } from '@/map/machineSprites';
import { buildMapStyle, type TileSource } from '@/map/style';
import { getTimeOfDay, mixColors } from '@/map/timeOfDay';

export { getTimeOfDay };

/** Blend a color toward white (map light experiment). */
export const towardWhite = (hex: string, t: number) =>
  mixColors([
    [hex, 1 - t],
    ['#FFFFFF', t],
  ]);

const NY_TZ = 'America/New_York';

/** UTC Date for a New York wall-clock time. */
export function nyDate(y: number, m: number, d: number, hh: number, mm: number): Date {
  for (const offset of [4, 5]) {
    const t = new Date(Date.UTC(y, m - 1, d, hh + offset, mm));
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: NY_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(t);
    if (parts === `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`) return t;
  }
  throw new Error('no NY offset matched');
}

export const SHOTS = [
  { name: 'dawn', hh: 7, mm: 0 },
  { name: 'day', hh: 13, mm: 0 },
  { name: 'dusk', hh: 18, mm: 30 },
  { name: 'night', hh: 23, mm: 0 },
] as const;

/** Pick the 2026 date where 07:00 is most "dawn" and 18:30 most "dusk" in New York. */
export function pickDate(lat: number, lng: number) {
  let best = { score: -1, y: 2026, m: 1, d: 1 };
  for (let doy = 0; doy < 365; doy++) {
    const dt = new Date(Date.UTC(2026, 0, 1 + doy));
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const tods = SHOTS.map((s) => getTimeOfDay(nyDate(y, m, d, s.hh, s.mm), lat, lng));
    if (tods.map((t) => t.dominant).join() !== 'dawn,day,dusk,night') continue;
    const score = Math.min(tods[0].weights.dawn, tods[2].weights.dusk);
    if (score > best.score) best = { score, y, m, d };
  }
  return best;
}

export interface MachinePoint {
  lng: number;
  lat: number;
  model: string;
  /** World heading bucket 0..7 (direction the front faces / 45°). */
  hb: number;
}

export function buildPreviewStyle(opts: {
  date: Date;
  lat: number;
  lng: number;
  tilesUrl: string;
  /** Overrides tilesUrl, e.g. OpenFreeMap TileJSON (OpenMapTiles schema). */
  tiles?: TileSource;
  spriteUrl: string;
  bearing: number;
  pitch: number;
  machines: MachinePoint[];
  iconOffset: [number, number];
}) {
  const tod = getTimeOfDay(opts.date, opts.lat, opts.lng);
  const style = buildMapStyle({
    tiles: opts.tiles ?? { kind: 'pmtiles', url: opts.tilesUrl },
    palette: tod.palette,
    sun: tod.sun,
  }) as unknown as Record<string, unknown> & {
    layers: unknown[];
    sources: Record<string, unknown>;
  };
  style.sprite = opts.spriteUrl;
  style.sources.machines = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: opts.machines.map((m) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: { model: m.model, hb: m.hb },
      })),
    },
  };
  const light = spriteLightFor(tod.dominant);
  style.layers.push({
    id: 'machines',
    type: 'symbol',
    source: 'machines',
    layout: {
      'icon-image': iconImageExpression(opts.bearing, opts.pitch, light),
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        ...MACHINE_SPRITES.iconSizeByZoom.flatMap(([z, s]) => [z, s]),
      ],
      'icon-anchor': 'bottom',
      'icon-offset': opts.iconOffset,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-pitch-alignment': 'viewport',
      'icon-rotation-alignment': 'viewport',
      'symbol-z-order': 'viewport-y',
    },
  });
  return { style, tod: { dominant: tod.dominant, weights: tod.weights, sun: tod.sun, light } };
}
