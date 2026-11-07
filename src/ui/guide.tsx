import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { TUTORIAL, type FirstTipId } from '@/config/tutorial';
import { useT } from '@/i18n';
import { tutorialStep, type TutorialStep } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';

import { Icon, type IconName } from './icons';
import { T } from './kit';
import { Key, SKIN } from './skin';
import { RADIUS, SPACE } from './theme';

/**
 * The guided tutorial (SPEC §8): which first-machine step the player is on,
 * or null when it is done or closed. Screens and sheets use it to say what to
 * do next and to pulse the key to press.
 */
export function useTutorialStep(): TutorialStep | null {
  const hidden = useProfile((s) => s.tutorialHidden);
  const step = useGame((s) => (s.game ? tutorialStep(s.game) : null));
  return hidden ? null : step;
}

/**
 * A soft pulsing ring around the key to press next. Wraps its child; pass the
 * child's layout style (e.g. `flex: 1`) as `style`.
 */
export function Pulse({
  on,
  children,
  style,
  radius = RADIUS.s + 4,
}: {
  on: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!on || reduced) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }
    p.value = withRepeat(
      withTiming(1, { duration: TUTORIAL.pulse.periodMs, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [on, reduced, p]);
  const spread = TUTORIAL.pulse.spreadPt;
  const ring = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : 1 - p.value,
    transform: [{ scaleX: 1 + p.value * 0.06 }, { scaleY: 1 + p.value * 0.22 }],
  }));
  return (
    <View style={style}>
      {on ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              left: -spread / 2,
              right: -spread / 2,
              top: -spread / 2,
              bottom: -spread / 2,
              borderRadius: radius + spread / 2,
            },
            ring,
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

/**
 * One line inside a sheet or screen saying what to do next, in large plain
 * words with a pointing finger (read out by VoiceOver when it changes).
 */
export function GuideLine({
  text,
  action,
}: {
  text: string;
  /** A key on the line that does the step (e.g. "Place" while the real key is further down). */
  action?: { label: string; onPress: () => void };
}) {
  return (
    <Animated.View
      key={text}
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={styles.line}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
    >
      <View style={styles.tap}>
        <Icon name="tap" size={22} color="#FFFFFF" />
      </View>
      <T size={TUTORIAL.text.line} weight="bold" color={SKIN.keyInk} style={{ flex: 1 }}>
        {text}
      </T>
      {action ? (
        <Key tone="brand" height={40} onPress={action.onPress} accessibilityLabel={action.label}>
          <T size={15} weight="bold" color="#FFFFFF">
            {action.label}
          </T>
        </Key>
      ) : null}
    </Animated.View>
  );
}

const TIP_ICON: Record<FirstTipId, IconName> = {
  keys: 'keys',
  routes: 'route',
  orders: 'orders',
  company: 'company',
  rankings: 'trend',
};

/**
 * A one-time tip the first time a screen opens (Keys, Routes, Orders,
 * Company, rankings): what this screen is for, in one sentence.
 */
export function FirstTip({ id, style }: { id: FirstTipId; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  const seen = useProfile((s) => s.tipsSeen?.includes(id) ?? false);
  if (seen) return null;
  const done = () =>
    useProfile.getState().update((p) => {
      p.tipsSeen = [...new Set([...(p.tipsSeen ?? []), id])];
    });
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[styles.tip, style]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.tipIcon}>
        <Icon name={TIP_ICON[id]} size={24} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T size={TUTORIAL.text.line} weight="bold" color={SKIN.keyInk} accessibilityRole="header">
          {t(`coach.tips.${id}.title`)}
        </T>
        <T size={15} color="#4A4F6A">
          {t(`coach.tips.${id}.line`)}
        </T>
      </View>
      <Key tone="brand" height={40} onPress={done} accessibilityLabel={t('coach.a11y.gotIt')}>
        <T size={15} weight="bold" color="#FFFFFF">
          {t('coach.ok')}
        </T>
      </Key>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: TUTORIAL.pulse.color,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: 14,
    backgroundColor: '#FFF6DE',
    borderWidth: 2,
    borderColor: TUTORIAL.pulse.color,
  },
  tap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TUTORIAL.pulse.color,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: SKIN.keyEdge,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.brandFace,
  },
});
