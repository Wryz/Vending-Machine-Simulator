import type { MachineFamily } from './machines';
import type { CurveKey } from './curves';
import type { ProductTag } from './products';

/**
 * Chapters, research (global per-family upgrades), collections, events.
 * SPEC §4.2, §4.7, §4.8, §4.6. Data only.
 */

export interface Chapter {
  n: number;
  title: string;
  /** `{amount}` is replaced by `amountCents`, shown in the local currency. */
  goal: string;
  amountCents?: number;
  unlocks: string[];
}

export const CHAPTERS: readonly Chapter[] = [
  {
    n: 1,
    title: 'Side Hustle',
    goal: 'Earn {amount} in sales with your used machine',
    amountCents: 100_000, // CHAPTER_GOALS[1].salesCents
    unlocks: ['Second machine', 'Price setting'],
  },
  {
    n: 2,
    title: 'The Route',
    goal: 'Run 5 machines and buy a van',
    unlocks: [
      'Telemetry',
      'Drinks & coffee machines',
      'District 2',
      'Drivers',
      'Auto-reorder rules',
    ],
  },
  {
    n: 3,
    title: 'LLC',
    goal: 'Run 15 machines and hire a driver',
    unlocks: [
      'Card readers',
      'Capsules & collectibles',
      'Warehouse',
      'Brightvend arrives',
      'Branches in your state or province',
    ],
  },
  {
    n: 4,
    title: 'Operator',
    goal: 'Run 40 machines with 3 drivers',
    unlocks: [
      'Smart machines',
      'Tech & essentials',
      'Hot food',
      'Events board',
      'Branches across your country',
    ],
  },
  {
    n: 5,
    title: 'Empire',
    goal: "Become the city's top operator (beat Brightvend's share)",
    unlocks: ['All machine types', 'Branches in neighbouring countries', 'Liquor permit'],
  },
  {
    n: 6,
    title: 'Continental',
    goal: 'Run branches in 3 countries and take {amount} in sales',
    amountCents: 25_000_000, // CHAPTER_GOALS[6].salesCents
    unlocks: ['Branches across your continent'],
  },
  {
    n: 7,
    title: 'Global',
    goal: 'Run branches on 2 continents and take {amount} in sales',
    amountCents: 100_000_000, // CHAPTER_GOALS[7].salesCents
    unlocks: ['Branches anywhere in the world'],
  },
  {
    n: 8,
    title: 'Prestige',
    goal: 'Sell the company when you are ready',
    unlocks: ['Reputation perks', 'Restart with a head start'],
  },
];

export const CHAPTER_GOALS = {
  1: { salesCents: 100_000 },
  2: { machines: 5, vanLevel: 1 },
  3: { machines: 15, drivers: 1 },
  4: { machines: 40, drivers: 3 },
  /** Player share of city vending revenue (rolling business day) vs. rival. */
  5: { share: 0.5, minRivalMachines: 1 },
  /** Company-wide: countries with a branch, and sales taken since the chapter began. */
  6: { countries: 3, salesCents: 25_000_000 },
  7: { continents: 2, salesCents: 100_000_000 },
} as const;

/**
 * Districts follow real neighbourhoods when the region has named ones
 * (pipeline/build-hoods.ts → src/sim/hoods.ts): each map cell joins its nearest
 * neighbourhood name, and a whole neighbourhood opens in the chapter of the
 * ring its name sits in. The neighbourhood you start in is always open.
 * Regions without names fall back to the plain rings below.
 */
export const HOODS = {
  /** A cell further than this from every name keeps the ring rule (km). */
  maxKm: 2.5,
  /** With at least this many fine neighbourhoods, quarters and villages are ignored (they overlap them). */
  minFine: 6,
} as const;

/**
 * One company, many cities (owner's call, 2026-11-08). From `unlockChapter`
 * the player can open branches in any city: cash, chapter, research,
 * collections, perks, goals and trophies are the company's; machines, vans,
 * drivers, the rival and rankings stay with each city. Branches you aren't
 * looking at keep trading and pay into the company. How many cities a chapter
 * allows (the city you started in counts).
 */
/** The action log kept in each save for a future server replay (src/sim/actionLog.ts). */
export const ACTION_LOG = {
  /** Entries kept; older ones drop off (the server will checkpoint before this matters). */
  cap: 5000,
} as const;

