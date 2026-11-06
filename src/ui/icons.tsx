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
  | 'chevron'
  | 'sun'
  | 'moon'
  | 'twilight'
  | 'cloud'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog'
  | 'percent'
  | 'clock'
  | 'smile'
  | 'eyeOff'
  | 'box'
  | 'play'
  | 'tag'
  | 'bolt'
  | 'wrench'
  | 'lock'
  | 'bag'
  | 'rotate'
  | 'brush'
  | 'handshake'
  | 'people'
  | 'plus'
  | 'minus'
  | 'close'
  | 'back'
  | 'star'
  | 'grid'
  | 'map'
  | 'cube'
  | 'pin'
  | 'trend';

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
      case 'pin':
        return (
          <>
            <Path d="M12 21.5s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0c0 5-6.5 11.2-6.5 11.2z" {...s} />
            <Circle cx={12} cy={10.3} r={2.4} {...s} />
          </>
        );
      case 'trend':
        return <Path d="M3.5 17l6-6 4 4 7-7.5M15 7.5h5.5V13" {...s} />;
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
      case 'sun':
        return (
          <>
            <Circle cx={12} cy={12} r={4.2} {...s} fill={c} />
            <Path
              d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"
              {...s}
            />
          </>
        );
      case 'moon':
        return <Path d="M19.5 14.6A8 8 0 019.4 4.5a8 8 0 1010.1 10.1z" {...s} fill={c} />;
      case 'twilight':
        return (
          <>
            <Path d="M7.5 16a4.5 4.5 0 019 0" {...s} fill={c} />
            <Path
              d="M3 19.5h18M12 6v2.4M5.6 9.6l1.6 1.6M18.4 9.6l-1.6 1.6M2.8 16h1.8M19.4 16h1.8"
              {...s}
            />
          </>
        );
      case 'cloud':
        return (
          <Path
            d="M7 18.5h10.2a3.8 3.8 0 00.5-7.6 5.6 5.6 0 00-10.8 1.4A3.1 3.1 0 007 18.5z"
            {...s}
            fill={c}
          />
        );
      case 'rain':
        return (
          <>
            <Path
              d="M7 14.5h10.2a3.6 3.6 0 00.5-7.2 5.4 5.4 0 00-10.4 1.3A3 3 0 007 14.5z"
              {...s}
            />
            <Path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" {...s} />
          </>
        );
      case 'snow':
        return (
          <>
            <Path
              d="M7 14.5h10.2a3.6 3.6 0 00.5-7.2 5.4 5.4 0 00-10.4 1.3A3 3 0 007 14.5z"
              {...s}
            />
            <Circle cx={8.5} cy={18.5} r={1} fill={c} />
            <Circle cx={12.5} cy={19.5} r={1} fill={c} />
            <Circle cx={16.5} cy={18.5} r={1} fill={c} />
          </>
        );
      case 'storm':
        return (
          <>
            <Path
              d="M7 14.5h10.2a3.6 3.6 0 00.5-7.2 5.4 5.4 0 00-10.4 1.3A3 3 0 007 14.5z"
              {...s}
            />
            <Path d="M12.5 15l-2 3.5h3l-2 3.5" {...s} />
          </>
        );
      case 'fog':
        return <Path d="M4 9h14M6 13h14M4 17h12" {...s} />;
      case 'percent':
        return (
          <>
            <Path d="M18 6L6 18" {...s} />
            <Circle cx={7.5} cy={7.5} r={2.5} {...s} />
            <Circle cx={16.5} cy={16.5} r={2.5} {...s} />
          </>
        );
      case 'clock':
        return (
          <>
            <Circle cx={12} cy={12} r={8.5} {...s} />
            <Path d="M12 7.5V12l3 2" {...s} />
          </>
        );
      case 'smile':
        return (
          <>
            <Circle cx={12} cy={12} r={8.5} {...s} />
            <Path d="M8.5 14c.9 1.4 2.1 2 3.5 2s2.6-.6 3.5-2" {...s} />
            <Circle cx={9} cy={10} r={1} {...s} fill={c} />
            <Circle cx={15} cy={10} r={1} {...s} fill={c} />
          </>
        );
      case 'eyeOff':
        return (
          <>
            <Path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6z" {...s} />
            <Circle cx={12} cy={12} r={2.6} {...s} />
            <Path d="M4 4l16 16" {...s} />
          </>
        );
      case 'box':
        return (
          <>
            <Path d="M4 8l8-4 8 4v8l-8 4-8-4z" {...s} />
            <Path d="M4 8l8 4 8-4M12 12v8" {...s} />
          </>
        );
      case 'play':
        return (
          <>
            <Rect x={3.5} y={5} width={17} height={14} rx={4} {...s} />
            <Path d="M10.5 9.5v5l4-2.5z" {...s} fill={c} />
          </>
        );
      case 'tag':
        return (
          <>
            <Path d="M3.5 12.5V4.5h8l9 9-8 8z" {...s} />
            <Circle cx={8} cy={9} r={1.4} {...s} fill={c} />
          </>
        );
      case 'bolt':
        return <Path d="M13 3L5 13.5h6l-1 7.5 8-10.5h-6z" {...s} />;
      case 'wrench':
        return (
          <Path
            d="M14.7 6.3a4 4 0 00-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 005.2-5.2l-2.5 2.5-2.6-.4-.4-2.6z"
            {...s}
          />
        );
      case 'lock':
        return (
          <>
            <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...s} />
            <Path d="M8 10.5V8a4 4 0 018 0v2.5" {...s} />
          </>
        );
      case 'bag':
        return (
          <>
            <Path d="M6 7h12l1 13H5z" {...s} />
            <Path d="M9 9.5V6a3 3 0 016 0v3.5" {...s} />
          </>
        );
      case 'rotate':
        return (
          <>
            <Path d="M19.5 12a7.5 7.5 0 11-2.2-5.3" {...s} />
            <Path d="M19.5 4.5v4h-4" {...s} />
          </>
        );
      case 'brush':
        return (
          <>
            <Path d="M19.5 4.5l-8.8 8.8" {...s} />
            <Path
              d="M10.7 13.3c-2.2-.6-4.4.9-4.4 3.3 0 1.2-.8 2.3-2.3 2.9 3.5 1.4 8.4.6 8.4-3.4"
              {...s}
            />
          </>
        );
      case 'handshake':
        return (
          <>
            <Path d="M2.5 11l4-4 3 1 3-2 3.5 2 3.5-1 2 4" {...s} />
            <Path d="M6.5 13l3 3a1.5 1.5 0 002.1 0l4.9-4.9M9 15.5l-1.5 1.5M11.5 17.5l-1 1" {...s} />
          </>
        );
      case 'people':
        return (
          <>
            <Circle cx={9} cy={8.5} r={3} {...s} />
            <Path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" {...s} />
            <Circle cx={17} cy={9.5} r={2.2} {...s} />
            <Path d="M16.5 14.4c2.2.2 3.6 1.7 4 4" {...s} />
          </>
        );
      case 'plus':
        return <Path d="M12 5v14M5 12h14" {...s} />;
      case 'minus':
        return <Path d="M5 12h14" {...s} />;
      case 'close':
        return <Path d="M6 6l12 12M18 6L6 18" {...s} />;
      case 'back':
        return <Path d="M15 5l-7 7 7 7" {...s} />;
      case 'star':
        return (
          <Path
            d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"
            {...s}
          />
        );
      case 'grid':
        return (
          <>
            <Rect x={4} y={4} width={7} height={7} rx={1.8} {...s} />
            <Rect x={13} y={4} width={7} height={7} rx={1.8} {...s} />
            <Rect x={4} y={13} width={7} height={7} rx={1.8} {...s} />
            <Rect x={13} y={13} width={7} height={7} rx={1.8} {...s} />
          </>
        );
      case 'chevron':
        return <Path d="M9 5l7 7-7 7" {...s} />;
      case 'map':
        return (
          <>
            <Path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z" {...s} />
            <Path d="M9 4v13.5M15 6.5V20" {...s} />
          </>
        );
      case 'cube':
        return (
          <>
            <Path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" {...s} />
            <Path d="M4 7.5l8 4.5 8-4.5M12 12v9" {...s} />
          </>
        );
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {shape}
    </Svg>
  );
}
