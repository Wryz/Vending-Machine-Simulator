import { FAMILY_ACCENT, type MachineFamily } from '@/config/machines';
import { MACHINE_PIN } from '@/config/map';

import {
  crossfadeOpacity,
  crossfadeRange,
  PIN_STATUSES,
  pinImageName,
  pinSizeAt,
  pinSizeExpression,
} from './machinePins';

describe('machine pins', () => {
  it('names one pin per family and status, plus the rival pin', () => {
    expect(pinImageName('snacks', null)).toBe('pin-snacks');
    expect(pinImageName('hotFood', 'alert')).toBe('pin-hotFood-alert');
    expect(pinImageName('rival', 'amber')).toBe('pin-rival');
    const names = new Set<string>();
    for (const f of Object.keys(FAMILY_ACCENT) as MachineFamily[]) {
      names.add(pinImageName(f, null));
      for (const s of PIN_STATUSES) names.add(pinImageName(f, s));
    }
    names.add(pinImageName('rival', null));
    expect(names.size).toBe(Object.keys(FAMILY_ACCENT).length * 4 + 1);
  });

  it('crossfades pins into sprites, ending at the street-life zoom', () => {
    expect(crossfadeRange(17, 0.5)).toEqual([16.5, 17]);
    expect(crossfadeOpacity(16, 1, 0, 0.5)).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      15.5,
      1,
      16,
      0,
    ]);
  });

  it('sizes pins by zoom, smaller for rivals', () => {
    const [z0, s0] = MACHINE_PIN.sizeByZoom[0];
    const expr = pinSizeExpression([[z0, s0]], 0.5);
    expect(expr.slice(0, 4)).toEqual(['interpolate', ['linear'], ['zoom'], z0]);
    expect(expr[4]).toEqual(['*', s0, ['case', ['to-boolean', ['get', 'mine']], 1, 0.5]]);
  });

  it('interpolates pin size between stops and clamps outside them', () => {
    const stops = [
      [12, 0.8],
      [16, 1.2],
    ] as const;
    expect(pinSizeAt(10, stops)).toBe(0.8);
    expect(pinSizeAt(14, stops)).toBeCloseTo(1);
    expect(pinSizeAt(20, stops)).toBe(1.2);
    // Pins grow with zoom in the shipped config.
    expect(pinSizeAt(17)).toBeGreaterThan(pinSizeAt(12));
  });
});
