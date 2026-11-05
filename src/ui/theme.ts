import { FAMILY_ACCENT } from '@/config/machines';

/** Color tokens (SPEC §3.7). Night variants derive from the same tokens. */
export const TOKENS = {
  ink: '#1B1F23',
  paper: '#F3F1EC',
  concrete: '#C9C6BF',
  asphalt: '#5C6066',
  signal: '#2E7D5B',
  amber: '#D9932B',
  alert: '#B5473A',
} as const;

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  paper: string;
  paperInk: string;
  signal: string;
  amber: string;
  alert: string;
  hud: string;
  shadow: string;
  family: typeof FAMILY_ACCENT;
}

export const LIGHT: Theme = {
  dark: false,
  bg: TOKENS.paper,
  surface: '#FBFAF7',
  raised: '#FFFFFF',
  ink: TOKENS.ink,
  muted: TOKENS.asphalt,
  line: TOKENS.concrete,
  paper: '#FBF9F4',
  paperInk: TOKENS.ink,
  signal: TOKENS.signal,
  amber: TOKENS.amber,
  alert: TOKENS.alert,
  hud: 'rgba(243,241,236,0.94)',
  shadow: 'rgba(27,31,35,0.18)',
  family: FAMILY_ACCENT,
};

export const DARK: Theme = {
  dark: true,
  bg: TOKENS.ink,
  surface: '#23282E',
  raised: '#2B3138',
  ink: '#ECE9E2',
  muted: '#A7ACB3',
  line: '#3A3F46',
  paper: '#E9E5DB',
  paperInk: TOKENS.ink,
  signal: '#4FA77E',
  amber: '#E3A645',
  alert: '#D0675A',
  hud: 'rgba(27,31,35,0.92)',
  shadow: 'rgba(0,0,0,0.45)',
  family: FAMILY_ACCENT,
};

export const FONTS = {
  ui: 'InstrumentSans_400Regular',
  uiMedium: 'InstrumentSans_500Medium',
  uiBold: 'InstrumentSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_600SemiBold',
} as const;

export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
/** Minimum touch target (SPEC §3.6). */
export const TOUCH = 44;
