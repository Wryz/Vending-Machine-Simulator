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

import { CASH_TRAY_MAX_PIECES, type CashDenomination } from '@/config/cash';
import { useCurrency } from '@/store/currency';

import { cashPiles, denomLabel, trayPieces } from '../cash';
import { Mono, T } from '../kit';
import { money } from '../format';
import { Icon, type IconName } from '../icons';
import { SKIN } from '../skin';
import { SPACE } from '../theme';

/** One note or coin dropping into the tray. */
function Piece({
  denom,
  label,
  slot,
  delay,
  onLand,
}: {
  denom: CashDenomination;
  label: string;
  /** Position: notes fan out on the left, coins stack on the right. */
  slot: { x: number; y: number; rot: number };
  delay: number;
  onLand: (kind: CashDenomination['kind']) => void;
}) {
  const y = useSharedValue(-130);
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 80 }));
    y.value = withDelay(delay, withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }));
    const timer = setTimeout(() => onLand(denom.kind), delay + 260);
    return () => clearTimeout(timer);
  }, [delay, denom.kind, o, y, onLand]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }, { rotate: `${slot.rot}deg` }],
  }));
  const isNote = denom.kind === 'note';
  return (
    <Animated.View
      style={[
        isNote ? styles.note : styles.coin,
        { left: slot.x, bottom: slot.y, backgroundColor: denom.color },
        style,
      ]}
    >
      {isNote ? <View style={styles.noteInner} /> : null}
      <T size={isNote ? 13 : 10} weight="bold" color="#2B2340" numberOfLines={1}>
        {label}
      </T>
    </Animated.View>
  );
}

/**
 * Cash box tray (SPEC §3.6): the takings drop in as the city's own notes and
 * coins (fanned notes on the left, coin stacks on the right, each with its
 * face value), with a tick and a clink or rustle per piece. Big hauls show
 * ×N counts. Below, the LED receipt: gross, venue commission, what you keep.
 */
export function CoinTray({
  grossCents,
  commissionCents,
}: {
  grossCents: number;
  commissionCents: number;
}) {
  const t = useT();
  const currency = useCurrency((s) => s.currency);
  // The box's takings as real local notes and coins (fixed game rates).
  const pieces = useMemo(() => {
    const drawn = trayPieces(cashPiles(grossCents, currency), CASH_TRAY_MAX_PIECES);
    const out: {
      key: string;
      denom: CashDenomination;
      label: string;
      slot: { x: number; y: number; rot: number };
    }[] = [];
    let note = 0;
    let coin = 0;
    // Smallest first, so the biggest note and coin land on top, face up.
    for (const p of [...drawn].reverse()) {
      for (let i = 0; i < p.drawn; i++) {
        const label = denomLabel(p.denom.value, currency);
        if (p.denom.kind === 'note') {
          // Fanned stack, a little offset each.
          out.push({
            key: `n${note}`,
            denom: p.denom,
            label,
            slot: { x: 14 + (note % 6) * 10, y: 16 + (note % 6) * 6, rot: -8 + (note % 5) * 4 },
          });
          note++;
        } else {
          // Coin stacks of up to four, side by side.
          const col = Math.floor(coin / 4);
          out.push({
            key: `c${coin}`,
            denom: p.denom,
            label,
            slot: { x: 172 + (col % 4) * 34, y: 12 + (coin % 4) * 9, rot: 0 },
          });
          coin++;
        }
      }
    }
    return out;
  }, [grossCents, currency]);
  const totals = useMemo(() => {
    const drawn = trayPieces(cashPiles(grossCents, currency), CASH_TRAY_MAX_PIECES);
    return drawn.filter((p) => p.total > p.drawn);
  }, [grossCents, currency]);
  const onLand = useMemo(
    () => (kind: CashDenomination['kind']) => {
      haptic.tick();
      sound.play(kind === 'note' ? 'paper' : 'coin');
    },
    [],
  );
  return (
    <View style={{ gap: SPACE.s }}>
      <View
        accessibilityLabel={t('objects.coinTray.a11y.collected', { amount: money(grossCents) })}
        style={{
          height: 132,
          borderRadius: 12,
          backgroundColor: '#3A3D42',
          borderWidth: 3,
          borderColor: '#A9ADB1',
          overflow: 'hidden',
        }}
      >
        {pieces.map((p, i) => (
          <Piece
            key={p.key}
            denom={p.denom}
            label={p.label}
            slot={p.slot}
            delay={i * Math.min(90, 1300 / pieces.length)}
            onLand={onLand}
          />
        ))}
        {/* Bigger hauls: how many of each piece are really in the box. */}
        {totals.length ? (
          <View style={styles.counts}>
            {totals.map((p) => (
              <T key={p.denom.value} size={10} weight="bold" color="#E8E4DA">
                {`${denomLabel(p.denom.value, currency)} ×${p.total}`}
              </T>
            ))}
          </View>
        ) : null}
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
  note: {
    position: 'absolute',
    width: 96,
    height: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  noteInner: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: 5,
    bottom: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  coin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  counts: {
    position: 'absolute',
    right: 8,
    top: 6,
    alignItems: 'flex-end',
    gap: 1,
  },
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
