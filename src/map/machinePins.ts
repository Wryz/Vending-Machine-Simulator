import type { MachineFamily } from '@/config/machines';
import { MACHINE_PIN } from '@/config/map';

/**
 * Machine pins (below the street-life zoom) and the pin ↔ 3D sprite crossfade.
 *
 * Pin images (`node scripts/sprites/build-pins.mjs`, src/map/pinImages.ts):
 *   pin-{family}           white face, family-colored machine glyph
 *   pin-{family}-{status}  face filled with the status color (amber / signal / alert)
 *   pin-rival              muted grey pin
 */

/** Status colors a pin face can carry (theme keys, as in the map's status rings). */
export const PIN_STATUSES = ['amber', 'signal', 'alert'] as const;
export type PinStatus = (typeof PIN_STATUSES)[number];

export function pinImageName(family: MachineFamily | 'rival', status: PinStatus | null): string {
  if (family === 'rival') return 'pin-rival';
  return status ? `pin-${family}-${status}` : `pin-${family}`;
}

/** Zoom range [start, end] of the crossfade: pins fade out while sprites fade in. */
export function crossfadeRange(lifeMinZoom: number, span: number = MACHINE_PIN.crossfadeZooms) {
  return [lifeMinZoom - span, lifeMinZoom] as const;
}

/** Opacity by zoom: `from` below the crossfade, `to` above it (numbers or data expressions). */
export function crossfadeOpacity(
  lifeMinZoom: number,
  from: unknown,
  to: unknown,
  span: number = MACHINE_PIN.crossfadeZooms,
): unknown[] {
  const [a, b] = crossfadeRange(lifeMinZoom, span);
  return ['interpolate', ['linear'], ['zoom'], a, from, b, to];
}

/**
 * Pin `icon-size` by zoom; features with `mine: false` (rivals) are scaled down.
 */
export function pinSizeExpression(
  stops: readonly (readonly [number, number])[] = MACHINE_PIN.sizeByZoom,
  rivalScale: number = MACHINE_PIN.rivalScale,
): unknown[] {
  const scale = ['case', ['to-boolean', ['get', 'mine']], 1, rivalScale];
  return ['interpolate', ['linear'], ['zoom'], ...stops.flatMap(([z, s]) => [z, ['*', s, scale]])];
}

/** Pin icon-size at a zoom (linear between stops, clamped), for a player's pin. */
export function pinSizeAt(
  zoom: number,
  stops: readonly (readonly [number, number])[] = MACHINE_PIN.sizeByZoom,
): number {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return 1;
  if (zoom <= first[0]) return first[1];
  for (let i = 1; i < stops.length; i++) {
    const [z1, s1] = stops[i];
    const [z0, s0] = stops[i - 1];
    if (zoom <= z1) return s0 + ((s1 - s0) * (zoom - z0)) / (z1 - z0);
  }
  return last[1];
}
