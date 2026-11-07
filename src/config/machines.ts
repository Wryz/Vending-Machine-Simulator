import type { ProductFamily } from './products';

/**
 * Machine look + dimensions (SPEC §3.3, §4.3). Data only.
 * Economy stats (slots, costs, rates) arrive with Milestone 2+.
 */

export type MachineFamily = 'snacks' | 'drinks' | 'capsules' | 'tech' | 'hotFood' | 'alcohol';

/** Saturated family accents; the city stays muted (SPEC §3.3). */
export const FAMILY_ACCENT: Record<MachineFamily, string> = {
  snacks: '#B8402F', // warm red
  drinks: '#1F3F78', // deep blue
  capsules: '#1E8C88', // teal
  tech: '#3A3D42', // graphite (+ white trim)
  hotFood: '#D18A1F', // amber
  alcohol: '#5E1F24', // oxblood
};

/** Display names per machine family. */
export const FAMILY_LABEL: Record<MachineFamily, string> = {
  snacks: 'Snacks & drinks',
  drinks: 'Drinks & coffee',
  capsules: 'Capsules & collectibles',
  tech: 'Tech & essentials',
  hotFood: 'Hot food & specialty',
  alcohol: 'Beer & wine',
};

export interface MachineDimensions {
  heightM: number;
  widthM: number;
  depthM: number;
}

/** Real proportions: a snack machine is ~1.83 m × 0.9 m × 0.9 m. */
export const SNACK_MACHINE_DIMENSIONS: MachineDimensions = {
  heightM: 1.83,
  widthM: 0.9,
  depthM: 0.9,
};

/** Close-up camera framing for the 3D scene. */
export const CLOSEUP_CAMERA = {
  distanceM: 3.4,
  eyeHeightM: 1.5,
  fovDeg: 46,
  /** Dolly from the matched map frame into the close-up. */
  dollyMs: 900,
} as const;

export type MachineTypeId =
  | 'used-snack'
  | 'snack'
  | 'cold-drinks'
  | 'combo'
  | 'coffee'
  | 'capsule'
  | 'card-pack'
  | 'blind-box'
  | 'chargers'
  | 'earbuds'
  | 'pharmacy'
  | 'hygiene'
  | 'hot-noodles'
  | 'pizza'
  | 'fresh-food'
  | 'flowers'
  | 'umbrellas'
  | 'ice'
  | 'beer-wine'
  | 'sake-soju';

export interface MachineType {
  id: MachineTypeId;
  name: string;
  family: MachineFamily;
  /** Product families this machine can hold. */
  holds: readonly ProductFamily[];
  slots: number;
  capacityPerSlot: number;
  purchaseCents: number;
  installCents: number;
  powerCentsPerDay: number;
  /** Expected breakdowns per business day. */
  breakdownPerDay: number;
  /** Relative theft attractiveness (1 = average). */
  theftRisk: number;
  /** Share of passers who stop and look (SPEC §5.2 capture_rate). */
  captureRate: number;
  unlockChapter: number;
  requiresPermit?: 'liquor';
  /** Restricted to these countries (e.g. sake/soju in Asia). */
  countries?: readonly string[];
  /** Grid used to lay out slot blocks in 3D. */
  grid: { rows: number; cols: number };
  dims: MachineDimensions;
}

const STD: MachineDimensions = SNACK_MACHINE_DIMENSIONS;
const SMALL: MachineDimensions = { heightM: 1.3, widthM: 0.55, depthM: 0.5 };
const WIDE: MachineDimensions = { heightM: 1.83, widthM: 1.2, depthM: 0.85 };

