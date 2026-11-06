import { productGlow, SODIUM, WARM_BOOST } from './warmLighting';

const RED = { r: 0.85, g: 0.12, b: 0.1 };
const dist = (a: typeof RED, b: typeof RED) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

describe('warm lighting pack', () => {
  it('leaves product glow in the product color without the pack', () => {
    expect(productGlow(RED, 0.3, false)).toEqual({ color: RED, intensity: 0.3 });
  });

  it('turns night product glow sodium-warm and a little brighter with the pack', () => {
    const warm = productGlow(RED, 0.3, true);
    expect(dist(warm.color, SODIUM)).toBeLessThan(dist(RED, SODIUM));
    expect(warm.intensity).toBeCloseTo(0.3 * WARM_BOOST);
  });

  it('has no effect by day (no glow)', () => {
    expect(productGlow(RED, 0, true).intensity).toBe(0);
  });
});
