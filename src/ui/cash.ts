import { CASH, GENERIC_CASH, type CashDenomination } from '@/config/cash';
import type { Currency, CurrencyCode } from '@/config/currency';

import { toLocalMinor } from './currency';

export interface CashPile {
  denom: CashDenomination;
  count: number;
}

/** The note and coin set for a currency. */
export function cashSet(c: Currency): readonly CashDenomination[] {
  const set = CASH[c.code as CurrencyCode] ?? GENERIC_CASH;
  // Zero-decimal currencies whose generic set assumes cents: scale up.
  if (!CASH[c.code as CurrencyCode] && c.minorDigits === 0)
    return GENERIC_CASH.map((d) => ({ ...d, value: Math.max(1, d.value / 100) }));
  return set;
}

/**
 * Split a cash-box amount (US cents) into the local currency's notes and
 * coins, largest first (greedy works for all these sets). Amounts smaller
 * than the smallest piece are dropped (rounding in the tray picture only).
 */
export function cashPiles(cents: number, c: Currency): CashPile[] {
  let left = Math.max(0, Math.round(toLocalMinor(cents, c)));
  const out: CashPile[] = [];
  for (const denom of cashSet(c)) {
    const n = Math.floor(left / denom.value);
    if (n > 0) {
      out.push({ denom, count: n });
      left -= n * denom.value;
    }
  }
  return out;
}

/**
 * Pieces to draw in the tray, notes first: at most `max`, keeping at least one
 * of every denomination present (the rest is shown as a ×N count).
 */
export function trayPieces(
  piles: readonly CashPile[],
  max: number,
): { denom: CashDenomination; drawn: number; total: number }[] {
  const out = piles.map((p) => ({ denom: p.denom, drawn: Math.min(1, p.count), total: p.count }));
  let budget = max - out.reduce((a, p) => a + p.drawn, 0);
  // Round-robin extra pieces so big piles get a little stack.
  let added = true;
  while (budget > 0 && added) {
    added = false;
    for (const p of out) {
      if (budget > 0 && p.drawn < p.total && p.drawn < 4) {
        p.drawn++;
        budget--;
        added = true;
      }
    }
  }
  return out;
}

/** Face value printed on a note or coin, e.g. "$20", "25¢", "¥1000", "50p". */
export function denomLabel(value: number, c: Currency): string {
  if (c.minorDigits === 0) return `${c.symbol}${value}`;
  if (value >= 100) return `${c.symbol}${value / 100}`;
  const cents: Partial<Record<string, string>> = {
    USD: '¢',
    GBP: 'p',
    EUR: 'c',
    AUD: 'c',
    SGD: 'c',
  };
  return `${value}${cents[c.code] ?? 'c'}`;
}
