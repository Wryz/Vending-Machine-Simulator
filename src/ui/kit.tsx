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

import { Icon } from './icons';
import { Cabinet, Glass, Key, keyInk, LedBar, Marquee, Plate, SKIN } from './skin';
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

/** Prices and numbers: Nunito with tabular figures, so digits don't jitter as they count. */
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
  hideLabel,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  /** Icon-only button: `label` is still read by VoiceOver. */
  hideLabel?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  if (kind === 'quiet') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        disabled={disabled || busy}
        onPress={() => {
          haptic.select();
          onPress();
        }}
        style={({ pressed }) => [
          styles.quiet,
          { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 },
          style,
        ]}
      >
        {icon}
        {!hideLabel ? (
          <T weight="bold" size={15}>
            {label}
          </T>
        ) : null}
      </Pressable>
    );
  }
  const tone = kind === 'primary' ? 'brand' : kind === 'danger' ? 'red' : 'white';
  const fg = keyInk(tone);
  return (
    <Key
      tone={tone}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={style}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon}
      {!busy && !hideLabel ? (
        <T weight="bold" color={fg} size={16}>
          {label}
        </T>
      ) : null}
    </Key>
  );
}

/** A shelf card inside the glass: white face with a chrome lip underneath. */
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
          backgroundColor: theme.dark ? theme.surface : tone === 'paper' ? '#FFFDF7' : '#FFFFFF',
          borderBottomColor: SKIN.chromeDark,
          borderColor: SKIN.chrome,
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
  const body = (
    <>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <T size={13} weight="bold" color={keyInk(active ? 'brand' : 'white')}>
        {label}
      </T>
    </>
  );
  if (!onPress)
    return (
      <View accessibilityRole="text" style={[styles.chipStatic, { backgroundColor: SKIN.chrome }]}>
        {body}
      </View>
    );
  return (
    <Key
      tone={active ? 'brand' : 'white'}
      onPress={onPress}
      height={34}
      accessibilityLabel={label}
      faceStyle={{ paddingHorizontal: SPACE.m, gap: 6 }}
    >
      {body}
    </Key>
  );
}

export function StatusDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  // Money and done states glow green, everything else amber.
  const led =
    !color || color === theme.signal
      ? SKIN.ledGreen
      : color === theme.alert
        ? SKIN.ledRed
        : SKIN.ledAmber;
  return <LedBar value={value} color={led} />;
}

/** Full-screen scrolling page with a calm header and back button. */
export function Screen({
  title,
  subtitle,
  children,
  right,
  scroll = true,
  onBack,
  back = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  scroll?: boolean;
  onBack?: () => void;
  /** Show the back key (default true). */
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <Cabinet style={{ flex: 1 }} screws={false}>
      {/* Top of the machine: back key and the lit marquee sign. */}
      <View style={[styles.header, { paddingTop: insets.top + SPACE.xs }]}>
        {back ? (
          <Key
            round
            height={TOUCH - 2}
            onPress={
              onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/map')))
            }
            accessibilityLabel="Back"
            faceStyle={{ paddingHorizontal: 0, width: TOUCH - 2 }}
          >
            <Icon name="back" size={22} color={SKIN.keyInk} />
          </Key>
        ) : null}
        <Marquee title={title} subtitle={subtitle} style={{ flex: 1 }} />
        {right}
      </View>
      {/* The window: everything sits behind the glass. */}
      <Glass style={styles.window} padding={0} fill>
        <Body
          style={{ flex: 1 }}
          contentContainerStyle={
            scroll ? { padding: SPACE.l, paddingBottom: SPACE.xxl, gap: SPACE.l } : undefined
          }
        >
          {children}
        </Body>
      </Glass>
      {/* Kick plate with the pickup bin. */}
      <View style={[styles.kick, { paddingBottom: insets.bottom + SPACE.s }]}>
        <View style={styles.bin} />
      </View>
    </Cabinet>
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
        <Plate>{title}</Plate>
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
  quiet: {
    minHeight: TOUCH,
    paddingHorizontal: SPACE.l,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.s,
  },
  chipStatic: {
    minHeight: 30,
    paddingHorizontal: SPACE.m,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  window: { flex: 1, marginHorizontal: SPACE.m, marginTop: SPACE.s },
  kick: { alignItems: 'center', paddingTop: SPACE.s },
  bin: {
    width: '46%',
    height: 14,
    borderRadius: 7,
    backgroundColor: SKIN.cabinetEdge,
    borderTopWidth: 3,
    borderTopColor: '#7A2A08',
  },
  paper: {
    borderRadius: RADIUS.m,
    padding: SPACE.l,
    borderWidth: 1,
    borderBottomWidth: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.08,
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
