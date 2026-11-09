/**
 * Economy tuning (SPEC §5). Data only. All money is in integer cents.
 *
 * TIME MODEL — read this first.
 * The *world clock* is real: hourly demand curves, lighting and weather use the
 * city's real local time. The *business clock* runs faster: one real minute
 * simulates `salesTimeScale` business minutes of trade. Every "per day" value
 * below (power, wages, contract terms, breakdown rates) is per business day,
 * i.e. 24 h / salesTimeScale of real time (90 real minutes at 16×).
 *
 * Why: a 1:1 clock makes chapter 1 take weeks. 60× (until 2026-11-08) sold a
 * full machine in ~10 minutes and felt like money printing; 12× (briefly) felt
 * slow; 16× (2026-11-08) felt a little slow too, so the owner sped it up to 24×
 * (2026-11-08), then went back to 16× (2026-11-09). This one knob sets the pace; see SPEC §4.8 and
 * docs/spikes/M1-REPORT.md.
 */
export const TIME = {
  salesTimeScale: 16,
  /** Live tick length (real ms). */
  liveTickMs: 60_000,
  /** Offline catch-up step (real minutes) — SPEC §5.1: 15-minute buckets. */
  offlineStepMinutes: 15,
  /**
   * Adaptive catch-up (owner's call, 2026-11-05): fine steps for the first
   * hours of an absence, then coarser ones, so 72 h with a big fleet stays
   * fast on Hermes. Same rules and expected sales; coarser timing later on.
   */
  offlineFineHours: 3,
  offlineCoarseStepMinutes: 60,
  /** Offline progress cap (real hours) before upgrades — SPEC §5.1. */
  offlineCapHours: 72,
  /** Long catch-ups run in slices of about this much JS time per frame (keeps the UI alive). */
  catchUpSliceMs: 12,
} as const;

/**
 * Trusted time (src/services/clock.ts): the game runs on the data API's clock,
 * so changing the phone's clock doesn't speed machines up (owner's call, 2026-11-08).
 */
