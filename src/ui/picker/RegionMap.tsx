import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { cellToBoundary, latLngToCell } from 'h3-js';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PICKER } from '@/config/picker';
import type { CityIndexEntry } from '@/data/types';
import { buildMapStyle } from '@/map/style';
import { tileSourceFor } from '@/map/tiles';
import { getTimeOfDay } from '@/map/timeOfDay';

import { SKIN } from '../skin';

/** [lng, lat] ring of an H3 res-5 region, closed. */
function hexRing(r: string): [number, number][] {
  const ring = cellToBoundary(r).map(([lat, lng]) => [lng, lat] as [number, number]);
  return [...ring, ring[0]];
}

/**
 * The area a city covers, on the real map: its own region filled in brand
 * orange, its outer districts dashed, downtown pinned. The camera frames all
 * of it; pinching out past the frame goes back to the globe (`onZoomOut`).
 */
export function RegionMap({
  city,
  districts,
  padding,
  spot,
  onSpot,
  onZoomOut,
}: {
  city: CityIndexEntry;
  /** Outer-district regions around the same city. */
  districts: readonly CityIndexEntry[];
  /** Room taken by the header (top) and the strip (bottom), in points. */
  padding: { top: number; bottom: number };
  /** Where you'll start, when you've tapped a spot (else downtown). */
  spot: { lat: number; lng: number } | null;
  /** A tap on the map: the region it falls in (this city or one of its districts), or null outside. */
  onSpot: (p: { lat: number; lng: number }, region: CityIndexEntry | null) => void;
  onZoomOut: () => void;
}) {
  const cam = useRef<CameraRef>(null);
  // Overlays mount after our style loads (iOS loads a default style first; see CityMap).
  const [styleGen, setStyleGen] = useState(0);
  const tiles = useMemo(() => tileSourceFor('planet'), []);
  // A bright, readable map in the city's own light.
  const mapStyle = useMemo(() => {
    const tod = getTimeOfDay(new Date(), city.a, city.o);
    return buildMapStyle({ tiles, palette: tod.palette, sun: tod.sun, latitude: city.a });
  }, [tiles, city.a, city.o]);

  const area = useMemo(() => {
    const own = hexRing(city.r);
    const others = districts.map((d) => hexRing(d.r));
    const all = [own, ...others].flat();
    const lngs = all.map((p) => p[0]);
    const lats = all.map((p) => p[1]);
    return {
      bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as [
        number,
        number,
        number,
        number,
      ],
      own: {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'Polygon' as const, coordinates: [own] },
          },
        ],
      },
      districts: {
        type: 'FeatureCollection' as const,
        features: others.map((ring) => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
        })),
      },
      downtown: {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'Point' as const, coordinates: [city.o, city.a] },
          },
        ],
      },
    };
  }, [city, districts]);

  // Frame the whole covered area.
  const framedZoom = useRef<number | null>(null);
  useEffect(() => {
    framedZoom.current = null;
    const id = setTimeout(
      () =>
        cam.current?.fitBounds(area.bounds, {
          padding: { top: padding.top + 24, bottom: padding.bottom + 24, left: 24, right: 24 },
          duration: PICKER.mapFitMs,
        }),
      50,
    );
    return () => clearTimeout(id);
  }, [area, padding.top, padding.bottom]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        logo={false}
        attribution={false}
        compass={false}
        scaleBar={false}
        onPress={(e) => {
          const [lng, lat] = (e.nativeEvent as { lngLat: [number, number] }).lngLat;
          const cell = latLngToCell(lat, lng, 5);
          const region = cell === city.r ? city : (districts.find((d) => d.r === cell) ?? null);
          onSpot({ lat, lng }, region);
        }}
        onDidFinishLoadingStyle={() => setStyleGen((g) => g + 1)}
        onRegionDidChange={(e) => {
          const v = e.nativeEvent;
          // The first settle after framing is the reference; pinching well out returns to the globe.
          if (!v.userInteraction) {
            framedZoom.current = v.zoom;
            return;
          }
          if (framedZoom.current !== null && v.zoom < framedZoom.current - PICKER.mapZoomOutBy)
            onZoomOut();
        }}
      >
        <Camera
          ref={cam}
          initialViewState={{ center: [city.o, city.a], zoom: 5 }}
          minZoom={2}
          maxZoom={16}
        />
        {styleGen > 0 ? (
          <Fragment key={styleGen}>
            <GeoJSONSource id="picker-districts" data={area.districts}>
              <Layer
                id="picker-districts-fill"
                type="fill"
                paint={{ 'fill-color': SKIN.cabinet, 'fill-opacity': 0.06 }}
              />
              <Layer
                id="picker-districts-line"
                type="line"
                paint={{
                  'line-color': SKIN.cabinet,
                  'line-width': 2,
                  'line-dasharray': [2, 2],
                  'line-opacity': 0.8,
                }}
              />
            </GeoJSONSource>
            <GeoJSONSource id="picker-city" data={area.own}>
              <Layer
                id="picker-city-fill"
                type="fill"
                paint={{ 'fill-color': SKIN.cabinet, 'fill-opacity': 0.16 }}
              />
              <Layer
                id="picker-city-line"
                type="line"
                paint={{ 'line-color': SKIN.cabinet, 'line-width': 3.5 }}
              />
            </GeoJSONSource>
            <GeoJSONSource id="picker-downtown" data={area.downtown}>
              <Layer
                id="picker-downtown-dot"
                type="circle"
                paint={{
                  'circle-radius': spot ? 5 : 8,
                  'circle-color': spot ? '#FFFFFF' : SKIN.cabinet,
                  'circle-stroke-color': spot ? SKIN.cabinet : '#FFFFFF',
                  'circle-stroke-width': 3,
                }}
              />
            </GeoJSONSource>
            {spot ? (
              <GeoJSONSource
                id="picker-spot"
                data={{
                  type: 'FeatureCollection',
                  features: [
                    {
                      type: 'Feature',
                      properties: {},
                      geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
                    },
                  ],
                }}
              >
                <Layer
                  id="picker-spot-halo"
                  type="circle"
                  paint={{
                    'circle-radius': 22,
                    'circle-color': SKIN.cabinet,
                    'circle-opacity': 0.22,
                  }}
                />
                <Layer
                  id="picker-spot-dot"
                  type="circle"
                  paint={{
                    'circle-radius': 10,
                    'circle-color': SKIN.cabinet,
                    'circle-stroke-color': '#FFFFFF',
                    'circle-stroke-width': 4,
                  }}
                />
              </GeoJSONSource>
            ) : null}
          </Fragment>
        ) : null}
      </Map>
    </View>
  );
}
