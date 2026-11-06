import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useT } from '@/i18n';

import { Icon, type IconName } from './icons';
import { T } from './kit';
import { RollingMoney } from './RollingMoney';
import { sfx } from './sfx';
import { Key, keyInk, SKIN } from './skin';
import { useTheme } from './ThemeProvider';
import { RADIUS, SPACE, TOUCH } from './theme';

/** Floating round map button (SPEC §8 HUD): icon only, label for VoiceOver. */
export function RoundButton({
  icon,
  label,
  onPress,
  active,
  badge,
  size = TOUCH + 2,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  badge?: string;
  size?: number;
}) {
  const t = useT();
  return (
    <View>
      <Key
        round
        tone={active ? 'brand' : 'white'}
        height={size}
        accessibilityLabel={badge ? t('hud.buttonBadge', { label, badge }) : label}
        onPress={() => {
          sfx('pop');
          onPress();
        }}
        faceStyle={{ paddingHorizontal: 0, width: size }}
      >
        <Icon name={icon} size={size * 0.46} color={keyInk(active ? 'brand' : 'white')} />
      </Key>
      {badge ? <Badge text={badge} /> : null}
    </View>
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

/** Cash on the machine's LED display. */
export function CashPill({ cents, onPress }: { cents: number; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      onPress={onPress}
      style={({ pressed }) => [styles.cash, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <View style={styles.cashLed}>
        <RollingMoney cents={cents} size={19} color={SKIN.ledGreen} glow />
      </View>
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
  const t = useT();
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={value ? t('hud.statValue', { label, value }) : label}
      style={[
        styles.stat,
        { backgroundColor: theme.dark ? theme.raised : SKIN.chrome, borderColor: SKIN.chromeDark },
      ]}
    >
      <Icon name={icon} size={18} color={color ?? SKIN.keyInk} />
      {value ? (
        <T size={14} weight="bold" color={color ?? SKIN.keyInk}>
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
  const t = useT();
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={t('hud.locked.a11y', { title, n: chapter })}
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
          {t('hud.locked.chip', { n: chapter })}
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
    <View
      style={[
        styles.info,
        { backgroundColor: SKIN.led, borderColor: '#0E1020', shadowColor: theme.shadow },
        style,
      ]}
    >
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.ledAmber,
    borderWidth: 3,
    borderColor: '#E8A21A',
    zIndex: 1,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: SPACE.m,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  cash: { flexDirection: 'row', alignItems: 'center', gap: -10 },
  cashLed: {
    backgroundColor: SKIN.led,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: SKIN.chrome,
    paddingHorizontal: SPACE.m,
    paddingVertical: 4,
    ...shadow,
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
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    ...shadow,
  },
});
