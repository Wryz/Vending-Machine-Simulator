import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/services/haptics';

import { Icon, type IconName } from './icons';
import { T } from './kit';
import { RollingMoney } from './RollingMoney';
import { sfx } from './sfx';
import { useTheme } from './ThemeProvider';
import { RADIUS, SPACE, TOUCH } from './theme';

/** Floating round map button (SPEC §8 HUD): icon only, label for VoiceOver. */
export function RoundButton({
  icon,
  label,
  onPress,
  active,
  badge,
  size = TOUCH + 4,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  badge?: string;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      accessibilityState={{ selected: !!active }}
      hitSlop={6}
      onPress={() => {
        haptic.select();
        sfx('pop');
        onPress();
      }}
      style={({ pressed }) => [
        styles.round,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active ? theme.brand : theme.hud,
          shadowColor: theme.shadow,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
      ]}
    >
      <Icon name={icon} size={size * 0.46} color={active ? theme.onBrand : theme.ink} />
      {badge ? <Badge text={badge} /> : null}
    </Pressable>
  );
}

export function Badge({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.brand, borderColor: theme.hud }]}>
      <T size={11} weight="bold" color={theme.onBrand}>
        {text}
      </T>
    </View>
  );
}

/** Cash as a floating pill with a coin. */
export function CashPill({ cents, onPress }: { cents: number; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.hud,
          shadowColor: theme.shadow,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <View style={[styles.coin, { backgroundColor: theme.amber }]}>
        <Icon name="coin" size={18} color="#FFFFFF" />
      </View>
      <RollingMoney cents={cents} size={18} />
    </Pressable>
  );
}

/**
 * An icon and a short value (SPEC §3.6: numbers and icons before sentences).
 * `label` is for VoiceOver only.
 */
export function StatChip({
  icon,
  value,
  label,
  color,
  children,
}: {
  icon: IconName;
  value?: string;
  label: string;
  color?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={value ? `${label}: ${value}` : label}
      style={[styles.stat, { backgroundColor: theme.surface }]}
    >
      <Icon name={icon} size={18} color={color ?? theme.muted} />
      {value ? (
        <T size={14} weight="bold" color={color}>
          {value}
        </T>
      ) : null}
      {children}
    </View>
  );
}

/** A feature that isn't open yet: one icon, a short name, the chapter that opens it. */
export function LockedCard({
  icon,
  title,
  chapter,
}: {
  icon: IconName;
  title: string;
  chapter: number;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${title}, unlocks in chapter ${chapter}`}
      style={[styles.locked, { backgroundColor: theme.surface }]}
    >
      <View style={[styles.lockedIcon, { backgroundColor: theme.line }]}>
        <Icon name={icon} size={22} color={theme.muted} />
      </View>
      <T weight="bold" muted style={{ flex: 1 }}>
        {title}
      </T>
      <View style={[styles.lockedChip, { backgroundColor: theme.line }]}>
        <Icon name="lock" size={14} color={theme.muted} />
        <T size={13} weight="bold" muted>
          {`Ch. ${chapter}`}
        </T>
      </View>
    </View>
  );
}

/** A small floating pill for one line of status (time, weather, a sale). */
export function InfoPill({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.info, { backgroundColor: theme.hud, shadowColor: theme.shadow }, style]}>
      {children}
    </View>
  );
}

const shadow = {
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 10,
  shadowOpacity: 1,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center', ...shadow },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
    height: TOUCH + 4,
    paddingLeft: 6,
    paddingRight: SPACE.l,
    borderRadius: RADIUS.pill,
    ...shadow,
  },
  coin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: SPACE.m,
    borderRadius: RADIUS.pill,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: RADIUS.m,
  },
  lockedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: SPACE.s + 2,
    borderRadius: RADIUS.pill,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACE.m,
    height: 32,
    borderRadius: RADIUS.pill,
    ...shadow,
  },
});
