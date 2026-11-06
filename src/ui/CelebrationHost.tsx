import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/services/haptics';
import { useCelebrations, type Moment } from '@/store/celebrations';

import { moneyShort } from './format';
import { Icon, type IconName } from './icons';
import { Mono, T } from './kit';
import { sfx } from './sfx';
import { useTheme } from './ThemeProvider';
import { RADIUS, SPACE } from './theme';

const SHOW_MS: Record<Moment['kind'], number> = {
  chapter: 7000,
  trophy: 4500,
  order: 3500,
  streak: 4500,
  event: 5000,
  info: 3000,
};

const ICON: Record<Moment['kind'], IconName> = {
  chapter: 'company',
  trophy: 'coin',
  order: 'orders',
  streak: 'orders',
  event: 'flame',
  info: 'locate',
};

/**
 * Shows the head of the celebration queue as a rounded card that springs in
 * from the top, with a matching sound and haptic. Tap to dismiss.
 */
export function CelebrationHost() {
  const theme = useTheme();
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
  const accent =
    head.kind === 'event' ? theme.amber : head.amountCents ? theme.signal : theme.brand;
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        key={head.id}
        entering={FadeInUp.springify().damping(15).stiffness(170)}
        exiting={FadeOutUp.duration(220)}
        style={{ paddingTop: insets.top + SPACE.s, paddingHorizontal: SPACE.l }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label[head.kind]}: ${head.title}. Tap to dismiss.`}
          accessibilityLiveRegion="polite"
          onPress={() => dismiss(head.id)}
          style={[styles.card, { backgroundColor: theme.hud, shadowColor: theme.shadow }]}
        >
          <View style={[styles.disc, { backgroundColor: accent }]}>
            <Icon name={ICON[head.kind]} size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <T size={12} weight="bold" color={accent}>
              {label[head.kind]}
            </T>
            <T size={16} weight="bold" numberOfLines={2}>
              {head.title}
            </T>
            {head.subtitle ? (
              <T size={13} muted numberOfLines={1}>
                {head.subtitle}
              </T>
            ) : null}
          </View>
          {head.amountCents ? (
            <View style={[styles.reward, { backgroundColor: theme.signal }]}>
              <Mono size={15} weight="bold" color="#FFFFFF">
                {`+${moneyShort(head.amountCents)}`}
              </Mono>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: RADIUS.l,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 1,
    elevation: 8,
  },
  disc: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  reward: { paddingHorizontal: SPACE.m, paddingVertical: 6, borderRadius: RADIUS.pill },
});
