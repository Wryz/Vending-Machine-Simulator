import { Marker } from '@maplibre/maplibre-react-native';
import { memo, useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getProduct } from '@/config/products';
import { REQUESTS } from '@/config/requests';
import { useT } from '@/i18n';
import { canCarry, type CustomerRequest, type GameState } from '@/sim';
import { Icon } from '@/ui/icons';
import { Glyph } from '@/ui/objects/small';
import { PRODUCT_IMAGES } from '@/ui/productImages';
import { TOKENS } from '@/ui/theme';

/**
 * Customer requests as speech bubbles over machines (SPEC §4.6): the product
 * they want, where they came from (a small place icon) and how long they'll
 * wait (the bar). Amber when this machine can't sell it (another machine type
 * nearby could). Tap to open the machine. Hidden when zoomed far out.
 */

const MIN_ZOOM = 13;
const SIZE = 56;

interface Props {
  game: GameState;
  zoom: number;
  /** Machine height on screen at this zoom (the bubble floats above it). */
  machineHeightPt: number;
  onPress?(machineId: string): void;
}

export const RequestBubbles = memo(function RequestBubbles({
  game,
  zoom,
  machineHeightPt,
  onPress,
}: Props) {
  if (zoom < MIN_ZOOM) return null;
  const lift = Math.min(150, machineHeightPt + 12);
  // A surprise badge on the same machine sits where the bubble would: go above it.
  const badged = new Set(
    [game.surprises.jackpot?.machineId, game.surprises.deal?.machineId].filter(Boolean),
  );
  return (
    <>
      {game.requests.open.map((r) => {
        const m = game.machines.find((x) => x.id === r.machineId && x.status === 'active');
        if (!m) return null;
        return (
          <Bubble
            key={r.id}
            request={r}
            lngLat={[m.lng, m.lat]}
            lift={badged.has(m.id) ? lift + 40 : lift}
            left={Math.max(0, Math.min(1, (r.until - game.now) / REQUESTS.waitMs))}
            fits={canCarry(game, m, r.productId)}
            onPress={onPress ? () => onPress(m.id) : undefined}
          />
        );
      })}
    </>
  );
});

function Bubble({
  request,
  lngLat,
  lift,
  left,
  fits,
  onPress,
}: {
  request: CustomerRequest;
  lngLat: [number, number];
  lift: number;
  /** Share of the wait left (0..1). */
  left: number;
  /** This machine can sell it. */
  fits: boolean;
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
  const product = getProduct(request.productId);
  const image = PRODUCT_IMAGES[product.id];
  const edge = fits ? '#FFFFFF' : TOKENS.amber;
  const urgent = left < 0.3;
  return (
    <Marker id={`request-${request.id}`} lngLat={lngLat} anchor="bottom" offset={[0, -lift]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('requests.a11y.bubble', { product: product.name })}
        hitSlop={10}
        onPress={onPress}
      >
        <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(12)}>
          <Animated.View style={[styles.wrap, float]}>
            <View style={[styles.bubble, { borderColor: edge }]}>
              {image ? <Image source={image} style={styles.product} resizeMode="contain" /> : null}
              {/* How long they'll wait. */}
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.round(left * 100)}%`,
                      backgroundColor: urgent ? TOKENS.alert : TOKENS.signal,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={[styles.tail, { borderTopColor: edge }]} />
            {/* Where they came from. */}
            <View style={styles.origin}>
              <Glyph category={request.from.category} size={14} />
            </View>
            {!fits ? (
              <View style={styles.hint}>
                <Icon name="lock" size={11} color="#FFFFFF" />
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE + 14, height: SIZE + 18, alignItems: 'center' },
  bubble: {
    width: SIZE,
    height: SIZE,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  product: { width: SIZE - 18, height: SIZE - 18 },
  track: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 5,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E6E8F0',
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 2 },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  origin: {
    position: 'absolute',
    left: 0,
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF3D6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    right: 0,
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.amber,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
