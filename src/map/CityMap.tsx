import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  type CameraRef,
  type LayerSpecification,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import {
  Fragment,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { MACHINE_SPRITE } from '@/config/map';
import { getMachineType } from '@/config/machines';
import { DISTRICTS } from '@/config/progression';
import { cellPolygon } from '@/data/h3';
import { offsetPoint } from '@/sim/geo';
import type { CellData } from '@/data/types';
import { baseTraffic, localTime, type GameState, type LocalEvent, type World } from '@/sim';
import type { Theme } from '@/ui/theme';
import { machineStatus } from '@/ui/machineStatus';

import {
  headingBucket,
  iconImageExpression,
  iconSizeStops,
  pitchBucket,
  relativeHeadingBucket,
  spriteLightFor,
} from './machineSprites';
import { metersPerPoint } from './cameraMatch';
import { SalePops, type SalePop } from './life/SalePops';
import { StreetLifeLayer, type LifeStats, type StreetLifeHandle } from './life/StreetLifeLayer';
import {
  SPRITE_ANCHOR_OFFSET_PX,
  SPRITE_ICON_OFFSET,
  SPRITE_IMAGES,
  SPRITE_PIXEL_RATIO,
  SPRITE_PTS_PER_METER,
  SPRITE_SIZE,
} from './spriteImages';
import { tileSourceFor } from './tiles';
import { buildBaseLayers, schemaOf, buildMapLight, buildMapStyle } from './style';
import type { TimeOfDay } from './timeOfDay';

/**
 * The real-city map (SPEC §3.5, §7.3): custom MapLibre style over Protomaps
 * tiles, fill-extrusion buildings tinted by the real time of day, machines as
 * pre-rendered low-poly sprites with subtle status rings, rival machines,
 * event pins, heat overlay and the selected spot's nearby places.
 */

export interface MapCameraState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export type { LifeStats, SalePop };

export interface CityMapHandle {
  /**
   * Fly the camera. `bottomPadding` (points) frames `center` in the part of the
   * screen above a sheet; it stays until the next fly-to (default 0).
   */
  flyTo(
    c: Partial<MapCameraState> & { center: [number, number] },
    durationMs: number,
    bottomPadding?: number,
  ): void;
  /** Zoom in (+) or out (−) around the current center. */
  zoomBy(delta: number, durationMs: number): void;
  getCamera(): MapCameraState;
}

const STATUS_RING: Record<string, keyof Pick<Theme, 'amber' | 'signal' | 'alert'> | null> = {
  ok: null,
  unknown: null,
  low: 'amber',
  empty: 'amber',
  'cash-full': 'signal',
  broken: 'alert',
  stored: null,
};

function modelFor(typeId: Parameters<typeof getMachineType>[0]): string {
  return getMachineType(typeId).family;
}

interface Props {
  game: GameState;
  world: World;
  tod: TimeOfDay;
  theme: Theme;
  heat: boolean;
  events: LocalEvent[];
  selected: {
    lat: number;
    lng: number;
    places: { name: string; category: string; lat: number; lng: number }[];
  } | null;
  initial: MapCameraState;
  /** How far out the player can zoom (default 11: the city only). */
  minZoom?: number;
  onMapPress(lat: number, lng: number): void;
  onMachinePress(id: string): void;
  /** `byUser` is true when a gesture moved the camera (not a fly-to or the initial load). */
  onCameraChanged?(c: MapCameraState, byUser: boolean): void;
  /**
   * Street-life stats (≤ 2×/s): traffic 0..1 for the soundscape, current
   * zoom, and how many cars / people are on screen (0 below zoom 16).
   */
  onLifeStats?: (s: LifeStats) => void;
  /** Recent sales (already rate-limited): a receipt chip rises over the machine. */
  salePops?: readonly SalePop[];
  /** Freeze street life (e.g. during the close-up fly-in). */
  lifePaused?: boolean;
  /** Sales that just landed on screen (their customer reached the machine, or at once when zoomed out). */
  onSalesShown?: (pops: SalePop[]) => void;
}

/** Closest the camera gets (street level). */
const MAX_ZOOM = 21.5;

/** Minimum machine icon-size (readable at mid zoom); true scale above it. */
const MACHINE_MIN_ICON_SIZE = MACHINE_SPRITE.minIconSize;

/** On-screen height of a machine sprite above its base, points. */
function machineHeightPt(zoom: number, lat: number): number {
  const size = Math.max(
    MACHINE_MIN_ICON_SIZE,
    1 / metersPerPoint(zoom, lat) / SPRITE_PTS_PER_METER,
  );
  return (size * (SPRITE_SIZE.height - SPRITE_ANCHOR_OFFSET_PX)) / SPRITE_PIXEL_RATIO;
}

export const CityMap = forwardRef<CityMapHandle, Props>(function CityMap(props, ref) {
  const { game, world, tod, theme, heat, events, selected, initial } = props;
  const mapRef = useRef<MapRef>(null);
  const camRef = useRef<CameraRef>(null);
  const camera = useRef<MapCameraState>(initial);
  /** Bottom padding of the last fly-to (kept for zoom steps). */
  const padding = useRef(0);

  // Sales reach the screen when their customer gets to the machine (StreetLifeLayer).
  const [shownSales, setShownSales] = useState<ReadonlySet<string>>(() => new Set());
  const lifeSales = useMemo(
    () =>
      (props.salePops ?? []).flatMap((p) => {
        const m = game.machines.find((x) => x.id === p.machineId);
        return m ? [{ id: p.id, lng: m.lng, lat: m.lat, heading: m.heading, units: p.units }] : [];
      }),
    // Positions only matter for new sales: follow the pop list, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.salePops],
  );
  const onSalesShownRef = useRef(props.onSalesShown);
  onSalesShownRef.current = props.onSalesShown;
  const salesShown = useCallback(
    (ids: string[]) => {
      setShownSales((prev) => new Set([...prev, ...ids].slice(-60)));
      const pops = (props.salePops ?? []).filter((p) => ids.includes(p.id));
      if (pops.length) onSalesShownRef.current?.(pops);
    },
    [props.salePops],
  );
  // Only re-render sprites when the camera crosses a 45° / pitch bucket.
  const [buckets, setBuckets] = useState({ bearing: initial.bearing, pitch: initial.pitch });
  // Half-zoom steps / 10° pitch steps for sale pops (re-render only on a step change).
  const [view, setView] = useState({
    zoom: Math.round(initial.zoom * 2) / 2,
    pitch: Math.round(initial.pitch / 10) * 10,
  });
  const lifeRef = useRef<StreetLifeHandle>(null);
  /** Counts style loads; overlay sources remount on each (see the overlay block below). */
  const [styleGen, setStyleGen] = useState(0);
  const machinePoints = useMemo(
    () => game.machines.filter((m) => m.status === 'active'),
    [game.machines],
  );
  const trackView = useCallback((zoom: number, pitch: number) => {
    const z = Math.round(zoom * 2) / 2;
    const p = Math.round(pitch / 10) * 10;
    setView((v) => (v.zoom === z && v.pitch === p ? v : { zoom: z, pitch: p }));
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo(c, durationMs, bottomPadding = 0) {
      padding.current = bottomPadding;
      camRef.current?.flyTo({
        center: c.center,
        zoom: c.zoom ?? camera.current.zoom,
        pitch: c.pitch ?? camera.current.pitch,
        bearing: c.bearing ?? camera.current.bearing,
        padding: { top: 0, right: 0, bottom: bottomPadding, left: 0 },
        duration: durationMs,
      });
    },
    zoomBy(delta, durationMs) {
      const cur = camera.current;
      const zoom = Math.max(props.minZoom ?? 11, Math.min(MAX_ZOOM, cur.zoom + delta));
      camRef.current?.easeTo({
        center: cur.center,
        zoom,
        padding: { top: 0, right: 0, bottom: padding.current, left: 0 },
        duration: durationMs,
      });
    },
    getCamera: () => camera.current,
  }));

  // The style JSON carries sources + light; layers are React children so a
  // palette change updates paint properties in place (no style reload).
  const tiles = useMemo(() => tileSourceFor(world.city.id), [world.city.id]);
  const mapStyle = useMemo(
    () => buildMapStyle({ tiles, palette: tod.palette, sun: tod.sun, includeLayers: false }),
    // Built once per city; time-of-day changes flow through layers + `light`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiles],
  );
  const baseLayers = buildBaseLayers(tod.palette, schemaOf(tiles), world.city.lat);
  const light = buildMapLight(tod.sun, tod.palette);
  const spriteLight = spriteLightFor(tod.dominant);

  const machines = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const m of game.machines) {
      if (m.status !== 'active') continue;
      const status = machineStatus(game, m);
      const ring = STATUS_RING[status];
      features.push({
        type: 'Feature',
        id: m.id,
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: {
          id: m.id,
          model: modelFor(m.typeId),
          hb: headingBucket(m.heading),
          ring: ring ? theme[ring] : '',
          accent: theme.family[getMachineType(m.typeId).family],
          mine: true,
        },
      });
    }
    for (const r of game.rival.machines) {
      features.push({
        type: 'Feature',
        id: r.id,
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          model: 'rival',
          hb: headingBucket((r.lat * 1e5) % 360),
          ring: '',
          accent: MACHINE_SPRITE.rivalPad,
          mine: false,
        },
      });
    }
    return { type: 'FeatureCollection' as const, features };
  }, [game, theme]);

  const heatData = useMemo(() => {
    if (!heat) return null;
    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    let max = 1;
    // Foot traffic right now (real local hour), relative to the busiest cell.
    const lt = localTime(game.now, world.city.timeZone, world.city.countryCode);
    const values: [CellData, number][] = [];
    for (const cell of world.cells.values()) {
      const t = baseTraffic(cell, lt.hour, lt.restDay).total;
      values.push([cell, t]);
      max = Math.max(max, t);
    }
    for (const [cell, t] of values) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [cellPolygon(cell.id)] },
        properties: { v: Math.sqrt(t / max) },
      });
    }
    return { type: 'FeatureCollection' as const, features };
    // Recomputed at most every 10 minutes of game time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heat, world, Math.floor(game.now / 600_000)]);

  const eventData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: events.map((e) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [e.lng, e.lat] },
        properties: { label: `${e.name}`, live: game.now >= e.startsAt ? 1 : 0 },
      })),
    }),
    [events, game.now],
  );

  const selectedData = useMemo(() => {
    if (!selected) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [selected.lng, selected.lat] },
          properties: { kind: 'spot', label: '' },
        },
        ...selected.places.map((p) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          properties: { kind: 'place', label: p.name },
        })),
      ],
    };
  }, [selected]);

  // Outline of the furthest unlocked district (SPEC §2.1: unlock districts, then cities).
  const district = useMemo(() => {
    const unlocked = DISTRICTS.filter((d) => d.unlockChapter <= game.chapter);
    const d = unlocked[unlocked.length - 1];
    if (!d || d.radiusKm >= 30) return null;
    const ring: [number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const p = offsetPoint(world.city, (i / 64) * 360, d.radiusKm * 1000);
      ring.push([p.lng, p.lat]);
    }
    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: ring },
      properties: {},
    };
  }, [game.chapter, world.city]);

  const sizeStops = iconSizeStops(
    world.city.lat,
    SPRITE_PTS_PER_METER,
    MACHINE_MIN_ICON_SIZE,
  ).flat();
  const iconImage = iconImageExpression(buckets.bearing, buckets.pitch, spriteLight);

  return (
    <Map
      ref={mapRef}
      style={{ flex: 1 }}
      mapStyle={mapStyle}
      light={light}
      logo={false}
      // The ODbL credit is drawn by the map screen as text above its sheet.
      attribution={false}
      compass={false}
      scaleBar={false}
      onPress={(e) => {
        const ev = e.nativeEvent as { lngLat: [number, number]; features?: unknown[] };
        // Presses on machines bubble up from the source with features; those open the close-up instead.
        if (ev.features && ev.features.length) return;
        props.onMapPress(ev.lngLat[1], ev.lngLat[0]);
      }}
      onDidFinishLoadingStyle={() => setStyleGen((g) => g + 1)}
      onRegionIsChanging={(e) => {
        const v = e.nativeEvent;
        camera.current = {
          center: v.center as [number, number],
          zoom: v.zoom,
          pitch: v.pitch,
          bearing: v.bearing,
        };
        const nb =
          relativeHeadingBucket(0, v.bearing) !== relativeHeadingBucket(0, buckets.bearing);
        const np = pitchBucket(v.pitch) !== pitchBucket(buckets.pitch);
        if (nb || np) setBuckets({ bearing: v.bearing, pitch: v.pitch });
        trackView(v.zoom, v.pitch);
      }}
      onRegionDidChange={(e) => {
        const v = e.nativeEvent;
        camera.current = {
          center: v.center as [number, number],
          zoom: v.zoom,
          pitch: v.pitch,
          bearing: v.bearing,
        };
        trackView(v.zoom, v.pitch);
        lifeRef.current?.regionDidChange(v);
        props.onCameraChanged?.(camera.current, !!v.userInteraction);
      }}
    >
      <Camera
        ref={camRef}
        initialViewState={{
          center: initial.center,
          zoom: initial.zoom,
          pitch: initial.pitch,
          bearing: initial.bearing,
        }}
        minZoom={props.minZoom ?? 11}
        maxZoom={MAX_ZOOM}
      />
      <Images images={SPRITE_IMAGES} />
      {baseLayers.map((l) => (
        <Layer key={l.id} {...(l as LayerSpecification)} />
      ))}

      {/* GeoJSON overlays mount once our style has loaded, and remount after any style
          load: MapLibre RN adds a GeoJSON source to whichever style is current when it
          mounts, and on iOS the map first loads its default style, then ours, which
          dropped every overlay source (machines, street life, events, district). */}
      {styleGen > 0 ? (
        <Fragment key={styleGen}>
          {district ? (
            <GeoJSONSource id="district" data={district}>
              <Layer
                id="district-line"
                type="line"
                paint={{
                  'line-color': tod.palette.label,
                  'line-width': 1.5,
                  'line-dasharray': [2, 3],
                  'line-opacity': 0.6,
                }}
              />
            </GeoJSONSource>
          ) : null}

          {heatData ? (
            <GeoJSONSource id="heat" data={heatData}>
              <Layer
                id="heat-fill"
                type="fill"
                beforeId="buildings"
                paint={{
                  'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'v'],
                    0,
                    theme.signal,
                    0.5,
                    theme.amber,
                    1,
                    theme.alert,
                  ],
                  'fill-opacity': ['interpolate', ['linear'], ['get', 'v'], 0, 0.04, 1, 0.42],
                }}
              />
            </GeoJSONSource>
          ) : null}

          {selectedData ? (
            <GeoJSONSource id="selected" data={selectedData}>
              <Layer
                id="selected-spot"
                type="circle"
                filter={['==', ['get', 'kind'], 'spot']}
                paint={{
                  'circle-radius': 9,
                  'circle-color': theme.ink,
                  'circle-stroke-color': theme.paper,
                  'circle-stroke-width': 3,
                  'circle-pitch-alignment': 'map',
                }}
              />
              <Layer
                id="selected-places"
                type="circle"
                filter={['==', ['get', 'kind'], 'place']}
                paint={{
                  'circle-radius': 4,
                  'circle-color': theme.paper,
                  'circle-stroke-color': theme.ink,
                  'circle-stroke-width': 1.5,
                }}
              />
              <Layer
                id="selected-place-labels"
                type="symbol"
                filter={['==', ['get', 'kind'], 'place']}
                layout={{
                  'text-field': ['get', 'label'],
                  'text-font': ['Noto Sans Regular'],
                  'text-size': 11,
                  'text-offset': [0, 1.1],
                  'text-anchor': 'top',
                  'text-max-width': 9,
                  'text-optional': true,
                }}
                paint={{
                  'text-color': tod.palette.label,
                  'text-halo-color': tod.palette.labelHalo,
                  'text-halo-width': 1.2,
                }}
              />
            </GeoJSONSource>
          ) : null}

          <GeoJSONSource id="events" data={eventData}>
            <Layer
              id="event-pins"
              type="circle"
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 17, 9],
                'circle-color': theme.amber,
                'circle-opacity': ['case', ['==', ['get', 'live'], 1], 1, 0.55],
                'circle-stroke-color': theme.paper,
                'circle-stroke-width': 2,
              }}
            />
            <Layer
              id="event-labels"
              type="symbol"
              minzoom={13}
              layout={{
                'text-field': ['get', 'label'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 11,
                'text-offset': [0, 1.3],
                'text-anchor': 'top',
                'text-optional': true,
              }}
              paint={{
                'text-color': tod.palette.label,
                'text-halo-color': tod.palette.labelHalo,
                'text-halo-width': 1.2,
              }}
            />
          </GeoJSONSource>

          {/* Cars and pedestrians at close zoom, under the buildings and machines. */}
          <StreetLifeLayer
            ref={lifeRef}
            mapRef={mapRef}
            cameraRef={camera}
            world={world}
            now={game.now}
            tod={tod}
            paused={props.lifePaused}
            onLifeStats={props.onLifeStats}
            sales={lifeSales}
            onSalesShown={salesShown}
          />

          <GeoJSONSource
            id="machines"
            data={machines}
            cluster
            clusterMaxZoom={13}
            clusterRadius={40}
            onPress={(e) => {
              const f = e.nativeEvent.features.find((x) => x.properties?.mine && x.properties?.id);
              if (f) props.onMachinePress(String(f.properties?.id));
            }}
          >
            <Layer
              id="machine-clusters"
              type="circle"
              filter={['has', 'point_count']}
              paint={{
                'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 24],
                'circle-color': theme.ink,
                'circle-opacity': 0.85,
                'circle-stroke-color': theme.paper,
                'circle-stroke-width': 2,
              }}
            />
            <Layer
              id="machine-cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 12,
              }}
              paint={{ 'text-color': theme.paper }}
            />
            <Layer
              id="machine-pads"
              type="circle"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-pitch-alignment': 'map',
                'circle-radius': [
                  'interpolate',
                  ['exponential', 1.6],
                  ['zoom'],
                  ...MACHINE_SPRITE.padRadius.flat(),
                ] as never,
                'circle-color': ['get', 'accent'],
                'circle-opacity': MACHINE_SPRITE.padOpacity,
                'circle-blur': MACHINE_SPRITE.padBlur,
              }}
            />
            <Layer
              id="machine-rings"
              type="circle"
              filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'ring'], '']]}
              paint={{
                'circle-pitch-alignment': 'map',
                'circle-radius': [
                  'interpolate',
                  ['exponential', 2],
                  ['zoom'],
                  14,
                  6,
                  18,
                  14,
                  21,
                  60,
                ],
                'circle-color': 'rgba(0,0,0,0)',
                'circle-stroke-color': ['get', 'ring'],
                'circle-stroke-width': 2,
                'circle-stroke-opacity': 0.85,
              }}
            />
            <Layer
              id="machine-sprites"
              type="symbol"
              filter={['!', ['has', 'point_count']]}
              layout={{
                'icon-image': iconImage as never,
                'icon-size': ['interpolate', ['exponential', 2], ['zoom'], ...sizeStops] as never,
                'icon-anchor': 'bottom',
                // The machine's base sits above the image bottom (contact shadow below it).
                'icon-offset': SPRITE_ICON_OFFSET,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-pitch-alignment': 'viewport',
                'icon-rotation-alignment': 'viewport',
                'symbol-sort-key': ['-', 0, ['get', 'hb']],
              }}
            />
          </GeoJSONSource>
        </Fragment>
      ) : null}

      {props.salePops ? (
        <SalePops
          pops={props.salePops}
          shown={shownSales}
          machines={machinePoints}
          zoom={view.zoom}
          pitch={view.pitch}
          machineHeightPt={machineHeightPt(view.zoom, world.city.lat)}
          theme={theme}
        />
      ) : null}
    </Map>
  );
});
