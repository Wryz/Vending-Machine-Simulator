import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { GLOBE } from '@/config/map';
import { T } from '@/ui/kit';
import { useTheme } from '@/ui/ThemeProvider';
import { RADIUS, SPACE } from '@/ui/theme';

import { buildGlobeMesh, projectGlobe, projectPoint } from './flatGlobe';
import { latLngToXYZ, subsolarPoint, yawToFace } from './geo';

export interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  /** The city being played: bigger, brand-colored, labeled. */
  current: boolean;
  label?: string;
}

/**
 * Zoomed-out world view (SPEC §3.5): a flat-shaded low-poly globe drawn with
 * SVG, lit by the real sun, with a pin per city you play. Drag to spin,
 * pinch in (or tap a pin) to go back down to the map.
 */
export function GlobeView({
  pins,
  focus,
  onPin,
  onEnter,
}: {
  pins: GlobePin[];
  focus: { lat: number; lng: number };
  onPin: (id: string) => void;
  onEnter: () => void;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const mesh = useMemo(() => buildGlobeMesh(), []);
  const sun = useMemo(() => {
    const p = subsolarPoint(new Date());
    return latLngToXYZ(p.lat, p.lng);
  }, []);
  const [view, setView] = useState({
    yaw: yawToFace(focus.lng),
    pitch: Math.max(-60, Math.min(60, focus.lat)),
    zoom: 1,
  });
  // Mutable gesture state shared by the gesture callbacks and the idle spin.
  const live = useMemo(
    () => ({
      yaw: view.yaw,
      pitch: view.pitch,
      zoom: 1,
      touchedAt: Date.now(),
      startYaw: 0,
      startPitch: 0,
      startZoom: 1,
      entered: false,
    }),
    // Initial values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Idle spin, a little after the last touch.
  useEffect(() => {
    const id = setInterval(() => {
      const l = live;
      if (Date.now() - l.touchedAt < GLOBE.idleAfterMs) return;
      l.yaw += GLOBE.idleSpinDegPerS / GLOBE.fps;
      setView({ yaw: l.yaw, pitch: l.pitch, zoom: l.zoom });
    }, 1000 / GLOBE.fps);
    return () => clearInterval(id);
  }, [live]);

  const gesture = useMemo(() => {
    const l = live;
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(4)
      .onStart(() => {
        l.touchedAt = Date.now();
        l.startYaw = l.yaw;
        l.startPitch = l.pitch;
      })
      .onUpdate((e) => {
        l.touchedAt = Date.now();
        l.yaw = l.startYaw + e.translationX * GLOBE.degPerPt;
        l.pitch = Math.max(-70, Math.min(70, l.startPitch + e.translationY * GLOBE.degPerPt));
        setView({ yaw: l.yaw, pitch: l.pitch, zoom: l.zoom });
      });
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        l.touchedAt = Date.now();
        l.startZoom = l.zoom;
      })
      .onUpdate((e) => {
        l.touchedAt = Date.now();
        l.zoom = Math.max(0.7, Math.min(1.6, l.startZoom * e.scale));
        setView({ yaw: l.yaw, pitch: l.pitch, zoom: l.zoom });
        if (e.scale > GLOBE.enterScale && !l.entered) {
          l.entered = true;
          onEnter();
        }
      });
    return Gesture.Simultaneous(pan, pinch);
  }, [live, onEnter]);

  const cx = width / 2;
  const cy = height * 0.44;
  const radius = Math.min(width, height) * 0.4 * view.zoom;
  const globe = useMemo(
    () => projectGlobe(mesh, view, sun, cx, cy, radius),
    [mesh, view, sun, cx, cy, radius],
  );
  const c = GLOBE.colors;

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient
              id="halo"
              cx={cx}
              cy={cy}
              r={radius * 1.35}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.7" stopColor={c.halo} stopOpacity={0.9} />
              <Stop offset="1" stopColor={c.halo} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill={c.sky} />
          <Circle cx={cx} cy={cy} r={radius * 1.35} fill="url(#halo)" />
          {globe.paths.map((p, i) => (
            <Path key={i} d={p.d} fill={p.fill} stroke={p.fill} strokeWidth={0.6} />
          ))}
          {pins.map((pin) => {
            const at = projectPoint(pin.lat, pin.lng, view, cx, cy, radius);
            if (!at) return null;
            const s = pin.current ? 1 : 0.7;
            return (
              <Line
                key={`${pin.id}-stem`}
                x1={at.x}
                y1={at.y}
                x2={at.x}
                y2={at.y - 22 * s}
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
          {pins.map((pin) => {
            const at = projectPoint(pin.lat, pin.lng, view, cx, cy, radius);
            if (!at) return null;
            const s = pin.current ? 1 : 0.7;
            return (
              <Circle
                key={pin.id}
                cx={at.x}
                cy={at.y - 22 * s}
                r={11 * s}
                fill={pin.current ? c.pin : c.pinOther}
                stroke="#FFFFFF"
                strokeWidth={3}
                onPress={() => onPin(pin.id)}
              />
            );
          })}
        </Svg>
        {pins.map((pin) => {
          if (!pin.current || !pin.label) return null;
          const at = projectPoint(pin.lat, pin.lng, view, cx, cy, radius);
          if (!at) return null;
          return (
            <View
              key={`${pin.id}-label`}
              pointerEvents="none"
              style={[
                styles.label,
                {
                  left: at.x - 80,
                  top: at.y - 72,
                  backgroundColor: theme.hud,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <T size={13} weight="bold" numberOfLines={1} center>
                {pin.label}
              </T>
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    width: 160,
    paddingVertical: 4,
    paddingHorizontal: SPACE.s,
    borderRadius: RADIUS.pill,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    shadowOpacity: 1,
    alignItems: 'center',
  },
});
