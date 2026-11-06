import { CURRENCIES, type CurrencyCode } from '@/config/currency';
import { useLocale } from '@/i18n';
import { useCurrency } from '@/store/currency';

import {
  duration,
  meters,
  money,
  moneyPrice,
  moneyShort,
  moneyWhole,
  pct,
  temperature,
} from './format';

describe('temperature', () => {
  it('follows the city in auto mode', () => {
    expect(temperature(20, 'US')).toBe('68°F');
    expect(temperature(20, 'PR', 'auto')).toBe('68°F');
    expect(temperature(20, 'GB', 'auto')).toBe('20°C');
    expect(temperature(-3.4, 'JP')).toBe('-3°C');
  });

  it('can be forced to °C or °F', () => {
    expect(temperature(20, 'US', 'c')).toBe('20°C');
    expect(temperature(20, 'GB', 'f')).toBe('68°F');
  });
});

describe('format', () => {
  it('formats money', () => {
    expect(money(123456)).toBe('$1,234.56');
    expect(money(-500)).toBe('−$5.00');
    expect(money(500, { sign: true })).toBe('+$5.00');
    expect(money(12_345_600, { compact: true })).toBe('$123k');
    expect(money(250_000_000, { compact: true })).toBe('$2.50M');
  });
  it('formats other units', () => {
    expect(pct(0.155, 1)).toBe('15.5%');
    expect(meters(40)).toBe('40 m');
    expect(meters(2500)).toBe('2.5 km');
    expect(duration(90 * 60_000)).toBe('1 h 30 min');
    expect(duration(3 * 86_400_000)).toBe('3 d 0 h');
  });
});

describe('moneyShort', () => {
  it('keeps HUD numbers short', () => {
    expect(moneyShort(0)).toBe('$0');
    expect(moneyShort(4599)).toBe('$45');
    expect(moneyShort(100_000)).toBe('$1k');
    expect(moneyShort(1_250_000)).toBe('$12.5k');
    expect(moneyShort(120_000_000)).toBe('$1.2M');
    expect(moneyShort(-50_000)).toBe('−$500');
  });
});

describe('money in local currencies', () => {
  const at = (code: CurrencyCode) => () => useCurrency.setState({ currency: CURRENCIES[code] });
  afterEach(() => {
    useCurrency.setState({ currency: CURRENCIES.USD });
    useLocale.setState({ lang: 'en' });
  });

  it('yen: no decimals, rounded at ¥150 per dollar', () => {
    at('JPY')();
    expect(money(150)).toBe('¥225');
    expect(money(123456)).toBe('¥185,184');
    expect(money(-500)).toBe('−¥750');
    expect(money(500, { sign: true })).toBe('+¥750');
    expect(money(12_345_600, { compact: true })).toBe('¥18.5M');
    expect(money(120_000, { compact: true })).toBe('¥180,000');
    expect(money(1_200_000, { compact: true })).toBe('¥1.80M');
    expect(moneyShort(120_000)).toBe('¥180k');
    expect(moneyShort(12_000_000)).toBe('¥18M');
    expect(moneyShort(300)).toBe('¥450');
    expect(moneyWhole(100_000)).toBe('¥150,000');
  });

  it('won: no decimals, compact millions', () => {
    at('KRW')();
    expect(money(150)).toBe('₩2,025');
    expect(moneyShort(120_000)).toBe('₩1.6M');
    expect(moneyShort(-50_000)).toBe('−₩675k');
    expect(moneyWhole(100_000)).toBe('₩1,350,000');
  });

  it('pounds and euros keep two decimals', () => {
    at('GBP')();
    expect(money(123456)).toBe('£975.30');
    expect(moneyShort(1_250_000)).toBe('£9.9k');
    expect(moneyWhole(100_000)).toBe('£790');
    at('EUR')();
    expect(money(150)).toBe('€1.38');
    expect(money(12_345_600, { compact: true })).toBe('€114k');
    useLocale.setState({ lang: 'fr' });
    expect(money(150).replace(/\s/g, ' ')).toBe('1,38 €');
    expect(moneyShort(1_250_000).replace(/\s/g, ' ')).toBe('11,5k €');
  });

  it('prices round to the local step', () => {
    at('JPY')();
    expect(moneyPrice(150)).toBe('¥230');
    expect(moneyPrice(155)).toBe('¥230');
    at('KRW')();
    expect(moneyPrice(150)).toBe('₩2,000');
    at('USD')();
    expect(moneyPrice(155)).toBe('$1.55');
  });

  it('takes an explicit currency (onboarding preview)', () => {
    expect(moneyWhole(25_000, CURRENCIES.JPY)).toBe('¥37,500');
  });
});