export const MACHINE_TYPES: readonly MachineType[] = [
  {
    id: 'used-snack',
    name: 'Used Snack Machine',
    family: 'snacks',
    holds: ['snack', 'drink'],
    slots: 30,
    capacityPerSlot: 8,
    purchaseCents: 25_000,
    installCents: 0,
    powerCentsPerDay: 120,
    breakdownPerDay: 0.05,
    theftRisk: 1.1,
    captureRate: 0.055,
    unlockChapter: 1,
    grid: { rows: 6, cols: 5 },
    dims: STD,
  },
  {
    id: 'snack',
    name: 'Snack Machine',
    family: 'snacks',
    holds: ['snack', 'drink'],
    slots: 30,
    capacityPerSlot: 12,
    purchaseCents: 180_000,
    installCents: 15_000,
    powerCentsPerDay: 100,
    breakdownPerDay: 0.015,
    theftRisk: 1,
    captureRate: 0.07,
    unlockChapter: 1,
    grid: { rows: 6, cols: 5 },
    dims: STD,
  },
  {
    id: 'cold-drinks',
    name: 'Cold Drinks',
    family: 'drinks',
    holds: ['drink'],
    slots: 10,
    capacityPerSlot: 30,
    purchaseCents: 260_000,
    installCents: 15_000,
    powerCentsPerDay: 250,
    breakdownPerDay: 0.02,
    theftRisk: 0.9,
    captureRate: 0.08,
    unlockChapter: 2,
    grid: { rows: 2, cols: 5 },
    dims: STD,
  },
  {
    id: 'combo',
    name: 'Combo Machine',
    family: 'snacks',
    holds: ['snack', 'drink'],
    slots: 24,
    capacityPerSlot: 14,
    purchaseCents: 320_000,
    installCents: 20_000,
    powerCentsPerDay: 220,
    breakdownPerDay: 0.02,
    theftRisk: 1,
    captureRate: 0.085,
    unlockChapter: 2,
    grid: { rows: 6, cols: 4 },
    dims: WIDE,
  },
  {
    id: 'coffee',
    name: 'Coffee Machine',
    family: 'drinks',
    holds: ['coffee'],
    slots: 4,
    capacityPerSlot: 80,
    purchaseCents: 380_000,
    installCents: 25_000,
    powerCentsPerDay: 280,
    breakdownPerDay: 0.03,
    theftRisk: 0.7,
    captureRate: 0.075,
    unlockChapter: 2,
    grid: { rows: 2, cols: 2 },
    dims: STD,
  },
  {
    id: 'capsule',
    name: 'Capsule Toy',
    family: 'capsules',
    holds: ['capsule'],
    slots: 4,
    capacityPerSlot: 60,
    purchaseCents: 60_000,
    installCents: 5_000,
    powerCentsPerDay: 0,
    breakdownPerDay: 0.01,
    theftRisk: 0.8,
    captureRate: 0.05,
    unlockChapter: 3,
    grid: { rows: 2, cols: 2 },
    dims: SMALL,
  },
  {
    id: 'card-pack',
    name: 'Card Pack Vendor',
    family: 'capsules',
    holds: ['card'],
    slots: 6,
    capacityPerSlot: 30,
    purchaseCents: 150_000,
    installCents: 10_000,
    powerCentsPerDay: 40,
    breakdownPerDay: 0.012,
    theftRisk: 1,
    captureRate: 0.045,
    unlockChapter: 3,
    grid: { rows: 3, cols: 2 },
    dims: STD,
  },
  {
    id: 'blind-box',
    name: 'Blind Box',
    family: 'capsules',
    holds: ['blindbox'],
    slots: 12,
    capacityPerSlot: 6,
    purchaseCents: 220_000,
    installCents: 15_000,
    powerCentsPerDay: 60,
    breakdownPerDay: 0.012,
    theftRisk: 1.2,
    captureRate: 0.04,
    unlockChapter: 3,
    grid: { rows: 4, cols: 3 },
    dims: STD,
  },
  {
    id: 'chargers',
    name: 'Chargers & Cables',
    family: 'tech',
    holds: ['tech'],
    slots: 12,
    capacityPerSlot: 8,
    purchaseCents: 300_000,
    installCents: 20_000,
    powerCentsPerDay: 80,
    breakdownPerDay: 0.01,
    theftRisk: 1.6,
    captureRate: 0.03,
    unlockChapter: 4,
    grid: { rows: 4, cols: 3 },
    dims: STD,
  },
  {
    id: 'earbuds',
    name: 'Earbuds & Accessories',
    family: 'tech',
    holds: ['tech'],
    slots: 12,
    capacityPerSlot: 6,
    purchaseCents: 350_000,
    installCents: 20_000,
    powerCentsPerDay: 80,
    breakdownPerDay: 0.01,
    theftRisk: 1.8,
    captureRate: 0.025,
    unlockChapter: 4,
    grid: { rows: 4, cols: 3 },
    dims: STD,
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy Essentials',
    family: 'tech',
    holds: ['pharmacy', 'hygiene'],
    slots: 20,
    capacityPerSlot: 8,
    purchaseCents: 380_000,
    installCents: 25_000,
    powerCentsPerDay: 90,
    breakdownPerDay: 0.01,
    theftRisk: 1.1,
    captureRate: 0.035,
    unlockChapter: 4,
    grid: { rows: 5, cols: 4 },
    dims: STD,
  },
  {
    id: 'hygiene',
    name: 'Hygiene',
    family: 'tech',
    holds: ['hygiene'],
    slots: 16,
    capacityPerSlot: 10,
    purchaseCents: 260_000,
    installCents: 15_000,
    powerCentsPerDay: 60,
    breakdownPerDay: 0.01,
    theftRisk: 0.9,
    captureRate: 0.03,
    unlockChapter: 4,
    grid: { rows: 4, cols: 4 },
    dims: STD,
  },
  {
    id: 'hot-noodles',
    name: 'Hot Noodles',
    family: 'hotFood',
    holds: ['noodles'],
    slots: 6,
    capacityPerSlot: 30,
    purchaseCents: 500_000,
    installCents: 30_000,
    powerCentsPerDay: 350,
    breakdownPerDay: 0.035,
    theftRisk: 0.7,
    captureRate: 0.06,
    unlockChapter: 4,
    grid: { rows: 2, cols: 3 },
    dims: STD,
  },
  {
    id: 'pizza',
    name: 'Pizza Oven',
    family: 'hotFood',
    holds: ['pizza'],
    slots: 2,
    capacityPerSlot: 40,
    purchaseCents: 900_000,
    installCents: 50_000,
    powerCentsPerDay: 600,
    breakdownPerDay: 0.05,
    theftRisk: 0.6,
    captureRate: 0.07,
    unlockChapter: 4,
    grid: { rows: 1, cols: 2 },
    dims: WIDE,
  },
  {
    id: 'fresh-food',
    name: 'Fresh Food',
    family: 'hotFood',
    holds: ['fresh'],
    slots: 20,
    capacityPerSlot: 5,
    purchaseCents: 650_000,
    installCents: 35_000,
    powerCentsPerDay: 300,
    breakdownPerDay: 0.03,
    theftRisk: 0.8,
    captureRate: 0.06,
    unlockChapter: 4,
    grid: { rows: 5, cols: 4 },
    dims: STD,
  },
  {
    id: 'flowers',
    name: 'Flowers',
    family: 'hotFood',
    holds: ['flowers'],
    slots: 12,
    capacityPerSlot: 3,
    purchaseCents: 400_000,
    installCents: 25_000,
    powerCentsPerDay: 200,
    breakdownPerDay: 0.02,
    theftRisk: 0.7,
    captureRate: 0.03,
    unlockChapter: 4,
    grid: { rows: 3, cols: 4 },
    dims: STD,
  },
  {
    id: 'umbrellas',
    name: 'Umbrellas',
    family: 'hotFood',
    holds: ['umbrella'],
    slots: 4,
    capacityPerSlot: 15,
    purchaseCents: 180_000,
    installCents: 10_000,
    powerCentsPerDay: 0,
    breakdownPerDay: 0.008,
    theftRisk: 0.9,
    captureRate: 0.02,
    unlockChapter: 4,
    grid: { rows: 2, cols: 2 },
    dims: SMALL,
  },
  {
    id: 'ice',
    name: 'Ice',
    family: 'hotFood',
    holds: ['ice'],
    slots: 1,
    capacityPerSlot: 60,
    purchaseCents: 550_000,
    installCents: 40_000,
    powerCentsPerDay: 600,
    breakdownPerDay: 0.04,
    theftRisk: 0.4,
    captureRate: 0.03,
    unlockChapter: 4,
    grid: { rows: 1, cols: 1 },
    dims: WIDE,
  },
  {
    id: 'beer-wine',
    name: 'Beer & Wine',
    family: 'alcohol',
    holds: ['alcohol'],
    slots: 20,
    capacityPerSlot: 8,
    purchaseCents: 500_000,
    installCents: 30_000,
    powerCentsPerDay: 260,
    breakdownPerDay: 0.02,
    theftRisk: 1.4,
    captureRate: 0.05,
    unlockChapter: 5,
    requiresPermit: 'liquor',
    grid: { rows: 5, cols: 4 },
    dims: STD,
  },
  {
    id: 'sake-soju',
    name: 'Sake & Soju',
    family: 'alcohol',
    holds: ['alcohol'],
    slots: 16,
    capacityPerSlot: 10,
    purchaseCents: 450_000,
    installCents: 30_000,
    powerCentsPerDay: 260,
    breakdownPerDay: 0.02,
    theftRisk: 1.2,
    captureRate: 0.055,
    unlockChapter: 5,
    requiresPermit: 'liquor',
    countries: ['JP', 'KR'],
    grid: { rows: 4, cols: 4 },
    dims: STD,
  },
];

