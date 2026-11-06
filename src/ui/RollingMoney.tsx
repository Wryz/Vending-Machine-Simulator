import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from './ThemeProvider';
import { money } from './format';
import { Mono } from './kit';

/**
 * Cash readout that counts toward the new value (ease-out, ~0.6 s) and
 * gives a soft colour flash: green when money comes in, amber when it goes
 * out. Calm, no bounce (SPEC §3.2).
 */
export function RollingMoney({ cents, size = 18 }: { cents: number; size?: number }) {
  const theme = useTheme();
  const [shown, setShown] = useState(cents);
  const from = useRef(cents);
  const raf = useRef<number | null>(null);
  const flash = useSharedValue(0);
  const [tone, setTone] = useState<'up' | 'down'>('up');

  useEffect(() => {
    const start = from.current;
    const delta = cents - start;
    if (delta === 0) return;
    setTone(delta > 0 ? 'up' : 'down');
    flash.value = withSequence(
      withTiming(0.2, { duration: 120 }),
      withTiming(0, { duration: 700 }),
    );
    const t0 = Date.now();
    const dur = Math.min(900, 350 + Math.log10(Math.abs(delta) + 1) * 90);
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - (1 - t) ** 3;
      const v = Math.round(start + delta * e);
      setShown(v);
      from.current = v;
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [cents, flash]);

  const glow = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View accessibilityLabel={`Cash ${money(cents)}`} accessible>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -6,
            right: -6,
            top: -2,
            bottom: -2,
            borderRadius: 6,
            backgroundColor: tone === 'up' ? theme.signal : theme.amber,
          },
          glow,
        ]}
      />
      <Mono size={size} weight="bold">
        {money(shown)}
      </Mono>
    </View>
  );
}
