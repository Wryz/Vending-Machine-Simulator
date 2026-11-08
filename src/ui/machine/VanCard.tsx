import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { venueName } from '@/i18n/sim';
import { deliveryProgress, type Delivery } from '@/sim';

import { Icon } from '../icons';
import { Mono, T } from '../kit';
import { LedBar, SKIN } from '../skin';
import { SPACE } from '../theme';

/** "0:34", "1:05": time left on a short trip. */
export function clockDuration(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The restock van on its way to this machine: where it loads, a road bar and
 * the time left. Ticks on its own so the bar moves smoothly between sim ticks.
 */
export function VanCard({ delivery, driverName }: { delivery: Delivery; driverName?: string }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const loading = now < delivery.departAt;
  // A later stop of a multi-stop run waits while the van serves the stops before it.
  const elsewhere = loading && (delivery.leg ?? 0) > 0;
  const left = clockDuration(delivery.arriveAt - now);
  const store = delivery.from.name ? venueName(delivery.from.name) : '';
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('machinePanel.van.a11y', { n: delivery.units, time: left })}
    >
      <View style={styles.top}>
        <View style={[styles.badge, driverName ? { backgroundColor: SKIN.driverVan } : null]}>
          <Icon name="van" size={26} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T size={17} weight="bold" color={SKIN.keyInk}>
            {driverName
              ? t('machinePanel.van.driverTitle', { name: driverName })
              : t('machinePanel.van.title')}
          </T>
          <T size={14} color="#4A4F6A" numberOfLines={1}>
            {elsewhere
              ? t('machinePanel.van.otherStops')
              : loading
                ? t('machinePanel.van.loading')
                : store
                  ? t('machinePanel.van.from', { store })
                  : t('machinePanel.van.fromDepot')}
          </T>
        </View>
        <Mono size={15} weight="bold" color={SKIN.keyInk}>
          {t('machinePanel.van.eta', { time: left })}
        </Mono>
      </View>
      <LedBar value={deliveryProgress(delivery, now)} color={SKIN.ledAmber} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACE.s,
    padding: SPACE.m,
    borderRadius: 16,
    backgroundColor: '#FFF6DE',
    borderWidth: 2,
    borderColor: SKIN.cabinet,
  },
  top: { flexDirection: 'row', gap: SPACE.m, alignItems: 'center' },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SKIN.cabinet,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
