import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/services/haptics';

import { useTheme } from './ThemeProvider';
import { FONTS, RADIUS, SPACE, TOUCH } from './theme';

/**
 * Base UI primitives (SPEC §3.6): bright, soft and rounded. Pill buttons,
 * borderless cards with soft shadows, short copy. Dynamic Type allowed
 * (fonts scale; capped so layouts hold).
 */

type TProps = TextProps & {
  size?: number;
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
};

export function T({ size = 15, weight = 'regular', color, muted, center, style, ...rest }: TProps) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        {
          fontFamily:
            weight === 'bold' ? FONTS.uiBold : weight === 'medium' ? FONTS.uiMedium : FONTS.ui,
          fontSize: size,
          lineHeight: Math.round(size * 1.35),
          color: color ?? (muted ? theme.muted : theme.ink),
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}

/** Receipts, prices and numbers: JetBrains Mono with tabular figures. */
export function Mono({
  size = 14,
  weight = 'regular',
  color,
  muted,
  center,
  style,
  ...rest
}: TProps) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.5}
      {...rest}
      style={[
        {
          fontFamily: weight === 'bold' ? FONTS.monoBold : FONTS.mono,
          fontSize: size,
          lineHeight: Math.round(size * 1.4),
          fontVariant: ['tabular-nums'],
          color: color ?? (muted ? theme.muted : theme.ink),
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}

type ButtonKind = 'primary' | 'secondary' | 'quiet' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  icon,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const bg =
    kind === 'primary'
      ? theme.brand
      : kind === 'danger'
        ? theme.alert
        : kind === 'secondary'
          ? theme.raised
          : 'transparent';
  const fg = kind === 'primary' ? theme.onBrand : kind === 'danger' ? '#FFFFFF' : theme.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          shadowColor: theme.shadow,
          shadowOpacity: kind === 'quiet' || pressed ? 0 : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon}
      {!busy && (
        <T weight="bold" color={fg} size={15}>
          {label}
        </T>
      )}
    </Pressable>
  );
}

/** A soft rounded card with a gentle shadow. */
export function Paper({
  children,
  style,
  tone = 'paper',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'paper' | 'surface';
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.paper,
        {
          backgroundColor: tone === 'paper' ? theme.paper : theme.surface,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = SPACE.s,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
  );
}

export function Spacer({ h = SPACE.m }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Divider({ dashed }: { dashed?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 0,
        borderTopWidth: dashed ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: theme.line,
        borderStyle: dashed ? 'dashed' : 'solid',
        marginVertical: SPACE.s,
      }}
    />
  );
}

export function Chip({
  label,
  color,
  onPress,
  active,
}: {
  label: string;
  color?: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.brand : theme.dark ? theme.raised : theme.brandSoft },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <T size={13} weight="bold" color={active ? theme.onBrand : theme.ink}>
        {label}
      </T>
    </Pressable>
  );
}

export function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height: 8, backgroundColor: theme.line, borderRadius: 4, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: '100%',
          borderRadius: 4,
          backgroundColor: color ?? theme.brand,
        }}
      />
    </View>
  );
}

/** Full-screen scrolling page with a calm header and back button. */
export function Screen({
  title,
  subtitle,
  children,
  right,
  scroll = true,
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  scroll?: boolean;
  onBack?: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + SPACE.s }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/map')))}
          style={({ pressed }) => [
            styles.back,
            {
              backgroundColor: theme.raised,
              shadowColor: theme.shadow,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <T size={24} weight="bold" style={{ marginTop: -2 }}>
            {'‹'}
          </T>
        </Pressable>
        <View style={{ flex: 1 }}>
          <T size={24} weight="bold" accessibilityRole="header">
            {title}
          </T>
          {subtitle ? (
            <T size={13} muted>
              {subtitle}
            </T>
          ) : null}
        </View>
        {right}
      </View>
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={
          scroll
            ? { padding: SPACE.l, paddingBottom: insets.bottom + SPACE.xxl, gap: SPACE.l }
            : undefined
        }
      >
        {children}
      </Body>
    </View>
  );
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={{ gap: SPACE.s }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={17} weight="bold">
          {title}
        </T>
        {right}
      </Row>
      {children}
    </View>
  );
}

export function ListRow({
  title,
  detail,
  right,
  onPress,
  left,
}: {
  title: string;
  detail?: string;
  right?: ReactNode;
  onPress?: () => void;
  left?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.listRow,
        { backgroundColor: theme.surface, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <T weight="medium">{title}</T>
        {detail ? (
          <T size={13} muted>
            {detail}
          </T>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Toast({
  text,
  tone = 'info',
}: {
  text: string;
  tone?: 'info' | 'error' | 'success';
}) {
  const theme = useTheme();
  const color = tone === 'error' ? theme.alert : tone === 'success' ? theme.signal : theme.ink;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: theme.hud, shadowColor: theme.shadow }]}
    >
      <T size={14} color={color}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH + 8,
    paddingHorizontal: SPACE.xl,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.s,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  paper: {
    borderRadius: RADIUS.l,
    padding: SPACE.l,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 1,
    elevation: 3,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: SPACE.m + 2,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    paddingHorizontal: SPACE.l,
    paddingBottom: SPACE.s,
  },
  back: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  listRow: {
    minHeight: TOUCH + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    paddingVertical: SPACE.s,
    paddingHorizontal: SPACE.l,
    borderRadius: RADIUS.m,
    marginBottom: SPACE.s,
  },
  toast: {
    paddingHorizontal: SPACE.l,
    paddingVertical: SPACE.m,
    borderRadius: RADIUS.pill,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 1,
  },
});
