import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import type { TutorialStep } from '@/sim';

import { Icon, type IconName } from './icons';
import { T } from './kit';
import { Key, SKIN } from './skin';
import { SPACE } from './theme';

export const COACH_STEPS: readonly TutorialStep[] = ['place', 'stock', 'wait', 'collect', 'goal'];

const COPY: Record<TutorialStep, { icon: IconName; title: string; line: string }> = {
  place: {
    icon: 'pin',
    title: 'Place your first machine',
    line: 'Tap a busy street. The flame key shows where people walk.',
  },
  stock: {
    icon: 'box',
    title: 'Stock it',
    line: 'Tap your machine, then Fill and Restock.',
  },
  wait: {
    icon: 'people',
    title: 'Wait for customers',
    line: 'Zoom in to watch people walk up and buy.',
  },
  collect: {
    icon: 'coin',
    title: 'Collect your cash',
    line: 'Tap your machine and empty the cash box.',
  },
  goal: {
    icon: 'star',
    title: 'Your first goal',
    line: 'Earn $1,000 in sales to finish chapter 1. The meter up top tracks it.',
  },
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
  const c = COPY[step];
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
        <Icon name={c.icon} size={24} color="#FFFFFF" />
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
          {c.title}
        </T>
        <T size={13} color="#5A5F7A">
          {c.line}
        </T>
      </View>
      {last ? (
        <Key tone="brand" height={36} onPress={onClose} accessibilityLabel="Got it">
          <T size={14} weight="bold" color="#FFFFFF">
            OK
          </T>
        </Key>
      ) : (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close the tutorial"
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
