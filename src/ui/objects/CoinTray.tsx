import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';

import { Mono, T } from '../kit';
import { money } from '../format';
import { Icon, type IconName } from '../icons';
import { SKIN } from '../skin';
import { SPACE } from '../theme';

const MAX_COINS = 24;

function Coin({ index, total, onLand }: { index: number; total: number; onLand: () => void }) {
  const y = useSharedValue(-120);
  const o = useSharedValue(0);
  useEffect(() => {
    const delay = index * Math.min(70, 1200 / total);
    o.value = withDelay(delay, withTiming(1, { duration: 80 }));
    y.value = withDelay(delay, withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
    const timer = setTimeout(onLand, delay + 240);
    return () => clearTimeout(timer);
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
  const t = useT();
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
        accessibilityLabel={t('objects.coinTray.a11y.collected', { amount: money(grossCents) })}
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
            {t('objects.coinTray.empty')}
          </T>
        ) : null}
      </View>
      {/* The receipt as an LED panel: box, the venue's cut, what you keep. */}
      <View
        accessible
        accessibilityLabel={t('objects.coinTray.a11y.summary', {
          gross: money(grossCents),
          commission: money(commissionCents),
          net: money(grossCents - commissionCents),
        })}
        style={styles.panel}
      >
        <Readout
          icon="coin"
          label={t('objects.coinTray.box')}
          value={money(grossCents)}
          color={SKIN.ledAmber}
        />
        <Readout
          icon="handshake"
          label={t('objects.coinTray.venue')}
          value={money(-commissionCents)}
          color={SKIN.ledRed}
        />
        <Readout
          icon="bag"
          label={t('objects.coinTray.youKeep')}
          value={money(grossCents - commissionCents)}
          color={SKIN.ledGreen}
          big
        />
      </View>
    </View>
  );
}

function Readout({
  icon,
  label,
  value,
  color,
  big,
}: {
  icon: IconName;
  label: string;
  value: string;
  color: string;
  big?: boolean;
}) {
  return (
    <View style={{ flex: big ? 1.3 : 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={13} color="#AEB3D6" />
        <T size={11} weight="bold" color="#AEB3D6">
          {label.toUpperCase()}
        </T>
      </View>
      <Mono
        size={big ? 18 : 15}
        weight="bold"
        color={color}
        style={{
          textShadowColor: color,
          textShadowRadius: 8,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {value}
      </Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    paddingVertical: SPACE.s,
    paddingHorizontal: SPACE.s,
    borderRadius: 12,
    backgroundColor: SKIN.led,
    borderWidth: 3,
    borderColor: SKIN.chrome,
  },
});
