import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { useTheme } from '../ThemeProvider';
import { Mono, Row } from '../kit';
import { SPACE } from '../theme';

/** Zig-zag torn edge of thermal paper. */
function Tear({ flip, color }: { flip?: boolean; color: string }) {
  const teeth = 24;
  const w = 100 / teeth;
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) pts.push(`${i * w},${i % 2 === 0 ? 0 : 6}`);
  pts.push('100,6', '0,6');
  return (
    <Svg
      width="100%"
      height={6}
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      style={flip ? { transform: [{ scaleY: -1 }] } : undefined}
    >
      <Polygon points={pts.join(' ')} fill={color} />
    </Svg>
  );
}

export interface ReceiptLine {
  label: string;
  value: string;
  tone?: 'normal' | 'muted' | 'good' | 'bad' | 'bold';
}

/**
 * Thermal receipt (SPEC §3.6): earnings summaries, sale tickers, offline report.
 * Monospace, dashed rules, torn edges. Always printed on paper, even at night.
 */
export function Receipt({
  title,
  subtitle,
  lines,
  total,
  footer,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  lines?: ReceiptLine[];
  total?: ReceiptLine;
  footer?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const ink = theme.paperInk;
  const toneColor = (t?: ReceiptLine['tone']) =>
    t === 'good' ? '#2E7D5B' : t === 'bad' ? '#B5473A' : t === 'muted' ? '#6B6F75' : ink;
  return (
    <View
      style={[
        {
          shadowColor: theme.shadow,
          shadowOpacity: 1,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        },
        style,
      ]}
    >
      <Tear color={theme.paper} flip />
      <View
        style={{
          backgroundColor: theme.paper,
          paddingHorizontal: SPACE.l,
          paddingVertical: SPACE.m,
          gap: 4,
        }}
      >
        <Mono weight="bold" size={15} color={ink} center accessibilityRole="header">
          {title.toUpperCase()}
        </Mono>
        {subtitle ? (
          <Mono size={12} color="#6B6F75" center>
            {subtitle}
          </Mono>
        ) : null}
        <Mono size={12} color="#9A9DA1" center>
          {'- '.repeat(18)}
        </Mono>
        {lines?.map((l, i) => (
          <Row key={`${l.label}-${i}`} style={{ justifyContent: 'space-between' }}>
            <Mono
              size={13}
              color={toneColor(l.tone === 'bold' ? undefined : l.tone)}
              weight={l.tone === 'bold' ? 'bold' : 'regular'}
              style={{ flexShrink: 1 }}
            >
              {l.label}
            </Mono>
            <Mono
              size={13}
              color={toneColor(l.tone)}
              weight={l.tone === 'bold' ? 'bold' : 'regular'}
            >
              {l.value}
            </Mono>
          </Row>
        ))}
        {children}
        {total ? (
          <>
            <Mono size={12} color="#9A9DA1" center>
              {'= '.repeat(18)}
            </Mono>
            <Row style={{ justifyContent: 'space-between' }}>
              <Mono size={15} weight="bold" color={ink}>
                {total.label}
              </Mono>
              <Mono size={15} weight="bold" color={toneColor(total.tone)}>
                {total.value}
              </Mono>
            </Row>
          </>
        ) : null}
        {footer ? (
          <Mono size={11} color="#6B6F75" center style={{ marginTop: SPACE.s }}>
            {footer}
          </Mono>
        ) : null}
      </View>
      <Tear color={theme.paper} />
    </View>
  );
}
