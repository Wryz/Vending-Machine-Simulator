import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { CHAPTER_GOALS } from '@/config/progression';
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
 * with step dots. Steps follow the game state (sim/unlocks.ts tutorialStep);
 * the player can close it at any time.
 */
export function Coach({
  step,
  onClose,
  bottom,
}: {
  step: TutorialStep;
  onClose: () => void;
  bottom: number;
}) {
  const t = useT();
  const at = COACH_STEPS.indexOf(step);
  const last = step === 'goal';
  return (
    <Animated.View
      key={step}
      entering={FadeInDown.duration(320)}
      exiting={FadeOut.duration(200)}
      style={[styles.card, { bottom }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.icon}>
        <Icon name={ICON[step]} size={24} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.dots}>
          {COACH_STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                { backgroundColor: i <= at ? SKIN.brandFace : SKIN.chromeDark, width: i === at ? 14 : 6 },
              ]}
            />
          ))}
        </View>
        <T size={15} weight="bold" color={SKIN.keyInk} accessibilityRole="header">
          {t(`coach.steps.${step}.title`)}
        </T>
        <T size={13} color="#5A5F7A">
          {t(`coach.steps.${step}.line`, { amount: moneyWhole(CHAPTER_GOALS[1].salesCents) })}
        </T>
      </View>
      {last ? (
        <Key tone="brand" height={36} onPress={onClose} accessibilityLabel={t('coach.a11y.gotIt')}>
          <T size={14} weight="bold" color="#FFFFFF">
            {t('coach.ok')}
          </T>
        </Key>
      ) : (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('coach.a11y.close')}
          style={styles.close}
        >
          <Icon name="close" size={16} color={SKIN.chromeDark} />
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: SPACE.l,
    right: 76,
    flexDirection: 'row',
    alignItems: 'center',
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
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.brandFace,
  },
  dots: { flexDirection: 'row', gap: 4, marginBottom: 2 },
  dot: { height: 6, borderRadius: 3 },
  close: { alignSelf: 'flex-start', padding: 2 },
});
