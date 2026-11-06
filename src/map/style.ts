import type {
  LayerSpecification,
  LightSpecification,
  StyleSpecification,
  VectorSourceSpecification,
} from '@maplibre/maplibre-react-native';

import type { Palette } from '@/config/timeOfDay';
import { MAP_STYLE, TILES } from '@/config/map';

import { metersPerPoint } from './cameraMatch';
import type { SunState } from './sun';
import { mixColors } from './timeOfDay';

/**
 * Custom MapLibre style (SPEC §3.5). Two tile schemas, one look:
 * - OpenMapTiles (OpenFreeMap, the free default): water, landcover, landuse,
 *   park, transportation, building, place, transportation_name.
 * - Protomaps v4 (self-hosted PMTiles): earth, water, landuse, roads,
 *   buildings, places.
 * Layer ids are identical in both, so the rest of the app (heat overlay
 * `beforeId`, street-life road queries) doesn't care which is in use.
 *
 * Everything colored comes from a `Palette`, so the same builder serves every
 * time-of-day blend. No default POI icons are ever rendered.
 */

export const BASEMAP_SOURCE_ID = 'basemap';

export type TileSchema = 'openmaptiles' | 'protomaps';

export type TileSource =
  /** TileJSON URL (OpenFreeMap: https://tiles.openfreemap.org/planet). */
  | { kind: 'tilejson'; url: string; schema: TileSchema }
  /** Native PMTiles (MapLibre Native iOS >= 6.10 / Android >= 11.8). */
  | { kind: 'pmtiles'; url: string; schema?: TileSchema }
  /** XYZ vector tiles, e.g. the data-api Worker's /tiles/{city}/{z}/{x}/{y}.mvt route. */
  | { kind: 'xyz'; urlTemplate: string; maxzoom?: number; schema?: TileSchema };

export function schemaOf(tiles: TileSource): TileSchema {
  return tiles.schema ?? 'protomaps';
}

export function attributionFor(tiles: TileSource): string {
  return schemaOf(tiles) === 'openmaptiles'
    ? TILES.openFreeMapAttribution
    : TILES.protomapsAttribution;
}

