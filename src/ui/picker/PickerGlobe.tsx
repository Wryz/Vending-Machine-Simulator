import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop, Text } from 'react-native-svg';

import { GLOBE } from '@/config/map';
import { PICKER } from '@/config/picker';
import { useT } from '@/i18n';
import {
  buildGlobeMesh,
  buildOceanFacets,
  oceanGradient,
  projectGlobe,
  projectLabel,
  projectOceanFacets,
  projectPoint,
  type GlobeMesh,
  type OceanFacets,
} from '@/three/globe/flatGlobe';
import { latLngToXYZ, yawToFace } from '@/three/globe/geo';

import { FONTS } from '../theme';

export interface GlobeDot {
  id: string;
  lat: number;
  lng: number;
  /** The selected city: bigger and in brand orange. */
  selected?: boolean;
  /** You (your approximate location): a blue dot. */
  you?: boolean;
}

interface View3 {
  yaw: number;
  pitch: number;
  zoom: number;
}

const PITCH_MAX = 75;

// Built once per app run (the same Earth every time the picker opens).
let meshes: { land: GlobeMesh; facets: OceanFacets } | null = null;
function globeMeshes() {
  meshes ??= {
    land: buildGlobeMesh(PICKER.meshDetail),
    facets: buildOceanFacets(PICKER.oceanFacetDetail, PICKER.oceanFacetShare),
  };
  return meshes;
}

/** 0..1: how much of a label kind to show at this zoom (fades out over the last stretch). */
function zoomFade(zoom: number, maxZoom: number): number {
  return Math.max(0, Math.min(1, (maxZoom - zoom) / PICKER.labels.labelFadeZoom));
}
const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;
/** The point under the middle of the globe (the crosshair). */
export function viewCenter(v: { yaw: number; pitch: number }): { lat: number; lng: number } {
  return { lat: v.pitch, lng: wrapLng(-v.yaw) };
}

/**
 * The picker's globe: the same flat-shaded low-poly Earth as the map's world
 * view, always lit for daytime, steered by the player: drag to turn it,
 * pinch to zoom, and it flies to a city when the strip asks. Whatever is under
 * the middle is reported through `onCenter` (the crosshair is drawn on top by
 * CityPicker).
 */
