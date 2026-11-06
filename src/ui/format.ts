import { FAHRENHEIT_COUNTRIES } from '@/config/climate';
import { t } from '@/i18n';

/** Money and number formatting. In-game dollars only (SPEC §6.3). */
const MINUS = '−';

export function money(cents: number, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const neg = cents < 0;
  const abs = Math.abs(cents) / 100;
  let s: string;
  if (opts.compact && abs >= 10_000) {
    s =
      abs >= 1_000_000
        ? `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`
        : `${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  } else {
    s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const sign = neg ? MINUS : opts.sign ? '+' : '';
  return `${sign}$${s}`;
}

/** Glanceable money for HUDs and goals: "$0", "$45", "$1k", "$12.5k", "$1.2M". */
export function moneyShort(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents) / 100;
  const trim = (x: number) => x.toFixed(1).replace(/\.0$/, '');
  const s =
    abs >= 1_000_000
      ? `${trim(abs / 1_000_000)}M`
      : abs >= 1000
        ? `${trim(abs / 1000)}k`
        : `${Math.floor(abs)}`;
  return `${neg ? MINUS : ''}$${s}`;
}

export function pct(x: number, digits = 0): string {
  return `${(x * 100).toFixed(digits)}%`;
}

export function meters(m: number): string {
  return m < 1000
    ? t('format.meters', { n: Math.round(m) })
    : t('format.km', { n: (m / 1000).toFixed(1) });
}

export function duration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return t('format.min', { n: min });
  const h = Math.floor(min / 60);
  if (h < 48) return t('format.hoursMin', { h, m: min % 60 });
  return t('format.daysHours', { d: Math.floor(h / 24), h: h % 24 });
}

export function clock(t: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(t));
}

/** Temperature unit setting: 'auto' follows the city's country. */
export type TempUnit = 'auto' | 'c' | 'f';

/** °F where people read °F (or when forced), °C elsewhere. */
export function temperature(tempC: number, countryCode: string, unit: TempUnit = 'auto'): string {
  const f =
    unit === 'f' || (unit === 'auto' && FAHRENHEIT_COUNTRIES.includes(countryCode.toUpperCase()));
  return f ? `${Math.round((tempC * 9) / 5 + 32)}°F` : `${Math.round(tempC)}°C`;
}
