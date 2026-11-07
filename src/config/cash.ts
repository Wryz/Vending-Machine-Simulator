import type { CurrencyCode } from './currency';

/**
 * Banknotes and coins per currency, for the cash box (coin tray) picture.
 * Data only. Values are in the currency's minor units (cents, pence; yen and
 * won are whole). Colors are our own flat tints, loosely evoking each note's
 * family; no real banknote artwork.
 */
export interface CashDenomination {
  value: number;
  kind: 'note' | 'coin';
  color: string;
}

const note = (value: number, color: string): CashDenomination => ({ value, kind: 'note', color });
const coin = (value: number, color: string): CashDenomination => ({ value, kind: 'coin', color });

const GOLD = '#D9B44A';
const SILVER = '#C3C8CE';
const COPPER = '#C9784A';

export const CASH: Partial<Record<CurrencyCode, readonly CashDenomination[]>> = {
  USD: [
    note(2000, '#9CC79A'), note(1000, '#A9CDA3'), note(500, '#B7D3AE'), note(100, '#C3D8B9'),
    coin(25, SILVER), coin(10, SILVER), coin(5, SILVER), coin(1, COPPER),
  ],
  GBP: [
    note(2000, '#C9A2D6'), note(1000, '#E3A86A'), note(500, '#8FCBC4'),
    coin(200, GOLD), coin(100, GOLD), coin(50, SILVER), coin(20, SILVER), coin(10, SILVER), coin(5, SILVER), coin(1, COPPER),
  ],
  EUR: [
    note(2000, '#8FB3E3'), note(1000, '#E39A8F'), note(500, '#B7BDC4'),
    coin(200, GOLD), coin(100, GOLD), coin(50, GOLD), coin(20, GOLD), coin(10, GOLD), coin(5, COPPER), coin(1, COPPER),
  ],
  JPY: [
    note(10000, '#C9B48F'), note(5000, '#B8A6CF'), note(1000, '#8FB6CF'),
    coin(500, GOLD), coin(100, SILVER), coin(50, SILVER), coin(10, COPPER), coin(1, SILVER),
  ],
  KRW: [
    note(50000, '#E3C77A'), note(10000, '#9CC79A'), note(5000, '#E3A88F'), note(1000, '#8FB3E3'),
    coin(500, SILVER), coin(100, SILVER), coin(50, SILVER), coin(10, COPPER),
  ],
  SGD: [
    note(1000, '#E39A8F'), note(500, '#A9CDA3'), note(200, '#B8A6CF'),
    coin(100, GOLD), coin(50, GOLD), coin(20, GOLD), coin(10, GOLD), coin(5, GOLD),
  ],
  AUD: [
    note(2000, '#E39A8F'), note(1000, '#8FB3E3'), note(500, '#E3A8C8'),
    coin(200, GOLD), coin(100, GOLD), coin(50, SILVER), coin(20, SILVER), coin(10, SILVER), coin(5, SILVER),
  ],
}; // prettier-ignore

/** Generic set for currencies without their own list (e.g. 100 = 1.00). */
export const GENERIC_CASH: readonly CashDenomination[] = [
  note(2000, '#9CC79A'), note(1000, '#A9CDA3'), note(500, '#B7D3AE'),
  coin(200, GOLD), coin(100, GOLD), coin(50, SILVER), coin(10, SILVER), coin(1, COPPER),
]; // prettier-ignore

/** Most pieces the tray draws; larger hauls are summarized per denomination. */
export const CASH_TRAY_MAX_PIECES = 16;
