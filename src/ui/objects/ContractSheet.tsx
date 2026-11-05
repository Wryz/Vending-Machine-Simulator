import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { runOnJS } from 'react-native-worklets';

import { haptic } from '@/services/haptics';

import { useTheme } from '../ThemeProvider';
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
}: {
  venue: string;
  terms: { label: string; value: string }[];
  disclaimer?: string;
  onSign: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [path, setPath] = useState('');
  const [width, setWidth] = useState(1);
  const [signed, setSigned] = useState(false);

  const add = (x: number, y: number, start: boolean) =>
    setPath((p) => `${start ? `${p} M` : `${p} L`}${x.toFixed(1)},${y.toFixed(1)}`);
  const finish = (span: number) => {
    if (span > width * 0.6 && !disabled) {
      setSigned(true);
      haptic.success();
      onSign();
    } else {
      setPath('');
    }
  };

  const pan = Gesture.Pan()
    .enabled(!signed && !disabled)
    .minDistance(0)
    .onBegin((e) => runOnJS(add)(e.x, e.y, true))
    .onUpdate((e) => runOnJS(add)(e.x, e.y, false))
    .onEnd((e) => runOnJS(finish)(Math.abs(e.translationX)));

  return (
    <View style={{ backgroundColor: theme.paper, borderRadius: 4, padding: SPACE.l, gap: SPACE.s }}>
      <Mono size={11} color="#6B6F75">
        LOCATION AGREEMENT
      </Mono>
      <T size={18} weight="bold" color={theme.paperInk}>
        {venue}
      </T>
      {terms.map((t) => (
        <View
          key={t.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderColor: '#E0DDD5',
            paddingVertical: 6,
          }}
        >
          <T size={14} color="#5C6066">
            {t.label}
          </T>
          <Mono size={14} color={theme.paperInk}>
            {t.value}
          </Mono>
        </View>
      ))}
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Signature line. Swipe across to sign."
          accessibilityActions={[{ name: 'activate', label: 'Sign' }]}
          onAccessibilityAction={() => {
            if (!signed && !disabled) {
              setSigned(true);
              onSign();
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
            <T size={13} color="#9A9DA1" style={{ marginBottom: 4 }}>
              {disabled ? 'Not enough cash to sign' : 'Swipe across to sign →'}
            </T>
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
