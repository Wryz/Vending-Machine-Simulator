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
import { FONTS, SPACE, TOUCH } from './theme';

/**
 * Base UI primitives. Calm and plain (SPEC §3.2): short copy, no shouting,
 * Dynamic Type allowed (fonts scale; capped so layouts hold).
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
      ? theme.ink
      : kind === 'danger'
        ? theme.alert
        : kind === 'secondary'
          ? theme.raised
          : 'transparent';
  const fg = kind === 'primary' ? theme.bg : kind === 'danger' ? '#FFFFFF' : theme.ink;
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
          borderColor: kind === 'secondary' ? theme.line : 'transparent',
          opacity: disabled ? 0.45 : 1,
          transform: [{ translateY: pressed ? 1 : 0 }, { scale: pressed ? 0.98 : 1 }],
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

/** A sheet of paper: slight grain via layered borders and a soft shadow. */
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
          borderColor: theme.dark && tone === 'surface' ? theme.line : 'rgba(27,31,35,0.06)',
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
        borderTopWidth: 1,
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
        {
          borderColor: active ? theme.ink : theme.line,
          backgroundColor: active ? theme.ink : 'transparent',
        },
      ]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <T size={13} weight="medium" color={active ? theme.bg : theme.ink}>
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
      style={{ height: 6, backgroundColor: theme.line, borderRadius: 3, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`,
          height: '100%',
          backgroundColor: color ?? theme.signal,
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
      <View style={[styles.header, { paddingTop: insets.top + SPACE.s, borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/map')))}
          style={styles.back}
        >
          <T size={22}>{'‹'}</T>
        </Pressable>
        <View style={{ flex: 1 }}>
          <T size={18} weight="bold" accessibilityRole="header">
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
        <T size={12} weight="bold" muted style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
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
        { borderColor: theme.line, opacity: pressed ? 0.7 : 1 },
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
      style={[styles.toast, { backgroundColor: theme.hud, borderColor: color }]}
    >
      <T size={14} color={color}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH + 4,
    paddingHorizontal: SPACE.l,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.s,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  paper: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.l,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 3,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: SPACE.m,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
    paddingHorizontal: SPACE.m,
    paddingBottom: SPACE.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  listRow: {
    minHeight: TOUCH + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    paddingVertical: SPACE.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toast: {
    paddingHorizontal: SPACE.l,
    paddingVertical: SPACE.m,
    borderRadius: 10,
    borderWidth: 1,
  },
});
