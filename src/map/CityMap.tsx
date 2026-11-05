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
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { getMachineType } from '@/config/machines';
import { cellPolygon } from '@/data/h3';
import { ENV } from '@/data/env';
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
import { SPRITE_IMAGES, SPRITE_PTS_PER_METER } from './spriteImages';
import { buildBaseLayers, buildMapLight, buildMapStyle, type TileSource } from './style';
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

export interface CityMapHandle {
  flyTo(c: Partial<MapCameraState> & { center: [number, number] }, durationMs: number): void;
  getCamera(): MapCameraState;
}

export function tileSourceFor(cityId: string): TileSource {
  const url = ENV.tilesUrl || (ENV.dataApiUrl ? `${ENV.dataApiUrl}/pmtiles/{name}.pmtiles` : '');
  const name = cityId.startsWith('area-') ? 'planet' : cityId;
  const resolved = url.replace('{name}', name);
  if (resolved.includes('{z}')) return { kind: 'xyz', urlTemplate: resolved };
  return { kind: 'pmtiles', url: resolved || 'https://build.protomaps.com/20261104.pmtiles' };
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
  onMapPress(lat: number, lng: number): void;
  onMachinePress(id: string): void;
  onCameraChanged?(c: MapCameraState): void;
}

export const CityMap = forwardRef<CityMapHandle, Props>(function CityMap(props, ref) {
  const { game, world, tod, theme, heat, events, selected, initial } = props;
  const mapRef = useRef<MapRef>(null);
  const camRef = useRef<CameraRef>(null);
  const camera = useRef<MapCameraState>(initial);
  // Only re-render sprites when the camera crosses a 45° / pitch bucket.
  const [buckets, setBuckets] = useState({ bearing: initial.bearing, pitch: initial.pitch });

  useImperativeHandle(ref, () => ({
    flyTo(c, durationMs) {
      camRef.current?.flyTo({
        center: c.center,
        zoom: c.zoom ?? camera.current.zoom,
        pitch: c.pitch ?? camera.current.pitch,
        bearing: c.bearing ?? camera.current.bearing,
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
  const baseLayers = buildBaseLayers(tod.palette);
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

  const sizeStops = iconSizeStops(world.city.lat, SPRITE_PTS_PER_METER, 0.32).flat();
  const iconImage = iconImageExpression(buckets.bearing, buckets.pitch, spriteLight);

  return (
    <Map
      ref={mapRef}
      style={{ flex: 1 }}
      mapStyle={mapStyle}
      light={light}
      logo={false}
      attribution
      attributionPosition={{ bottom: 92, left: 8 }}
      compass={false}
      scaleBar={false}
      onPress={(e) => {
        const ev = e.nativeEvent as { lngLat: [number, number]; features?: unknown[] };
        // Presses on machines bubble up from the source with features; those open the close-up instead.
        if (ev.features && ev.features.length) return;
        props.onMapPress(ev.lngLat[1], ev.lngLat[0]);
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
      }}
      onRegionDidChange={(e) => {
        const v = e.nativeEvent;
        camera.current = {
          center: v.center as [number, number],
          zoom: v.zoom,
          pitch: v.pitch,
          bearing: v.bearing,
        };
        props.onCameraChanged?.(camera.current);
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
        minZoom={11}
        maxZoom={21.5}
      />
      <Images images={SPRITE_IMAGES} />
      {baseLayers.map((l) => (
        <Layer key={l.id} {...(l as LayerSpecification)} />
      ))}

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
          id="machine-rings"
          type="circle"
          filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'ring'], '']]}
          paint={{
            'circle-pitch-alignment': 'map',
            'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 14, 6, 18, 14, 21, 60],
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
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-pitch-alignment': 'viewport',
            'icon-rotation-alignment': 'viewport',
            'symbol-sort-key': ['-', 0, ['get', 'hb']],
          }}
        />
      </GeoJSONSource>
    </Map>
  );
});
