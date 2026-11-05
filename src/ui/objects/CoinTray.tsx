import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';

import { useTheme } from '../ThemeProvider';
import { Mono, T } from '../kit';
import { money } from '../format';
import { SPACE } from '../theme';

const MAX_COINS = 24;

function Coin({ index, total, onLand }: { index: number; total: number; onLand: () => void }) {
  const y = useSharedValue(-120);
  const o = useSharedValue(0);
  useEffect(() => {
    const delay = index * Math.min(70, 1200 / total);
    o.value = withDelay(delay, withTiming(1, { duration: 80 }));
    y.value = withDelay(delay, withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
    const t = setTimeout(onLand, delay + 240);
    return () => clearTimeout(t);
  }, [index, total, o, y, onLand]);
  const col = index % 6;
  const stack = Math.floor(index / 6);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value - stack * 4 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 14,
          left: 20 + col * 34,
          width: 28,
          height: 10,
          borderRadius: 14,
          backgroundColor: index % 3 === 0 ? '#C9A13A' : '#B9BDC1',
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.2)',
        },
        style,
      ]}
    />
  );
}

/**
 * Coin tray (SPEC §3.6): coins slide in and stack with a light haptic tick
 * and a clink per coin. Shows gross, commission and what you keep.
 */
export function CoinTray({
  grossCents,
  commissionCents,
}: {
  grossCents: number;
  commissionCents: number;
}) {
  const theme = useTheme();
  const coins = Math.min(MAX_COINS, Math.max(1, Math.round(grossCents / 2000)));
  const onLand = useMemo(
    () => () => {
      haptic.tick();
      sound.play('coin');
    },
    [],
  );
  return (
    <View style={{ gap: SPACE.s }}>
      <View
        accessibilityLabel={`Collected ${money(grossCents)}`}
        style={{
          height: 110,
          borderRadius: 12,
          backgroundColor: '#3A3D42',
          borderWidth: 3,
          borderColor: '#A9ADB1',
          overflow: 'hidden',
        }}
      >
        {grossCents > 0
          ? Array.from({ length: coins }, (_, i) => (
              <Coin key={i} index={i} total={coins} onLand={onLand} />
            ))
          : null}
        {grossCents <= 0 ? (
          <T center color="#C9C6BF" style={{ marginTop: 44 }}>
            Cash box is empty
          </T>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono muted>Cash box</Mono>
        <Mono>{money(grossCents)}</Mono>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono muted>Venue commission</Mono>
        <Mono color={theme.alert}>{money(-commissionCents)}</Mono>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono weight="bold">You keep</Mono>
        <Mono weight="bold" color={theme.signal}>
          {money(grossCents - commissionCents)}
        </Mono>
      </View>
    </View>
  );
}
