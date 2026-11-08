import {
  GeoJSONSource,
  Images,
  Layer,
  type MapRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useIsFocused } from 'expo-router';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { AppState, useWindowDimensions } from 'react-native';

import { MAP_LIFE } from '@/config/mapLife';
import { baseTraffic, localTime, type World } from '@/sim';

import { LIFE_SPRITE_IMAGES, LIFE_SPRITE_PTS_PER_METER } from '../lifeSprites';
import type { TimeOfDay } from '../timeOfDay';

import {
  busyLevel,
  lifeGeoJSON,
  lifeInputsFromFeatures,
  lifeLightFor,
  LIFE_QUERY_LAYERS,
  lifeSymbolLayer,
  lifeViewRadiusM,
  StreetLife,
  type LifeConditions,
  type LifeView,
  type LifeWeather,
} from './index';

/**
 * Pedestrians and customers on the map at close zoom (RN side of src/map/life).
 *
 * - Roads: queried from the rendered road, path and water layers when the
 *   camera settles (debounced), so the sim always matches what is drawn:
 *   people walk outside the drawn asphalt, on paths, and never on water.
 * - Animation: a ~14 fps timer steps the pure sim and pushes one GeoJSON
 *   string to the `life` source. Only this component re-renders per frame,
 *   never the CityMap.
 * - Paused below MAP_LIFE.minZoom, when the screen isn't focused, when the
 *   app is in the background, or when `paused` is set.
 */

export interface LifeStats {
  /** 0..1, how busy the city is right now around the camera. */
  busy: number;
  zoom: number;
  people: number;
}

export interface StreetLifeHandle {
  /** Forward the map's onRegionDidChange. */
  regionDidChange(v: ViewStateChangeEvent): void;
}

interface Props {
  mapRef: RefObject<MapRef | null>;
  /** Live camera (updated by the map's onRegionIsChanging). */
  cameraRef: RefObject<{ bearing: number; pitch: number; zoom: number }>;
  world: World;
  now: number;
  tod: TimeOfDay;
  paused?: boolean;
  /** Draw under this layer (default: under the buildings, so towers occlude people). */
  beforeId?: string;
  onLifeStats?: (s: LifeStats) => void;
  /**
   * Recent sales. While street life runs, each new one sends a customer to its
   * machine and is reported to `onSalesShown` when they get there; otherwise
   * (zoomed out, paused) it is reported at once.
   */
  sales?: readonly LifeSale[];
  onSalesShown?: (ids: string[]) => void;
  /** The map's last settled view: a remount (style reload) picks up from it. */
  initialView?: ViewStateChangeEvent | null;
}

/** A sale at a machine (position and facing, so the customer knows where to stand). */
export interface LifeSale {
  id: string;
  lng: number;
  lat: number;
  heading: number;
  units: number;
}

const EMPTY = '{"type":"FeatureCollection","features":[]}';
/** Marks the extra customers of a multi-item sale (they don't release it). */
const COMPANION = '#';
const LIFE_WEATHER: readonly LifeWeather[] = ['clear', 'cloudy', 'rain', 'snow', 'storm', 'fog'];

