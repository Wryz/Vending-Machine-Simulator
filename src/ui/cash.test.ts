import { CURRENCIES } from '@/config/currency';

import { cashPiles, trayPieces } from './cash';

const sum = (piles: ReturnType<typeof cashPiles>) =>
  piles.reduce((a, p) => a + p.denom.value * p.count, 0);

describe('cash box notes and coins', () => {
  it('splits dollars into bills and coins', () => {
    const p = cashPiles(3741, CURRENCIES.USD); // $37.41
    expect(p.map((x) => [x.denom.value, x.count])).toEqual([
      [2000, 1],
      [1000, 1],
      [500, 1],
      [100, 2],
      [25, 1],
      [10, 1],
      [5, 1],
      [1, 1],
    ]);
    expect(sum(p)).toBe(3741);
  });

  it('uses yen notes and coins (whole yen)', () => {
    const p = cashPiles(10_000, CURRENCIES.JPY); // $100 → ¥15,000
    expect(p.map((x) => [x.denom.value, x.denom.kind, x.count])).toEqual([
      [10000, 'note', 1],
      [5000, 'note', 1],
    ]);
  });

  it('uses won and pounds too', () => {
    expect(sum(cashPiles(1000, CURRENCIES.KRW))).toBe(13_500);
    expect(cashPiles(1000, CURRENCIES.GBP)[0].denom.value).toBe(500); // £7.90 → a £5 note first
  });

  it('draws a bounded number of pieces, one of each denomination at least', () => {
    const piles = cashPiles(1_234_567, CURRENCIES.USD);
    const drawn = trayPieces(piles, 16);
    expect(drawn.reduce((a, p) => a + p.drawn, 0)).toBeLessThanOrEqual(16);
    for (const p of drawn) expect(p.drawn).toBeGreaterThanOrEqual(1);
  });

  it('an empty box has no cash', () => {
    expect(cashPiles(0, CURRENCIES.EUR)).toEqual([]);
  });
});
