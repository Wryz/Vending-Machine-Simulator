/**
 * Surprise moments (SPEC §4.6): small, rare, positive things that happen
 * while you play. Calm, never a slot machine: no near-misses, no streaks, no
 * money asked. Rolled only during live play (short advances), never piled up
 * from offline catch-up. Times are real ms.
 */
export const SURPRISES = {
  /** Only advances shorter than this roll surprises (the app is open and ticking). */
  maxLiveGapMs: 2 * 60_000,
  /** Gap between two surprises, uniformly in [min, max]. */
  gapMinMs: 4 * 60_000,
  gapMaxMs: 9 * 60_000,
  /** The first one waits at least this long after the tutorial is through. */
  firstAfterMs: 3 * 60_000,
  /** Relative odds by kind. */
  weights: { vip: 0.45, jackpot: 0.35, deal: 0.2 },
  /** VIP customer: buys a whole row (a slot) in one go. */
  vip: { minUnits: 3, maxUnits: 8 },
  /** Jackpot hour: one spot gets a demand boost for a while (real ms; 1 real min = 1 business hour). */
  jackpot: { multiplier: 1.5, durationMs: 5 * 60_000 },
  /**
   * Venue deal: the venue cuts its commission on that machine's sales for a
   * while, if you accept before the offer runs out.
   */
  deal: { commission: 0.05, offerMs: 3 * 60_000, durationMs: 10 * 60_000, minCommission: 0.1 },
} as const;
