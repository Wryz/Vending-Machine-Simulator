import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { useT } from '@/i18n';
import type { RunPlan } from '@/sim';

import { money } from './format';
import { Icon } from './icons';
import { Mono, T } from './kit';
import { Key, SKIN } from './skin';
import { SPACE } from './theme';
import { clockDuration } from './machine/VanCard';

/**
 * The "Restock low" order card on the map: how many machines one van will
 * top up, the stock plus fuel it costs and about how long the run takes.
 */
export function LowRunCard({
  plan,
  vansOut,
  onSend,
  onClose,
}: {
  plan: RunPlan;
  /** No van free: the card explains instead of sending. */
  vansOut: boolean;
  onSend: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const items = plan.legs.reduce((a, l) => a + l.lines.reduce((b, x) => b + x.qty, 0), 0);
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(150)}
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={styles.badge}>
          <Icon name="van" size={24} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T size={16} weight="bold" color={SKIN.keyInk}>
            {t('map.lowRun.title', { n: plan.legs.length })}
          </T>
          <Mono size={13} color="#4A4F6A">
            {t('map.lowRun.detail', {
              items,
              cost: money(plan.wholesaleCents + plan.fuelCents),
              time: clockDuration(plan.doneIn),
            })}
          </Mono>
        </View>
      </View>
      <View style={styles.keys}>
        <Key onPress={onClose} style={{ flex: 1 }} accessibilityLabel={t('map.lowRun.cancel')}>
          <T size={15} weight="bold" color={SKIN.keyInk}>
            {t('map.lowRun.cancel')}
          </T>
        </Key>
        <Key
          tone="brand"
          disabled={vansOut}
          onPress={onSend}
          style={{ flex: 1.4 }}
          accessibilityLabel={vansOut ? t('map.lowRun.vansOut') : t('map.lowRun.send')}
        >
          <T size={15} weight="bold" color="#FFFFFF">
            {vansOut ? t('map.lowRun.vansOut') : t('map.lowRun.send')}
          </T>
        </Key>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: 18,
    backgroundColor: '#FFF6DE',
    borderWidth: 2,
    borderColor: SKIN.cabinet,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  top: { flexDirection: 'row', gap: SPACE.m, alignItems: 'center' },
  keys: { flexDirection: 'row', gap: SPACE.s },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: SKIN.cabinet,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
