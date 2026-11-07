import { Marker } from '@maplibre/maplibre-react-native';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useT } from '@/i18n';
import { venueName } from '@/i18n/sim';
import { deliveryProgress, pointAlong, type Delivery, type GameState } from '@/sim';
import { Icon } from '@/ui/icons';
import { T } from '@/ui/kit';
import { SKIN } from '@/ui/skin';

/**
 * Restock vans on the map (SPEC §4.1 Service): each order's van loads at a
 * warehouse (a crate pin), then drives the street route (drawn by CityMap as a
 * dashed line) to the machine. Positions are interpolated on the device clock
 * so the van moves smoothly between sim ticks. Hidden when zoomed far out.
 */

const MIN_ZOOM = 12;
/** Store names show from this zoom. */
const LABEL_ZOOM = 15;
const FRAME_MS = 100;

interface Props {
  game: GameState;
  zoom: number;
}

export const DeliveryVans = memo(function DeliveryVans({ game, zoom }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const active = game.deliveries.length > 0 && zoom >= MIN_ZOOM;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), FRAME_MS);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  return (
    <>
      {game.deliveries.map((d) => {
        const m = game.machines.find((x) => x.id === d.machineId && x.status === 'active');
        if (!m) return null;
        return <Trip key={d.id} delivery={d} to={m} now={now} zoom={zoom} />;
      })}
    </>
  );
});

function Trip({
  delivery,
  to,
  now,
  zoom,
}: {
  delivery: Delivery;
  to: { lat: number; lng: number; venue: { name: string } };
  now: number;
  zoom: number;
}) {
  const t = useT();
  const from = delivery.from;
  const path = delivery.path ?? [
    [from.lng, from.lat],
    [to.lng, to.lat],
  ];
  const { at, east } = pointAlong(path, deliveryProgress(delivery, now));
  const label = from.name
    ? venueName(from.name)
    : from.kind === 'wholesale'
      ? t('map.wholesale')
      : t('map.warehouse');
  return (
    <>
      <Marker id={`${delivery.id}-store`} lngLat={[from.lng, from.lat]} anchor="bottom">
        <View
          pointerEvents="none"
          style={styles.storeWrap}
          accessible
          accessibilityLabel={t('map.a11y.store', { store: label })}
        >
          {zoom >= LABEL_ZOOM ? (
            <View style={styles.storeLabel}>
              <T size={11} weight="bold" color={SKIN.keyInk} numberOfLines={1}>
                {label}
              </T>
            </View>
          ) : null}
          <View style={styles.storePin}>
            <Icon name="box" size={14} color="#FFFFFF" />
          </View>
        </View>
      </Marker>
      <Marker id={`${delivery.id}-van`} lngLat={at} anchor="bottom">
        <View
          pointerEvents="none"
          accessible
          accessibilityLabel={t('map.a11y.van', { venue: venueName(to.venue.name) })}
        >
          <ToyVan facingRight={east} driving={now > delivery.departAt && now < delivery.arriveAt} />
        </View>
      </Marker>
    </>
  );
}

/** A little toy delivery van in the brand tangerine, bouncing as it drives. */
function ToyVan({ facingRight, driving }: { facingRight: boolean; driving: boolean }) {
  const reduced = useReducedMotion();
  const bounce = useSharedValue(0);
  useEffect(() => {
    if (reduced || !driving) {
      bounce.value = 0;
      return;
    }
    bounce.value = withRepeat(
      withTiming(1, { duration: 180, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bounce, reduced, driving]);
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * bounce.value }] }));
  return (
    <Animated.View
      entering={reduced ? undefined : ZoomIn.springify().damping(14)}
      style={[styles.van, { transform: [{ scaleX: facingRight ? 1 : -1 }] }]}
    >
      <View style={styles.shadow} />
      <Animated.View style={body}>
        {/* Cargo box with a cream stripe, then the cab with its window. */}
        <View style={styles.box}>
          <View style={styles.stripe} />
        </View>
        <View style={styles.cab}>
          <View style={styles.window} />
        </View>
      </Animated.View>
      <View style={[styles.wheel, { left: 6 }]} />
      <View style={[styles.wheel, { left: 27 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  storeWrap: { alignItems: 'center' },
  storeLabel: {
    maxWidth: 140,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 3,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  storePin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1B8F57',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  van: { width: 42, height: 30 },
  shadow: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  box: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 27,
    height: 21,
    borderRadius: 5,
    backgroundColor: SKIN.cabinet,
    borderBottomWidth: 3,
    borderBottomColor: SKIN.cabinetEdge,
    justifyContent: 'center',
  },
  stripe: { height: 4, backgroundColor: SKIN.marquee },
  cab: {
    position: 'absolute',
    left: 25,
    top: 6,
    width: 16,
    height: 15,
    borderTopRightRadius: 8,
    borderTopLeftRadius: 3,
    borderBottomRightRadius: 4,
    backgroundColor: SKIN.cabinetLight,
    borderBottomWidth: 3,
    borderBottomColor: SKIN.cabinetEdge,
  },
  window: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 8,
    height: 6,
    borderTopRightRadius: 5,
    borderRadius: 2,
    backgroundColor: '#BFE6FA',
  },
  wheel: {
    position: 'absolute',
    bottom: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2B2F4A',
    borderWidth: 2,
    borderColor: '#E3E7EE',
  },
});
