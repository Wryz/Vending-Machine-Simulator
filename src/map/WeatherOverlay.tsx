import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Ellipse } from 'react-native-svg';

/**
 * Weather over the map (SPEC §3.4, §4.6): thin slanted rain streaks, slow
 * drifting snow, or a soft fog haze. Calm, never busy: at most ~60 animated
 * views, all driven on the UI thread by one Reanimated clock, and it never
 * takes touches. The parent mounts it above the map, below the HUD.
 */

export type OverlayWeather = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

interface Props {
  condition: OverlayWeather | string | null | undefined;
  /** 0..1 (e.g. precipitation). */
  intensity: number;
  /** Night: dimmer streaks, cooler haze. */
  night: boolean;
}

const MAX_RAIN = 60;
const MAX_SNOW = 48;
/** One loop of the shared clock; every particle's period divides it. */
const LOOP_MS = 12_000;

/** Deterministic pseudo-random in [0, 1) (stable layout across renders). */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const WeatherOverlay = memo(function WeatherOverlay({ condition, intensity, night }: Props) {
  const k = Math.min(1, Math.max(0, intensity));
  const kind =
    condition === 'rain' || condition === 'storm'
      ? 'rain'
      : condition === 'snow'
        ? 'snow'
        : condition === 'fog'
          ? 'fog'
          : null;
  if (!kind || k <= 0.02) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {kind === 'fog' ? (
        <Fog k={k} night={night} />
      ) : (
        <Particles kind={kind} k={condition === 'storm' ? Math.max(k, 0.85) : k} night={night} />
      )}
    </View>
  );
});

function useClock(): SharedValue<number> {
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, { duration: LOOP_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock]);
  return clock;
}

function Particles({ kind, k, night }: { kind: 'rain' | 'snow'; k: number; night: boolean }) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const count = Math.round((kind === 'rain' ? MAX_RAIN : MAX_SNOW) * (0.25 + 0.75 * k));
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: rand(i, 1),
        phase: rand(i, 2),
        // Integer loops per clock cycle keep the motion seamless.
        loops: kind === 'rain' ? 14 + Math.floor(rand(i, 3) * 8) : 1 + Math.floor(rand(i, 3) * 2),
        size: rand(i, 4),
        sway: rand(i, 5),
      })),
    [count, kind],
  );
  const color =
    kind === 'rain'
      ? night
        ? 'rgba(190,205,225,0.22)'
        : 'rgba(255,255,255,0.42)'
      : night
        ? 'rgba(225,230,240,0.7)'
        : 'rgba(255,255,255,0.9)';
  return (
    <>
      {kind === 'rain' ? (
        // Rain darkens the scene a touch (SPEC §3.4).
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(40,48,60,${0.08 * k})` }]}
        />
      ) : null}
      {items.map((p, i) =>
        kind === 'rain' ? (
          <Streak key={i} p={p} clock={clock} w={width} h={height} color={color} />
        ) : (
          <Flake key={i} p={p} clock={clock} w={width} h={height} color={color} />
        ),
      )}
    </>
  );
}

interface P {
  x: number;
  phase: number;
  loops: number;
  size: number;
  sway: number;
}

const RAIN_SLANT = 0.22; // dx per dy: a gentle wind from the left

function Streak({
  p,
  clock,
  w,
  h,
  color,
}: {
  p: P;
  clock: SharedValue<number>;
  w: number;
  h: number;
  color: string;
}) {
  const len = 12 + p.size * 12;
  const style = useAnimatedStyle(() => {
    const t = (clock.value * p.loops + p.phase) % 1;
    const y = -len + t * (h + len * 2);
    return {
      transform: [
        { translateX: p.x * (w + h * RAIN_SLANT) - h * RAIN_SLANT + y * RAIN_SLANT },
        { translateY: y },
        { rotate: `${-Math.atan(RAIN_SLANT)}rad` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: 1, height: len, backgroundColor: color, borderRadius: 0.5 },
        style,
      ]}
    />
  );
}

function Flake({
  p,
  clock,
  w,
  h,
  color,
}: {
  p: P;
  clock: SharedValue<number>;
  w: number;
  h: number;
  color: string;
}) {
  const d = 2.5 + p.size * 3;
  const style = useAnimatedStyle(() => {
    const t = (clock.value * p.loops + p.phase) % 1;
    const y = -d + t * (h + d * 2);
    const drift = Math.sin((t * 3 + p.sway) * Math.PI * 2) * (10 + 14 * p.sway);
    return { transform: [{ translateX: p.x * w + drift }, { translateY: y }] };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: color,
          opacity: 0.6 + 0.4 * p.size,
        },
        style,
      ]}
    />
  );
}

function Fog({ k, night }: { k: number; night: boolean }) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const haze = night ? '#59606B' : '#E9EAE7';
  // Two soft banks drifting slowly in opposite directions.
  const a = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(clock.value * Math.PI * 2) * width * 0.12 }],
  }));
  const b = useAnimatedStyle(() => ({
    transform: [{ translateX: -Math.sin(clock.value * Math.PI * 2 + 1) * width * 0.1 }],
  }));
  return (
    <>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Thicker toward the horizon (top), thin over the foreground. */}
          <LinearGradient id="fogv" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={haze} stopOpacity={0.85 * k} />
            <Stop offset="0.45" stopColor={haze} stopOpacity={0.45 * k} />
            <Stop offset="1" stopColor={haze} stopOpacity={0.18 * k} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#fogv)" />
      </Svg>
      {[
        { style: a, top: height * 0.18, op: 0.5 },
        { style: b, top: height * 0.5, op: 0.35 },
      ].map((bank, i) => (
        <Animated.View
          key={i}
          style={[
            {
              position: 'absolute',
              left: -width * 0.25,
              top: bank.top,
              width: width * 1.5,
              height: height * 0.35,
            },
            bank.style,
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={`bank${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={haze} stopOpacity={bank.op * k} />
                <Stop offset="1" stopColor={haze} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill={`url(#bank${i})`} />
          </Svg>
        </Animated.View>
      ))}
    </>
  );
}