export const BRANCHES = {
  unlockChapter: 3,
  /**
   * How far from the company's home city a chapter lets you open branches
   * (owner's call, 2026-11-08): state/province → country → UN sub-region
   * (e.g. South-Eastern Asia) → continent → the world.
   */
  reach: { 3: 'state', 4: 'country', 5: 'region', 6: 'continent', 7: 'world' } as Record<
    number,
    'state' | 'country' | 'region' | 'continent' | 'world'
  >,
  /** Catch up other branches at most this often (real minutes) while playing. */
  syncEveryMinutes: 10,
} as const;

/** Districts: rings around the city center, unlocked by chapter. Radius in km. */
export const DISTRICTS = [
  { id: 1, name: 'Downtown', radiusKm: 1.2, unlockChapter: 1 },
  { id: 2, name: 'Inner ring', radiusKm: 2.5, unlockChapter: 2 },
  { id: 3, name: 'Outer ring', radiusKm: 4.5, unlockChapter: 4 },
  { id: 4, name: 'Whole city', radiusKm: 30, unlockChapter: 5 },
] as const;

export type ResearchId =
  | 'telemetry'
  | 'card-reader'
  | 'bigger-coil'
  | 'cooler'
  | 'security-cage'
  | 'camera'
  | 'led-panel'
  | 'technician'
  | 'smart-pricing'
  | 'id-check'
  | 'auto-reorder'
  | 'cash-vault';

export interface Research {
  id: ResearchId;
  name: string;
  description: string;
  /** Cost per family (researched separately per family — SPEC §4.2). */
  costCents: number;
  unlockChapter: number;
  /** If true, applies to all families at once. */
  global?: boolean;
  /** Business days the lab needs (one research at a time; owner's call, 2026-11-08). */
  days: number;
}

export const RESEARCH: readonly Research[] = [
  {
    id: 'telemetry',
    name: 'Telemetry',
    description: 'See stock and cash levels remotely.',
    costCents: 60_000,
    unlockChapter: 2,
    days: 1,
    global: true,
  },
  {
    id: 'card-reader',
    name: 'Card readers',
    description: 'Card sales deposit directly to your account.',
    costCents: 150_000,
    unlockChapter: 3,
    days: 2,
  },
  {
    id: 'bigger-coil',
    name: 'Bigger coils',
    description: '+50% capacity per slot.',
    costCents: 120_000,
    unlockChapter: 2,
    days: 1.5,
  },
  {
    id: 'cooler',
    name: 'Better cooling & heating',
    description: 'Fewer refrigeration failures; +5% sales of hot and cold items.',
    costCents: 100_000,
    unlockChapter: 2,
    days: 1.5,
  },
  {
    id: 'security-cage',
    name: 'Security cage',
    description: 'Cuts theft risk by more than half.',
    costCents: 90_000,
    unlockChapter: 2,
    days: 1,
  },
  {
    id: 'camera',
    name: 'Camera',
    description: 'Cuts theft risk by a third.',
    costCents: 70_000,
    unlockChapter: 3,
    days: 1,
  },
  {
    id: 'led-panel',
    name: 'LED panel',
    description: 'Machines stay visible at night (+12% visibility).',
    costCents: 80_000,
    unlockChapter: 2,
    days: 1,
  },
  {
    id: 'technician',
    name: 'Technician on call',
    description: 'Breakdowns are fixed automatically within a few hours.',
    costCents: 200_000,
    unlockChapter: 3,
    days: 3,
    global: true,
  },
  {
    id: 'smart-pricing',
    name: 'Smart machines',
    description: 'Machines suggest and apply prices.',
    costCents: 300_000,
    unlockChapter: 4,
    days: 3,
  },
  {
    id: 'id-check',
    name: 'ID check',
    description: 'Reduces alcohol fines and incidents.',
    costCents: 150_000,
    unlockChapter: 5,
    days: 2,
  },
  {
    id: 'auto-reorder',
    name: 'Auto-reorder rules',
    description: 'Drivers restock to your par levels automatically.',
    costCents: 250_000,
    unlockChapter: 2,
    days: 3,
    global: true,
  },
  {
    id: 'cash-vault',
    name: 'Larger cash box',
    description: 'Doubles cash box capacity.',
    costCents: 80_000,
    unlockChapter: 1,
    days: 0.5,
  },
];

