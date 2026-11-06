import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { haptic } from '@/services/haptics';

import { FONTS, RADIUS, SPACE, TOUCH } from './theme';

/**
 * The vending machine skin (SPEC §3.6): every screen is part of a machine.
 * Cabinet (glossy colored body), Marquee (the lit sign on top), Glass (the
 * window that products sit behind), Key (keypad buttons that press down),
 * Led (glowing digit displays) and Plate (engraved metal labels).
 */
export const SKIN = {
  cabinet: '#FF6B2C',
  cabinetLight: '#FF9561',
  cabinetDark: '#D9501A',
  cabinetEdge: '#B8410F',
  chrome: '#E3E7EE',
  chromeDark: '#AEB6C4',
  glass: '#F4FAFE',
  glassTint: '#DCEEFA',
  marquee: '#FFF7DA',
  marqueeGlow: '#FFE7A0',
  marqueeInk: '#7A2E0B',
  bulb: '#FFD45C',
  led: '#1C1F33',
  ledGreen: '#5CFFA0',
  ledAmber: '#FFC94D',
  ledRed: '#FF6A5C',
  keyFace: '#FFFFFF',
  keyEdge: '#C9CEDA',
  keyInk: '#2B2F4A',
  brandFace: '#FF6B2C',
  brandEdge: '#B8410F',
  greenFace: '#22C26B',
  greenEdge: '#138449',
  redFace: '#FF5547',
  redEdge: '#C02B20',
  screw: '#C9CFDB',
} as const;

/** Glossy cabinet body: a vertical gloss, darker sides and a few screw heads. */
export function Cabinet({
  children,
  color = SKIN.cabinet,
  light = SKIN.cabinetLight,
  dark = SKIN.cabinetDark,
  style,
  screws = true,
}: {
  children?: ReactNode;
  color?: string;
  light?: string;
  dark?: string;
  style?: StyleProp<ViewStyle>;
  screws?: boolean;
}) {
  return (
    <View style={[{ backgroundColor: color, overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="cab-v" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.35" stopColor={color} />
            <Stop offset="1" stopColor={dark} />
          </LinearGradient>
          <LinearGradient id="cab-h" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.14} />
            <Stop offset="0.08" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.92" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.14} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#cab-v)" />
        <Rect width="100" height="100" fill="url(#cab-h)" />
      </Svg>
      {screws ? (
        <>
          <Screw style={{ top: 10, left: 10 }} />
          <Screw style={{ top: 10, right: 10 }} />
        </>
      ) : null}
      {children}
    </View>
  );
}

export function Screw({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.screw, style]}>
      <View style={styles.screwSlot} />
    </View>
  );
}

/** The lit sign on top of the machine: warm glow, a row of bulbs, bold spaced letters. */
export function Marquee({
  title,
  subtitle,
  style,
}: {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.marqueeFrame, style]}>
      <View style={styles.marquee}>
        <Bulbs />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.marqueeText}
        >
          {title.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.marqueeSub}>
            {subtitle}
          </Text>
        ) : null}
        <Bulbs />
      </View>
    </View>
  );
}

function Bulbs() {
  return (
    <View style={styles.bulbs} pointerEvents="none">
      {Array.from({ length: 11 }, (_, i) => (
        <View key={i} style={styles.bulb} />
      ))}
    </View>
  );
}

/** A window of glass in a chrome frame, with a diagonal reflection streak. */
export function Glass({
  children,
  style,
  padding = SPACE.l,
  fill,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  /** Stretch the glass to fill its frame (for a scrolling window). */
  fill?: boolean;
}) {
  return (
    <View style={[styles.glassFrame, style]}>
      <View style={[styles.glass, { padding }, fill ? { flex: 1 } : null]}>
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <Defs>
            <LinearGradient id="glass-t" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={SKIN.glassTint} stopOpacity={0.9} />
              <Stop offset="1" stopColor={SKIN.glass} stopOpacity={0.4} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#glass-t)" />
          <Path d="M62 0 L78 0 L40 100 L24 100 Z" fill="#FFFFFF" opacity={0.45} />
          <Path d="M82 0 L86 0 L48 100 L44 100 Z" fill="#FFFFFF" opacity={0.5} />
        </Svg>
        {children}
      </View>
    </View>
  );
}

type KeyTone = 'brand' | 'white' | 'green' | 'red';

const KEY_COLORS: Record<KeyTone, { face: string; edge: string; ink: string }> = {
  brand: { face: SKIN.brandFace, edge: SKIN.brandEdge, ink: '#FFFFFF' },
  white: { face: SKIN.keyFace, edge: SKIN.keyEdge, ink: SKIN.keyInk },
  green: { face: SKIN.greenFace, edge: SKIN.greenEdge, ink: '#FFFFFF' },
  red: { face: SKIN.redFace, edge: SKIN.redEdge, ink: '#FFFFFF' },
};

