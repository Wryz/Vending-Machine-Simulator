import { Marker } from '@maplibre/maplibre-react-native';
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '@/i18n';
import type { GameState } from '@/sim';
import { Icon, type IconName } from '@/ui/icons';
import { Mono } from '@/ui/kit';
import { TOKENS } from '@/ui/theme';

/**
 * Badges over machines for running surprises (SPEC §4.6): a flame for a
 * jackpot hour ("×1.5"), a handshake for a venue deal (tap to accept while it
 * is offered). A soft breathing pulse, no bounce. Hidden when zoomed far out.
 */

const MIN_ZOOM = 12.5;
const W = 84;

interface Props {
  game: GameState;
  zoom: number;
  /** Machine height on screen at this zoom (the badge floats above it). */
  machineHeightPt: number;
  onDealPress?(dealId: string): void;
}

export const SurpriseMarkers = memo(function SurpriseMarkers({
  game,
  zoom,
  machineHeightPt,
  onDealPress,
}: Props) {
  const t = useT();
  if (zoom < MIN_ZOOM) return null;
  const { jackpot, deal } = game.surprises;
  const now = game.now;
  const at = (id: string) => game.machines.find((m) => m.id === id && m.status === 'active');
  const lift = Math.min(150, machineHeightPt + 12);
  const out: React.ReactNode[] = [];
  const j = jackpot && jackpot.until > now ? at(jackpot.machineId) : null;
  if (jackpot && j)
    out.push(
      <Badge
        key={`jp-${jackpot.machineId}-${jackpot.until}`}
        lngLat={[j.lng, j.lat]}
        lift={lift}
        icon="flame"
        color={TOKENS.amber}
        text={`×${jackpot.multiplier}`}
        label={t('rival.marker.jackpot')}
      />,
    );
  const d = deal && (deal.activeUntil > now || deal.offerUntil >= now) ? at(deal.machineId) : null;
  if (deal && d) {
    const offered = deal.activeUntil === 0;
    out.push(
      <Badge
        key={`deal-${deal.id}-${offered ? 'offer' : 'on'}`}
        lngLat={[d.lng, d.lat]}
        // Two badges on one machine: the deal sits a little higher.
        lift={j && j.id === d.id ? lift + 34 : lift}
        icon="handshake"
        color={TOKENS.signal}
        text={offered ? '?' : `${Math.round(deal.commission * 100)}%`}
        label={offered ? t('rival.marker.deal') : t('rival.marker.dealOn')}
        onPress={offered && onDealPress ? () => onDealPress(deal.id) : undefined}
      />,
    );
  }
  return <>{out}</>;
});

function Badge({
  lngLat,
  lift,
  icon,
  color,
  text,
  label,
  onPress,
}: {
  lngLat: [number, number];
  lift: number;
  icon: IconName;
  color: string;
  text: string;
  label: string;
  onPress?: () => void;
}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);
  const glow = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.35 * pulse.value,
    transform: [{ scale: 1 + 0.25 * pulse.value }],
  }));
  const body = (
    <View style={styles.wrap}>
      <Animated.View style={[styles.glow, { backgroundColor: color }, glow]} />
      <View style={[styles.pill, { backgroundColor: color }]}>
        <Icon name={icon} size={16} color="#FFFFFF" />
        <Mono size={13} weight="bold" color="#FFFFFF">
          {text}
        </Mono>
      </View>
    </View>
  );
  return (
    <Marker
      id={`surprise-${label}-${lngLat.join(',')}`}
      lngLat={lngLat}
      anchor="bottom"
      offset={[0, -lift]}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={12}
          onPress={onPress}
        >
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={label} pointerEvents="none">
          {body}
        </View>
      )}
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, height: 44, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 64, height: 36, borderRadius: 18 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
