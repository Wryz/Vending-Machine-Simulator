import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/services/haptics';
import { useCelebrations, type Moment } from '@/store/celebrations';

import { sfx } from './sfx';
import { money } from './format';
import { Receipt } from './objects/Receipt';
import { SPACE } from './theme';

const SHOW_MS: Record<Moment['kind'], number> = {
  chapter: 7000,
  trophy: 4500,
  order: 3500,
  streak: 4500,
  event: 5000,
  info: 3000,
};

/**
 * Shows the head of the celebration queue as a thermal receipt printing down
 * from the top, with a matching sound and haptic. Tap to dismiss.
 */
export function CelebrationHost() {
  const insets = useSafeAreaInsets();
  const head = useCelebrations((s) => s.queue[0]);
  const dismiss = useCelebrations((s) => s.dismiss);

  useEffect(() => {
    if (!head) return;
    sfx('paper');
    if (head.kind === 'chapter' || head.kind === 'streak') {
      setTimeout(() => sfx('chime'), 350);
      haptic.success();
    } else if (head.kind === 'trophy' || head.kind === 'order') {
      setTimeout(() => sfx(head.amountCents ? 'coins' : 'success'), 300);
      haptic.success();
    } else if (head.kind === 'event') {
      sfx('notify');
      haptic.tick();
    }
    const t = setTimeout(() => dismiss(head.id), SHOW_MS[head.kind]);
    return () => clearTimeout(t);
  }, [head, dismiss]);

  if (!head) return null;
  const label: Record<Moment['kind'], string> = {
    chapter: 'Chapter complete',
    trophy: 'Trophy',
    order: 'Order complete',
    streak: 'All orders done',
    event: 'Coming up nearby',
    info: 'Note',
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <Animated.View
        key={head.id}
        entering={SlideInUp.duration(520).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutUp.duration(320).easing(Easing.in(Easing.quad))}
        style={{ paddingTop: insets.top + SPACE.s, paddingHorizontal: SPACE.xl }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label[head.kind]}: ${head.title}. Tap to dismiss.`}
          accessibilityLiveRegion="polite"
          onPress={() => dismiss(head.id)}
        >
          <Receipt
            title={label[head.kind]}
            subtitle={head.title}
            lines={[
              ...(head.subtitle ? [{ label: head.subtitle, value: '' }] : []),
              ...(head.lines ?? []),
            ]}
            total={
              head.amountCents
                ? { label: 'Reward', value: money(head.amountCents, { sign: true }), tone: 'good' }
                : undefined
            }
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}
