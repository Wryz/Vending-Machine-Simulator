import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import { SPLASH } from '@/config/splash';

import { SKIN } from './skin';

/**
 * The animated launch splash. It starts as an exact copy of the native splash
 * still (assets/images/splash-icon.png, made from the same layers), so the
 * hand-off is invisible; then the sunburst turns, the can floats and the
 * marquee bulbs chase while the app loads. When `ready`, the can pops toward
 * you and everything fades into the game.
 *
 * Layer boxes are in points inside the 360×480 art box, i.e. the 1080×1440
 * still's pixel layout divided by 3.
 */
const ART = {
  rays: { left: 0, top: 20 / 3, width: 360, height: 360 },
  shadow: { left: 110, top: 808 / 3, width: 140, height: 70 / 3 },
  can: { left: 202 / 3, top: 250 / 3, width: 676 / 3, height: 620 / 3 },
  wordmark: { left: 115 / 3, top: 320, width: 850 / 3, height: 82 },
  bulbY: 410,
  bulbX0: 220 / 3,
  bulbGap: 80 / 3,
  bulbSize: 26 / 3,
} as const;

const IMAGES = {
  rays: require('../../assets/brand/splash/rays.png'),
  shadow: require('../../assets/brand/splash/shadow.png'),
  can: require('../../assets/brand/splash/can.png'),
  wordmark: require('../../assets/brand/splash/wordmark.png'),
};
const IMAGE_COUNT = Object.keys(IMAGES).length;

export function BrandSplash({
  ready,
  onShown,
  onDone,
}: {
  /** The app is loaded and can be revealed. */
  ready: boolean;
  /** The art is on screen (hide the native splash now). */
  onShown(): void;
  /** The exit finished (unmount). */
  onDone(): void;
}) {
  const reduced = useReducedMotion();
  const [minElapsed, setMinElapsed] = useState(false);
  const loadedCount = useRef(0);
  const shown = useRef(false);

  const turn = useSharedValue(0);
  const bob = useSharedValue(0);
  const chase = useSharedValue(-1);
  const exit = useSharedValue(0);

  const show = () => {
    if (shown.current) return;
    shown.current = true;
    onShown();
  };
  const imageLoaded = () => {
    loadedCount.current += 1;
    if (loadedCount.current >= IMAGE_COUNT) show();
  };

  useEffect(() => {
    // Never keep the native splash up for long if an image event goes missing.
    const fallback = setTimeout(show, 600);
    const min = setTimeout(() => setMinElapsed(true), SPLASH.minShowMs);
    return () => {
      clearTimeout(fallback);
      clearTimeout(min);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  useEffect(() => {
    if (reduced) return;
    turn.value = withRepeat(
      withTiming(360, { duration: SPLASH.raysTurnMs, easing: Easing.linear }),
      -1,
    );
    bob.value = withRepeat(
      withTiming(1, { duration: SPLASH.canBobMs / 2, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    chase.value = withRepeat(
      withTiming(SPLASH.bulbs, {
        duration: SPLASH.bulbs * SPLASH.bulbStepMs,
        easing: Easing.linear,
      }),
      -1,
    );
  }, [reduced, turn, bob, chase]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    exit.value = withTiming(
      1,
      { duration: reduced ? 200 : SPLASH.exitMs, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDone)();
      },
    );
  }, [ready, minElapsed, reduced, exit, onDone]);

  const fade = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const rays = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }, { scale: 1 + 0.15 * exit.value }],
  }));
  const can = useAnimatedStyle(() => ({
    transform: [
      { translateY: -SPLASH.canBobPt * bob.value },
      { scale: 1 + (SPLASH.exitScale - 1) * exit.value },
    ],
  }));
  const shadow = useAnimatedStyle(() => ({
    opacity: 1 - 0.35 * bob.value,
    transform: [{ scaleX: 1 - 0.08 * bob.value }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, fade]}
      pointerEvents={ready ? 'none' : 'auto'}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Coinline"
    >
      <View style={styles.art}>
        <Animated.View style={[styles.abs, ART.rays, rays]}>
          <Image
            source={IMAGES.rays}
            style={styles.fill}
            onLoadEnd={imageLoaded}
            fadeDuration={0}
          />
        </Animated.View>
        <Animated.View style={[styles.abs, ART.shadow, shadow]}>
          <Image
            source={IMAGES.shadow}
            style={styles.fill}
            onLoadEnd={imageLoaded}
            fadeDuration={0}
          />
        </Animated.View>
        <Animated.View style={[styles.abs, ART.can, can]}>
          <Image source={IMAGES.can} style={styles.fill} onLoadEnd={imageLoaded} fadeDuration={0} />
        </Animated.View>
        <Image
          source={IMAGES.wordmark}
          style={[styles.abs, ART.wordmark]}
          onLoadEnd={imageLoaded}
          fadeDuration={0}
        />
        {Array.from({ length: SPLASH.bulbs }, (_, i) => (
          <Bulb key={i} index={i} chase={chase} />
        ))}
      </View>
    </Animated.View>
  );
}

/** A marquee bulb: steady like the still, flaring as the chase passes. */
function Bulb({ index, chase }: { index: number; chase: SharedValue<number> }) {
  const glow = useAnimatedStyle(() => {
    const d = Math.abs(chase.value - index);
    const lit = Math.max(0, 1 - d);
    return { opacity: lit, transform: [{ scale: 1 + 0.35 * lit }] };
  });
  const left = ART.bulbX0 + index * ART.bulbGap - ART.bulbSize / 2;
  const box = {
    left,
    top: ART.bulbY - ART.bulbSize / 2,
    width: ART.bulbSize,
    height: ART.bulbSize,
  };
  return (
    <View style={[styles.abs, box]}>
      <View style={[styles.fill, styles.bulb]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.bulbLit, glow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: SPLASH.background, alignItems: 'center', justifyContent: 'center' },
  art: { width: SPLASH.widthPt, height: SPLASH.heightPt },
  abs: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
  bulb: {
    borderRadius: 999,
    backgroundColor: SKIN.bulb,
    shadowColor: SKIN.marqueeGlow,
    shadowOpacity: 1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  bulbLit: {
    borderRadius: 999,
    backgroundColor: '#FFFBEA',
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
});