/** Product-tag affinity by place category (SPEC §5.2 fit). 1 = neutral. */
export const PLACE_TAG_AFFINITY: Partial<Record<CurveKey, Partial<Record<ProductTag, number>>>> = {
  office: { caffeine: 1.6, snack: 1.1, meal: 1.3, health: 1.1, tech: 1.3 },
  school: { sweet: 1.6, snack: 1.4, salty: 1.2, caffeine: 0.4, collectible: 1.7, adult: 0 },
  university: { caffeine: 1.7, snack: 1.3, meal: 1.3, collectible: 1.3, tech: 1.4 },
  gym: { protein: 2, hydration: 1.8, health: 1.4, sweet: 0.6, salty: 0.7 },
  hospital: { health: 1.8, caffeine: 1.4, hot: 1.3, meal: 1.3, gift: 1.8 },
  clinic: { health: 1.6, hydration: 1.2 },
  station: { caffeine: 1.4, snack: 1.3, tech: 1.8, weather: 1.4, health: 1.2 },
  stadium: { cold: 1.4, salty: 1.5, adult: 1.4, collectible: 1.2 },
  park: { cold: 1.4, hydration: 1.6, sweet: 1.2, collectible: 1.3 },
  beach: { cold: 1.8, hydration: 1.8, weather: 1.5, sweet: 1.2 },
  nightlife: { salty: 1.5, hydration: 1.4, adult: 1.8, meal: 1.4, caffeine: 0.6 },
  cafe: { sweet: 1.2, caffeine: 0.8 },
  restaurant: { sweet: 1.2 },
  fastfood: { cold: 1.4, hydration: 1.3, sweet: 1.2, caffeine: 1.1 },
  shopping: { collectible: 1.6, gift: 1.4, tech: 1.3, cold: 1.1 },
  hotel: { health: 1.4, tech: 1.5, adult: 1.3, hydration: 1.2 },
  airport: { tech: 2, health: 1.5, caffeine: 1.4, gift: 1.3 },
  convention: { caffeine: 1.5, tech: 1.4, collectible: 1.4 },
  religious: { gift: 1.3, adult: 0.3 },
  residential: { snack: 1.1, hot: 1.1, meal: 1.2, adult: 1.1 },
};

export type Rarity = 'common' | 'uncommon' | 'rare' | 'ultra';

/** Pull odds (disclosed in-game — SPEC §4.7). Must sum to 1. */
export const RARITY_ODDS: Record<Rarity, number> = {
  common: 0.62,
  uncommon: 0.26,
  rare: 0.1,
  ultra: 0.02,
};

export interface CollectibleSeries {
  id: string;
  name: string;
  family: MachineFamily;
  items: { id: string; name: string; rarity: Rarity }[];
  /** Completion perk: permanent sales multiplier for this machine family. */
  perkFamily: MachineFamily;
  perkSalesBonus: number;
}

function series(
  id: string,
  name: string,
  names: [string, Rarity][],
  perkFamily: MachineFamily,
): CollectibleSeries {
  return {
    id,
    name,
    family: 'capsules',
    items: names.map(([n, rarity], i) => ({ id: `${id}-${i + 1}`, name: n, rarity })),
    perkFamily,
    perkSalesBonus: 0.05,
  };
}

