import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

import type { PlaceCategory } from '@/data/types';
import { useT } from '@/i18n';

import { useTheme } from '../ThemeProvider';
import { Mono, T } from '../kit';
import { SPACE } from '../theme';

/** Permit card (SPEC §3.6): licenses such as the liquor permit. */
export function PermitCard({
  title,
  holder,
  valid,
  detail,
}: {
  title: string;
  holder: string;
  valid: boolean;
  detail: string;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View
      style={{
        backgroundColor: valid ? '#E8EFE9' : theme.paper,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: valid ? '#2E7D5B' : '#C9C6BF',
        padding: SPACE.l,
        gap: 4,
      }}
    >
      <Mono size={11} color="#5C6066">
        {t('objects.permit.office')}
      </Mono>
      <T weight="bold" size={16} color={theme.paperInk}>
        {title}
      </T>
      <T size={13} color="#5C6066">
        {holder}
      </T>
      <Mono size={12} color={valid ? '#2E7D5B' : '#B5473A'}>
        {valid ? t('objects.permit.valid') : t('objects.permit.notHeld')}
      </Mono>
      <T size={12} color="#5C6066">
        {detail}
      </T>
    </View>
  );
}

/** Spec tag (SPEC §3.6): machine stats printed on a tag hanging from the machine. */
export function SpecTag({
  title,
  rows,
  children,
}: {
  title: string;
  rows: [string, string][];
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 2, height: 14, backgroundColor: '#A9ADB1' }} />
      <View
        style={{
          backgroundColor: theme.paper,
          borderRadius: 6,
          padding: SPACE.m,
          width: '100%',
          gap: 2,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 6,
            alignSelf: 'center',
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: '#A9ADB1',
          }}
        />
        <T weight="bold" size={14} color={theme.paperInk} center style={{ marginTop: 10 }}>
          {title}
        </T>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Mono size={12} color="#5C6066">
              {k}
            </Mono>
            <Mono size={12} color={theme.paperInk}>
              {v}
            </Mono>
          </View>
        ))}
        {children}
      </View>
    </View>
  );
}

/** Hourly sparkline (bars) for the Spot Card. */
export function Sparkline({
  values,
  highlight,
  height = 48,
}: {
  values: number[];
  highlight?: number;
  height?: number;
}) {
  const theme = useTheme();
  const t = useT();
  const max = Math.max(1e-6, ...values);
  const w = 100 / values.length;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      accessibilityLabel={t('objects.sparkline.a11y')}
    >
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * (height - 2));
        return (
          <Rect
            key={i}
            x={i * w + 0.3}
            y={height - h}
            width={w - 0.6}
            height={h}
            fill={i === highlight ? theme.amber : theme.muted}
            opacity={i === highlight ? 1 : 0.55}
          />
        );
      })}
    </Svg>
  );
}

