/**
 * City ranking board (SPEC §4.8): "Top operators in <City>", the player plus a
 * field of fictional AI operators and the real rival, ranked by this week's
 * sales. The board updates at the city's local midnight; weeks start on the
 * local Monday. Data only; the logic is in src/sim/rankings.ts.
 */

export const RANKINGS = {
  /** AI operators on the board (Brightvend joins them once it is in the city). */
  operators: 7,
  /**
   * Each operator's weekly sales as a multiple of the reference (the sales a
   * player at this chapter is expected to make), strongest first. The field
   * spans ~0.3× to ~3× so there is always someone just above and just below.
   */
  tierMultipliers: [3.0, 2.0, 1.4, 1.0, 0.7, 0.45, 0.3],
  /**
   * How much of the above-1× strength stays at each chapter (index = chapter):
   * the top one or two are out of reach early and become catchable later.
   * effective = 1 + (tier - 1) × taper, for tiers above 1.
   */
  topTaper: [1, 1, 1, 0.9, 0.75, 0.55, 0.4],
  /**
   * Expected weekly sales (cents) for a casual player at each chapter (index =
   * chapter, past the end uses the last). Rough by design: the blend with the
   * player's own last week (below) keeps the board reachable if these are off.
   */
  weeklyRefCents: [600_000, 600_000, 2_000_000, 6_000_000, 20_000_000, 50_000_000, 100_000_000],
  /**
   * Weight of the player's own last full week in the reference (geometric
   * blend). 0 = chapter only, 1 = follow the player completely.
   */
  lastWeekWeight: 0.5,
  /** Last week counts as at least this share of the chapter reference (an idle week). */
  lastWeekFloor: 0.3,
  /** Week-to-week form of each operator: ± this share (log-uniform). */
  weekNoise: 0.2,
  /** Day-to-day form: each day's sales vary ± this share. */
  dayNoise: 0.3,
} as const;

/**
 * Operator names. Fictional, no real brands or chains (CLAUDE.md). Each city
 * draws its own names first, then fills up from the shared list. Names are
 * proper nouns and stay the same in every language.
 */
export const OPERATOR_NAMES: {
  generic: readonly string[];
  byCity: Record<string, readonly string[]>;
} = {
  generic: [
    'Cornerstop Vending',
    'Night Owl Snacks',
    'Coin & Crumb',
    'Pocket Pantry Co.',
    'Sunny Slot Vending',
    'Quick Nickel',
    'Two-Coin Treats',
    'Lucky Coil',
    'Little Lever Co.',
    'Midnight Munch Route',
  ],
  byCity: {
    'new-york': [
      'Five Borough Vending',
      'Bodega Box Co.',
      'Uptown Coil Co.',
      'Hudson Snack Route',
      'Stoop Side Snacks',
    ],
    'los-angeles': [
      'Sunset Slot Co.',
      'Palm Coin Vending',
      'Freeway Snacks',
      'Golden Coast Vending',
      'Canyon Coil Co.',
    ],
    chicago: [
      'Windy Coin Vending',
      'Lakeshore Snacks',
      'Loop Line Vending',
      'Deep Dish Coin Co.',
      'Prairie Route Snacks',
    ],
    london: [
      'Thames Coin Co.',
      'Mind the Snack',
      'Big Penny Vending',
      'Tea & Coin Ltd',
      'Foggy Lane Snacks',
    ],
    paris: [
      'Coin du Coin',
      'Petit Distrib',
      'Seine Snacks',
      'Rive Gauche Vending',
      'Boulevard Bonbons',
    ],
    tokyo: [
      'Neon Coil Vending',
      'Ekimae Snacks',
      'Sakura Coin Co.',
      'Midnight Ramen Co.',
      'Kissa Coin',
    ],
    seoul: [
      'Han River Vending',
      'Hanok Coin Co.',
      'Kimbap Corner',
      'Neon Alley Snacks',
      'Morning Calm Vending',
    ],
    singapore: [
      'Lion City Vending',
      'Hawker Coin Co.',
      'Kopi Corner Vending',
      'Monsoon Coin',
      'Orchard Snack Route',
    ],
    sydney: [
      'Harbour Coin Co.',
      'Bondi Snack Route',
      'Wattle & Coin',
      'Southern Cross Vending',
      "G'day Snacks",
    ],
  },
};