export function PickerGlobe({
  width,
  height,
  cy,
  dots,
  flyTo,
  onCenter,
  onDot,
}: {
  width: number;
  height: number;
  /** Vertical center of the globe on screen (room for the strip below). */
  cy: number;
  dots: GlobeDot[];
  /** Fly here when `key` changes (a card tap, "locate me"). */
  flyTo: { lat: number; lng: number; zoom?: number; key: number };
  onCenter: (p: { lat: number; lng: number }, settled: boolean) => void;
  onDot: (id: string) => void;
}) {
  const t = useT();
  const { land: mesh, facets } = globeMeshes();
  const [view, setView] = useState<View3>(() => ({
    yaw: yawToFace(flyTo.lng),
    pitch: Math.max(-PITCH_MAX, Math.min(PITCH_MAX, flyTo.lat)),
    zoom: flyTo.zoom ?? 1,
  }));
  // Mutable state for gestures and the fly-to animation (read only in callbacks).
  const live = useRef({
    ...view,
    startYaw: 0,
    startPitch: 0,
    startZoom: 1,
    anim: 0,
    /** The pending coalesced redraw (requestAnimationFrame id), 0 when none. */
    frame: 0,
  });
  const onCenterRef = useRef(onCenter);
  useEffect(() => {
    onCenterRef.current = onCenter;
  }, [onCenter]);
  const apply = useRef((v: View3, settled: boolean) => {
    const l = live.current;
    Object.assign(l, v);
    if (l.frame) {
      cancelAnimationFrame(l.frame);
      l.frame = 0;
    }
    setView({ ...v });
    onCenterRef.current(viewCenter(v), settled);
  });
  // Touch events can outpace the screen: gestures store the latest view and
  // redraw at most once per animation frame.
  const schedule = useRef((v: View3) => {
    const l = live.current;
    Object.assign(l, v);
    if (l.frame) return;
    l.frame = requestAnimationFrame(() => {
      l.frame = 0;
      const now = { yaw: l.yaw, pitch: l.pitch, zoom: l.zoom };
      setView(now);
      onCenterRef.current(viewCenter(now), false);
    });
  });
  // A gesture ended: draw the final view now and report it as settled.
  const settle = useRef(() => {
    const l = live.current;
    apply.current({ yaw: l.yaw, pitch: l.pitch, zoom: l.zoom }, true);
  });
  useEffect(() => {
    const l = live.current;
    return () => {
      if (l.frame) cancelAnimationFrame(l.frame);
      l.frame = 0;
    };
  }, []);

  // Fly to a city: ease yaw (the short way round), pitch and zoom together.
  useEffect(() => {
    const l = live.current;
    const from = { yaw: l.yaw, pitch: l.pitch, zoom: l.zoom };
    let dYaw = yawToFace(flyTo.lng) - from.yaw;
    dYaw = ((((dYaw + 180) % 360) + 360) % 360) - 180;
    const to = {
      yaw: from.yaw + dYaw,
      pitch: Math.max(-PITCH_MAX, Math.min(PITCH_MAX, flyTo.lat)),
      zoom: flyTo.zoom ?? from.zoom,
    };
    // The clock starts on the first frame.
    let start = -1;
    const anim = ++l.anim;
    const step = () => {
      if (anim !== live.current.anim) return;
      const now = Date.now();
      if (start < 0) start = now;
      const k = Math.min(1, (now - start) / PICKER.flyMs);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      apply.current(
        {
          yaw: from.yaw + (to.yaw - from.yaw) * e,
          pitch: from.pitch + (to.pitch - from.pitch) * e,
          zoom: from.zoom + (to.zoom - from.zoom) * e,
        },
        k >= 1,
      );
      if (k < 1) frame = requestAnimationFrame(step);
    };
    let frame = requestAnimationFrame(step);
    // Unmounting (or a newer fly-to) stops this one.
    const cleanup = () => {
      cancelAnimationFrame(frame);
      if (anim === live.current.anim) live.current.anim++;
    };
    return cleanup;
    // Only a new fly-to request (its key) starts an animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo.key]);

  /* eslint-disable react-hooks/refs -- gesture callbacks run on touch events, after render, never during it */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(3)
      .onStart(() => {
        const l = live.current;
        l.anim++;
        l.startYaw = l.yaw;
        l.startPitch = l.pitch;
      })
      .onUpdate((e) => {
        const l = live.current;
        // Turn slower when zoomed in, so the spot under your finger stays put.
        const k = GLOBE.degPerPt / l.zoom;
        schedule.current({
          yaw: l.startYaw + e.translationX * k,
          pitch: Math.max(-PITCH_MAX, Math.min(PITCH_MAX, l.startPitch + e.translationY * k)),
          zoom: l.zoom,
        });
      })
      .onEnd(() => settle.current());
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        const l = live.current;
        l.anim++;
        l.startZoom = l.zoom;
      })
      .onUpdate((e) => {
        const l = live.current;
        schedule.current({
          yaw: l.yaw,
          pitch: l.pitch,
          zoom: Math.max(PICKER.minZoom, Math.min(PICKER.maxZoom, l.startZoom * e.scale)),
        });
      })
      .onEnd(() => settle.current());
    return Gesture.Simultaneous(pan, pinch);
  }, []);
  /* eslint-enable react-hooks/refs */

  const cx = width / 2;
  const radius = Math.min(width, height) * 0.36 * view.zoom;
  // Choosing a city happens in daylight: lit from the upper left of whatever faces you.
  // Only land is projected; the ocean is one disc with the same light steps as rings.
  const globe = useMemo(() => {
    const c = viewCenter(view);
    const sun = latLngToXYZ(Math.min(85, c.lat + 28), c.lng - 32);
    return {
      land: projectGlobe(mesh, view, sun, cx, cy, radius, GLOBE.shadeSteps, { landOnly: true }),
      ocean: oceanGradient(view, sun, cx, cy, radius),
      facets: projectOceanFacets(facets, view, cx, cy, radius),
    };
  }, [mesh, facets, view, cx, cy, radius]);
  const labels = useMemo(() => {
    const L = PICKER.labels;
    const scale = Math.min(L.maxScale, Math.sqrt(view.zoom));
    const out: {
      key: string;
      text: string;
      x: number;
      y: number;
      alpha: number;
      size: number;
      ocean: boolean;
    }[] = [];
    const add = (
      list: readonly { id: string; lat: number; lng: number }[],
      ocean: boolean,
      fade: number,
      name: (id: string) => string,
    ) => {
      if (fade <= 0) return;
      list.forEach((a, i) => {
        const at = projectLabel(a.lat, a.lng, view, cx, cy, radius, L.labelHideZ, L.labelFullZ);
        if (!at) return;
        out.push({
          key: `${ocean ? 'o' : 'c'}${i}`,
          text: name(a.id).toUpperCase(),
          x: at.x,
          y: at.y,
          alpha: at.alpha * fade,
          size: (ocean ? L.oceanSize : L.continentSize) * scale,
          ocean,
        });
      });
    };
    add(L.oceans, true, zoomFade(view.zoom, L.oceanMaxZoom), (id) =>
      t(`picker.globe.oceans.${id as (typeof L.oceans)[number]['id']}`),
    );
    add(L.continents, false, zoomFade(view.zoom, L.continentMaxZoom), (id) =>
      t(`picker.globe.continents.${id as (typeof L.continents)[number]['id']}`),
    );
    return out;
  }, [view, cx, cy, radius, t]);
  const c = GLOBE.colors;
  const placed = dots
    .map((d) => ({ d, at: projectPoint(d.lat, d.lng, view, cx, cy, radius) }))
    .filter((x): x is { d: GlobeDot; at: { x: number; y: number } } => !!x.at);
  // Selected and "you" on top.
  placed.sort((a, b) => Number(!!a.d.selected || !!a.d.you) - Number(!!b.d.selected || !!b.d.you));

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient
              id="pickerHalo"
              cx={cx}
              cy={cy}
              r={radius * 1.3}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.72" stopColor={c.halo} stopOpacity={0.85} />
              <Stop offset="1" stopColor={c.halo} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id="pickerOcean"
              cx={globe.ocean.cx}
              cy={globe.ocean.cy}
              r={globe.ocean.r}
              gradientUnits="userSpaceOnUse"
            >
              {globe.ocean.stops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill={c.sky} />
          <Circle cx={cx} cy={cy} r={radius * 1.3} fill="url(#pickerHalo)" />
          <Circle cx={cx} cy={cy} r={radius} fill="url(#pickerOcean)" />
          {globe.facets.light ? (
            <Path d={globe.facets.light} fill={c.oceanLight} opacity={c.oceanLightOpacity} />
          ) : null}
          {globe.facets.dark ? (
            <Path d={globe.facets.dark} fill={c.oceanDark} opacity={c.oceanDarkOpacity} />
          ) : null}
          {globe.land.paths.map((p, i) => (
            <Path key={i} d={p.d} fill={p.fill} stroke={p.fill} strokeWidth={0.6} />
          ))}
          {/* Names under the pins, and never touchable. */}
          <G pointerEvents="none">
            {labels.map((l) => (
              <Text
                key={l.key}
                x={l.x}
                y={l.y + l.size * 0.35}
                textAnchor="middle"
                fontFamily={FONTS.uiBold}
                fontSize={l.size}
                letterSpacing={PICKER.labels.letterSpacing}
                fill={l.ocean ? c.labelOcean : c.labelLand}
                opacity={l.alpha * (l.ocean ? c.labelOceanOpacity : c.labelLandOpacity)}
              >
                {l.text}
              </Text>
            ))}
          </G>
          {placed.map(({ d, at }) => (
            <Circle
              key={d.id}
              cx={at.x}
              cy={at.y}
              r={d.selected ? 9 : d.you ? 7 : 3.5}
              fill={d.you ? '#3D7BE0' : d.selected ? c.pin : c.pinOther}
              stroke={d.you || d.selected ? '#FFFFFF' : c.pin}
              strokeWidth={d.selected ? 3 : 1.5}
              opacity={d.selected || d.you ? 1 : 0.9}
              onPress={d.you ? undefined : () => onDot(d.id)}
            />
          ))}
        </Svg>
      </View>
    </GestureDetector>
  );
}