export const CLOCK = {
  /** A save this far ahead of real time counts as "clock was ahead" (the city waits). */
  toleranceMs: 5 * 60_000,
  /** Clock check request timeout. */
  timeoutMs: 5000,
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

/**
 * Per-city traffic calibration. Open map data is much denser in some cities
 * (Paris) than others (Tokyo), so raw traffic isn't comparable. Each city's
 * cells are scaled so its downtown (district 1) 75th-percentile noon traffic
 * hits this target: pacing is the same everywhere, while spots within a city
 * keep their real relative differences.
 */
export const CALIBRATION = {
  targetP75NoonTraffic: 380,
  districtRadiusKm: 1.2,
  minScale: 0.03,
  maxScale: 8,
} as const;

/** How much of an "interested" customer's choice is product fit vs. random. */
export const FIT = {
  /** Base purchase propensity once a customer stops at a machine. */
  baseBuy: 0.72,
  /** Below this many stocked slots, customers who don't find their thing leave. */
  selectionRef: 6,
  /** At most this share of stopping customers buy something. */
  maxBuy: 0.95,
  /** Weather "pull" (how many stop at all, from the stocked products' weather fit) is clamped to this range. */
  pullMin: 0.5,
  pullMax: 1.8,
  /** Tag fit multipliers are clamped to this range. */
  min: 0.35,
  max: 1.8,
} as const;

/** The coin bubble over machines on the map; tapping any one collects every machine (owner's call, 2026-11-08). */
export const CASH_BUBBLE = {
  /** Show it once a machine's cash box holds at least this much. */
  minCents: 500,
  /** Hidden when zoomed out further than this. */
  minZoom: 13,
} as const;

export const SERVICE = {
  /** Van capacity in items per level (level 0 = car boot). */
  vanCapacityByLevel: [120, 300, 600, 1200],
  vanUpgradeCostCents: [0, 450_000, 1_200_000, 3_000_000],
  /** The chapter-2 goal "buy a van" means reaching level 1. */
  /** Fuel per km of route (straight-line × routeFactor). Was 22 before deliveries were made cheap (2026-11-08). */
  fuelCentsPerKm: 6,
  /**
   * Restock orders (your vans and drivers') pay this share of a product's
   * wholesale list price: deliveries made much cheaper at the owner's request
   * (2026-11-08). The warehouse discount applies on top.
   */
  deliveryStockShare: 0.5,
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
  /**
   * Drivers come with their own van (owner's call, 2026-11-08): rent one for a
   * short while, extend the rental for the same price, or buy the van for good.
   * A rental is all-in (no wages); an owned van's driver earns a daily wage.
   */
  driverRentCents: 100_000,
  /** How long one rental (or one extension) lasts, in business days. */
  driverRentBusinessDays: 3,
  /** Buying a driver's van for good (or hiring one that way straight away). */
  driverOwnCents: 500_000,
  /** Daily wage of a driver whose van you own (rented drivers have none). */
  driverWageCentsPerDay: 9_000,
  /** Stops a driver can run per route. */
  stopsPerRoute: 8,
  /**
   * Real minutes between a driver's route runs (owner's call, 2026-11-09: every
   * 15 real minutes; was 6 business hours, about 22 minutes at 16×).
   */
  routeIntervalMinutes: 15,
  /** Items a driver carries per run (warehouse raises this). */
  driverCapacity: 600,
  /**
   * Catch-up: most route runs one driver makes in one sim step. Coarse offline
   * steps (60 min) hold 10 runs at the 6-business-hour interval; runs past
   * this are skipped, which keeps long catch-ups bounded.
   */
  maxRunsPerStep: 12,
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

/** Placing, selling and pricing machines (src/sim/actions.ts). */
export const PLACEMENT = {
  /** Two machines (yours or the rival's) can't stand closer than this (m). */
  minSpacingM: 8,
  /** Selling a machine refunds this share of its purchase price. */
  sellRefundShare: 0.4,
} as const;

/** Price setting limits (src/sim/actions.ts setPrice). */
export const PRICING = {
  /** Highest price: this multiple of the suggested price. */
  maxSuggestedMultiple: 3,
  /** Lowest price: this multiple of the wholesale price. */
  minWholesaleMultiple: 0.5,
  /** Prices snap to this step (cents). */
  stepCents: 5,
} as const;

/** One-time permits (company screen). */
export const PERMITS = {
  liquorCents: 1_500_000,
} as const;

/** Research effects not covered elsewhere (src/sim/advance.ts). */
export const RESEARCH_EFFECTS = {
  /** Cooler: hot and cold products fit this much better. */
  coolerHotColdFit: 1.05,
  /** Cooler: refrigerated machines break down this much as often. */
  coolerFridgeBreakdown: 0.6,
} as const;

export const CONTRACT = {
  termsDays: [30, 90, 180] as const,
  /**
   * Longer terms earn a lower commission ask (points off the venue's cut; raised
   * 2026-11-09 so the term clearly matters: was 0 / 2 / 4).
   */
  termDiscount: { 30: 0, 90: 0.03, 180: 0.06 } as Record<number, number>,
  /**
   * The free starter machine's contract is permanent (owner's call, 2026-11-09):
   * no term, never up for renewal, priced like the longest term.
   */
  permanentTermDays: 0,
  /** Exclusivity: rival can't place within the radius; costs extra commission. */
  exclusivityCommission: 0.04,
  /** Exclusive contracts open in this chapter (when Brightvend expands, owner 2026-11-09). */
  exclusivityChapter: 3,
  exclusivityRadiusM: 250,
  commissionMin: 0.1,
  commissionMax: 0.35,
  /** Renegotiation (chapter-1 unlock) can shave this much, once per contract (never below commissionMin). */
  renegotiateDiscount: 0.03,
  /** The venue only renegotiates at or above this mood. */
  renegotiateMinMood: 0.6,
  /**
   * Venue mood (0..1) moves in REAL hours, not business days. Venues judge
   * service on a human clock: on the (then 60×) business clock an unattended machine
   * lost its contract within an hour of selling out, so every chapter-1
   * player lost their machines overnight. Now an empty machine survives a
   * night away; a contract ends after roughly two days of neglect.
   */
  moodRecoverPerHour: 0.05,
  moodLossEmptyPerHour: 0.02,
  moodLossBrokenPerHour: 0.03,
  terminateBelow: 0.2,
  /** Real hours the mood must stay below `terminateBelow` before termination. */
  terminateAfterHours: 24,
} as const;

export const RISK = {
  /** Theft: base chance per business day for an average spot. */
  /**
   * Breakdowns, theft and alcohol incidents roll on REAL time: each real day
   * counts as this many "risk days" for the per-day rates (machine
   * `breakdownPerDay`, `theftBasePerDay`, `alcoholIncidentPerDay`). On the (then 60×)
   * business clock a starter machine left for a night broke down 56% of the
   * time and was robbed 68% of the time; now a night away is a small risk.
   */
  riskDaysPerRealDay: 4,
  theftBasePerDay: 0.03,
  theftIsolationWeight: 1.6,
  theftNightWeight: 0.8,
  /** Theft "night" (local hours): from nightStartHour until nightEndHour. */
  nightStartHour: 22,
  nightEndHour: 6,
  /** Share of breakdowns in refrigerated machines that are fridge failures (the rest jam). */
  fridgeFailureShare: 0.5,
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
  /** A cell's store count is shared with its neighbors: this share counts at a machine. */
  storeCellShare: 0.5,
} as const;

export const VISIBILITY = {
  base: 1.0,
  /** At night an unlit machine is easy to miss; LED panel research fixes it. */
  nightUnlit: 0.8,
  /** Visibility "night" (local hours): from nightStartHour until nightEndHour. */
  nightStartHour: 20,
  nightEndHour: 6,
  ledPanel: 1.12,
} as const;

export const RIVAL = {
  name: 'Brightvend',
  /** The rival's owner, a fictional character with a face (portrait: src/ui/RivalPortrait.tsx). */
  owner: 'Rex Brightley',
  /**
   * Chapter the rival ramps up (its full fleet arrives, it bids for contracts
   * and counts fully as a competitor). Before this it runs a small early fleet.
   */
  arrivesChapter: 3,
  /**
   * Day one (SPEC §4.6): one rival machine opens near your first machine once
   * the tutorial is through (first sale and first collect) and you have sold
   * `afterSalesCents` in total. Gentle until chapter 3.
   */
  early: {
    afterSalesCents: 15_000,
    /** Max rival machines by chapter before the ramp. */
    maxMachines: { 1: 1, 2: 2 } as Record<number, number>,
    /** Competitor weight of a rival machine before the ramp (1.25 after). */
    competitorWeight: 0.5,
    /** The first rival machine opens this far from your first machine (inside COMPETITION.radiusM). */
    placeMinM: 90,
    placeMaxM: 200,
  },
  /** Competitor weight of a rival machine from the ramp on (it undercuts). */
  competitorWeight: 1.25,
  /** Share of your nearby sales that counts as lost to the rival for the map's "sting" pop. */
  sting: {
    /** Min real ms between two stings (a customer walking to the rival instead). */
    minGapMs: 75_000,
    /** Chance per live minute (cooldown over, a rival machine near one of yours). */
    chancePerMinute: 0.45,
  },
  /** "Undercut" counter-move: your nearby prices drop to this share of suggested. */
  counterPriceRatio: 0.9,
  /** Share lead (above or below 50%) before "you passed them" / "they passed you" fires. */
  leadHysteresis: 0.06,
  /** Both rolling revenues must reach this (cents) before the lead is judged. */
  leadMinCents: 2_000,
  /** Min real ms between two rival cards (taunts); arrivals always show. */
  tauntMinGapMs: 4 * 60_000,
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

/** The Spot Card's ratings and warnings (src/sim/spot.ts). */
export const SPOT_CARD = {
  /**
   * Customers per business hour (DEMAND_SCALE included, like the sim) that
   * count as a "decent" spot: 3 stars. 18 before the card used DEMAND_SCALE.
   */
  decentCustomersPerHour: 18 * DEMAND_SCALE,
  /** Below this share of decent: "Few people pass here." */
  fewPeopleShare: 0.35,
  /** Nearby places listed within this radius (m). */
  nearbyRadiusM: 400,
  /** Theft score thresholds (per-day rate incl. isolation and night share). */
  theftHighAbove: 0.09,
  theftMediumAbove: 0.05,
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
  /** Double Profits (one-time): every sale pays this share of its revenue on top. */
  doubleProfitsSalesBonus: 1,
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
