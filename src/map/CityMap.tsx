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
  useEffect,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SOUNDSCAPE } from '@/config/audio';
import { RIVAL } from '@/config/economy';
import { AREA_NAME, MACHINE_PIN, MACHINE_SPRITE } from '@/config/map';
import { MAP_LIFE } from '@/config/mapLife';
import { getMachineType } from '@/config/machines';
import { DISTRICTS } from '@/config/progression';
import { cellPolygon } from '@/data/h3';
import { useLang, useT } from '@/i18n';
import { content } from '@/i18n/content';
import { offsetPoint } from '@/sim/geo';
import type { CellData } from '@/data/types';
import { baseTraffic, localTime, type GameState, type LocalEvent, type World } from '@/sim';
import type { Theme } from '@/ui/theme';
import { money } from '@/ui/format';
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
import {
  crossfadeOpacity,
  crossfadeRange,
  pinImageName,
  pinSizeAt,
  pinSizeExpression,
} from './machinePins';
import { PIN_ICON_OFFSET, PIN_IMAGES, PIN_SIZE } from './pinImages';
import { SalePops, type SalePop } from './life/SalePops';
import { SurpriseMarkers } from './SurpriseMarkers';
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
import {
  AREA_PROBE_LAYER_ID,
  AreaBook,
  areaPoints,
  areaProbeLayer,
  type AreaNames,
} from './areaName';
import { districtAt } from './districts';
import { PARK_LAYER_IDS, probeFromFeatures, WATER_LAYER_ID, type EnvProbeResult } from './envProbe';
import { buildBaseLayers, schemaOf, buildMapLight, buildMapStyle } from './style';
import type { TimeOfDay } from './timeOfDay';

/**
 * The real-city map (SPEC §3.5, §7.3): custom MapLibre style over Protomaps
 * tiles, fill-extrusion buildings tinted by the real time of day, machines as
 * pre-rendered low-poly sprites with subtle status rings at street-life zoom
 * and as flat family-colored pins further out, rival machines, event pins,
 * heat overlay and the selected spot's nearby places.
 */

/** Machine sprites and pins, registered once. */
const MACHINE_IMAGES = { ...SPRITE_IMAGES, ...PIN_IMAGES };

/** Pins fade out / sprites fade in over this zoom range, ending where pedestrians appear. */
const [SPRITE_FADE_START, SPRITE_FADE_END] = crossfadeRange(MAP_LIFE.minZoom);

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

/** Rival machines have no stored heading: a stable one from their position (sprite and customers agree). */
function rivalHeading(r: { lat: number }): number {
  return (r.lat * 1e5) % 360;
}

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
  /** A rival machine was tapped. */
  onRivalPress?(id: string): void;
  /** A venue-deal badge was tapped (accept the offer). */
  onDealPress?(dealId: string): void;
  /** `byUser` is true when a gesture moved the camera (not a fly-to or the initial load). */
  onCameraChanged?(c: MapCameraState, byUser: boolean): void;
  /** Neighbourhood and district nearest the center (null = none known). */
  onAreaName?(names: AreaNames): void;
  /**
   * Street-life stats (≤ 2×/s): busy level 0..1 for the soundscape, current
   * zoom, and how many people are on screen (0 below zoom 16).
   */
  onLifeStats?: (s: LifeStats) => void;
  /**
   * What is around the view center (water, green), once the camera settles
   * (debounced): the soundscape places waves, birds and crickets by it.
   */
  onEnvProbe?: (env: EnvProbeResult) => void;
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

/** On-screen height of a machine (pin below the street-life zoom, else sprite) above its base, points. */
function machineHeightPt(zoom: number, lat: number): number {
  if (zoom < (SPRITE_FADE_START + SPRITE_FADE_END) / 2) {
    return pinSizeAt(zoom) * (PIN_SIZE.height - PIN_ICON_OFFSET[1]);
  }
  const size = Math.max(
    MACHINE_MIN_ICON_SIZE,
    1 / metersPerPoint(zoom, lat) / SPRITE_PTS_PER_METER,
  );
  return (size * (SPRITE_SIZE.height - SPRITE_ANCHOR_OFFSET_PX)) / SPRITE_PIXEL_RATIO;
}