export function buildBasemapSource(tiles: TileSource): VectorSourceSpecification {
  const attribution = attributionFor(tiles);
  if (tiles.kind === 'tilejson') return { type: 'vector', url: tiles.url, attribution };
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

/** `line-width` value type, taken from the RN layer spec (no direct style-spec dependency). */
type RoadWidth = NonNullable<
  NonNullable<Extract<LayerSpecification, { type: 'line' }>['paint']>['line-width']
>;

/**
 * Road `line-width`: the styled widths at low zoom, then true scale from
 * MAP_STYLE.roads.trueScaleFromZoom so close-up street life fits the asphalt.
 */
export function roadWidth(
  low: readonly number[],
  widthM: number,
  latitude: number = MAP_STYLE.roads.referenceLatitude,
): RoadWidth {
  const zTrue = MAP_STYLE.roads.trueScaleFromZoom;
  const truePts = (z: number) => widthM / metersPerPoint(z, latitude);
  const lastLow = low[low.length - 1];
  // Halfway (geometrically) between the styled width and true scale one zoom earlier.
  const bridge = Math.sqrt(lastLow * 2 * truePts(zTrue - 1));
  const stops: number[] = [...low, zTrue - 1, Math.max(lastLow, bridge)];
  for (let z = zTrue; z <= 22; z++) stops.push(z, truePts(z));
  return ['interpolate', ['exponential', 2], ['zoom'], ...stops] as RoadWidth;
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

export function buildBaseLayers(
  p: Palette,
  schema: TileSchema = 'protomaps',
  /** City latitude, for true-scale road widths at close zoom. */
  latitude: number = MAP_STYLE.roads.referenceLatitude,
): LayerSpecification[] {
  if (schema === 'openmaptiles') return buildOpenMapTilesLayers(p, latitude);
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
        'line-width': roadWidth([12, 0.5, 15, 3], MAP_STYLE.roads.widthM.minor, latitude),
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
        'line-width': roadWidth([8, 0.8, 15, 7], MAP_STYLE.roads.widthM.majorCasing, latitude),
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
        'line-width': roadWidth([8, 0.5, 15, 5.5], MAP_STYLE.roads.widthM.major, latitude),
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

const OMT_PARK_LANDCOVER = ['grass', 'wood', 'farmland', 'wetland'];
const OMT_PARK_LANDUSE = ['cemetery', 'pitch', 'playground', 'stadium', 'garden'];
const OMT_MINOR = ['minor', 'service', 'track', 'raceway'];
const OMT_MAJOR = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
const NOT_TUNNEL: ExpressionLike = ['!=', ['get', 'brunnel'], 'tunnel'];
type ExpressionLike = unknown[];

/** Same look over the OpenMapTiles schema (OpenFreeMap). */
function buildOpenMapTilesLayers(p: Palette, latitude: number): LayerSpecification[] {
  const src = BASEMAP_SOURCE_ID;
  const { building, label } = MAP_STYLE;
  const name = ['coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
  const layers = [
    // No land layer in OpenMapTiles: the background is land, water sits on top.
    { id: 'background', type: 'background', paint: { 'background-color': p.land } },
    {
      id: 'landuse-park',
      type: 'fill',
      source: src,
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', OMT_PARK_LANDCOVER]],
      paint: { 'fill-color': p.park },
    },
    {
      id: 'landuse-park-2',
      type: 'fill',
      source: src,
      'source-layer': 'landuse',
      filter: ['in', ['get', 'class'], ['literal', OMT_PARK_LANDUSE]],
      paint: { 'fill-color': p.park },
    },
    {
      id: 'parks',
      type: 'fill',
      source: src,
      'source-layer': 'park',
      paint: { 'fill-color': p.park },
    },
    {
      id: 'water',
      type: 'fill',
      source: src,
      'source-layer': 'water',
      filter: NOT_TUNNEL,
      paint: { 'fill-color': p.water },
    },
    {
      id: 'roads-minor',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['all', ['in', ['get', 'class'], ['literal', OMT_MINOR]], NOT_TUNNEL],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.road,
        'line-width': roadWidth([12, 0.5, 15, 3], MAP_STYLE.roads.widthM.minor, latitude),
      },
    },
    {
      id: 'roads-major-casing',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      filter: ['all', ['in', ['get', 'class'], ['literal', OMT_MAJOR]], NOT_TUNNEL],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadCasing,
        'line-width': roadWidth([8, 0.8, 15, 7], MAP_STYLE.roads.widthM.majorCasing, latitude),
      },
    },
    {
      id: 'roads-major',
      type: 'line',
      source: src,
      'source-layer': 'transportation',
      filter: ['all', ['in', ['get', 'class'], ['literal', OMT_MAJOR]], NOT_TUNNEL],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': p.roadMajor,
        'line-width': roadWidth([8, 0.5, 15, 5.5], MAP_STYLE.roads.widthM.major, latitude),
      },
    },
    {
      id: 'buildings',
      type: 'fill-extrusion',
      source: src,
      'source-layer': 'building',
      minzoom: building.minZoom,
      filter: ['!=', ['get', 'hide_3d'], true],
      paint: {
        'fill-extrusion-color': p.building,
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], building.defaultHeightM],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
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
      'source-layer': 'place',
      minzoom: label.districtMinZoom,
      maxzoom: label.districtMaxZoom,
      filter: ['in', ['get', 'class'], ['literal', ['neighbourhood', 'quarter', 'suburb']]],
      layout: {
        'text-field': name,
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
      'source-layer': 'transportation_name',
      minzoom: label.roadMinZoom,
      filter: ['in', ['get', 'class'], ['literal', OMT_MAJOR]],
      layout: {
        'symbol-placement': 'line',
        'text-field': name,
        'text-font': [...label.font],
        'text-size': 11,
      },
      paint: { 'text-color': p.label, 'text-halo-color': p.labelHalo, 'text-halo-width': 1 },
    },
  ];
  return layers as LayerSpecification[];
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
  /** City latitude (true-scale road widths at close zoom). */
  latitude?: number;
}): StyleSpecification {
  return {
    version: 8,
    name: 'Coinline',
    glyphs: MAP_STYLE.glyphsUrl,
    sources: { [BASEMAP_SOURCE_ID]: buildBasemapSource(opts.tiles) },
    light: buildMapLight(opts.sun, opts.palette),
    layers:
      opts.includeLayers === false
        ? []
        : buildBaseLayers(opts.palette, schemaOf(opts.tiles), opts.latitude),
  };
}
