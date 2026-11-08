import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { haptic } from '@/services/haptics';

import { useTheme } from './ThemeProvider';
import { FONTS, RADIUS, SPACE, TOUCH } from './theme';

/**
 * The vending machine skin (SPEC §3.6): every screen is part of a machine.
 * Cabinet (glossy colored body), Marquee (the lit sign on top), Glass (the
 * window that products sit behind), Key (keypad buttons that press down),
 * Led (glowing digit displays) and Plate (engraved metal labels).
 */
export interface SkinPalette {
  cabinet: string;
  cabinetLight: string;
  cabinetDark: string;
  cabinetEdge: string;
  /** Text and icons straight on the cabinet body. */
  onCabinet: string;
  /** Quieter text on the cabinet body. */
  onCabinetSoft: string;
  /** Ink on the light orange status band of the tab bar. */
  stripInk: string;
  stripSoft: string;
  /** Warm shadow under the cabinet's floating parts (tab bar, bin lip). */
  cabinetShadow: string;
  chrome: string;
  chromeDark: string;
  glass: string;
  glassTint: string;
  /** The thin bright rim inside the glass frame. */
  glassEdge: string;
  /** Opacity of the glass reflection streaks. */
  glassShine: number;
  marquee: string;
  marqueeGlow: string;
  marqueeInk: string;
  bulb: string;
  led: string;
  ledEdge: string;
  ledOff: string;
  ledGreen: string;
  ledAmber: string;
  ledRed: string;
  keyFace: string;
  keyEdge: string;
  keyInk: string;
  /** Opacity of the shine on top of a key. */
  keyShine: number;
  /** Brand-colored icons on a white key. */
  keyAccent: string;
  brandFace: string;
  brandEdge: string;
  greenFace: string;
  greenEdge: string;
  redFace: string;
  redEdge: string;
  screw: string;
  /** Cream note cards floating over the map (order cards, coach tips). */
  card: string;
  /** Secondary text on `card`. */
  cardMuted: string;
  /** Body text on a marquee-colored face (a selected card). */
  onMarquee: string;
  /** A small dark pill with white text floating over a map. */
  inkPill: string;
  /** A greyed-out row (something not unlocked yet). */
  lockedFace: string;
  /** Quiet icons (a close cross) on a key face or card. */
  iconSoft: string;
  /** Hired drivers' vans (the player's own are the cabinet tangerine). */
  driverVan: string;
  driverVanEdge: string;
}

/** The daytime machine: glossy tangerine, cream marquee, white keys. */
export const SKIN_LIGHT: SkinPalette = {
  cabinet: '#FF6B2C',
  cabinetLight: '#FF9561',
  cabinetDark: '#D9501A',
  cabinetEdge: '#B8410F',
  onCabinet: '#FFFFFF',
  onCabinetSoft: '#FFE3D4',
  stripInk: '#7A2E0B',
  stripSoft: '#9A4418',
  cabinetShadow: '#7A2A08',
  chrome: '#E3E7EE',
  chromeDark: '#AEB6C4',
  glass: '#F4FAFE',
  glassTint: '#DCEEFA',
  glassEdge: '#FFFFFF',
  glassShine: 1,
  marquee: '#FFF7DA',
  marqueeGlow: '#FFE7A0',
  marqueeInk: '#7A2E0B',
  bulb: '#FFD45C',
  led: '#1C1F33',
  ledEdge: '#0E1020',
  ledOff: '#2C3050',
  ledGreen: '#5CFFA0',
  ledAmber: '#FFC94D',
  ledRed: '#FF6A5C',
  keyFace: '#FFFFFF',
  keyEdge: '#C9CEDA',
  keyInk: '#2B2F4A',
  keyShine: 0.18,
  keyAccent: '#FF6B2C',
  brandFace: '#FF6B2C',
  brandEdge: '#B8410F',
  greenFace: '#22C26B',
  greenEdge: '#138449',
  redFace: '#FF5547',
  redEdge: '#C02B20',
  screw: '#C9CFDB',
  card: '#FFF6DE',
  cardMuted: '#4A4F6A',
  iconSoft: '#AEB6C4',
  lockedFace: '#F1EDF5',
  onMarquee: '#2B2F4A',
  inkPill: '#2B2F4A',
  driverVan: '#3D7BE0',
  driverVanEdge: '#2556A8',
};

/**
 * The same machine after dark (players on "System" with a dark phone): a deep
 * burnt-orange cabinet, a dimmed warm marquee, smoky indigo glass and dark
 * keys and plates with light ink. Cozy, not black; LEDs glow the same.
 */
