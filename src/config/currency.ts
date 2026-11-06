/**
 * In-game money in the local currency (SPEC §6.3). Data only.
 *
 * The sim keeps every amount in integer US cents; the UI converts at the edge
 * with these FIXED, rounded GAME rates (not live exchange rates, and never
 * fetched), so a city's prices stay stable and saves never change value.
 *
 * - `perUsd`: local major units per US dollar.
 * - `minorDigits`: decimals shown (0 for yen and won).
 * - `priceStep`: a "nice" local price step for the price steppers, in local
 *   minor units (¥10, ₩100, £0.05...). It must be at least the sim's 5-cent
 *   price grid converted (5 × perUsd × 10^minorDigits / 100), so every press
 *   moves the shown price (checked in src/ui/currency.test.ts).
 * - `symbol`: fallback symbol when Intl can't format the currency.
 */
export interface Currency {
  code: string;
  perUsd: number;
  minorDigits: 0 | 2;
  priceStep: number;
  symbol: string;
}

/** The sim's price grid (src/sim/actions.ts setPrice rounds to 5 cents). */
export const SIM_PRICE_GRID_CENTS = 5;

export const CURRENCIES = {
  USD: { code: 'USD', perUsd: 1, minorDigits: 2, priceStep: 5, symbol: '$' },
  GBP: { code: 'GBP', perUsd: 0.79, minorDigits: 2, priceStep: 5, symbol: '£' },
  EUR: { code: 'EUR', perUsd: 0.92, minorDigits: 2, priceStep: 5, symbol: '€' },
  JPY: { code: 'JPY', perUsd: 150, minorDigits: 0, priceStep: 10, symbol: '¥' },
  KRW: { code: 'KRW', perUsd: 1350, minorDigits: 0, priceStep: 100, symbol: '₩' },
  SGD: { code: 'SGD', perUsd: 1.35, minorDigits: 2, priceStep: 10, symbol: '$' },
  AUD: { code: 'AUD', perUsd: 1.52, minorDigits: 2, priceStep: 10, symbol: '$' },
  CAD: { code: 'CAD', perUsd: 1.37, minorDigits: 2, priceStep: 10, symbol: '$' },
  NZD: { code: 'NZD', perUsd: 1.65, minorDigits: 2, priceStep: 10, symbol: '$' },
  CHF: { code: 'CHF', perUsd: 0.88, minorDigits: 2, priceStep: 5, symbol: 'CHF' },
  CNY: { code: 'CNY', perUsd: 7.2, minorDigits: 2, priceStep: 50, symbol: '¥' },
  HKD: { code: 'HKD', perUsd: 7.8, minorDigits: 2, priceStep: 50, symbol: '$' },
  TWD: { code: 'TWD', perUsd: 32, minorDigits: 0, priceStep: 5, symbol: '$' },
  INR: { code: 'INR', perUsd: 83, minorDigits: 0, priceStep: 5, symbol: '₹' },
  MXN: { code: 'MXN', perUsd: 17, minorDigits: 2, priceStep: 100, symbol: '$' },
  BRL: { code: 'BRL', perUsd: 5, minorDigits: 2, priceStep: 50, symbol: 'R$' },
  SEK: { code: 'SEK', perUsd: 10.5, minorDigits: 2, priceStep: 100, symbol: 'kr' },
  NOK: { code: 'NOK', perUsd: 10.7, minorDigits: 2, priceStep: 100, symbol: 'kr' },
  DKK: { code: 'DKK', perUsd: 6.9, minorDigits: 2, priceStep: 50, symbol: 'kr' },
  PLN: { code: 'PLN', perUsd: 4, minorDigits: 2, priceStep: 50, symbol: 'zł' },
  THB: { code: 'THB', perUsd: 35, minorDigits: 0, priceStep: 5, symbol: '฿' },
} as const satisfies Record<string, Currency>;

export type CurrencyCode = keyof typeof CURRENCIES;

/** What we show where we don't know the local currency. */
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

const EURO_COUNTRIES =
  'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK MC AD SM VA ME XK'.split(' ');

/** ISO 3166 country → currency. Anything missing shows US dollars. */
export const COUNTRY_CURRENCY: Readonly<Record<string, CurrencyCode>> = {
  US: 'USD',
  PR: 'USD',
  GU: 'USD',
  VI: 'USD',
  AS: 'USD',
  MP: 'USD',
  EC: 'USD',
  SV: 'USD',
  PA: 'USD',
  GB: 'GBP',
  IM: 'GBP',
  JE: 'GBP',
  GG: 'GBP',
  ...Object.fromEntries(EURO_COUNTRIES.map((c) => [c, 'EUR' as const])),
  JP: 'JPY',
  KR: 'KRW',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  NZ: 'NZD',
  CH: 'CHF',
  LI: 'CHF',
  CN: 'CNY',
  HK: 'HKD',
  TW: 'TWD',
  IN: 'INR',
  MX: 'MXN',
  BR: 'BRL',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  TH: 'THB',
};
