import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { runOnJS } from 'react-native-worklets';

import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';

import { useTheme } from '../ThemeProvider';
import { Icon } from '../icons';
import { Mono, T } from '../kit';
import { SPACE } from '../theme';

/**
 * Contract sheet (SPEC §3.6, §4.5): the terms, and a signature line you swipe
 * across to sign. Signing calls `onSign` once the stroke spans most of the line.
 */
export function ContractSheet({
  venue,
  terms,
  disclaimer,
  onSign,
  disabled,
  showHow,
}: {
  venue: string;
  terms: { label: string; value: string }[];
  disclaimer?: string;
  /** Returns false when signing failed (the line clears so the player can sign again). */
  onSign: () => boolean | void;
  disabled?: boolean;
  /** Tutorial: a finger slides along the line to show how to sign. */
  showHow?: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const [path, setPath] = useState('');
  const [width, setWidth] = useState(1);
  const [signed, setSigned] = useState(false);

  const add = (x: number, y: number, start: boolean) =>
    setPath((p) => `${start ? `${p} M` : `${p} L`}${x.toFixed(1)},${y.toFixed(1)}`);
  const finish = (span: number) => {
    if (span > width * 0.6 && !disabled) {
      setSigned(true);
      haptic.success();
      if (onSign() === false) {
        setSigned(false);
        setPath('');
      }
    } else {
      setPath('');
    }
  };

  // The "how to sign" finger: slides left to right along the line, again and again.
  const reduced = useReducedMotion();
  const slide = useSharedValue(0);
  const showFinger = !!showHow && !path && !signed && !disabled;
  useEffect(() => {
    if (!showFinger || reduced) {
      cancelAnimation(slide);
      slide.value = 0;
      return;
    }
    slide.value = withRepeat(
      withDelay(400, withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );
    return () => cancelAnimation(slide);
  }, [showFinger, reduced, slide]);
  const finger = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * Math.max(0, width * 0.75) }],
    opacity: slide.value < 0.9 ? 1 : (1 - slide.value) * 10,
  }));

  const pan = Gesture.Pan()
    .enabled(!signed && !disabled)
    .minDistance(0)
    .onBegin((e) => runOnJS(add)(e.x, e.y, true))
    .onUpdate((e) => runOnJS(add)(e.x, e.y, false))
    .onEnd((e) => runOnJS(finish)(Math.abs(e.translationX)));

  return (
    <View style={{ backgroundColor: theme.paper, borderRadius: 4, padding: SPACE.l, gap: SPACE.s }}>
      <Mono size={11} color="#6B6F75">
        {t('objects.contract.header')}
      </Mono>
      <T size={18} weight="bold" color={theme.paperInk}>
        {venue}
      </T>
      {terms.map((term) => (
        <View
          key={term.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: '#E0DDD5',
            paddingVertical: 6,
          }}
        >
          <T size={14} color="#5C6066">
            {term.label}
          </T>
          <Mono size={14} color={theme.paperInk}>
            {term.value}
          </Mono>
        </View>
      ))}
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('objects.contract.a11y.line')}
          accessibilityActions={[{ name: 'activate', label: t('objects.contract.a11y.sign') }]}
          onAccessibilityAction={() => {
            if (!signed && !disabled) {
              setSigned(true);
              if (onSign() === false) setSigned(false);
            }
          }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{
            height: 72,
            marginTop: SPACE.m,
            borderBottomWidth: 1.5,
            borderColor: theme.paperInk,
            justifyContent: 'flex-end',
          }}
        >
          <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
            <Path
              d={path}
              stroke="#1F3F78"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          {!path ? (
            <T size={showHow ? 15 : 13} color="#9A9DA1" style={{ marginBottom: 4 }}>
              {disabled ? t('objects.contract.noCash') : t('objects.contract.swipe')}
            </T>
          ) : null}
          {showFinger ? (
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', left: 4, bottom: -14 }, finger]}
            >
              <Icon name="tap" size={34} color="#FF8A2C" />
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>
      {disclaimer ? (
        <T size={11} color="#6B6F75">
          {disclaimer}
        </T>
      ) : null}
    </View>
  );
}
