/**
 * The guided first-machine tutorial (SPEC §8 onboarding). Data only.
 *
 * The tutorial follows the player into each sheet, pulses the one key to press
 * next and offers a "Show me" key that does the looking for them.
 */
export const TUTORIAL = {
  /** "Show me a good spot": cells searched around the map's center (rings of ~170 m). */
  spotSearchRings: 6,
  /** The busiest cells by foot traffic that get a full spot estimate. */
  spotCandidates: 10,
  /** A suggested spot keeps this far from any machine (yours or the rival's), meters. */
  spotClearanceM: 150,
  /** The spot card warns "few people walk here" below this many stars (0..5). */
  quietBelowStars: 1,
  /** The pulsing ring around the key to press next. */
  pulse: { periodMs: 1100, spreadPt: 7, color: '#FFB020' },
  /** The coach card's text sizes (large on purpose, for young and older players). */
  text: { title: 18, line: 16 },
} as const;

/**
 * One-time tips when a key opens for the first time (Keys, Routes, Orders,
 * Company, rankings). Shown at the top of that screen until "Got it".
 */
export const FIRST_TIPS = ['keys', 'routes', 'orders', 'company', 'rankings'] as const;
export type FirstTipId = (typeof FIRST_TIPS)[number];
