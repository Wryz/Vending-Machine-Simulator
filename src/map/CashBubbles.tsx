import { Marker } from '@maplibre/maplibre-react-native';
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CASH_BUBBLE } from '@/config/economy';
import { useT } from '@/i18n';
import type { GameState } from '@/sim';
import { Icon } from '@/ui/icons';
import { TOKENS } from '@/ui/theme';

/**
 * A coin bubble over every machine with cash waiting (owner's call,
 * 2026-11-08). Tapping any one collects every machine at once. Hidden when
 * zoomed far out.
 */

const SIZE = 44;

interface Props {
  game: GameState;
  zoom: number;
  /** Machine height on screen at this zoom (the bubble floats above it). */
  machineHeightPt: number;
  onPress?(): void;
}

export const CashBubbles = memo(function CashBubbles({
  game,
  zoom,
  machineHeightPt,
  onPress,
}: Props) {
  if (zoom < CASH_BUBBLE.minZoom) return null;
  const lift = Math.min(150, machineHeightPt + 12);
  // A surprise badge on the same machine sits where the bubble would: go above it.
  const badged = new Set(
    [game.surprises.jackpot?.machineId, game.surprises.deal?.machineId].filter(Boolean),
  );
  return (
    <>
      {game.machines.map((m) =>
        m.status === 'active' && m.cashBoxCents >= CASH_BUBBLE.minCents ? (
          <Bubble
            key={m.id}
            id={m.id}
            lngLat={[m.lng, m.lat]}
            lift={badged.has(m.id) ? lift + 40 : lift}
            onPress={onPress}
          />
        ) : null,
      )}
    </>
  );
});

function Bubble({
  id,
  lngLat,
  lift,
  onPress,
}: {
  id: string;
  lngLat: [number, number];
  lift: number;
  onPress?: () => void;
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bob, reduced]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * bob.value }] }));
  return (
    <Marker id={`cash-${id}`} lngLat={lngLat} anchor="bottom" offset={[0, -lift]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('map.a11y.cashBubble')}
        hitSlop={12}
        onPress={onPress}
      >
        <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(12)}>
          <Animated.View style={[styles.wrap, float]}>
            <View style={styles.bubble}>
              <Icon name="coin" size={26} color={TOKENS.amber} />
            </View>
            <View style={styles.tail} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE + 8, height: SIZE + 12, alignItems: 'center' },
  bubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: TOKENS.amber,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: TOKENS.amber,
  },
});
