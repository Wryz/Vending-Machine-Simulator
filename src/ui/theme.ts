import { FAMILY_ACCENT } from '@/config/machines';

/**
 * Color tokens (SPEC §3.7): bright, sunny, flat. Night variants are a cozy
 * indigo, never charcoal, so the city stays readable and warm after dark.
 */
export const TOKENS = {
  ink: '#23264A',
  paper: '#FFF8EE',
  cream: '#FFF1DC',
  sky: '#8FD3F7',
  brand: '#FF6B2C',
  signal: '#1FB36B',
  amber: '#FFB020',
  alert: '#FF4F45',
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
  /** Primary actions and highlights. */
  brand: string;
  /** Text and icons on `brand`. */
  onBrand: string;
  /** Soft tint of `brand` for selected chips and badges. */
  brandSoft: string;
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
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  ink: TOKENS.ink,
  muted: '#6E7191',
  line: '#EFE6D8',
  paper: '#FFFDF8',
  paperInk: TOKENS.ink,
  brand: TOKENS.brand,
  onBrand: '#FFFFFF',
  brandSoft: '#FFE3D4',
  signal: TOKENS.signal,
  amber: TOKENS.amber,
  alert: TOKENS.alert,
  hud: 'rgba(255,255,255,0.96)',
  shadow: 'rgba(35,38,74,0.16)',
  family: FAMILY_ACCENT,
};

export const DARK: Theme = {
  dark: true,
  bg: '#1E2250',
  surface: '#2A2F66',
  raised: '#343A78',
  ink: '#F3F1FF',
  muted: '#B4B8E6',
  line: '#3C4284',
  paper: '#FFF8EE',
  paperInk: TOKENS.ink,
  brand: '#FF8A4C',
  onBrand: '#FFFFFF',
  brandSoft: '#4A3D6E',
  signal: '#3CD68A',
  amber: '#FFC247',
  alert: '#FF7066',
  hud: 'rgba(42,47,102,0.96)',
  shadow: 'rgba(8,10,40,0.45)',
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
/** Corner radii: everything is soft. `pill` for buttons and chips. */
export const RADIUS = { s: 12, m: 18, l: 24, pill: 999 } as const;
/** Minimum touch target (SPEC §3.6). */
export const TOUCH = 44;
