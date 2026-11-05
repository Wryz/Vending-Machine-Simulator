/**
 * Economy tuning (SPEC §5). Data only. All money is in integer cents.
 *
 * TIME MODEL — read this first.
 * The *world clock* is real: hourly demand curves, lighting and weather use the
 * city's real local time. The *business clock* runs faster: one real minute
 * simulates `salesTimeScale` business minutes of trade. Every "per day" value
 * below (power, wages, contract terms, breakdown rates) is per business day,
 * i.e. 24 h / salesTimeScale of real time (24 real minutes at 60×).
 *
 * Why: SPEC §4.8 wants chapter 1 (earn $1,000 with the used machine) in
 * 20–30 minutes and chapter 3 around day 2–3, which a 1:1 clock can't deliver.
 * This one knob keeps the pacing targets; see docs/spikes/M1-REPORT.md.
 */
export const TIME = {
  salesTimeScale: 60,
  /** Live tick length (real ms). */
  liveTickMs: 60_000,
  /** Offline catch-up step (real minutes) — SPEC §5.1: 15-minute buckets. */
  offlineStepMinutes: 15,
  /** Offline progress cap (real hours) before upgrades — SPEC §5.1. */
  offlineCapHours: 72,
} as const;

export const BUSINESS_DAY_REAL_MS = (24 * 60 * 60_000) / TIME.salesTimeScale;

export const START = {
  cashCents: 30_000,
  /** The used starter machine is owned from the beginning (SPEC §1). */
  starterMachineType: 'used-snack',
  starterStock: true,
} as const;

/**
 * price_response(ratio = price / suggested): logistic, ≈1.0 at 0.9×,
 * ≈0.5 at 1.3×, ≈0.15 at 1.8× (SPEC §5.2).
 */
export const PRICE_RESPONSE = {
  midpoint: 1.27,
  steepness: 4.4,
  /** Normalize so the curve is ~1.0 at 0.9×. */
  ceilingAt: 0.9,
} as const;

/**
 * Global demand scale (the main pacing knob). Tuned so a used machine in a
 * decent spot finishes chapter 1 in ~25 minutes when kept stocked
 * (asserted by src/sim/game.test.ts).
 */
export const DEMAND_SCALE = 1.6;

/** How much of an "interested" customer's choice is product fit vs. random. */
export const FIT = {
  /** Base purchase propensity once a customer stops at a machine. */
  baseBuy: 0.72,
  /** Below this many stocked slots, customers who don't find their thing leave. */
  selectionRef: 6,
  /** At most this share of stopping customers buy something. */
  maxBuy: 0.95,
  /** Tag fit multipliers are clamped to this range. */
  min: 0.35,
  max: 1.8,
} as const;

export const SERVICE = {
  /** Van capacity in items per level (level 0 = car boot). */
  vanCapacityByLevel: [120, 300, 600, 1200],
  vanUpgradeCostCents: [0, 450_000, 1_200_000, 3_000_000],
  /** The chapter-2 goal "buy a van" means reaching level 1. */
  /** Fuel per km of route (straight-line × routeFactor). */
  fuelCentsPerKm: 22,
  routeFactor: 1.3,
  /** SPEC §4.2: manual restock gives +10% sales for a (business) day. */
  freshStockBonus: 0.1,
  freshStockBusinessDays: 1,
  manualRepairCostCents: 1_500,
  technicianRepairCostCents: 4_000,
  /** Business hours a technician (research) needs to fix a breakdown. */
  technicianDelayHours: 3,
} as const;

export const CASH = {
  /** Cash box capacity in cents (per machine, before upgrades). */
  cashBoxCents: 60_000,
  /** Share of sales paid by card once card readers are researched. */
  cardShare: 0.6,
  /** Card processing fee. */
  cardFee: 0.03,
} as const;

export const STAFF = {
  driverHireCents: 250_000,
  driverWageCentsPerDay: 9_000,
  /** Stops a driver can run per route. */
  stopsPerRoute: 8,
  /** Business hours between a driver's route runs. */
  routeIntervalHours: 6,
  /** Items a driver carries per run (warehouse raises this). */
  driverCapacity: 600,
  warehouseDriverCapacity: 1_500,
  warehouseRentCentsPerDay: 6_000,
  warehouseBuyCents: 900_000,
  /** Wholesale discount when buying through the warehouse. */
  warehouseDiscount: 0.12,
} as const;