export const COLLECTIONS: readonly CollectibleSeries[] = [
  series(
    'city-critters',
    'City Critters',
    [
      ['Rooftop Pigeon', 'common'],
      ['Alley Cat', 'common'],
      ['Subway Mouse', 'common'],
      ['Park Squirrel', 'common'],
      ['Harbor Gull', 'common'],
      ['Night Fox', 'uncommon'],
      ['Bodega Cat', 'uncommon'],
      ['Tunnel Bat', 'uncommon'],
      ['Canal Heron', 'uncommon'],
      ['Tower Falcon', 'rare'],
      ['Lantern Moth', 'rare'],
      ['Golden Koi', 'ultra'],
    ],
    'snacks',
  ),
  series(
    'transit-tokens',
    'Transit Tokens',
    [
      ['Brass Token', 'common'],
      ['Night Bus', 'common'],
      ['Tram Bell', 'common'],
      ['Platform Clock', 'common'],
      ['Ferry Horn', 'common'],
      ['Ticket Punch', 'common'],
      ['Signal Lamp', 'uncommon'],
      ['Cable Car', 'uncommon'],
      ['Sleeper Car', 'uncommon'],
      ['Monorail', 'uncommon'],
      ['Steam Engine', 'rare'],
      ['Airship Pass', 'rare'],
      ['Golden Turnstile', 'ultra'],
      ['First Train', 'ultra'],
    ],
    'drinks',
  ),
  series(
    'night-market-minis',
    'Night Market Minis',
    [
      ['Dumpling Stall', 'common'],
      ['Skewer Cart', 'common'],
      ['Paper Lantern', 'common'],
      ['Noodle Bowl', 'common'],
      ['Bubble Tea', 'common'],
      ['Fortune Cat', 'uncommon'],
      ['Neon Sign', 'uncommon'],
      ['Hot Pot', 'uncommon'],
      ['Mochi Stand', 'uncommon'],
      ['Dragon Kite', 'rare'],
      ['Fireworks', 'rare'],
      ['Moon Cake', 'rare'],
      ['Lucky Coin', 'ultra'],
    ],
    'hotFood',
  ),
  series(
    'rooftop-friends',
    'Rooftop Friends',
    [
      ['Water Tower', 'common'],
      ['Antenna', 'common'],
      ['Skylight', 'common'],
      ['Garden Box', 'common'],
      ['Satellite Dish', 'uncommon'],
      ['Chimney Sweep', 'uncommon'],
      ['Beehive', 'uncommon'],
      ['Pool Float', 'rare'],
      ['Helipad', 'rare'],
      ['Rooftop Cinema', 'rare'],
      ['Weather Vane', 'ultra'],
      ['Neon Crown', 'ultra'],
    ],
    'tech',
  ),
];

export const COLLECTION_PULL = {
  /** Chance of a free pull when collecting cash from a capsule-family machine. */
  freePullOnCollect: 0.35,
  /** Cost of a pull bought with in-game money. */
  pullCostCents: 2_500,
} as const;

/** Local events generated from nearby places (SPEC §4.6). */
export interface EventTemplate {
  id: string;
  name: string;
  /** Place category that hosts it. */
  host: CurveKey;
  /** Traffic multiplier near the host while active. */
  multiplier: [number, number];
  /** Extra boost for product tags. */
  tagBoost?: Partial<Record<ProductTag, number>>;
  durationHours: number;
  /** Chance per host place per real day. */
  chancePerDay: number;
  /** Preferred local start hours. */
  startHours: readonly number[];
  weekendOnly?: boolean;
  /** Months (1..12) in the city's hemisphere-adjusted summer, for beaches. */
  summerOnly?: boolean;
}

/** Local events (src/sim/events.ts, demand.ts). */
export const EVENTS = {
  /** Most events generated per local day. */
  maxPerDay: 6,
  /** Local days whose events are remembered (so a day is generated once). */
  daysRemembered: 14,
  /** An event lifts demand within this radius (m), fading to nothing at the edge. */
  radiusM: 600,
} as const;

export const EVENT_TEMPLATES: readonly EventTemplate[] = [
  {
    id: 'game-night',
    name: 'Game night',
    host: 'stadium',
    multiplier: [2, 4],
    tagBoost: { cold: 1.3, salty: 1.3 },
    durationHours: 4,
    chancePerDay: 0.3,
    startHours: [18, 19],
  },
  {
    id: 'exam-week',
    name: 'Exam week',
    host: 'university',
    multiplier: [1.2, 1.5],
    tagBoost: { caffeine: 1.6, snack: 1.2 },
    durationHours: 14,
    chancePerDay: 0.08,
    startHours: [8],
  },
  {
    id: 'festival',
    name: 'Park festival',
    host: 'park',
    multiplier: [1.8, 3],
    tagBoost: { cold: 1.3, sweet: 1.2 },
    durationHours: 6,
    chancePerDay: 0.05,
    startHours: [11, 12, 13],
    weekendOnly: true,
  },
  {
    id: 'expo',
    name: 'Expo',
    host: 'convention',
    multiplier: [2, 3],
    tagBoost: { caffeine: 1.3, tech: 1.4 },
    durationHours: 9,
    chancePerDay: 0.12,
    startHours: [9],
  },
  {
    id: 'summer-weekend',
    name: 'Summer weekend',
    host: 'beach',
    multiplier: [1.8, 2.6],
    tagBoost: { cold: 1.5, hydration: 1.4 },
    durationHours: 8,
    chancePerDay: 0.6,
    startHours: [10, 11],
    weekendOnly: true,
    summerOnly: true,
  },
];

