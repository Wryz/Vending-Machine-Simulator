import {
  CASH,
  CONTRACT,
  FIT,
  RESEARCH_EFFECTS,
  RISK,
  RIVAL,
  SERVICE,
  STAFF,
  TIME,
} from '@/config/economy';
import { CHAPTER_GOALS as CHAPTER_GOALS_REF, type ResearchId } from '@/config/progression';
import { SURPRISES } from '@/config/surprises';
import { getMachineType, type MachineFamily, type MachineType } from '@/config/machines';
import { getProduct, type Product } from '@/config/products';
import type { CellData, WeatherHour } from '@/data/types';

import { cloneState, collectCash } from './actions';
import {
  baseTraffic,
  customersPerHour,
  hasResearch,
  isNoBoost,
  priceResponse,
  productFit,
  productWeatherFactor,
  tagBoostFactor,
  type TrafficBreakdown,
} from './demand';
import {
  dealSavingCents,
  expireSurprises,
  maintainEvents,
  rollSurprise,
  surpriseBoost,
  type SurpriseNews,
} from './events';
import { bump, checkAchievements, rollGoalsDay } from './goals';
import { addLedger, log, rollLedgerDay } from './ledger';
import { rankingsStep, type RankBoard } from './rankings';
import { arriveDeliveries, dispatchDriver, type DeliveryNews } from './deliveries';
import { rollRequest, serveRequests, type RequestNews } from './requests';
import { happens, nextRandom, poisson } from './rng';
import {
  playerShare,
  rivalCap,
  rivalDecide,
  rivalMachineId,
  rivalRevenue,
  rivalSting,
  updateLead,
  type RivalNews,
  type RivalSting,
} from './rival';
import {
  activeMachines,
  cashBoxCapacity,
  competition,
  isEmpty,
  maxOfflineMs,
  machineFresh,
  overheadCentsPerDay,
  rivalWeight,
  salesMultiplierBase,
} from './rules';
import type { GameState, Machine, SimOptions, World } from './state';
import {
  businessDays,
  businessDaysToMs,
  businessHours,
  businessHoursToMs,
  localTime,
  type LocalTime,
} from './time';

export interface AdvanceReport {
  fromAt: number;
  toAt: number;
  /** Real ms skipped because of the offline cap. */
  skippedMs: number;
  salesCents: number;
  units: number;
  cashDeltaCents: number;
  costsCents: number;
  breakdowns: number;
  thefts: number;
  becameEmpty: string[];
  cashBoxFull: string[];
  contractsLost: string[];
  spoiledUnits: number;
  driverRuns: number;
  chaptersCompleted: number[];
  events: string[];
  /** Sales per machine during this advance (ticker, receipts). */
  perMachine: Record<string, { units: number; cents: number }>;
  /** Trophies unlocked during this advance. */
  achievements: string[];
  /** Research the lab finished (it now applies). */
  researchDone: { id: ResearchId; key: MachineFamily | '*' }[];
  /** What the rival did (its taunt cards). */
  rival: RivalNews[];
  /** Customers who bought at the rival's next to yours (live play only; map moments). */
  stings: RivalSting[];
  /** Surprise moments: VIP customer, jackpot hour, venue deal (live play only). */
  surprises: SurpriseNews[];
  /** Customer requests: new ones (live play only), served and given up. */
  requests: RequestNews[];
  /** Restock vans that arrived (or brought the stock back). */
  deliveries: DeliveryNews[];
  /** The latest nightly ranking board taken during this advance (one per advance). */
  rankUpdate?: RankBoard;
}

const EMPTY_CELL: CellData = {
  id: '',
  lat: 0,
  lng: 0,
  pop: 400,
  counts: {},
  nearby: {},
  places: [],
  competitors: 0,
  isolation: 0.6,
};

function newReport(from: number): AdvanceReport {
  return {
    fromAt: from,
    toAt: from,
    skippedMs: 0,
    salesCents: 0,
    units: 0,
    cashDeltaCents: 0,
    costsCents: 0,
    breakdowns: 0,
    thefts: 0,
    becameEmpty: [],
    cashBoxFull: [],
    contractsLost: [],
    spoiledUnits: 0,
    driverRuns: 0,
    chaptersCompleted: [],
    events: [],
    perMachine: {},
    achievements: [],
    researchDone: [],
    rival: [],
    stings: [],
    surprises: [],
    requests: [],
    deliveries: [],
  };
}