const TYPE_BY_ID = new Map(MACHINE_TYPES.map((t) => [t.id, t]));

export function getMachineType(id: MachineTypeId): MachineType {
  const t = TYPE_BY_ID.get(id);
  if (!t) throw new Error(`Unknown machine type: ${id}`);
  return t;
}

/** Alcohol rules per country (SPEC §14 Q4: follow local rules). */
export const ALCOHOL_ALLOWED_COUNTRIES: readonly string[] = ['JP', 'KR', 'US', 'GB', 'FR', 'AU'];
/** Singapore: strict limits — no alcohol vending in v1. */

/**
 * The open machine in the machine sheet: each coil shows its products one
 * behind another, smaller and dimmer towards the back (UI only).
 */
export const MACHINE_WINDOW = {
  /** Most products drawn in one coil; a fuller coil shows more of them. */
  depth: 6,
  /** Each product further back is this much smaller (share of the front one). */
  shrinkPerStep: 0.075,
  /** ...sits this much higher (share of the product size)... */
  risePerStep: 0.14,
  /** ...and this much dimmer. */
  dimPerStep: 0.11,
  /** Product size as a share of the coil's width (and at most this many pt). */
  productShare: 0.64,
  productMaxPt: 70,
  /** Planned (not yet loaded) products show see-through at the back. */
  plannedOpacity: 0.4,
  /** Loaded products slide in from the back, one after another, ms. */
  loadInMs: 260,
  loadStaggerMs: 45,
} as const;
