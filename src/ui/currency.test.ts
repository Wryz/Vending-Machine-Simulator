import { FALLBACK_CITIES } from '@/config/cities';
import { CURRENCIES, SIM_PRICE_GRID_CENTS, type Currency } from '@/config/currency';

import { currencyForCountry, localPriceMinor, stepPriceCents, toLocalMinor } from './currency';

const ALL: Currency[] = Object.values(CURRENCIES);

describe('currency config', () => {
  it('maps the fallback cities to their local currency', () => {
    const got = Object.fromEntries(
      FALLBACK_CITIES.map((c) => [c.id, currencyForCountry(c.countryCode).code]),
    );
    expect(got).toEqual({
      'new-york': 'USD',
      'los-angeles': 'USD',
      chicago: 'USD',
      london: 'GBP',
      paris: 'EUR',
      tokyo: 'JPY',
      seoul: 'KRW',
      singapore: 'SGD',
      sydney: 'AUD',
    });
  });

  it('falls back to US dollars', () => {
    expect(currencyForCountry('ZZ').code).toBe('USD');
    expect(currencyForCountry(undefined).code).toBe('USD');
    expect(currencyForCountry('de').code).toBe('EUR');
  });

  it.each(ALL.map((c) => [c.code, c] as const))(
    '%s price step covers the sim 5-cent grid',
    (_code, c) => {
      expect(c.priceStep).toBeGreaterThanOrEqual(toLocalMinor(SIM_PRICE_GRID_CENTS, c));
    },
  );
});

describe('stepPriceCents', () => {
  it('keeps US cents steps of 5', () => {
    expect(stepPriceCents(150, 1, CURRENCIES.USD)).toBe(155);
    expect(stepPriceCents(150, -1, CURRENCIES.USD)).toBe(145);
    expect(stepPriceCents(5, -1, CURRENCIES.USD)).toBe(5);
  });

  it('moves yen prices by ¥10', () => {
    const c = CURRENCIES.JPY;
    expect(localPriceMinor(150, c)).toBe(230);
    const up = stepPriceCents(150, 1, c);
    expect(localPriceMinor(up, c)).toBe(240);
    expect(localPriceMinor(stepPriceCents(up, -1, c), c)).toBe(230);
  });

  it.each(ALL.map((c) => [c.code, c] as const))(
    '%s: every press moves the shown price by one step, and ± round-trips',
    (_code, c) => {
      for (let start = 50; start <= 600; start += SIM_PRICE_GRID_CENTS) {
        const shown = localPriceMinor(start, c);
        const up = stepPriceCents(start, 1, c);
        expect(up % SIM_PRICE_GRID_CENTS).toBe(0);
        expect(localPriceMinor(up, c)).toBe(shown + c.priceStep);
        const down = stepPriceCents(up, -1, c);
        expect(localPriceMinor(down, c)).toBe(shown);
        // Repeated presses never drift: up, down, up lands on the same cents.
        expect(stepPriceCents(down, 1, c)).toBe(up);
        let p = up;
        for (let i = 0; i < 5; i++) p = stepPriceCents(p, 1, c);
        for (let i = 0; i < 5; i++) p = stepPriceCents(p, -1, c);
        expect(p).toBe(up);
      }
    },
  );
});