/**
 * Caches for one (local hour, rest day) pair. Traffic and fit depend only on the
 * cell, the hour and the day type, so hourly catch-up steps reuse them every day.
 */
interface HourCache {
  /** Product fit by cell, then product id (nested maps: no string keys in the hot loop). */
  fit: Map<string, Map<string, number>>;
  /** Place affinity by cell, then product tag (products share tags). */
  affinity: Map<string, Map<string, number>>;
  /** Base traffic by cell. */
  traffic: Map<string, TrafficBreakdown>;
}

/** Caches for one step: the hour caches plus what depends on this step's weather and perks. */
interface StepCache extends HourCache {
  /** sqrt(productWeatherFactor) by product id (same weather for every machine in a step). */
  weatherFit: Map<string, number>;
  /** salesMultiplier without the fresh-stock bonus, by machine family. */
  salesBase: Map<string, number>;
}

/** Scratch arrays reused by sellStep (it never re-enters), to spare the garbage collector. */
const FITS: number[] = [];
const PRODUCTS: (Product | null)[] = [];
const EXPECTED: number[] = [];
const UNITS: number[] = [];

function fitFor(
  cache: StepCache,
  cellId: string,
  product: Product,
  traffic: TrafficBreakdown,
  hour: number,
): number {
  let byProduct = cache.fit.get(cellId);
  if (!byProduct) cache.fit.set(cellId, (byProduct = new Map()));
  let f = byProduct.get(product.id);
  if (f === undefined) {
    let aff = cache.affinity.get(cellId);
    if (!aff) cache.affinity.set(cellId, (aff = new Map()));
    f = productFit(product, traffic, hour, aff);
    byProduct.set(product.id, f);
  }
  return f;
}

const HOT_COLD = (p: Product) => p.tags.includes('hot') || p.tags.includes('cold');
const FRIDGE_FAMILIES = new Set(['drink', 'coffee', 'fresh', 'ice', 'noodles', 'pizza', 'alcohol']);

