import type {
  LayerSpecification,
  LightSpecification,
  StyleSpecification,
  VectorSourceSpecification,
} from '@maplibre/maplibre-react-native';

import type { Palette } from '@/config/timeOfDay';
import { MAP_STYLE } from '@/config/map';

import type { SunState } from './sun';
import { mixColors } from './timeOfDay';

/**
 * Custom MapLibre style (SPEC §3.5) over the Protomaps v4 basemap schema
 * (layers: earth, water, landuse, roads, buildings, places, ...).
 *
 * Everything colored comes from a `Palette`, so the same builder serves every
 * time-of-day blend. No default POI icons are ever rendered.
 */

export const BASEMAP_SOURCE_ID = 'basemap';

export type TileSource =
  /** Native PMTiles (MapLibre Native iOS >= 6.10 / Android >= 11.8). */
  | { kind: 'pmtiles'; url: string }
  /** XYZ vector tiles, e.g. the data-api Worker's /tiles/{city}/{z}/{x}/{y}.mvt route. */
  | { kind: 'xyz'; urlTemplate: string; maxzoom?: number };

export function buildBasemapSource(tiles: TileSource): VectorSourceSpecification {
  const attribution = '© OpenStreetMap contributors';
  if (tiles.kind === 'pmtiles') {
    const url = tiles.url.startsWith('pmtiles://') ? tiles.url : `pmtiles://${tiles.url}`;
    return { type: 'vector', url, attribution };
  }
  return {
    type: 'vector',
    tiles: [tiles.urlTemplate],
    maxzoom: tiles.maxzoom ?? 15,
    attribution,
  };
}

const PARK_KINDS = [
  'park',
  'garden',
  'national_park',
  'nature_reserve',
  'forest',
  'wood',
  'grass',
  'grassland',
  'meadow',
  'playground',
  'pitch',
  'golf_course',
  'cemetery',
];

export function buildBaseLayers(p: Palette): LayerSpecification[] {
  const src = BASEMAP_SOURCE_ID;
  const { building, label } = MAP_STYLE;
  return [
    // Water is the backdrop; land ("earth") sits on top of it.
    { id: 'background', type: 'background', paint: { 'background-color': p.water } },
    {
      id: 'earth',
      type: 'fill',
      source: src,
      'source-layer': 'earth',
      paint: { 'fill-color': p.land },
    },
    {
      id: 'landuse-park',
      type: 'fill',
      source: src,
      'source-layer': 'landuse',
      filter: ['in', ['get', 'kind'], ['literal', PARK_KINDS]],
      paint: { 'fill-color': p.park },
    },
    {
      id: 'water',
      type: 'fill',
      source: src,
      'source-layer': 'water',
      paint: { 'fill-color': p.water },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: src,
      'source-layer': 'roads',
      minzoom: 12,
      filter: [
        'all',
        ['in', ['get', 'kind'], ['literal', ['minor_road', 'other']]],
        ['!', ['to-boolean', ['get', 'is_tunnel']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.road,
        'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0.5, 15, 3, 18, 14],
      },
    },
    {
      id: 'roads-major-casing',
      type: 'line',
      source: src,
      'source-layer': 'roads',
      filter: [
        'all',
        ['in', ['get', 'kind'], ['literal', ['major_road', 'highway']]],
        ['!', ['to-boolean', ['get', 'is_tunnel']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadCasing,
        'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 0.8, 15, 7, 18, 26],
      },
    },
    {
      id: 'roads-major',
      type: 'line',
      source: src,
      'source-layer': 'roads',
      filter: [
        'all',
        ['in', ['get', 'kind'], ['literal', ['major_road', 'highway']]],
        ['!', ['to-boolean', ['get', 'is_tunnel']]],
      ],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadMajor,
        'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 0.5, 15, 5.5, 18, 22],
      },
    },
    {
      id: 'buildings',
      type: 'fill-extrusion',
      source: src,
      'source-layer': 'buildings',
      minzoom: building.minZoom,
      paint: {
        'fill-extrusion-color': p.building,
        'fill-extrusion-height': ['coalesce', ['get', 'height'], building.defaultHeightM],
        'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
        'fill-extrusion-vertical-gradient': true,
        'fill-extrusion-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          building.minZoom,
          0,
          building.minZoom + 0.5,
          building.opacity,
        ],
      },
    },
    {
      id: 'label-districts',
      type: 'symbol',
      source: src,
      'source-layer': 'places',
      minzoom: label.districtMinZoom,
      maxzoom: label.districtMaxZoom,
      filter: ['in', ['get', 'kind'], ['literal', ['neighbourhood', 'macrohood', 'locality']]],
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': [...label.font],
        'text-size': 12,
        'text-letter-spacing': 0.12,
        'text-transform': 'uppercase',
        'text-max-width': 8,
      },
      paint: { 'text-color': p.label, 'text-halo-color': p.labelHalo, 'text-halo-width': 1.2 },
    },
    {
      id: 'label-major-roads',
      type: 'symbol',
      source: src,
      'source-layer': 'roads',
      minzoom: label.roadMinZoom,
      filter: ['in', ['get', 'kind'], ['literal', ['major_road', 'highway']]],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': [...label.font],
        'text-size': 11,
      },
      paint: { 'text-color': p.label, 'text-halo-color': p.labelHalo, 'text-halo-width': 1 },
    },
  ];
}

/**
 * MapLibre `light` for fill-extrusions, driven by the real sun.
 * position = [radial, azimuthal (bearing, 0 = north), polar (0 = overhead)].
 * Below the horizon we light from high overhead with the night tint, so
 * buildings read as moonlit rather than lit from under the ground.
 */
export function buildMapLight(sun: SunState, p: Palette): LightSpecification {
  const polar = sun.altitudeDeg > 0 ? Math.min(85, Math.max(15, 90 - sun.altitudeDeg)) : 30;
  return {
    anchor: 'map',
    position: [1.15, sun.bearingDeg, polar],
    // Tint toward white: a fully saturated sun color turns every building orange at dusk.
    color: mixColors([
      [p.sunColor, 0.3],
      ['#FFFFFF', 0.7],
    ]),
    intensity: p.mapLightIntensity,
  };
}

export function buildMapStyle(opts: {
  tiles: TileSource;
  palette: Palette;
  sun: SunState;
  /** Set to false to leave layers out (they are rendered as RN <Layer>s). */
  includeLayers?: boolean;
}): StyleSpecification {
  return {
    version: 8,
    name: 'Coinline',
    glyphs: MAP_STYLE.glyphsUrl,
    sources: { [BASEMAP_SOURCE_ID]: buildBasemapSource(opts.tiles) },
    light: buildMapLight(opts.sun, opts.palette),
    layers: opts.includeLayers === false ? [] : buildBaseLayers(opts.palette),
  };
}