export const SKIN_DARK: SkinPalette = {
  cabinet: '#9A3E17',
  cabinetLight: '#A9471B',
  cabinetDark: '#73300F',
  cabinetEdge: '#55220A',
  onCabinet: '#FFF1E0',
  onCabinetSoft: '#FFD9BF',
  stripInk: '#FFF1E0',
  stripSoft: '#FFE0C8',
  cabinetShadow: '#000000',
  chrome: '#4A4452',
  chromeDark: '#2B2731',
  glass: '#26232F',
  glassTint: '#332F45',
  glassEdge: '#4A4560',
  glassShine: 0.15,
  marquee: '#DDB57A',
  marqueeGlow: '#9C5F22',
  marqueeInk: '#4A1D08',
  bulb: '#E6B04A',
  led: '#1C1F33',
  ledEdge: '#0E1020',
  ledOff: '#2C3050',
  ledGreen: '#5CFFA0',
  ledAmber: '#FFC94D',
  ledRed: '#FF6A5C',
  keyFace: '#4A4356',
  keyEdge: '#2C2733',
  keyInk: '#FFF1E0',
  keyShine: 0.08,
  keyAccent: '#FF9A62',
  brandFace: '#C44C18',
  brandEdge: '#7A2C0C',
  greenFace: '#178046',
  greenEdge: '#0C5430',
  redFace: '#C93A30',
  redEdge: '#83221A',
  screw: '#5E5768',
  card: '#37323F',
  cardMuted: '#D3CAD9',
  iconSoft: '#A79FB3',
  lockedFace: '#38333F',
  onMarquee: '#4A1D08',
  inkPill: '#2C2733',
  driverVan: '#3D7BE0',
  driverVanEdge: '#2556A8',
};

/**
 * The light palette, for places outside React (map paint, plain helpers).
 * Components use `useSkin()` so the machine follows the theme.
 */
export const SKIN = SKIN_LIGHT;

/** The machine's palette for the active theme (dark only on "System" + a dark phone). */
export function useSkin(): SkinPalette {
  return useTheme().dark ? SKIN_DARK : SKIN_LIGHT;
}

/** Glossy cabinet body: a vertical gloss, darker sides and a few screw heads. */
export function Cabinet({
  children,
  color,
  light,
  dark,
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
  const skin = useSkin();
  const body = color ?? skin.cabinet;
  return (
    <View style={[{ backgroundColor: body, overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="cab-v" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light ?? skin.cabinetLight} />
            <Stop offset="0.35" stopColor={body} />
            <Stop offset="1" stopColor={dark ?? skin.cabinetDark} />
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
  const skin = useSkin();
  return (
    <View
      pointerEvents="none"
      style={[styles.screw, { backgroundColor: skin.screw, borderColor: skin.chromeDark }, style]}
    >
      <View style={[styles.screwSlot, { backgroundColor: skin.chromeDark }]} />
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
  const skin = useSkin();
  return (
    <View style={[styles.marqueeFrame, { backgroundColor: skin.cabinetEdge }, style]}>
      <View
        style={[styles.marquee, { backgroundColor: skin.marquee, shadowColor: skin.marqueeGlow }]}
      >
        <Bulbs color={skin.bulb} />
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.marqueeText, { color: skin.marqueeInk }]}
        >
          {title.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.marqueeSub, { color: skin.marqueeInk }]}>
            {subtitle}
          </Text>
        ) : null}
        <Bulbs color={skin.bulb} />
      </View>
    </View>
  );
}

