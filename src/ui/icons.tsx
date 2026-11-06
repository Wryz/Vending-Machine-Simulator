import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from './ThemeProvider';

/**
 * HUD and sheet icons: one consistent family, 24-unit grid, rounded 2.2 strokes.
 * Place categories keep their own glyphs (objects/small.tsx).
 */
export type IconName =
  | 'gear'
  | 'tilt'
  | 'topdown'
  | 'flame'
  | 'locate'
  | 'keys'
  | 'route'
  | 'orders'
  | 'company'
  | 'shop'
  | 'coin'
  | 'globe'
  | 'chevron';

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const theme = useTheme();
  const c = color ?? theme.ink;
  const s = {
    stroke: c,
    strokeWidth: 2.2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const shape = (() => {
    switch (name) {
      case 'gear':
        return (
          <>
            <Path
              d="M18.00 12.00L20.80 12.00M16.24 16.24L18.22 18.22M12.00 18.00L12.00 20.80M7.76 16.24L5.78 18.22M6.00 12.00L3.20 12.00M7.76 7.76L5.78 5.78M12.00 6.00L12.00 3.20M16.24 7.76L18.22 5.78"
              {...s}
              strokeWidth={3.4}
            />
            <Circle cx={12} cy={12} r={6} {...s} />
            <Circle cx={12} cy={12} r={2.4} {...s} />
          </>
        );
      case 'tilt':
        return (
          <>
            <Path d="M4 16l8 4 8-4-8-4z" {...s} />
            <Path d="M7 12V7l5-3 5 3v5" {...s} />
          </>
        );
      case 'topdown':
        return (
          <>
            <Rect x={4} y={4} width={16} height={16} rx={3} {...s} />
            <Path d="M4 12h16M12 4v16" {...s} />
          </>
        );
      case 'flame':
        return (
          <Path
            d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.6-5.4 3.9-8.4.7 1.6 1.4 2.5 2.6 3.2.3-2.6 1.4-4.6 3.1-6.2.3 3.3 3.4 5.6 3.4 10.4 0 4.1-2.6 7.1-6.5 7.1z"
            {...s}
          />
        );
      case 'locate':
        return (
          <>
            <Circle cx={12} cy={12} r={6.5} {...s} />
            <Circle cx={12} cy={12} r={2} fill={c} />
            <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" {...s} />
          </>
        );
      case 'keys':
        return (
          <>
            <Circle cx={8} cy={8} r={4.2} {...s} />
            <Path d="M11 11l9 9M16 16l2.5-2.5M18.5 18.5l2-2" {...s} />
          </>
        );
      case 'route':
        return (
          <>
            <Circle cx={6} cy={18} r={2.4} {...s} />
            <Circle cx={18} cy={6} r={2.4} {...s} />
            <Path d="M8.4 18H15a3 3 0 000-6H9a3 3 0 010-6h6.6" {...s} />
          </>
        );
      case 'orders':
        return (
          <>
            <Rect x={5} y={4} width={14} height={17} rx={2.5} {...s} />
            <Path d="M9 9h6M9 13h6M9 17h3" {...s} />
          </>
        );
      case 'company':
        return (
          <>
            <Rect x={4} y={9} width={16} height={11} rx={2} {...s} />
            <Path d="M9 9V6a3 3 0 016 0v3M4 14h16" {...s} />
          </>
        );
      case 'shop':
        return (
          <>
            <Path d="M5 8h14l-1.2 11.2a2 2 0 01-2 1.8H8.2a2 2 0 01-2-1.8z" {...s} />
            <Path d="M9 10V7a3 3 0 016 0v3" {...s} />
          </>
        );
      case 'coin':
        return (
          <>
            <Circle cx={12} cy={12} r={8.5} {...s} />
            <Path
              d="M12 7.5v9M14.6 9.4c-.5-.8-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 1.9 0 2.6 5.4 1.4 5.4 4.1 0 1.1-1.2 1.9-2.8 1.9-1.2 0-2.2-.5-2.7-1.3"
              {...s}
            />
          </>
        );
      case 'globe':
        return (
          <>
            <Circle cx={12} cy={12} r={8.5} {...s} />
            <Path
              d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"
              {...s}
            />
          </>
        );
      case 'chevron':
        return <Path d="M9 5l7 7-7 7" {...s} />;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {shape}
    </Svg>
  );
}