/** Sales for one machine over `bh` business hours. Returns gross revenue. */
function sellStep(
  state: GameState,
  world: World,
  m: Machine,
  type: MachineType,
  ctx: {
    local: LocalTime;
    weather: WeatherHour | null;
    competitors: number;
    t: number;
    bh: number;
    cache: StepCache;
    /** Purchased bonus as a share of revenue (Double Profits = 1). */
    salesBonus: number;
  },
  report: AdvanceReport,
): number {
  if (m.broken || isEmpty(m)) return 0;
  const cell = world.cells.get(m.cellId) ?? EMPTY_CELL;
  let cellTraffic = ctx.cache.traffic.get(cell.id);
  if (!cellTraffic) {
    cellTraffic = baseTraffic(cell, ctx.local.hour, ctx.local.restDay);
    ctx.cache.traffic.set(cell.id, cellTraffic);
  }
  const { customers, traffic, tagBoost } = customersPerHour(m, state, {
    cell,
    local: ctx.local,
    weather: ctx.weather,
    competitors: ctx.competitors,
    events: state.events,
    t: ctx.t,
    traffic: cellTraffic,
  });
  if (customers <= 0) return 0;
  let multBase = ctx.cache.salesBase.get(type.family);
  if (multBase === undefined) {
    multBase = salesMultiplierBase(state, type);
    ctx.cache.salesBase.set(type.family, multBase);
  }
  // Jackpot hour (a surprise) boosts this spot for a while.
  const mult =
    (machineFresh(m, ctx.t) ? multBase * (1 + SERVICE.freshStockBonus) : multBase) *
    surpriseBoost(state, m.id, ctx.t);
  const cooler = hasResearch(state, 'cooler', type.family);
  const noBoost = isNoBoost(tagBoost);

  // Each stocked slot draws customers in proportion to its fit; a thin
  // selection (fewer than SELECTION_REF slots) loses customers who don't find
  // what they want. Total purchases never exceed the customers who stopped.
  const slots = m.slots;
  const n = slots.length;
  const fits = FITS;
  const products = PRODUCTS;
  let stocked = 0;
  let weatherSum = 0;
  for (let i = 0; i < n; i++) {
    const s = slots[i];
    if (s.qty <= 0 || !s.productId) {
      fits[i] = 0;
      products[i] = null;
      continue;
    }
    const p = getProduct(s.productId);
    products[i] = p;
    // Weather works two ways: it changes what people pick (fit) and how many
    // stop at all (pull). Split as a square root so the total effect is the
    // product's weather factor.
    let w = ctx.cache.weatherFit.get(p.id);
    if (w === undefined) {
      w = Math.sqrt(productWeatherFactor(p, ctx.weather));
      ctx.cache.weatherFit.set(p.id, w);
    }
    weatherSum += w;
    fits[i] =
      fitFor(ctx.cache, cell.id, p, traffic, ctx.local.hour) *
      (noBoost ? 1 : tagBoostFactor(p, tagBoost)) *
      w *
      (cooler && HOT_COLD(p) ? RESEARCH_EFFECTS.coolerHotColdFit : 1);
    stocked++;
  }
  if (!stocked) return 0;
  const pull = Math.min(FIT.pullMax, Math.max(FIT.pullMin, weatherSum / stocked));
  const customersPulled = customers * pull;
  const denom = Math.max(stocked, FIT.selectionRef);
  const cardShare = hasResearch(state, 'card-reader', type.family) ? CASH.cardShare : 0;
  const expected = EXPECTED;
  let sumExpected = 0;
  for (let i = 0; i < n; i++) {
    const p = products[i];
    const s = slots[i];
    const e =
      !fits[i] || !s.productId || !p
        ? 0
        : customersPulled *
          mult *
          ctx.bh *
          (fits[i] / denom) *
          FIT.baseBuy *
          priceResponse(s.priceCents / p.suggestedCents);
    expected[i] = e;
    sumExpected += e;
  }
  const ceiling = customersPulled * mult * ctx.bh * FIT.maxBuy;
  const scale = sumExpected > ceiling ? ceiling / sumExpected : 1;
  const units = UNITS;
  let revenue = 0;
  for (let i = 0; i < n; i++) {
    const e = expected[i];
    units[i] = e > 0 ? Math.min(slots[i].qty, poisson(state, e * scale)) : 0;
    revenue += units[i] * slots[i].priceCents;
  }
  if (revenue <= 0) return 0;

  // Cash box capacity: cash customers are turned away once it is full.
  const cap = cashBoxCapacity(state, type);
  const cashRevenue = revenue * (1 - cardShare);
  const room = Math.max(0, cap - m.cashBoxCents);
  if (cashRevenue > room) {
    const allowed = cashRevenue > 0 ? room / cashRevenue : 0;
    const keep = cardShare + (1 - cardShare) * allowed;
    revenue = 0;
    for (let i = 0; i < n; i++) {
      units[i] = Math.floor(units[i] * keep);
      revenue += units[i] * slots[i].priceCents;
    }
  }

  let sold = 0;
  for (let i = 0; i < n; i++) {
    slots[i].qty -= units[i];
    sold += units[i];
  }
  if (sold === 0) return 0;

  const card = Math.round(revenue * cardShare);
  const cash = revenue - card;
  m.cashBoxCents += cash;
  if (card > 0) {
    const commission = Math.round(card * m.contract.commission);
    const fee = Math.round(card * CASH.cardFee);
    state.cashCents += card - commission - fee;
    state.ledger.lifetimeNetCents += card - commission - fee;
    addLedger(state, 'Commission', -commission);
    addLedger(state, 'Card fees', -fee);
  }
  // Bonuses are paid on top of sales (ad boost + Double Profits stack additively).
  // They are ledger 'Bonus', not sales: lifetime sales and chapter goals ignore them.
  const bonusShare = (ctx.t < state.boosts.doubleEarningsUntil ? 1 : 0) + ctx.salesBonus;
  if (bonusShare > 0) {
    const bonus = Math.round(revenue * bonusShare);
    state.cashCents += bonus;
    addLedger(state, 'Bonus', bonus);
  }
  // Venue deal (a surprise): the commission saved on this sale is credited at once.
  const saving = dealSavingCents(state, m, revenue, ctx.t);
  if (saving > 0) {
    state.cashCents += saving;
    state.ledger.lifetimeNetCents += saving;
    addLedger(state, 'Commission', saving);
  }
  addLedger(state, 'Sales', revenue);
  m.stats.unitsTotal += sold;
  m.stats.revenueTotalCents += revenue;
  m.stats.revenueRecentCents += revenue;
  m.stats.lastSaleAt = ctx.t;
  state.ledger.lifetimeSalesCents += revenue;
  state.ledger.lifetimeUnits += sold;
  state.ledger.recentPlayerCents += revenue;
  report.salesCents += revenue;
  report.units += sold;
  bump(state, 'sales', revenue);
  bump(state, 'units', sold);
  const pm = (report.perMachine[m.id] ??= { units: 0, cents: 0 });
  pm.units += sold;
  pm.cents += revenue;
  if (m.cashBoxCents >= cap && !report.cashBoxFull.includes(m.id)) {
    report.cashBoxFull.push(m.id);
    log(state, 'cash-full', 'Cash box full', m.id);
  }
  return revenue;
}