export const CityMap = forwardRef<CityMapHandle, Props>(function CityMap(props, ref) {
  const { game, world, tod, theme, heat, events, selected, initial } = props;
  const mapRef = useRef<MapRef>(null);

  // Neighbourhood under the center, for the tab bar (see areaName.ts).
  const areas = useRef(new AreaBook());
  // Map labels and the area name follow the UI language (labelLanguage.ts).
  const lang = useLang();
  const labels = useMemo(
    () => ({ lang, countryCode: world.city.countryCode }),
    [lang, world.city.countryCode],
  );
  const areaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAreaName = props.onAreaName;
  const lookUpArea = useCallback(() => {
    if (!onAreaName) return;
    if (areaTimer.current) clearTimeout(areaTimer.current);
    areaTimer.current = setTimeout(async () => {
      const map = mapRef.current;
      if (!map) return;
      try {
        const features = await map.queryRenderedFeatures({ layers: [AREA_PROBE_LAYER_ID] });
        areas.current.add(areaPoints(features, labels));
      } catch {
        // Style not ready: try again on the next camera change.
      }
      const [lng, lat] = camera.current.center;
      const names = areas.current.nearest(lng, lat, world.city.name);
      // Borough / ward / municipality from OSM boundaries (districts.ts); the
      // place-point guess stays where there's no polygon (or it's the city).
      const district = districtAt(world.city.id, lng, lat, lang, world.city.name);
      if (district) names.district = district === names.area ? null : district;
      onAreaName(names);
    }, AREA_NAME.debounceMs);
  }, [onAreaName, world.city.name, world.city.id, labels, lang]);
  useEffect(
    () => () => {
      if (areaTimer.current) clearTimeout(areaTimer.current);
    },
    [],
  );
  const camRef = useRef<CameraRef>(null);
  const camera = useRef<MapCameraState>(initial);

  // Ambience sources near the view center (envProbe.ts), on camera idle.
  const envTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnvProbe = props.onEnvProbe;
  const probeSchema = schemaOf(useMemo(() => tileSourceFor(world.city.id), [world.city.id]));
  const probeEnv = useCallback(() => {
    if (!onEnvProbe) return;
    if (envTimer.current) clearTimeout(envTimer.current);
    envTimer.current = setTimeout(async () => {
      const map = mapRef.current;
      if (!map) return;
      try {
        const [water, parks] = await Promise.all([
          map.queryRenderedFeatures({ layers: [WATER_LAYER_ID] }),
          map.queryRenderedFeatures({ layers: [...PARK_LAYER_IDS[probeSchema]] }),
        ]);
        onEnvProbe(probeFromFeatures(camera.current.center, water, parks, SOUNDSCAPE.probe.rangeM));
      } catch {
        // Style not ready: try again on the next camera change.
      }
    }, SOUNDSCAPE.probe.debounceMs);
  }, [onEnvProbe, probeSchema]);
  useEffect(
    () => () => {
      if (envTimer.current) clearTimeout(envTimer.current);
    },
    [],
  );
  /** Bottom padding of the last fly-to (kept for zoom steps). */
  const padding = useRef(0);

  const machinePoints = useMemo(
    () => game.machines.filter((m) => m.status === 'active'),
    [game.machines],
  );
  /** Rival machines with the facing their sprite uses (customers stand in front). */
  const rivalPoints = useMemo(
    () =>
      game.rival.machines.map((r) => ({
        id: r.id,
        lng: r.lng,
        lat: r.lat,
        heading: rivalHeading(r),
      })),
    [game.rival.machines],
  );
  const popPoints = useMemo(() => [...machinePoints, ...rivalPoints], [machinePoints, rivalPoints]);
  const t = useT();
  const rivalLabel = useCallback(
    (cents: number) => t('rival.sting', { money: money(cents), rival: RIVAL.name }),
    [t],
  );
  // Sales reach the screen when their customer gets to the machine (StreetLifeLayer).
  const [shownSales, setShownSales] = useState<ReadonlySet<string>>(() => new Set());
  const lifeSales = useMemo(
    () =>
      (props.salePops ?? []).flatMap((p) => {
        // A sale lost to the rival: the customer walks to the rival machine instead.
        const m =
          p.tone === 'rival'
            ? rivalPoints.find((x) => x.id === p.machineId)
            : game.machines.find((x) => x.id === p.machineId);
        // A VIP comes alone (one customer for the whole row).
        const units = p.tone ? 1 : p.units;
        return m ? [{ id: p.id, lng: m.lng, lat: m.lat, heading: m.heading, units }] : [];
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
  const baseLayers = buildBaseLayers(tod.palette, schemaOf(tiles), world.city.lat, labels);
  const light = buildMapLight(tod.sun, tod.palette);
  const spriteLight = spriteLightFor(tod.dominant);

  const machines = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const m of game.machines) {
      if (m.status !== 'active') continue;
      const status = machineStatus(game, m);
      const ring = STATUS_RING[status];
      const family = getMachineType(m.typeId).family;
      features.push({
        type: 'Feature',
        id: m.id,
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: {
          id: m.id,
          model: modelFor(m.typeId),
          hb: headingBucket(m.heading),
          ring: ring ? theme[ring] : '',
          accent: theme.family[family],
          pin: pinImageName(family, ring),
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
          hb: headingBucket(rivalHeading(r)),
          ring: '',
          accent: MACHINE_SPRITE.rivalPad,
          pin: pinImageName('rival', null),
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
        properties: { label: content.eventByName(e.name), live: game.now >= e.startsAt ? 1 : 0 },
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
      onDidFinishLoadingStyle={() => {
        setStyleGen((g) => g + 1);
        lookUpArea();
        probeEnv();
      }}
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
        lookUpArea();
        probeEnv();
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
      <Images images={MACHINE_IMAGES} />
      {baseLayers.map((l) => (
        <Layer key={l.id} {...(l as LayerSpecification)} />
      ))}
      <Layer {...(areaProbeLayer(schemaOf(tiles)) as unknown as LayerSpecification)} />

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

          {/* Pedestrians at close zoom, under the buildings and machines. */}
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
              if (f) return props.onMachinePress(String(f.properties?.id));
              const r = e.nativeEvent.features.find(
                (x) => x.properties?.mine === false && x.properties?.id,
              );
              if (r) props.onRivalPress?.(String(r.properties?.id));
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
              minzoom={SPRITE_FADE_START}
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
                'circle-opacity': crossfadeOpacity(
                  MAP_LIFE.minZoom,
                  0,
                  MACHINE_SPRITE.padOpacity,
                ) as never,
                'circle-blur': MACHINE_SPRITE.padBlur,
              }}
            />
            <Layer
              id="machine-rings"
              type="circle"
              minzoom={SPRITE_FADE_START}
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
                'circle-stroke-opacity': crossfadeOpacity(MAP_LIFE.minZoom, 0, 0.85) as never,
              }}
            />
            <Layer
              id="machine-sprites"
              type="symbol"
              minzoom={SPRITE_FADE_START}
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
              paint={{ 'icon-opacity': crossfadeOpacity(MAP_LIFE.minZoom, 0, 1) as never }}
            />
            {/* Below the street-life zoom: a flat pin per machine, tip on the spot. */}
            <Layer
              id="machine-pins"
              type="symbol"
              maxzoom={SPRITE_FADE_END}
              filter={['!', ['has', 'point_count']]}
              layout={{
                'icon-image': ['get', 'pin'],
                'icon-size': pinSizeExpression() as never,
                'icon-anchor': 'bottom',
                'icon-offset': PIN_ICON_OFFSET,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-pitch-alignment': 'viewport',
                'icon-rotation-alignment': 'viewport',
                // Nearer pins (lower on screen) draw over the ones behind them.
                'symbol-z-order': 'viewport-y',
              }}
              paint={{
                'icon-opacity': crossfadeOpacity(
                  MAP_LIFE.minZoom,
                  ['case', ['to-boolean', ['get', 'mine']], 1, MACHINE_PIN.rivalOpacity],
                  0,
                ) as never,
              }}
            />
          </GeoJSONSource>
        </Fragment>
      ) : null}

      {props.salePops ? (
        <SalePops
          pops={props.salePops}
          shown={shownSales}
          machines={popPoints}
          zoom={view.zoom}
          pitch={view.pitch}
          machineHeightPt={machineHeightPt(view.zoom, world.city.lat)}
          theme={theme}
          rivalLabel={rivalLabel}
        />
      ) : null}

      {/* Jackpot hour and venue-deal badges over machines. */}
      <SurpriseMarkers
        game={game}
        zoom={view.zoom}
        machineHeightPt={machineHeightPt(view.zoom, world.city.lat)}
        onDealPress={props.onDealPress}
      />
    </Map>
  );
});
