/**
 * Warm lighting pack (shop cosmetic): after dusk, the product glow behind the
 * glass leans toward sodium amber and is a little brighter. Pure, no three.js,
 * so it is unit-tested; machineFx applies it to the slot materials.
 */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Sodium amber (#FFB25E) in linear-ish 0..1 channels, as three.js Color stores sRGB hex. */
export const SODIUM: Rgb = { r: 1, g: 0xb2 / 255, b: 0x5e / 255 };
/** How far the product color moves toward sodium amber. */
export const SODIUM_MIX = 0.6;
/** Glow intensity multiplier with the pack. */
export const WARM_BOOST = 1.15;
/** Spill light color with and without the pack. */
export const SPILL_LIGHT = { plain: '#FFE9C7', warm: '#FFC07A' } as const;

/** The emissive color and intensity for a product glowing at `glow` intensity. */
export function productGlow(
  color: Rgb,
  glow: number,
  warm: boolean,
): { color: Rgb; intensity: number } {
  if (!warm) return { color, intensity: glow };
  const k = SODIUM_MIX;
  return {
    color: {
      r: color.r + (SODIUM.r - color.r) * k,
      g: color.g + (SODIUM.g - color.g) * k,
      b: color.b + (SODIUM.b - color.b) * k,
    },
    intensity: glow * WARM_BOOST,
  };
}
