import { CASH, CONTRACT, FIT, RISK, RIVAL, SERVICE, STAFF, TIME } from '@/config/economy';
import { CHAPTER_GOALS as CHAPTER_GOALS_REF } from '@/config/progression';
import { getMachineType, type MachineType } from '@/config/machines';
import { getProduct, type Product } from '@/config/products';
import type { CellData, WeatherHour } from '@/data/types';

import { cloneState, collectCash, fuelCents } from './actions';
import {
  customersPerHour,
  hasResearch,
  priceResponse,
  productFit,
  productWeatherFactor,
  tagBoostFactor,
  type TrafficBreakdown,
} from './demand';
import { maintainEvents } from './events';
import { bump, checkAchievements, rollGoalsDay } from './goals';
import { orderStops } from './geo';
import { addLedger, log, rollLedgerDay } from './ledger';
import { happens, nextRandom, poisson } from './rng';
import { playerShare, rivalDecide, rivalRevenue } from './rival';
import {
  activeMachines,
  cashBoxCapacity,
  competition,
  driverCapacity,
  isEmpty,
  maxOfflineMs,
  overheadCentsPerDay,
  salesMultiplier,
  slotCapacity,
  wholesaleCents,
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
  };
}

/** Per-step caches: traffic per cell and fit per (cell, product). */
interface StepCache {
  /** Product fit by cell, then product id (nested maps: no string keys in the hot loop). */
  fit: Map<string, Map<string, number>>;
}

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
    f = productFit(product, traffic, hour);
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
  },
  report: AdvanceReport,
): number {
  if (m.broken || isEmpty(m)) return 0;
  const cell = world.cells.get(m.cellId) ?? EMPTY_CELL;
  const { customers, traffic, tagBoost } = customersPerHour(m, state, {
    cell,
    local: ctx.local,
    weather: ctx.weather,
    competitors: ctx.competitors,
    events: state.events,
    t: ctx.t,
  });
  if (customers <= 0) return 0;
  const mult = salesMultiplier(state, m, ctx.t);
  const cooler = hasResearch(state, 'cooler', type.family);

  // Each stocked slot draws customers in proportion to its fit; a thin
  // selection (fewer than SELECTION_REF slots) loses customers who don't find
  // what they want. Total purchases never exceed the customers who stopped.
  const fits: number[] = [];
  let stocked = 0;
  let weatherSum = 0;
  for (const s of m.slots) {
    if (s.qty <= 0 || !s.productId) {
      fits.push(0);
      continue;
    }
    const p = getProduct(s.productId);
    // Weather works two ways: it changes what people pick (fit) and how many
    // stop at all (pull). Split as a square root so the total effect is the
    // product's weather factor.
    const w = Math.sqrt(productWeatherFactor(p, ctx.weather));
    weatherSum += w;
    fits.push(
      fitFor(ctx.cache, cell.id, p, traffic, ctx.local.hour) *
        tagBoostFactor(p, tagBoost) *
        w *
        (cooler && HOT_COLD(p) ? 1.05 : 1),
    );
    stocked++;
  }
  if (!stocked) return 0;
  const pull = Math.min(1.8, Math.max(0.5, weatherSum / stocked));
  const customersPulled = customers * pull;
  const denom = Math.max(stocked, FIT.selectionRef);
  const cardShare = hasResearch(state, 'card-reader', type.family) ? CASH.cardShare : 0;
  const expected = m.slots.map((s, i) => {
    if (!fits[i] || !s.productId) return 0;
    const p = getProduct(s.productId);
    return (
      customersPulled *
      mult *
      ctx.bh *
      (fits[i] / denom) *
      FIT.baseBuy *
      priceResponse(s.priceCents / p.suggestedCents)
    );
  });
  const sumExpected = expected.reduce((a, b) => a + b, 0);
  const ceiling = customersPulled * mult * ctx.bh * FIT.maxBuy;
  const scale = sumExpected > ceiling ? ceiling / sumExpected : 1;
  const units: number[] = m.slots.map((s, i) =>
    expected[i] > 0 ? Math.min(s.qty, poisson(state, expected[i] * scale)) : 0,
  );
  let revenue = 0;
  m.slots.forEach((s, i) => (revenue += units[i] * s.priceCents));
  if (revenue <= 0) return 0;

  // Cash box capacity: cash customers are turned away once it is full.
  const cap = cashBoxCapacity(state, type);
  const cashRevenue = revenue * (1 - cardShare);
  const room = Math.max(0, cap - m.cashBoxCents);
  if (cashRevenue > room) {
    const allowed = cashRevenue > 0 ? room / cashRevenue : 0;
    const keep = cardShare + (1 - cardShare) * allowed;
    for (let i = 0; i < units.length; i++) units[i] = Math.floor(units[i] * keep);
    revenue = 0;
    m.slots.forEach((s, i) => (revenue += units[i] * s.priceCents));
  }

  let sold = 0;
  m.slots.forEach((s, i) => {
    s.qty -= units[i];
    sold += units[i];
  });
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
  if (ctx.t < state.boosts.doubleEarningsUntil) {
    state.cashCents += revenue;
    addLedger(state, 'Bonus', revenue);
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
  bd: number,
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
    const rate = type.breakdownPerDay * (fridge && cooler ? 0.6 : 1);
    if (happens(state, rate, bd)) {
      const kind = fridge && nextRandom(state) < 0.5 ? 'fridge' : 'jam';
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
  const night = local.hour < 6 || local.hour >= 22;
  let theftRate =
    RISK.theftBasePerDay *
    type.theftRisk *
    (1 + RISK.theftIsolationWeight * cell.isolation) *
    (night ? 1 + RISK.theftNightWeight : 1);
  if (hasResearch(state, 'security-cage', type.family)) theftRate *= 1 - RISK.securityCageReduction;
  if (hasResearch(state, 'camera', type.family)) theftRate *= 1 - RISK.cameraReduction;
  if (happens(state, theftRate, bd)) {
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
    if (happens(state, rate, bd)) {
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
  bd: number,
  report: AdvanceReport,
): void {
  if (m.broken) m.mood -= CONTRACT.moodLossBrokenPerDay * bd;
  else if (isEmpty(m)) m.mood -= CONTRACT.moodLossEmptyPerDay * bd;
  else m.mood += CONTRACT.moodRecoverPerDay * bd;
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
    if (t - m.lowMoodSince >= businessDaysToMs(CONTRACT.terminateAfterDays)) {
      lose('poor service');
      return;
    }
  } else m.lowMoodSince = null;

  if (t >= m.contract.endsAt) {
    const rivalBids =
      state.rival.active &&
      !m.contract.exclusive &&
      m.venue.category !== 'street' &&
      m.mood < RIVAL.stealMoodBelow &&
      nextRandom(state) < RIVAL.stealChance;
    if (rivalBids) {
      lose(`${RIVAL.name} outbid you`);
      state.rival.machines.push({
        id: `r${state.nextId++}`,
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

/** A driver's route run: collect cash and restock (auto-reorder to par when researched). */
function driverRun(
  state: GameState,
  world: World,
  machineIds: readonly string[],
  report: AdvanceReport,
): number {
  const stops = orderStops(
    world.city,
    machineIds
      .map((id) => state.machines.find((m) => m.id === id))
      .filter((m): m is Machine => !!m && m.status === 'active'),
  );
  if (!stops.length) return 0;
  let capacity = driverCapacity(state);
  let costs = 0;
  let restocked = 0;
  for (const m of stops) {
    collectCash(state, m.id);
    const type = getMachineType(m.typeId);
    const cap = slotCapacity(state, type);
    const autoReorder = hasResearch(state, 'auto-reorder', type.family);
    for (const s of m.slots) {
      if (!s.productId || capacity <= 0) continue;
      const target = autoReorder && s.par > 0 ? Math.min(cap, s.par) : cap;
      const need = Math.min(capacity, Math.max(0, target - s.qty));
      if (need <= 0) continue;
      const p = getProduct(s.productId);
      const cost = wholesaleCents(state, p) * need;
      if (cost > state.cashCents) break;
      state.cashCents -= cost;
      addLedger(state, 'Wholesale', -cost);
      costs += cost;
      // Mixing batches: keep the older stocked time only if most stock is old.
      if (s.qty < need) s.stockedAt = state.now;
      s.qty += need;
      capacity -= need;
      restocked += need;
    }
    m.lastVisitAt = state.now;
    if (hasResearch(state, 'telemetry', type.family))
      m.seen = { at: state.now, qty: m.slots.map((x) => x.qty), cashBoxCents: m.cashBoxCents };
  }
  const fuel = fuelCents(state, world, stops);
  state.cashCents -= fuel;
  addLedger(state, 'Fuel', -fuel);
  costs += fuel;
  report.driverRuns++;
  if (restocked > 0)
    log(state, 'driver', `Driver restocked ${restocked} items across ${stops.length} machines`);
  return costs;
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
    if (!done) return;
    state.chapterDoneAt[ch] = t;
    state.chapter = ch + 1;
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
  const s = cloneState(state);
  const report = newReport(s.now);
  if (to <= s.now) return { state: s, report };
  const cap = maxOfflineMs(s, opts.offlineCapMultiplier ?? 1);
  if (to - s.now > cap) {
    report.skippedMs = to - s.now - cap;
    s.now = to - cap;
    report.fromAt = s.now;
  }
  const longGap = to - s.now > 15 * 60_000;
  const stepMs = longGap ? TIME.offlineStepMinutes * 60_000 : TIME.liveTickMs;
  const startCash = s.cashCents;
  let compIdx = competition(s, world);
  let comp = compIdx.values;
  const emptyBefore = new Set(
    activeMachines(s)
      .filter(isEmpty)
      .map((m) => m.id),
  );

  while (s.now < to) {
    const lostBefore = report.contractsLost.length;
    const dt = Math.min(stepMs, to - s.now);
    const tMid = s.now + dt / 2;
    const tEnd = s.now + dt;
    const local = localTime(tMid, world.city.timeZone, world.city.countryCode);
    rollLedgerDay(s, local.dateKey);
    rollGoalsDay(s, local.dateKey);
    const evBefore = s.events.length;
    maintainEvents(s, world, tMid);
    for (let i = evBefore; i < s.events.length; i++) report.events.push(s.events[i].name);
    const weather = world.weatherAt(tMid);
    const bh = businessHours(dt);
    const bd = businessDays(dt);
    const cache: StepCache = { fit: new Map() };
    let costs = 0;

    let powerCents = 0;
    for (const m of s.machines) {
      if (m.status !== 'active') continue;
      const type = getMachineType(m.typeId);
      sellStep(
        s,
        world,
        m,
        type,
        { local, weather, competitors: comp.get(m.id) ?? 0, t: tMid, bh, cache },
        report,
      );
      powerCents += type.powerCentsPerDay * bd;
      costs += risksStep(s, world, m, type, local, tMid, bd, report);
      spoilStep(s, m, tMid, report);
      contractStep(s, world, m, tMid, bd, report);
      if (m.status === 'active' && isEmpty(m) && !emptyBefore.has(m.id)) {
        emptyBefore.add(m.id);
        report.becameEmpty.push(m.id);
        log(s, 'empty', 'Machine empty', m.id);
      } else if (!isEmpty(m)) emptyBefore.delete(m.id);
    }

    // Drivers run their routes on a fixed business-hour interval.
    for (const d of s.drivers) {
      let runs = 0;
      while (d.nextRunAt <= tEnd && runs < 6) {
        s.now = Math.max(s.now, Math.min(tEnd, d.nextRunAt));
        costs += driverRun(s, world, d.machineIds, report);
        d.nextRunAt += businessHoursToMs(STAFF.routeIntervalHours);
        runs++;
      }
      if (d.nextRunAt <= tEnd) d.nextRunAt = tEnd + 1;
    }

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
    const rivalsBefore = s.rival.machines.slice();
    const rivalWasActive = s.rival.active;
    if (rivalDecide(s, world, tMid)) {
      if (!rivalWasActive) {
        compIdx = competition(s, world);
        comp = compIdx.values;
      } else {
        const before = new Set(rivalsBefore);
        const after = new Set(s.rival.machines);
        compIdx.updateRivals(
          rivalsBefore.filter((r) => !after.has(r)),
          s.rival.machines.filter((r) => !before.has(r)),
        );
      }
    }
    s.ledger.recentRivalCents += rivalRevenue(s, world, local, bh, comp);
    const decay = 0.5 ** bd;
    s.ledger.recentPlayerCents *= decay;
    s.ledger.recentRivalCents *= decay;
    for (const m of s.machines) m.stats.revenueRecentCents *= decay;

    report.costsCents += costs;
    s.now = tEnd;
    checkChapters(s, s.now, report);
    for (const id of checkAchievements(s)) report.achievements.push(id);
    // Competition only changes when machines go: rebuild if this step lost a contract
    // (report.contractsLost is cumulative over the whole catch-up).
    if (report.contractsLost.length > lostBefore) {
      const gone = new Set(report.contractsLost.slice(lostBefore));
      compIdx.remove(s.machines.filter((m) => gone.has(m.id)));
    }
  }
  report.toAt = s.now;
  report.cashDeltaCents = s.cashCents - startCash;
  return { state: s, report };
}