/** Prestige perks bought with Reputation. */
export interface PrestigePerk {
  id: string;
  name: string;
  /** `{amount}` is replaced by `amountCents`, shown in the local currency. */
  description: string;
  amountCents?: number;
  costRep: number;
  maxLevel: number;
}

export const PRESTIGE_PERKS: readonly PrestigePerk[] = [
  {
    id: 'head-start',
    name: 'Head start',
    description: '+{amount} starting cash per level.',
    amountCents: 200_000, // src/sim/create.ts
    costRep: 2,
    maxLevel: 5,
  },
  {
    id: 'sharp-eye',
    name: 'Sharp eye',
    description: '+4% sales everywhere per level.',
    costRep: 3,
    maxLevel: 5,
  },
  {
    id: 'smooth-talker',
    name: 'Smooth talker',
    description: '-1% venue commission per level.',
    costRep: 3,
    maxLevel: 3,
  },
  {
    id: 'long-weekend',
    name: 'Long weekend',
    description: '+12 h offline cap per level.',
    costRep: 2,
    maxLevel: 4,
  },
  {
    id: 'old-van',
    name: 'Old van',
    description: 'Start with a level-1 van.',
    costRep: 4,
    maxLevel: 1,
  },
];

/**
 * Daily orders (gamification, SPEC §1.2 pillar 5 "always something to want").
 * Three per local day, picked deterministically per save and day, scaled by
 * chapter (index = chapter - 1). Claiming all three extends the daily streak.
 */
export type GoalKind =
  'sales' | 'units' | 'restocks' | 'collects' | 'places' | 'repairs' | 'research' | 'pulls';

export interface GoalTemplate {
  id: string;
  kind: GoalKind;
  /** `{n}` is replaced by the target (money targets formatted by the UI). */
  title: string;
  minChapter: number;
  targetByChapter: readonly number[];
  rewardCentsByChapter: readonly number[];
}

export const DAILY_GOALS: readonly GoalTemplate[] = [
  {
    id: 'sales',
    kind: 'sales',
    title: 'Take {n} in sales',
    minChapter: 1,
    targetByChapter: [50_000, 300_000, 1_500_000, 6_000_000, 20_000_000, 40_000_000],
    rewardCentsByChapter: [5_000, 25_000, 100_000, 350_000, 1_000_000, 2_000_000],
  },
  {
    id: 'units',
    kind: 'units',
    title: 'Sell {n} items',
    minChapter: 1,
    targetByChapter: [200, 1_000, 5_000, 20_000, 60_000, 120_000],
    rewardCentsByChapter: [4_000, 20_000, 80_000, 300_000, 900_000, 1_800_000],
  },
  {
    id: 'restocks',
    kind: 'restocks',
    title: 'Restock {n} times by hand',
    minChapter: 1,
    targetByChapter: [2, 4, 6, 8, 10, 10],
    rewardCentsByChapter: [3_000, 12_000, 40_000, 120_000, 300_000, 600_000],
  },
  {
    id: 'collects',
    kind: 'collects',
    title: 'Empty {n} cash boxes',
    minChapter: 1,
    targetByChapter: [2, 5, 8, 12, 15, 15],
    rewardCentsByChapter: [3_000, 12_000, 40_000, 120_000, 300_000, 600_000],
  },
  {
    id: 'places',
    kind: 'places',
    title: 'Place {n} new machines',
    minChapter: 2,
    targetByChapter: [1, 1, 2, 3, 4, 5],
    rewardCentsByChapter: [0, 30_000, 120_000, 400_000, 1_000_000, 2_000_000],
  },
  {
    id: 'repairs',
    kind: 'repairs',
    title: 'Fix {n} breakdowns',
    minChapter: 2,
    targetByChapter: [1, 1, 2, 3, 3, 3],
    rewardCentsByChapter: [0, 15_000, 50_000, 150_000, 400_000, 800_000],
  },
  {
    id: 'research',
    kind: 'research',
    title: 'Research {n} upgrade',
    minChapter: 2,
    targetByChapter: [1, 1, 1, 1, 1, 1],
    rewardCentsByChapter: [0, 25_000, 80_000, 250_000, 600_000, 1_200_000],
  },
  {
    id: 'pulls',
    kind: 'pulls',
    title: 'Open {n} capsules',
    minChapter: 3,
    targetByChapter: [1, 1, 3, 5, 8, 8],
    rewardCentsByChapter: [0, 0, 30_000, 100_000, 300_000, 600_000],
  },
];

