import { duration, meters, money, pct } from './format';

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
