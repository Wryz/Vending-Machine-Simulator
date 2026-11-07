import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { CHAPTER_GOALS } from '@/config/progression';
import { TUTORIAL } from '@/config/tutorial';
import { useT } from '@/i18n';
import type { TutorialStep } from '@/sim';

import { moneyWhole } from './format';
import { Icon, type IconName } from './icons';
import { T } from './kit';
import { Key, SKIN } from './skin';
import { SPACE } from './theme';

export const COACH_STEPS: readonly TutorialStep[] = ['place', 'stock', 'wait', 'collect', 'goal'];

/** Copy lives in the `coach.steps.<step>` catalog. */
const ICON: Record<TutorialStep, IconName> = {
  place: 'pin',
  stock: 'box',
  wait: 'people',
  collect: 'coin',
  goal: 'star',
};

/**
 * The first-machine tutorial (SPEC §8): one short card at a time over the map,
 * with step dots, large plain words and one key that does the step's looking
 * for the player ("Show me a spot", "Open my machine", "Watch"). Steps follow
 * the game state (sim/unlocks.ts tutorialStep); inside the sheets a GuideLine
 * and a pulsing key take over. The player can close it at any time (Settings
 * brings it back).
 */
export function Coach({
  step,
  onClose,
  onAction,
  bottom,
}: {
  step: TutorialStep;
  onClose: () => void;
  /** The step's helper key (the goal step's key is "OK", which closes). */
  onAction?: () => void;
  bottom: number;
}) {
  const t = useT();
  const at = COACH_STEPS.indexOf(step);
  const last = step === 'goal';
  const action = last ? onClose : onAction;
  return (
    <Animated.View
      key={step}
      entering={FadeInDown.duration(320)}
      exiting={FadeOut.duration(200)}
      style={[styles.card, { bottom }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon name={ICON[step]} size={26} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={t('coach.a11y.step', { n: at + 1, total: COACH_STEPS.length })}
          >
            {COACH_STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i <= at ? SKIN.brandFace : SKIN.chromeDark,
                    width: i === at ? 16 : 7,
                  },
                ]}
              />
            ))}
          </View>
          <T
            size={TUTORIAL.text.title}
            weight="bold"
            color={SKIN.keyInk}
            accessibilityRole="header"
          >
            {t(`coach.steps.${step}.title`)}
          </T>
          <T size={TUTORIAL.text.line} color="#4A4F6A">
            {t(`coach.steps.${step}.line`, { amount: moneyWhole(CHAPTER_GOALS[1].salesCents) })}
          </T>
        </View>
        {!last ? (
          <Pressable
            onPress={onClose}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={t('coach.a11y.close')}
            style={styles.close}
          >
            <Icon name="close" size={18} color={SKIN.chromeDark} />
          </Pressable>
        ) : null}
      </View>
      {action ? (
        <Key
          tone="brand"
          height={44}
          onPress={action}
          accessibilityLabel={last ? t('coach.a11y.gotIt') : t(`coach.steps.${step}.action`)}
          accessibilityHint={last ? undefined : t(`coach.steps.${step}.actionHint`)}
        >
          {!last ? <Icon name="tap" size={20} color="#FFFFFF" /> : null}
          <T size={16} weight="bold" color="#FFFFFF">
            {last ? t('coach.ok') : t(`coach.steps.${step}.action`)}
          </T>
        </Key>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: SPACE.l,
    right: 76,
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: SKIN.keyEdge,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.m },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.brandFace,
  },
  dots: { flexDirection: 'row', gap: 4, marginBottom: 2 },
  dot: { height: 7, borderRadius: 3.5 },
  close: { padding: 4 },
});
