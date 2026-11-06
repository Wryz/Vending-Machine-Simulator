import { FAMILY_ACCENT } from '@/config/machines';

/**
 * Color tokens (SPEC §3.7): bright, sunny, flat. The UI stays bright at all
 * hours; DARK is only for players who choose "System" with a dark phone.
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
  bg: '#2B2733',
  surface: '#37323F',
  raised: '#433D4C',
  ink: '#FFF6EC',
  muted: '#C9BFCF',
  line: '#4C4555',
  paper: '#FFF8EE',
  paperInk: TOKENS.ink,
  brand: '#FF8A4C',
  onBrand: '#FFFFFF',
  brandSoft: '#5A4450',
  signal: '#3CD68A',
  amber: '#FFC247',
  alert: '#FF7066',
  hud: 'rgba(55,50,63,0.96)',
  shadow: 'rgba(0,0,0,0.4)',
  family: FAMILY_ACCENT,
};

/** Nunito everywhere (rounded and friendly); numbers use its tabular figures. */
export const FONTS = {
  ui: 'Nunito_600SemiBold',
  uiMedium: 'Nunito_700Bold',
  uiBold: 'Nunito_800ExtraBold',
  mono: 'Nunito_700Bold',
  monoBold: 'Nunito_800ExtraBold',
} as const;

export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
/** Corner radii: everything is soft. `pill` for buttons and chips. */
export const RADIUS = { s: 12, m: 18, l: 24, pill: 999 } as const;
/** Minimum touch target (SPEC §3.6). */
export const TOUCH = 44;
