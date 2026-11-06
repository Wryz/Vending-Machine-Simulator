import { duration, meters, money, moneyShort, pct, temperature } from './format';

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