function risksStep(
  state: GameState,
  world: World,
  m: Machine,
  type: MachineType,
  local: LocalTime,
  t: number,
  /** Risk days this step covers (real time, see RISK.riskDaysPerRealDay). */
  riskDays: number,
  report: AdvanceReport,
): number {
  let costs = 0;
  // Technician (research) fixes breakdowns after a delay.
  if (m.broken?.techFixAt && t >= m.broken.techFixAt) {
    m.broken = null;
    costs += SERVICE.technicianRepairCostCents;
    addLedger(state, 'Repairs', -SERVICE.technicianRepairCostCents);
    log(state, 'repair', 'Technician fixed the machine', m.id);
  }
  if (!m.broken) {
    const fridge = type.holds.some((f) => FRIDGE_FAMILIES.has(f));
    const cooler = hasResearch(state, 'cooler', type.family);
    const rate =
      type.breakdownPerDay * (fridge && cooler ? RESEARCH_EFFECTS.coolerFridgeBreakdown : 1);
    if (happens(state, rate, riskDays)) {
      const kind = fridge && nextRandom(state) < RISK.fridgeFailureShare ? 'fridge' : 'jam';
      const tech = hasResearch(state, 'technician', type.family);
      m.broken = {
        kind,
        since: t,
        techFixAt: tech ? t + businessHoursToMs(SERVICE.technicianDelayHours) : null,
      };
      report.breakdowns++;
      log(state, 'breakdown', kind === 'fridge' ? 'Refrigeration failure' : 'Coil jammed', m.id);
    }
  }
  // Theft & vandalism: loss of cash and stock, never the machine.
  const cell = world.cells.get(m.cellId) ?? EMPTY_CELL;
  const night = local.hour < RISK.nightEndHour || local.hour >= RISK.nightStartHour;
  let theftRate =
    RISK.theftBasePerDay *
    type.theftRisk *
    (1 + RISK.theftIsolationWeight * cell.isolation) *
    (night ? 1 + RISK.theftNightWeight : 1);
  if (hasResearch(state, 'security-cage', type.family)) theftRate *= 1 - RISK.securityCageReduction;
  if (hasResearch(state, 'camera', type.family)) theftRate *= 1 - RISK.cameraReduction;
  if (happens(state, theftRate, riskDays)) {
    const lostCash = Math.round(m.cashBoxCents * RISK.theftCashLoss);
    m.cashBoxCents -= lostCash;
    let lostUnits = 0;
    for (const s of m.slots) {
      const l = Math.floor(s.qty * RISK.theftStockLoss);
      s.qty -= l;
      lostUnits += l;
    }
    addLedger(state, 'Theft', -lostCash);
    report.thefts++;
    log(
      state,
      'theft',
      `Break-in: lost $${(lostCash / 100).toFixed(2)} and ${lostUnits} items`,
      m.id,
      -lostCash,
    );
  }
  // Alcohol incidents and fines.
  if (type.family === 'alcohol') {
    const rate =
      RISK.alcoholIncidentPerDay *
      (hasResearch(state, 'id-check', type.family) ? 1 - RISK.idCheckIncidentReduction : 1);
    if (happens(state, rate, riskDays)) {
      costs += RISK.alcoholFineCents;
      addLedger(state, 'Fines', -RISK.alcoholFineCents);
      log(state, 'fine', 'Fined for an underage sale', m.id, -RISK.alcoholFineCents);
    }
  }
  return costs;
}

function spoilStep(state: GameState, m: Machine, t: number, report: AdvanceReport): void {
  for (const s of m.slots) {
    if (!s.productId || s.qty <= 0) continue;
    const p = getProduct(s.productId);
    if (p.shelfLifeHours && businessHours(t - s.stockedAt) > p.shelfLifeHours) {
      report.spoiledUnits += s.qty;
      log(state, 'spoiled', `${s.qty} × ${p.name} spoiled`, m.id);
      s.qty = 0;
    }
  }
}