/** Small, consistent low-poly-style category glyphs (SPEC §3.5). Never default POI icons. */
export function Glyph({
  category,
  size = 22,
  color,
}: {
  category: PlaceCategory | 'residential' | 'street' | 'event';
  size?: number;
  color?: string;
}) {
  const theme = useTheme();
  const c = color ?? theme.ink;
  const s = { stroke: c, strokeWidth: 1.6, fill: 'none', strokeLinejoin: 'round' as const };
  const shape = (() => {
    switch (category) {
      case 'school':
        return (
          <>
            <Polygon points="3,10 12,4 21,10" {...s} />
            <Rect x={5} y={10} width={14} height={9} {...s} />
            <Rect x={10} y={14} width={4} height={5} {...s} />
          </>
        );
      case 'university':
        return (
          <>
            <Polygon points="2,9 12,4 22,9 12,14" {...s} />
            <Path d="M6 11 v5 q6 3 12 0 v-5" {...s} />
          </>
        );
      case 'gym':
        return (
          <>
            <Rect x={3} y={9} width={3} height={6} {...s} />
            <Rect x={18} y={9} width={3} height={6} {...s} />
            <Path d="M6 12 h12" {...s} />
          </>
        );
      case 'office':
        return (
          <>
            <Rect x={6} y={3} width={12} height={18} {...s} />
            <Path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" {...s} />
          </>
        );
      case 'hospital':
      case 'clinic':
        return (
          <>
            <Rect x={4} y={4} width={16} height={16} rx={2} {...s} />
            <Path d="M12 8v8M8 12h8" {...s} />
          </>
        );
      case 'station':
      case 'airport':
        return (
          <>
            <Rect x={6} y={3} width={12} height={14} rx={3} {...s} />
            <Path d="M8 21l2-4M16 21l-2-4M6 11h12" {...s} />
          </>
        );
      case 'stadium':
        return (
          <>
            <Path d="M3 9 q9 -6 18 0 v6 q-9 6 -18 0 z" {...s} />
            <Path d="M3 9 q9 6 18 0" {...s} />
          </>
        );
      case 'park':
        return (
          <>
            <Polygon points="12,3 19,15 5,15" {...s} />
            <Path d="M12 15v6" {...s} />
          </>
        );
      case 'beach':
        return (
          <>
            <Path d="M4 18 q8 -4 16 0" {...s} />
            <Path d="M12 18 V8 M12 8 q-6 -2 -8 2 M12 8 q6 -2 8 2" {...s} />
          </>
        );
      case 'nightlife':
        return (
          <>
            <Polygon points="5,4 19,4 12,12" {...s} />
            <Path d="M12 12v7M8 20h8" {...s} />
          </>
        );
      case 'cafe':
        return (
          <>
            <Path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" {...s} />
            <Path d="M16 11h2a2 2 0 0 1 0 4h-2" {...s} />
          </>
        );
      case 'fastfood':
        // A burger.
        return (
          <>
            <Path d="M4 11a8 6 0 0 1 16 0z" {...s} />
            <Path d="M4 14h16M5 17h14a1 1 0 0 1-1 2H6a1 1 0 0 1-1-2z" {...s} />
          </>
        );
      case 'restaurant':
        return (
          <>
            <Path d="M8 3v18M5 3v5a3 3 0 0 0 6 0V3M16 3c-2 2-2 7 0 9v9" {...s} />
          </>
        );
      case 'shopping':
        return (
          <>
            <Path d="M5 8h14l-1 12H6z" {...s} />
            <Path d="M9 8a3 3 0 0 1 6 0" {...s} />
          </>
        );
      case 'hotel':
        return (
          <>
            <Path d="M3 18V8M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6" {...s} />
            <Circle cx={7} cy={11} r={2} {...s} />
          </>
        );
      case 'convention':
        return (
          <>
            <Rect x={3} y={6} width={18} height={12} {...s} />
            <Path d="M3 10h18M8 6v12M16 6v12" {...s} />
          </>
        );
      case 'religious':
        return (
          <>
            <Polygon points="12,3 18,9 18,20 6,20 6,9" {...s} />
            <Path d="M12 12v4" {...s} />
          </>
        );
      case 'competitor':
        return (
          <>
            <Rect x={4} y={7} width={16} height={12} {...s} />
            <Path d="M4 11h16M10 19v-4h4v4" {...s} />
          </>
        );
      case 'event':
        return (
          <>
            <Polygon points="12,3 14.5,9 21,9 16,13 18,20 12,16 6,20 8,13 3,9 9.5,9" {...s} />
          </>
        );
      case 'street':
        return (
          <>
            <Path d="M7 21L10 3M17 21L14 3M12 6v2M12 11v2M12 16v2" {...s} />
          </>
        );
      default:
        return (
          <>
            <Polygon points="4,11 12,4 20,11" {...s} />
            <Rect x={6} y={11} width={12} height={9} {...s} />
          </>
        );
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shape}
    </Svg>
  );
}
