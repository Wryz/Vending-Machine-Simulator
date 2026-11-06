import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * Rex Brightley, owner of Brightvend (fictional rival, SPEC §4.6): a flat,
 * friendly-smug toy-style portrait in the game's bright flat style (SPEC §3.3).
 * Big glossy quiff, one raised eyebrow, half-lidded eyes, a pencil mustache
 * and a lopsided grin; purple suit with a red tie on Brightvend violet.
 */
export const BRIGHTVEND = {
  violet: '#7B61FF',
  violetDark: '#5B43D6',
  suit: '#3B3470',
  tie: '#FF4F45',
  shirt: '#FFFDF8',
  skin: '#F3B38A',
  skinShade: '#E39E76',
  hair: '#3A2618',
  hairShine: '#6B4A33',
  ink: '#23264A',
  gold: '#FFC83D',
} as const;

export function RivalPortrait({ size = 56 }: { size?: number }) {
  const c = BRIGHTVEND;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id="rex-disc">
          <Circle cx={32} cy={32} r={32} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#rex-disc)">
        <Rect x={0} y={0} width={64} height={64} fill={c.violet} />
        {/* Soft sunburst behind the head. */}
        <Circle cx={32} cy={26} r={22} fill={c.violetDark} opacity={0.35} />
        {/* Suit, shirt and tie. */}
        <Path d="M6 64 C8 50 18 45 32 45 C46 45 56 50 58 64 Z" fill={c.suit} />
        <Path d="M25 45 L32 56 L39 45 Z" fill={c.shirt} />
        <Path d="M30.2 47 L33.8 47 L35 58 L32 61 L29 58 Z" fill={c.tie} />
        <Path d="M30 45 L34 45 L33.6 48 L30.4 48 Z" fill={c.tie} />
        {/* Lapel pin: a little gold star. */}
        <Path
          d="M45 51 l1.1 2.3 2.5 .3 -1.8 1.7 .5 2.5 -2.3 -1.2 -2.3 1.2 .5 -2.5 -1.8 -1.7 2.5 -.3 Z"
          fill={c.gold}
        />
        {/* Neck. */}
        <Rect x={27} y={36} width={10} height={10} rx={4} fill={c.skinShade} />
        {/* Ears and head. */}
        <Circle cx={18.5} cy={28} r={3.6} fill={c.skinShade} />
        <Circle cx={45.5} cy={28} r={3.6} fill={c.skinShade} />
        <Ellipse cx={32} cy={27} rx={13.5} ry={15} fill={c.skin} />
        {/* The quiff: a big glossy swoop. */}
        <Path
          d="M18.5 25 C17 13 25 6.5 34 7.5 C42 8.2 47 13 46 22 C44 17.5 40 15.5 35 16 C29 16.6 24 18 18.5 25 Z"
          fill={c.hair}
        />
        <Path d="M27 10.5 C31 8.8 37 9 40.5 11.5 C36.5 10.8 31.5 11 27 12.8 Z" fill={c.hairShine} />
        {/* Brows: the left one raised (smug), the right one level. */}
        <Path
          d="M22.5 21.5 Q26 18 29.5 20.5"
          stroke={c.hair}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M34.5 22.3 L41.5 22"
          stroke={c.hair}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
        {/* Half-lidded eyes. */}
        <Ellipse cx={26} cy={26} rx={2.3} ry={2.1} fill={c.ink} />
        <Ellipse cx={38} cy={26} rx={2.3} ry={2.1} fill={c.ink} />
        <Rect x={23.2} y={23.3} width={5.6} height={2.5} fill={c.skin} />
        <Rect x={35.2} y={23.3} width={5.6} height={2.5} fill={c.skin} />
        <Circle cx={26.8} cy={26.4} r={0.6} fill={c.shirt} />
        <Circle cx={38.8} cy={26.4} r={0.6} fill={c.shirt} />
        {/* Nose and blush. */}
        <Path
          d="M31 28 Q33.5 31.5 31 32.5"
          stroke={c.skinShade}
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={22.5} cy={31} r={2} fill={c.tie} opacity={0.18} />
        <Circle cx={41.5} cy={31} r={2} fill={c.tie} opacity={0.18} />
        {/* Pencil mustache and a lopsided, toothy grin (up on one side: smug). */}
        <Path
          d="M27.5 33.2 Q32 31.9 36.5 33.2"
          stroke={c.hair}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
        />
        <Path d="M26.5 35.6 Q32 39.6 39 34.2 Q33 36.8 26.5 35.6 Z" fill={c.ink} />
        <Path d="M28.5 36.1 Q32.5 37.6 36.8 35.4 Q33 36.5 28.5 36.1 Z" fill={c.shirt} />
      </G>
    </Svg>
  );
}