export const StreetLifeLayer = memo(
  forwardRef<StreetLifeHandle, Props>(function StreetLifeLayer(props, ref) {
    const { mapRef, cameraRef, world, now, tod, paused, onLifeStats, sales } = props;
    const focused = useIsFocused();
    const { height } = useWindowDimensions();
    const [appActive, setAppActive] = useState(AppState.currentState === 'active');
    const [json, setJson] = useState(EMPTY);
    const [zoomedIn, setZoomedIn] = useState(false);
    /** Sprites are registered lazily, the first time the camera gets close. */
    const [imagesWanted, setImagesWanted] = useState(false);
    const [hasRoads, setHasRoads] = useState(false);

    const simRef = useRef<StreetLife | null>(null);
    if (!simRef.current) simRef.current = new StreetLife(hashSeed(world.city.id));
    const lastView = useRef<ViewStateChangeEvent | null>(null);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastStats = useRef(0);
    const statsCb = useRef(onLifeStats);
    statsCb.current = onLifeStats;
    const shownCb = useRef(props.onSalesShown);
    shownCb.current = props.onSalesShown;
    // Sales already listed when the map mounts are history: no customers for them.
    const seenSales = useRef<Set<string> | null>(null);
    if (!seenSales.current) seenSales.current = new Set((sales ?? []).map((x) => x.id));
    const runningRef = useRef(false);

    // Hour / weather; foot traffic is filled in per view (cells around the camera).
    const lt = useMemo(
      () => localTime(now, world.city.timeZone, world.city.countryCode),
      // Minute resolution is plenty for density.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [Math.floor(now / 60_000), world.city.timeZone, world.city.countryCode],
    );
    const weather = world.weatherAt(now)?.condition ?? null;
    const cond = useRef<LifeConditions>({ hour: 12, restDay: false, footTraffic: 0 });
    const footTraffic = useCallback(
      (center: readonly [number, number], radiusM: number) => {
        const [lng, lat] = center;
        const dLat = radiusM / 2 / 111_320;
        const dLng = dLat / Math.cos((lat * Math.PI) / 180);
        let sum = 0;
        let n = 0;
        for (const [x, y] of [
          [0, 0],
          [dLng, 0],
          [-dLng, 0],
          [0, dLat],
          [0, -dLat],
        ]) {
          const cell = world.cells.get(world.cellOf(lat + y, lng + x));
          n++;
          if (cell) sum += baseTraffic(cell, lt.hour, lt.restDay).total;
        }
        return n ? sum / n : 0;
      },
      [world, lt.hour, lt.restDay],
    );

    const updateConditions = useCallback(() => {
      const v = lastView.current;
      const radius = v ? lifeViewRadiusM(v.zoom, v.center[1], height) : 300;
      cond.current = {
        hour: lt.hour,
        restDay: lt.restDay,
        footTraffic: v ? footTraffic(v.center, radius) : cond.current.footTraffic,
        weather: weather && LIFE_WEATHER.includes(weather) ? weather : null,
      };
      simRef.current!.setConditions(cond.current);
    }, [lt.hour, lt.restDay, weather, footTraffic, height]);
    useEffect(updateConditions, [updateConditions]);

    const emitStats = useCallback(
      (force: boolean) => {
        const cb = statsCb.current;
        if (!cb) return;
        const t = Date.now();
        if (!force && t - lastStats.current < MAP_LIFE.statsIntervalMs) return;
        lastStats.current = t;
        const sim = simRef.current!;
        const z = cameraRef.current?.zoom ?? 0;
        const live = z >= MAP_LIFE.minZoom;
        cb({
          busy: busyLevel(cond.current),
          zoom: z,
          people: live ? sim.people.length : 0,
        });
      },
      [cameraRef],
    );

    const queryRoads = useCallback(async () => {
      const map = mapRef.current;
      const v = lastView.current;
      if (!map || !v || v.zoom < MAP_LIFE.minZoom - 0.3) return;
      try {
        const features = await map.queryRenderedFeatures({ layers: [...LIFE_QUERY_LAYERS] });
        const view = lifeViewOf(v, height);
        const { roads, surface } = lifeInputsFromFeatures(features);
        simRef.current!.setRoads(roads, view, surface);
        setHasRoads(true);
      } catch {
        // Style not ready yet; the next camera change retries.
      }
    }, [mapRef, height]);

    const regionDidChange = useCallback(
      (v: ViewStateChangeEvent) => {
        lastView.current = v;
        const close = v.zoom >= MAP_LIFE.minZoom;
        setZoomedIn(close);
        if (v.zoom >= MAP_LIFE.minZoom - 0.5) setImagesWanted(true);
        updateConditions();
        if (close) simRef.current!.setView(lifeViewOf(v, height));
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(queryRoads, MAP_LIFE.roadQueryDebounceMs);
        emitStats(true);
      },
      [queryRoads, updateConditions, emitStats, height],
    );
    useImperativeHandle(ref, () => ({ regionDidChange }), [regionDidChange]);
    // Remounted after a style reload: people come back without waiting for the camera to move.
    const initialView = props.initialView;
    useEffect(() => {
      if (initialView) regionDidChange(initialView);
      // Once per mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
      return () => {
        sub.remove();
        if (debounce.current) clearTimeout(debounce.current);
      };
    }, []);

    const light = lifeLightFor(tod.weights);
    const running = focused && appActive && !paused && zoomedIn && hasRoads;
    runningRef.current = running;

    // New sales: a customer walks up (only the first of a group carries the sale).
    useEffect(() => {
      const seen = seenSales.current!;
      const now: string[] = [];
      for (const sale of sales ?? []) {
        if (seen.has(sale.id)) continue;
        seen.add(sale.id);
        const sim = simRef.current!;
        const group = Math.min(MAP_LIFE.customers.perSale, Math.max(1, sale.units));
        let sent = false;
        if (runningRef.current) {
          sent = sim.addCustomer(sale.id, sale.lng, sale.lat, sale.heading);
          for (let i = 1; sent && i < group; i++)
            sim.addCustomer(`${sale.id}${COMPANION}${i}`, sale.lng, sale.lat, sale.heading);
        }
        if (!sent) now.push(sale.id);
      }
      if (seen.size > 200) seenSales.current = new Set([...seen].slice(-100));
      if (now.length) shownCb.current?.(now);
    }, [sales]);

    // Street life stopped: every sale still walking lands now.
    useEffect(() => {
      if (running) return;
      const ids = simRef.current!.flushCustomers().filter((id) => !id.includes(COMPANION));
      if (ids.length) shownCb.current?.(ids);
    }, [running]);

    useEffect(() => {
      if (!running) return;
      const sim = simRef.current!;
      let last = Date.now();
      const id = setInterval(() => {
        const t = Date.now();
        sim.step((t - last) / 1000);
        last = t;
        const arrived = sim.takeArrivals().filter((id) => !id.includes(COMPANION));
        if (arrived.length) shownCb.current?.(arrived);
        const cam = cameraRef.current;
        setJson(lifeGeoJSON(sim, { bearing: cam?.bearing ?? 0, pitch: cam?.pitch ?? 0, light }));
        emitStats(false);
      }, 1000 / MAP_LIFE.fps);
      return () => clearInterval(id);
    }, [running, light, cameraRef, emitStats]);

    const lat = world.city.lat;
    const sprites = useMemo(
      () =>
        lifeSymbolLayer(lat, LIFE_SPRITE_PTS_PER_METER, {
          minZoom: MAP_LIFE.minZoom,
          fadeInEndZoom: MAP_LIFE.fadeInEndZoom,
        }),
      [lat],
    );

    // Only the current lighting set is registered (half the image memory).
    const images = useMemo(() => {
      const out: Record<string, number> = {};
      if (!imagesWanted) return out;
      const suffix = `-${light}`;
      for (const k in LIFE_SPRITE_IMAGES) if (k.endsWith(suffix)) out[k] = LIFE_SPRITE_IMAGES[k];
      return out;
    }, [imagesWanted, light]);

    const beforeId = props.beforeId ?? 'buildings';
    return (
      <>
        {imagesWanted ? <Images images={images} /> : null}
        <GeoJSONSource
          id="life"
          data={running ? json : EMPTY}
          maxzoom={20}
          buffer={16}
          tolerance={0}
        >
          <Layer
            id="life-sprites"
            type="symbol"
            beforeId={beforeId}
            minzoom={MAP_LIFE.minZoom}
            layout={sprites.layout as never}
            paint={sprites.paint as never}
          />
        </GeoJSONSource>
      </>
    );
  }),
);

function lifeViewOf(v: ViewStateChangeEvent, screenHeightPt: number): LifeView {
  const [west, south, east, north] = v.bounds;
  return {
    bounds: { west, south, east, north },
    center: v.center,
    radiusM: lifeViewRadiusM(v.zoom, v.center[1], screenHeightPt),
  };
}

/** Stable per-city seed (FNV-1a). */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h | 0;
}
