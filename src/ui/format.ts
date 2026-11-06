import { FAHRENHEIT_COUNTRIES } from '@/config/climate';
import type { Currency } from '@/config/currency';
import { currentLang, t } from '@/i18n';
import { currentCurrency } from '@/store/currency';

import { localPriceMinor, toLocalMinor } from './currency';

/**
 * Money and number formatting. Amounts come in as in-game US cents (the
 * sim's unit) and show in the open city's currency at fixed game rates
 * (src/config/currency.ts), formatted for the UI language (SPEC §6.3).
 */
const MINUS = '\u2212';

const currencyFormats = new Map<string, Intl.NumberFormat | null>();
/** Cached Intl currency formatter (narrow symbol where supported); null if Intl can't. */
function currencyFormat(lang: string, c: Currency, digits: number): Intl.NumberFormat | null {
  const key = `${lang}|${c.code}|${digits}`;
  let f = currencyFormats.get(key);
  if (f !== undefined) return f;
  f = null;
  for (const currencyDisplay of ['narrowSymbol', 'symbol'] as const) {
    try {
      f = new Intl.NumberFormat(lang, {
        style: 'currency',
        currency: c.code,
        currencyDisplay,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      break;
    } catch {
      f = null;
    }
  }
  currencyFormats.set(key, f);
  return f;
}

const numberFormats = new Map<string, Intl.NumberFormat>();
function numberFormat(lang: string, minDigits: number, maxDigits: number): Intl.NumberFormat {
  const key = `${lang}|${minDigits}|${maxDigits}`;
  let f = numberFormats.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(lang, {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits,
      });
    } catch {
      f = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits,
      });
    }
    numberFormats.set(key, f);
  }
  return f;
}

/** A non-negative local major amount ("$1,234.56", "¥150,000", "1 234,56 €"). */
function formatMajor(major: number, c: Currency, digits: number = c.minorDigits): string {
  const lang = currentLang();
  const f = currencyFormat(lang, c, digits);
  return f ? f.format(major) : `${c.symbol}${numberFormat(lang, digits, digits).format(major)}`;
}

const affixes = new Map<string, [string, string]>();
/** Symbol before/after the number in this language ("$" + "", or "" + " €"). */
function currencyAffix(c: Currency): [string, string] {
  const lang = currentLang();
  const key = `${lang}|${c.code}`;
  let a = affixes.get(key);
  if (!a) {
    const one = formatMajor(1, c, 0);
    const i = one.indexOf(numberFormat(lang, 0, 0).format(1));
    a = i >= 0 ? [one.slice(0, i), one.slice(i + 1)] : [c.symbol, ''];
    affixes.set(key, a);
  }
  return a;
}

/** A compact amount: "$1.2k", "¥180k", "₩1.6M", "1,2 k€". */
function compactMajor(mantissa: number, suffix: string, digits: [number, number], c: Currency) {
  const [pre, post] = currencyAffix(c);
  const n = numberFormat(currentLang(), digits[0], digits[1]).format(mantissa);
  return `${pre}${n}${suffix}${post}`;
}

/** Full amount in the local currency; `compact` shortens big ones ("$123k"). */
export function money(
  cents: number,
  opts: { sign?: boolean; compact?: boolean; currency?: Currency } = {},
): string {
  const c = opts.currency ?? currentCurrency();
  const minor = Math.round(toLocalMinor(cents, c));
  const neg = minor < 0;
  const abs = Math.abs(minor) / 10 ** c.minorDigits;
  // No-decimal currencies (¥, ₩) have short numbers until much bigger amounts.
  const compactFrom = c.minorDigits === 0 ? 1_000_000 : 10_000;
  let s: string;
  if (opts.compact && abs >= compactFrom) {
    if (abs >= 1_000_000) {
      const d = abs >= 10_000_000 ? 1 : 2;
      s = compactMajor(abs / 1_000_000, 'M', [d, d], c);
    } else {
      const d = abs >= 100_000 ? 0 : 1;
      s = compactMajor(abs / 1000, 'k', [d, d], c);
    }
  } else {
    s = formatMajor(abs, c);
  }
  const sign = neg ? MINUS : opts.sign ? '+' : '';
  return `${sign}${s}`;
}

/** Glanceable money for HUDs and goals: "$0", "$45", "$1k", "$12.5k", "¥180k", "₩1.6M". */
export function moneyShort(cents: number, currency: Currency = currentCurrency()): string {
  const c = currency;
  const local = toLocalMinor(cents, c) / 10 ** c.minorDigits;
  const neg = local < 0;
  const abs = Math.abs(local);
  let s: string;
  if (abs >= 1_000_000) s = compactMajor(abs / 1_000_000, 'M', [0, 1], c);
  else if (abs >= 1000) s = compactMajor(abs / 1000, 'k', [0, 1], c);
  else s = formatMajor(Math.floor(abs), c, 0);
  return `${neg ? MINUS : ''}${s}`;
}

/**
 * A whole amount without decimals, for goals and flavor text
 * ("Earn $1,000", "Earn ¥150,000", "Earn £790").
 */
export function moneyWhole(cents: number, currency: Currency = currentCurrency()): string {
  const local = toLocalMinor(cents, currency) / 10 ** currency.minorDigits;
  const s = formatMajor(Math.abs(Math.round(local)), currency, 0);
  return local <= -0.5 ? `${MINUS}${s}` : s;
}

/**
 * A product price as shown on coils, steppers and sale pops: rounded to the
 * currency's nice price step ("$1.50", "¥230", "₩2,000", "£1.20").
 */
export function moneyPrice(cents: number, opts: { sign?: boolean } = {}): string {
  const c = currentCurrency();
  const minor = localPriceMinor(cents, c);
  const s = formatMajor(Math.abs(minor) / 10 ** c.minorDigits, c);
  return `${minor < 0 ? MINUS : opts.sign ? '+' : ''}${s}`;
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