function contractStep(
  state: GameState,
  world: World,
  m: Machine,
  t: number,
  /** Real hours this step covers (mood runs on real time, see CONTRACT). */
  hours: number,
  report: AdvanceReport,
  /**
   * Share of the step the machine stood empty (0..1). Default: judged by
   * whether it is empty now. Catch-up passes it for machines on a driver's
   * route, which are refilled several times within a coarse step.
   */
  emptyShare?: number,
): void {
  if (m.broken) m.mood -= CONTRACT.moodLossBrokenPerHour * hours;
  else if (emptyShare !== undefined)
    m.mood +=
      (CONTRACT.moodRecoverPerHour * (1 - emptyShare) - CONTRACT.moodLossEmptyPerHour * emptyShare) *
      hours;
  else if (isEmpty(m)) m.mood -= CONTRACT.moodLossEmptyPerHour * hours;
  else m.mood += CONTRACT.moodRecoverPerHour * hours;
  m.mood = Math.min(1, Math.max(0, m.mood));

  const lose = (why: string) => {
    collectCash(state, m.id);
    m.status = 'stored';
    report.contractsLost.push(m.id);
    log(
      state,
      'contract-lost',
      `${m.venue.name} ended your contract: ${why}. The machine is back in storage.`,
      m.id,
    );
  };

  if (m.mood < CONTRACT.terminateBelow) {
    m.lowMoodSince ??= t;
    if (t - m.lowMoodSince >= CONTRACT.terminateAfterHours * 3_600_000) {
      lose('poor service');
      return;
    }
  } else m.lowMoodSince = null;

  if (t >= m.contract.endsAt) {
    // Contract bids start with the rival's chapter-3 ramp.
    const rivalBids =
      state.rival.ramped &&
      !m.contract.exclusive &&
      m.venue.category !== 'street' &&
      m.mood < RIVAL.stealMoodBelow &&
      nextRandom(state) < RIVAL.stealChance &&
      // Its fleet stays within its cap (judged with this machine still yours).
      state.rival.machines.length < rivalCap(state);
    if (rivalBids) {
      lose(`${RIVAL.name} outbid you`);
      const rivalId = rivalMachineId(state);
      report.rival.push({ kind: 'steal', rivalId, machineId: m.id });
      state.rival.machines.push({
        id: rivalId,
        lat: m.lat,
        lng: m.lng,
        cellId: m.cellId,
        typeId: 'snack',
        placedAt: t,
      });
      return;
    }
    m.contract.startedAt = t;
    m.contract.endsAt = t + businessDaysToMs(m.contract.termDays);
    m.contract.renegotiated = false;
    log(state, 'contract-renewed', `${m.venue.name} renewed your contract`, m.id);
  }
  void world;
}

function checkChapters(state: GameState, t: number, report: AdvanceReport): void {
  for (;;) {
    const ch = state.chapter;
    const active = activeMachines(state).length;
    let done = false;
    if (ch === 1) done = state.ledger.lifetimeSalesCents >= CHAPTER_GOALS_REF[1].salesCents;
    else if (ch === 2)
      done =
        active >= CHAPTER_GOALS_REF[2].machines && state.vanLevel >= CHAPTER_GOALS_REF[2].vanLevel;
    else if (ch === 3)
      done =
        active >= CHAPTER_GOALS_REF[3].machines &&
        state.drivers.length >= CHAPTER_GOALS_REF[3].drivers;
    else if (ch === 4)
      done =
        active >= CHAPTER_GOALS_REF[4].machines &&
        state.drivers.length >= CHAPTER_GOALS_REF[4].drivers;
    else if (ch === 5)
      done =
        state.rival.active &&
        state.ledger.recentPlayerCents > 0 &&
        playerShare(state) >= CHAPTER_GOALS_REF[5].share;
    else if (ch === 6)
      done =
        state.footprint.countries.length >= CHAPTER_GOALS_REF[6].countries &&
        state.ledger.lifetimeSalesCents - state.chapterStartSalesCents >=
          CHAPTER_GOALS_REF[6].salesCents;
    else if (ch === 7)
      done =
        state.footprint.continents.length >= CHAPTER_GOALS_REF[7].continents &&
        state.ledger.lifetimeSalesCents - state.chapterStartSalesCents >=
          CHAPTER_GOALS_REF[7].salesCents;
    if (!done) return;
    state.chapterDoneAt[ch] = t;
    state.chapter = ch + 1;
    state.chapterStartSalesCents = state.ledger.lifetimeSalesCents;
    report.chaptersCompleted.push(ch);
    log(state, 'chapter', `Chapter ${ch} complete`);
  }
}