function Bulbs({ color }: { color: string }) {
  return (
    <View style={styles.bulbs} pointerEvents="none">
      {Array.from({ length: 11 }, (_, i) => (
        <View key={i} style={[styles.bulb, { backgroundColor: color, shadowColor: color }]} />
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
  const skin = useSkin();
  return (
    <View
      style={[
        styles.glassFrame,
        { backgroundColor: skin.chrome, borderColor: skin.chromeDark },
        style,
      ]}
    >
      <View
        style={[
          styles.glass,
          { padding, backgroundColor: skin.glass, borderColor: skin.glassEdge },
          fill ? { flex: 1 } : null,
        ]}
      >
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <Defs>
            <LinearGradient id="glass-t" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={skin.glassTint} stopOpacity={0.9} />
              <Stop offset="1" stopColor={skin.glass} stopOpacity={0.4} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#glass-t)" />
          <Path d="M62 0 L78 0 L40 100 L24 100 Z" fill="#FFFFFF" opacity={0.45 * skin.glassShine} />
          <Path d="M82 0 L86 0 L48 100 L44 100 Z" fill="#FFFFFF" opacity={0.5 * skin.glassShine} />
        </Svg>
        {children}
      </View>
    </View>
  );
}

export type KeyTone = 'brand' | 'white' | 'green' | 'red';

function keyColors(tone: KeyTone, skin: SkinPalette): { face: string; edge: string; ink: string } {
  switch (tone) {
    case 'brand':
      return { face: skin.brandFace, edge: skin.brandEdge, ink: '#FFFFFF' };
    case 'green':
      return { face: skin.greenFace, edge: skin.greenEdge, ink: '#FFFFFF' };
    case 'red':
      return { face: skin.redFace, edge: skin.redEdge, ink: '#FFFFFF' };
    default:
      return { face: skin.keyFace, edge: skin.keyEdge, ink: skin.keyInk };
  }
}

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
  const skin = useSkin();
  const c = keyColors(tone, skin);
  const radius = round ? (height + KEY_DEPTH) / 2 : RADIUS.s + 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      disabled={disabled}
      // Small keys (chips) still take a 44 pt tall touch.
      hitSlop={
        height < TOUCH ? { top: (TOUCH - height) / 2, bottom: (TOUCH - height) / 2 } : undefined
      }
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
                {
                  borderTopLeftRadius: radius,
                  borderTopRightRadius: radius,
                  opacity: skin.keyShine,
                },
              ]}
            />
            {children}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** Ink (text and icons) on a key of this tone, for the given palette. */
export function keyInk(tone: KeyTone, skin: SkinPalette): string {
  return keyColors(tone, skin).ink;
}

/** A dark LED display with glowing digits. */
export function Led({
  children,
  color,
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
  const skin = useSkin();
  const ink = color ?? skin.ledGreen;
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={[styles.led, { backgroundColor: skin.led, borderColor: skin.ledEdge }, style]}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          fontFamily: FONTS.monoBold,
          fontSize: size,
          color: ink,
          fontVariant: ['tabular-nums'],
          letterSpacing: 1,
          textShadowColor: ink,
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
  color,
}: {
  value: number;
  segments?: number;
  color?: string;
}) {
  const skin = useSkin();
  const ink = color ?? skin.ledGreen;
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.led, styles.ledBar, { backgroundColor: skin.led, borderColor: skin.ledEdge }]}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < lit
              ? { backgroundColor: ink, shadowColor: ink, shadowOpacity: 0.9, shadowRadius: 4 }
              : { backgroundColor: skin.ledOff },
          ]}
        />
      ))}
    </View>
  );
}

/** An engraved metal label plate (section titles). */
export function Plate({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  const skin = useSkin();
  return (
    <View
      style={[styles.plate, { backgroundColor: skin.chrome, borderColor: skin.chromeDark }, style]}
    >
      <View style={[styles.plateRivet, { backgroundColor: skin.chromeDark }]} />
      <Text accessibilityRole="header" style={[styles.plateText, { color: skin.keyInk }]}>
        {children.toUpperCase()}
      </Text>
      <View style={[styles.plateRivet, { backgroundColor: skin.chromeDark }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screw: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screwSlot: {
    width: 7,
    height: 1.6,
    transform: [{ rotate: '35deg' }],
  },
  marqueeFrame: {
    padding: 4,
    borderRadius: RADIUS.m,
  },
  marquee: {
    borderRadius: RADIUS.m - 3,
    paddingVertical: 4,
    paddingHorizontal: SPACE.m,
    alignItems: 'center',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  marqueeText: {
    fontFamily: FONTS.uiBold,
    fontSize: 22,
    letterSpacing: 3,
    marginVertical: 2,
  },
  marqueeSub: {
    fontFamily: FONTS.uiMedium,
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 2,
  },
  bulbs: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  bulb: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  glassFrame: {
    padding: 5,
    borderRadius: RADIUS.l,
    borderWidth: 1,
  },
  glass: {
    borderRadius: RADIUS.l - 5,
    overflow: 'hidden',
    borderWidth: 1,
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
  },
  led: {
    borderRadius: 10,
    paddingHorizontal: SPACE.m,
    paddingVertical: 4,
    borderWidth: 2,
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
    borderWidth: 1,
  },
  plateRivet: { width: 5, height: 5, borderRadius: 3 },
  plateText: { fontFamily: FONTS.uiBold, fontSize: 13, letterSpacing: 2 },
});
