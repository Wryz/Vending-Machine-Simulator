import { Marker } from '@maplibre/maplibre-react-native';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MAP_LIFE } from '@/config/mapLife';
import { money } from '@/ui/format';
import { Mono } from '@/ui/kit';
import type { Theme } from '@/ui/theme';

/**
 * Sale pops on the map: a small thermal-receipt chip ("+$2.00") that rises
 * above the machine and fades, plus a soft ring spreading on the ground at
 * its base (SPEC §3.6: receipts; calm easing, no bounce).
 */

export interface SalePop {
  id: string;
  machineId: string;
  cents: number;
}

interface Live {
  id: string;
  lngLat: [number, number];
  cents: number;
}

const DURATION_MS = 1200;
const RISE_PT = 24;
const MAX_VISIBLE = 6;
const RING_PT = 30;
const W = 120;

interface Props {
  pops: readonly SalePop[];
  machines: readonly { id: string; lng: number; lat: number }[];
  /** Current zoom / pitch (quantized is fine). */
  zoom: number;
  pitch: number;
  /** Machine sprite height on screen at this zoom, points (the chip starts above it). */
  machineHeightPt: number;
  theme: Theme;
}

export const SalePops = memo(function SalePops(props: Props) {
  const { pops, machines, zoom } = props;
  // Sales already listed when the map mounts are history, not news.
  const [history] = useState(() => new Set(pops.map((p) => p.id)));
  if (zoom < MAP_LIFE.salePopMinZoom) return null;
  const live: Live[] = [];
  for (let i = pops.length - 1; i >= 0 && live.length < MAX_VISIBLE; i--) {
    const p = pops[i];
    if (history.has(p.id)) continue;
    const m = machines.find((x) => x.id === p.machineId);
    if (m) live.push({ id: p.id, lngLat: [m.lng, m.lat], cents: p.cents });
  }
  return (
    <>
      {live.map((p) => (
        <Pop key={p.id} pop={p} {...props} />
      ))}
    </>
  );
});

function Pop({
  pop,
  pitch,
  machineHeightPt,
  theme,
}: { pop: Live } & Pick<Props, 'pitch' | 'machineHeightPt' | 'theme'>) {
  const t = useSharedValue(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    t.value = withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) });
    const id = setTimeout(() => setDone(true), DURATION_MS + 100);
    return () => clearTimeout(id);
  }, [t]);

  const start = Math.min(150, machineHeightPt + 6);
  const H = start + RISE_PT + 26 + RING_PT / 2;
  const squash = Math.max(0.35, Math.cos((pitch * Math.PI) / 180));

  const chip = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.62, 1], [0, 1, 1, 0]),
    transform: [{ translateY: -RISE_PT * t.value }],
  }));
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 1], [0, 0.55, 0]),
    transform: [{ scaleY: squash }, { scale: 0.35 + 1.15 * t.value }],
  }));

  if (done) return null;
  return (
    <Marker
      id={`sale-${pop.id}`}
      lngLat={pop.lngLat}
      anchor="bottom"
      // The view's bottom carries half a ring below the machine's base point.
      offset={[0, RING_PT / 2]}
    >
      <View pointerEvents="none" style={{ width: W, height: H }}>
        <Animated.View
          style={[
            styles.ring,
            { borderColor: theme.paper, top: H - RING_PT, left: (W - RING_PT) / 2 },
            ring,
          ]}
        />
        <Animated.View style={[styles.chipWrap, { bottom: RING_PT / 2 + start }, chip]}>
          <View style={[styles.chip, { backgroundColor: theme.paper, shadowColor: theme.shadow }]}>
            <Mono size={11} weight="bold" color={theme.signal}>
              {money(pop.cents, { sign: true })}
            </Mono>
          </View>
        </Animated.View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: RING_PT,
    height: RING_PT,
    borderRadius: RING_PT / 2,
    borderWidth: 2,
  },
  chipWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
    shadowOpacity: 1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
