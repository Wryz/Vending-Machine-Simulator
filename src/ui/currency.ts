import {
  COUNTRY_CURRENCY,
  CURRENCIES,
  DEFAULT_CURRENCY,
  SIM_PRICE_GRID_CENTS,
  type Currency,
} from '@/config/currency';

/**
 * Local currency at the UI edge (SPEC §6.3). The sim keeps US cents; these
 * pure helpers convert for display and turn local price steps back into the
 * cents the sim stores. Fixed game rates from src/config/currency.ts.
 */

/** The currency players see in a country (US dollars when unknown). */
export function currencyForCountry(countryCode: string | null | undefined): Currency {
  const code = COUNTRY_CURRENCY[(countryCode ?? '').toUpperCase()] ?? DEFAULT_CURRENCY;
  return CURRENCIES[code];
}

/** US cents → local minor units (yen, won, pence...), unrounded. */
export function toLocalMinor(cents: number, c: Currency): number {
  return (cents * c.perUsd * 10 ** c.minorDigits) / 100;
}

/** A price as shown: local minor units rounded to the currency's nice price step. */
export function localPriceMinor(cents: number, c: Currency): number {
  return Math.round(toLocalMinor(cents, c) / c.priceStep) * c.priceStep;
}

/**
 * The price (US cents, on the sim's 5-cent grid) one stepper press away:
 * the next shown local price up or down, and the grid price closest to it.
 * Each shown price has one such cents value, so ± presses round-trip
 * without drift (¥230 → ¥240 → ¥230). Returns `cents` itself when no lower
 * price exists.
 */
export function stepPriceCents(cents: number, dir: 1 | -1, c: Currency): number {
  const g = SIM_PRICE_GRID_CENTS;
  const base = Math.round(cents / g) * g;
  const shown = localPriceMinor(base, c);
  let target: number | null = null;
  let best: number | null = null;
  let bestDist = Infinity;
  // A step is at least one grid unit, so a few hundred grid moves always reach it.
  for (let k = 1; k <= 400; k++) {
    const next = base + dir * g * k;
    if (next <= 0) break;
    const d = localPriceMinor(next, c);
    if (d === shown) continue;
    if (target === null) target = d;
    if (d !== target) break;
    const dist = Math.abs(toLocalMinor(next, c) - target);
    if (dist < bestDist - 1e-9 || (Math.abs(dist - bestDist) <= 1e-9 && next < (best ?? next))) {
      best = next;
      bestDist = dist;
    }
  }
  return best ?? cents;
}