export const OVERHEAD = {
  /** Management overhead per machine per day grows with fleet size (SPEC §5.4). */
  perMachineCentsPerDay: 60,
  growthPerMachine: 0.012,
  /** Districts further out cost more to install into. */
  districtInstallMultiplier: [1, 1.25, 1.6, 2.0],
} as const;

export const CONTRACT = {
  termsDays: [30, 90, 180] as const,
  /** Longer terms earn a lower commission ask. */
  termDiscount: { 30: 0, 90: 0.02, 180: 0.04 } as Record<number, number>,
  /** Exclusivity: rival can't place within the radius; costs extra commission. */
  exclusivityCommission: 0.04,
  exclusivityRadiusM: 250,
  commissionMin: 0.1,
  commissionMax: 0.35,
  /** Renegotiation (chapter-1 unlock) can shave this much, once per contract. */
  renegotiateDiscount: 0.03,
  /** Mood (0..1) changes per business day. */
  moodRecoverPerDay: 0.12,
  moodLossEmptyPerDay: 0.25,
  moodLossBrokenPerDay: 0.35,
  terminateBelow: 0.2,
  /** Days the mood must stay below `terminateBelow` before termination. */
  terminateAfterDays: 2,
} as const;

export const RISK = {
  /** Theft: base chance per business day for an average spot. */
  theftBasePerDay: 0.03,
  theftIsolationWeight: 1.6,
  theftNightWeight: 0.8,
  /** Fraction of cash box and stock lost on a theft. */
  theftCashLoss: 0.6,
  theftStockLoss: 0.15,
  securityCageReduction: 0.55,
  cameraReduction: 0.35,
  idCheckIncidentReduction: 0.6,
  /** Alcohol incidents (fines) per business day without ID check. */
  alcoholIncidentPerDay: 0.04,
  alcoholFineCents: 25_000,
} as const;

export const COMPETITION = {
  /** Machines (any owner) within this radius compete. */
  radiusM: 250,
  /** Each competitor takes this share (diminishing). */
  perCompetitorShare: 0.18,
  maxShare: 0.7,
  /** Real convenience stores count as this many machines. */
  storeWeight: 0.6,
} as const;

export const VISIBILITY = {
  base: 1.0,
  /** At night an unlit machine is easy to miss; LED panel research fixes it. */
  nightUnlit: 0.8,
  ledPanel: 1.12,
} as const;

export const RIVAL = {
  name: 'Brightvend',
  /** Rival arrives with chapter 3. */
  arrivesChapter: 3,
  /** Business hours between rival decisions. */
  decisionEveryHours: 12,
  /** Max rival machines as a multiple of the player's (keeps it beatable). */
  maxFleetRatio: 1.1,
  startFleet: 3,
  priceUndercut: 0.08,
  /** Rival growth slows as the player's share rises. */
  growthChance: 0.65,
  /** Chance per expiring contract the rival steals it when venue mood < this. */
  stealMoodBelow: 0.55,
  stealChance: 0.5,
  /** Rival per-machine sales baseline as a share of an equivalent player machine. */
  efficiency: 0.85,
} as const;

export const PRESTIGE = {
  /** Valuation = lifetime net × multiple + fleet value. */
  netMultiple: 0.35,
  machineValueShare: 0.5,
  /** Reputation = floor(sqrt(valuation_dollars / divisor)). */
  reputationDivisor: 2_000,
} as const;

export const ADS = {
  doubleEarningsMinutes: 30,
  freeCapsulePullsPerDay: 3,
} as const;

export const PURCHASES = {
  removeAdsOfflineCapMultiplier: 1.25,
  starterPackCashCents: 200_000,
} as const;

export const NOTIFICATIONS = {
  maxPerDay: 3,
  quietStartHour: 22,
  quietEndHour: 8,
} as const;

export const SAVE = {
  autosaveMs: 30_000,
  logLimit: 200,
} as const;