/** Depth of a keypad key's visible edge (pt); the key travels this far when pressed. */
export const KEY_DEPTH = 5;

/** A chunky keypad key that presses down into the cabinet. */
export function Key({
  onPress,
  tone = 'white',
  disabled,
  children,
  style,
  faceStyle,
  accessibilityLabel,
  accessibilityHint,
  round,
  height = TOUCH + 8,
  accessibilityState,
}: {
  onPress: () => void;
  tone?: KeyTone;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  round?: boolean;
  height?: number;
  accessibilityState?: { selected?: boolean };
}) {
  const c = KEY_COLORS[tone];
  const radius = round ? (height + KEY_DEPTH) / 2 : RADIUS.s + 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      {({ pressed }) => (
        <View
          style={{
            height: height + KEY_DEPTH,
            borderRadius: radius,
            backgroundColor: c.edge,
            paddingTop: pressed ? KEY_DEPTH : 0,
          }}
        >
          <View
            style={[
              styles.keyFace,
              {
                height,
                borderRadius: radius,
                backgroundColor: c.face,
              },
              faceStyle,
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.keyShine,
                { borderTopLeftRadius: radius, borderTopRightRadius: radius },
              ]}
            />
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function keyInk(tone: KeyTone): string {
  return KEY_COLORS[tone].ink;
}

/** A dark LED display with glowing digits. */
export function Led({
  children,
  color = SKIN.ledGreen,
  size = 20,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={[styles.led, style]}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontFamily: FONTS.monoBold,
          fontSize: size,
          color,
          fontVariant: ['tabular-nums'],
          letterSpacing: 1,
          textShadowColor: color,
          textShadowRadius: 8,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** An LED bar made of segments (progress). */
export function LedBar({
  value,
  segments = 16,
  color = SKIN.ledGreen,
}: {
  value: number;
  segments?: number;
  color?: string;
}) {
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.led, styles.ledBar]}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < lit
              ? { backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 4 }
              : { backgroundColor: '#2C3050' },
          ]}
        />
      ))}
    </View>
  );
}

/** An engraved metal label plate (section titles). */
export function Plate({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.plate, style]}>
      <View style={styles.plateRivet} />
      <Text accessibilityRole="header" style={styles.plateText}>
        {children.toUpperCase()}
      </Text>
      <View style={styles.plateRivet} />
    </View>
  );
}

const styles = StyleSheet.create({
  screw: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: SKIN.screw,
    borderWidth: 1,
    borderColor: SKIN.chromeDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screwSlot: {
    width: 7,
    height: 1.6,
    backgroundColor: SKIN.chromeDark,
    transform: [{ rotate: '35deg' }],
  },
  marqueeFrame: {
    padding: 4,
    borderRadius: RADIUS.m,
    backgroundColor: SKIN.cabinetEdge,
  },
  marquee: {
    borderRadius: RADIUS.m - 3,
    backgroundColor: SKIN.marquee,
    paddingVertical: 4,
    paddingHorizontal: SPACE.m,
    alignItems: 'center',
    shadowColor: SKIN.marqueeGlow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  marqueeText: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    letterSpacing: 3,
    color: SKIN.marqueeInk,
    marginVertical: 2,
  },
  marqueeSub: {
    fontFamily: FONTS.uiMedium,
    fontSize: 12,
    color: SKIN.marqueeInk,
    opacity: 0.75,
    marginBottom: 2,
  },
  bulbs: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  bulb: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SKIN.bulb,
    shadowColor: SKIN.bulb,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  glassFrame: {
    padding: 5,
    borderRadius: RADIUS.l,
    backgroundColor: SKIN.chrome,
    borderWidth: 1,
    borderColor: SKIN.chromeDark,
  },
  glass: {
    borderRadius: RADIUS.l - 5,
    backgroundColor: SKIN.glass,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  keyFace: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.s,
    paddingHorizontal: SPACE.l,
    overflow: 'hidden',
  },
  keyShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: '#FFFFFF',
    opacity: 0.18,
  },
  led: {
    backgroundColor: SKIN.led,
    borderRadius: 10,
    paddingHorizontal: SPACE.m,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#0E1020',
  },
  ledBar: { flexDirection: 'row', gap: 3, paddingVertical: 6, paddingHorizontal: 6 },
  segment: { flex: 1, height: 10, borderRadius: 2 },
  plate: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACE.m,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: SKIN.chrome,
    borderWidth: 1,
    borderColor: SKIN.chromeDark,
  },
  plateRivet: { width: 5, height: 5, borderRadius: 3, backgroundColor: SKIN.chromeDark },
  plateText: { fontFamily: FONTS.uiBold, fontSize: 13, letterSpacing: 2, color: SKIN.keyInk },
});