export const DAILY_GOALS_PER_DAY = 3;
/** Streak bonus for finishing all orders: base × min(streak, cap). */
export const STREAK_BONUS = {
  baseCentsByChapter: [5_000, 20_000, 80_000, 250_000, 700_000, 1_500_000],
  cap: 7,
} as const;

/** Trophies: permanent milestones with a one-time cash reward. */
export interface Achievement {
  id: string;
  title: string;
  /** `{amount}` is replaced by `amountCents`, shown in the local currency. */
  description: string;
  amountCents?: number;
  rewardCents: number;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-sale',
    title: 'Open for business',
    description: 'Make your first sale.',
    rewardCents: 2_000,
  },
  { id: 'units-100', title: 'Regulars', description: 'Sell 100 items.', rewardCents: 5_000 },
  {
    id: 'units-10k',
    title: 'Household name',
    description: 'Sell 10,000 items.',
    rewardCents: 150_000,
  },
  {
    id: 'sales-1k',
    title: 'Side hustle',
    description: 'Take {amount} in sales.',
    amountCents: 100_000, // src/sim/goals.ts
    rewardCents: 10_000,
  },
  {
    id: 'sales-100k',
    title: 'Real business',
    description: 'Take {amount} in sales.',
    amountCents: 10_000_000, // src/sim/goals.ts
    rewardCents: 500_000,
  },
  {
    id: 'sales-1m',
    title: 'Seven figures',
    description: 'Take {amount} in sales.',
    amountCents: 100_000_000, // src/sim/goals.ts
    rewardCents: 2_500_000,
  },
  { id: 'machines-5', title: 'A route', description: 'Run 5 machines.', rewardCents: 30_000 },
  { id: 'machines-15', title: 'A network', description: 'Run 15 machines.', rewardCents: 120_000 },
  {
    id: 'machines-40',
    title: 'An operator',
    description: 'Run 40 machines.',
    rewardCents: 500_000,
  },
  {
    id: 'machines-100',
    title: 'Coinline everywhere',
    description: 'Run 100 machines.',
    rewardCents: 2_000_000,
  },
  {
    id: 'first-driver',
    title: 'Delegation',
    description: 'Hire your first driver.',
    rewardCents: 50_000,
  },
  {
    id: 'first-research',
    title: 'Upgrades',
    description: 'Research your first upgrade.',
    rewardCents: 20_000,
  },
  {
    id: 'full-set',
    title: 'Completionist',
    description: 'Complete a collectible set.',
    rewardCents: 200_000,
  },
  {
    id: 'beat-rival',
    title: 'Top operator',
    description: 'Beat Brightvend for the city.',
    rewardCents: 1_000_000,
  },
  {
    id: 'streak-7',
    title: 'Every day',
    description: 'Finish your daily orders 7 days in a row.',
    rewardCents: 300_000,
  },
  { id: 'sold-company', title: 'Exit', description: 'Sell the company.', rewardCents: 0 },
];

/**
 * Features open up as the player reaches milestones, so the first minutes show
 * only what's needed (place a machine, stock it, watch a sale). A feature opens
 * when ANY of its conditions is met; `chapter` also opens it for older saves.
 */
export type Feature = 'orders' | 'company' | 'rankings' | 'keys' | 'routes' | 'topDown' | 'locate';

export interface FeatureRule {
  /** Opens at this chapter. */
  chapter: number;
  /** ...or once this many items have sold. */
  sales?: number;
  /** ...or once cash has been collected at least once. */
  collected?: boolean;
  /** ...or once the player owns this many machines. */
  machines?: number;
  /** ...or once this many machines are placed on the map. */
  placed?: number;
}

export const FEATURE_UNLOCKS: Record<Feature, FeatureRule> = {
  locate: { chapter: 2, placed: 1 },
  orders: { chapter: 2, sales: 1 },
  company: { chapter: 2, collected: true },
  /** City ranking board: with the Company key, after the first collect. */
  rankings: { chapter: 2, collected: true },
  keys: { chapter: 2, machines: 2 },
  routes: { chapter: 2 },
  topDown: { chapter: 1 },
};