/**
 * Advance the simulation to `to` (real epoch ms). Pure: returns a new state.
 * Steps are 1 real minute when live and 15 minutes for long gaps (SPEC §5.1).
 * Offline time beyond the cap (72 h + upgrades) is skipped.
 */
export function advance(
  state: GameState,
  world: World,
  to: number,
  opts: SimOptions = {},
): { state: GameState; report: AdvanceReport } {
  const job = beginAdvance(state, world, to, opts);
  job.run(Infinity);
  return { state: job.state, report: job.report };
}

/**
 * A catch-up that can run a few steps at a time, so the UI can paint between
 * chunks. Running it in any number of chunks gives exactly the same result as
 * `advance`. `state` is a private copy: don't touch it until `done`.
 */
export interface AdvanceJob {
  readonly state: GameState;
  readonly report: AdvanceReport;
  /** Runs up to `maxSteps` steps; returns true once the job is done. */
  run(maxSteps: number): boolean;
  /** Share of the simulated time already covered, 0..1. */
  progress(): number;
  done(): boolean;
}

export function beginAdvance(
  state: GameState,
  world: World,
  to: number,
  opts: SimOptions = {},
): AdvanceJob {
  const s = cloneState(state);
  const report = newReport(s.now);
  if (to <= s.now)
    return { state: s, report, run: () => true, progress: () => 1, done: () => true };
  const cap = maxOfflineMs(s, opts.offlineCapMultiplier ?? 1);
  const salesBonus = Math.max(0, opts.salesBonus ?? 0);
  // Live play (the app open and ticking): surprises and rival stings happen only then.
  const live = to - s.now <= SURPRISES.maxLiveGapMs;
  if (to - s.now > cap) {
    report.skippedMs = to - s.now - cap;
    s.now = to - cap;
    report.fromAt = s.now;
    // Rival decisions due in the skipped time are skipped too (not replayed in the first step).
    if (s.rival.nextDecisionAt < s.now) s.rival.nextDecisionAt = s.now;
  }
  const longGap = to - s.now > 15 * 60_000;
  const fineUntil = s.now + TIME.offlineFineHours * 3_600_000;
  // Live ticks for short gaps; for long ones 15-minute steps, then hourly after the first hours.
  const stepAt = (now: number) =>
    !longGap
      ? TIME.liveTickMs
      : now < fineUntil
        ? TIME.offlineStepMinutes * 60_000
        : TIME.offlineCoarseStepMinutes * 60_000;
  const startCash = s.cashCents;
  const hourCaches = new Map<string, HourCache>();
  let compIdx = competition(s, world);
  let comp = compIdx.values;
  const emptyBefore = new Set(
    activeMachines(s)
      .filter(isEmpty)
      .map((m) => m.id),
  );

  const from = s.now;
  const runIntervalMs = businessHoursToMs(STAFF.routeIntervalHours);
  const trackEmpty = (m: Machine) => {
    if (m.status === 'active' && isEmpty(m) && !emptyBefore.has(m.id)) {
      emptyBefore.add(m.id);
      report.becameEmpty.push(m.id);
      log(s, 'empty', 'Machine empty', m.id);
    } else if (!isEmpty(m)) emptyBefore.delete(m.id);
  };
  const step = () => {
    const lostBefore = report.contractsLost.length;
    const weightBefore = rivalWeight(s);
    const dt = Math.min(stepAt(s.now), to - s.now);
    const segFrom = s.now;
    const tMid = s.now + dt / 2;
    const tEnd = s.now + dt;
    const local = localTime(tMid, world.city.timeZone, world.city.countryCode);
    rollLedgerDay(s, local.dateKey);
    rollGoalsDay(s, local.dateKey);
    const evBefore = s.events.length;
    maintainEvents(s, world, tMid);
    // Vans that arrive in this step's first half stock up before it sells.
    for (const news of arriveDeliveries(s, tMid)) report.deliveries.push(news);
    for (let i = evBefore; i < s.events.length; i++) report.events.push(s.events[i].name);
    const weather = world.weatherAt(tMid);
    const bh = businessHours(dt);
    const bd = businessDays(dt);
    const hourKey = `${local.hour}|${local.restDay}`;
    let hc = hourCaches.get(hourKey);
    if (!hc)
      hourCaches.set(hourKey, (hc = { fit: new Map(), affinity: new Map(), traffic: new Map() }));
    const cache: StepCache = { ...hc, weatherFit: new Map(), salesBase: new Map() };
    let costs = 0;

    let powerCents = 0;
    // Rival machines before this step: contract steals (in the machine loop) and the
    // rival's own moves below both change them, and the competition index needs both.
    const rivalsBefore = s.rival.machines.slice();
    // One context per step (only `competitors` changes per machine): no allocation per machine.
    const sellCtx = { local, weather, competitors: 0, t: tMid, bh, cache, salesBonus };
    // Steps longer than a driver's route interval (offline catch-up) split the
    // sales of machines on a route at each run, so they're refilled (and their
    // cash boxes emptied) at about the live cadence instead of once per step.
    const split = s.drivers.length > 0 && dt > runIntervalMs;
    const driven = split ? new Set(s.drivers.flatMap((d) => d.machineIds)) : null;
    for (const m of s.machines) {
      if (m.status !== 'active') continue;
      const type = getMachineType(m.typeId);
      const onRoute = driven?.has(m.id) ?? false;
      sellCtx.competitors = comp.get(m.id) ?? 0;
      if (!onRoute) sellStep(s, world, m, type, sellCtx, report);
      powerCents += type.powerCentsPerDay * bd;
      costs += risksStep(
        s,
        world,
        m,
        type,
        local,
        tMid,
        (dt / 86_400_000) * RISK.riskDaysPerRealDay,
        report,
      );
      spoilStep(s, m, tMid, report);
      if (onRoute) continue;
      contractStep(s, world, m, tMid, dt / 3_600_000, report);
      trackEmpty(m);
    }

    // Drivers run their routes on a fixed business-hour interval.
    const runsDue = (until: number) => {
      for (const d of s.drivers) {
        while (d.nextRunAt <= until && (runs.get(d.id) ?? 0) < STAFF.maxRunsPerStep) {
          s.now = Math.max(s.now, Math.min(tEnd, d.nextRunAt));
          // Vans due by now have filled their machines before the next run is planned.
          for (const news of arriveDeliveries(s, s.now)) report.deliveries.push(news);
          const spent = dispatchDriver(s, world, d);
          if (spent > 0) report.driverRuns++;
          costs += spent;
          d.nextRunAt += runIntervalMs;
          runs.set(d.id, (runs.get(d.id) ?? 0) + 1);
        }
      }
    };
    const runs = new Map<string, number>();
    if (driven) {
      // Segment ends: each run time inside the step, then the step's end.
      const ends: number[] = [];
      for (const d of s.drivers)
        for (let k = 0, at = d.nextRunAt; at < tEnd && k < STAFF.maxRunsPerStep; k++) {
          ends.push(Math.max(segFrom, at));
          at += runIntervalMs;
        }
      ends.push(tEnd);
      ends.sort((a, b) => a - b);
      let from = segFrom;
      for (const end of ends) {
        if (end > from) {
          const len = end - from;
          const mid = from + len / 2;
          // Vans that reach their stop in this segment's first half fill it before it sells.
          for (const news of arriveDeliveries(s, mid)) report.deliveries.push(news);
          const segCtx = { ...sellCtx, t: mid, bh: businessHours(len) };
          for (const m of s.machines) {
            if (m.status !== 'active' || !driven.has(m.id)) continue;
            const emptyAtStart = isEmpty(m) ? 1 : 0;
            segCtx.competitors = comp.get(m.id) ?? 0;
            sellStep(s, world, m, getMachineType(m.typeId), segCtx, report);
            // Empty part of the time: half credit when it sold out during the segment.
            const emptyShare = (emptyAtStart + (isEmpty(m) ? 1 : 0)) / 2;
            contractStep(s, world, m, mid, len / 3_600_000, report, emptyShare);
          }
          from = end;
        }
        runsDue(end);
      }
      for (const m of s.machines) if (m.status === 'active' && driven.has(m.id)) trackEmpty(m);
    } else runsDue(tEnd);
    for (const d of s.drivers) if (d.nextRunAt <= tEnd) d.nextRunAt = tEnd + 1;

    // Fixed daily costs, prorated.
    const n = activeMachines(s).length;
    const fixed =
      Math.round(powerCents) +
      Math.round(overheadCentsPerDay(n) * bd) +
      Math.round(s.drivers.length * STAFF.driverWageCentsPerDay * bd) +
      Math.round((s.warehouse ? STAFF.warehouseRentCentsPerDay : 0) * bd);
    s.cashCents -= fixed;
    addLedger(s, 'Power', -Math.round(powerCents));
    addLedger(s, 'Overhead', -Math.round(overheadCentsPerDay(n) * bd));
    addLedger(s, 'Wages', -Math.round(s.drivers.length * STAFF.driverWageCentsPerDay * bd));
    if (s.warehouse) addLedger(s, 'Rent', -Math.round(STAFF.warehouseRentCentsPerDay * bd));
    costs += fixed;

    // Rival + market share window (half-life: one business day).
    const rivalWasActive = s.rival.active;
    const rivalMoved = rivalDecide(s, world, tMid, report.rival);
    if (rivalMoved && !rivalWasActive) {
      compIdx = competition(s, world);
      comp = compIdx.values;
    } else if (rivalMoved || s.rival.machines.length !== rivalsBefore.length) {
      const before = new Set(rivalsBefore);
      const after = new Set(s.rival.machines);
      compIdx.updateRivals(
        rivalsBefore.filter((r) => !after.has(r)),
        s.rival.machines.filter((r) => !before.has(r)),
      );
    }
    const rivalCents = rivalRevenue(s, world, local, bh, comp);
    s.ledger.recentRivalCents += rivalCents;
    // City ranking board: credit the week, take the nightly board at local midnight.
    const board = rankingsStep(s, local, rivalCents);
    if (board) report.rankUpdate = board;
    const decay = 0.5 ** bd;
    s.ledger.recentPlayerCents *= decay;
    s.ledger.recentRivalCents *= decay;
    for (const m of s.machines) m.stats.revenueRecentCents *= decay;
    updateLead(s, report.rival);
    if (live) {
      const sting = rivalSting(s, tMid);
      if (sting) report.stings.push(sting);
      const surprise = rollSurprise(s, tMid, { salesBonus });
      if (surprise) {
        report.surprises.push(surprise);
        report.salesCents += surprise.cents ?? 0;
        report.units += surprise.units ?? 0;
      }
      const request = rollRequest(s, world, tMid);
      if (request) report.requests.push(request);
    }
    expireSurprises(s, tEnd);
    for (const news of serveRequests(s, tEnd, { salesBonus })) {
      report.requests.push(news);
      if (news.kind === 'served') {
        report.salesCents += news.cents;
        report.units += 1;
      }
    }

    report.costsCents += costs;
    s.now = tEnd;
    // The lab finishes its research: it applies from now on.
    if (s.lab && s.lab.doneAt <= s.now) {
      const { id, key } = s.lab;
      s.research[id] = [...(s.research[id] ?? []), key];
      s.lab = null;
      report.researchDone.push({ id, key });
      log(s, 'info', 'Research finished in the lab');
    }
    checkChapters(s, s.now, report);
    for (const id of checkAchievements(s)) report.achievements.push(id);
    // Competition only changes when machines go: rebuild if this step lost a contract
    // (report.contractsLost is cumulative over the whole catch-up).
    if (report.contractsLost.length > lostBefore) {
      const gone = new Set(report.contractsLost.slice(lostBefore));
      compIdx.remove(s.machines.filter((m) => gone.has(m.id)));
    }
    // The rival's competitor weight steps up with its chapter-3 ramp: rebuild.
    if (rivalWeight(s) !== weightBefore) {
      compIdx = competition(s, world);
      comp = compIdx.values;
    }
  };

  return {
    state: s,
    report,
    run(maxSteps) {
      for (let i = 0; i < maxSteps && s.now < to; i++) step();
      report.toAt = s.now;
      report.cashDeltaCents = s.cashCents - startCash;
      return s.now >= to;
    },
    progress: () => (to > from ? Math.min(1, (s.now - from) / (to - from)) : 1),
    done: () => s.now >= to,
  };
}
