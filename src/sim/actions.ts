import { ADS, CONTRACT, PURCHASES, SERVICE, STAFF } from '@/config/economy';
import {
  ALCOHOL_ALLOWED_COUNTRIES,
  getMachineType,
  type MachineFamily,
  type MachineTypeId,
} from '@/config/machines';
import {
  COLLECTION_PULL,
  COLLECTIONS,
  PRESTIGE_PERKS,
  RARITY_ODDS,
  RESEARCH,
  type ResearchId,
  type Rarity,
} from '@/config/progression';
import { PRODUCTS, getProduct } from '@/config/products';

import { nextId, storedMachine } from './create';
import { distanceM } from './geo';
import { nextRandom } from './rng';
import { bump } from './goals';
import { addLedger, log } from './ledger';
import {
  alcoholBlocked,
  commissionAsk,
  districtOf,
  districtUnlocked,
  machineTypeUnlocked,
  productAllowed,
  resolveVenue,
  slotCapacity,
  vanCapacity,
  wholesaleCents,
} from './rules';
import type { GameState, Machine, World } from './state';
import { businessDaysToMs, localTime } from './time';

/**
 * Player actions. Each mutates the `state` it is given and returns a result;
 * callers that need immutability clone first (see `withClone`).
 */
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export function cloneState<T>(s: T): T {
  return JSON.parse(JSON.stringify(s)) as T;
}

export function withClone<R>(
  state: GameState,
  fn: (draft: GameState) => R,
): { state: GameState; result: R } {
  const draft = cloneState(state);
  const result = fn(draft);
  return { state: draft, result };
}

function spend(state: GameState, cents: number, line: string): boolean {
  if (cents > state.cashCents) return false;
  state.cashCents -= cents;
  addLedger(state, line, -cents);
  return true;
}

function getMachine(state: GameState, id: string): Machine | undefined {
  return state.machines.find((m) => m.id === id);
}

// ---------------------------------------------------------------- placement

export interface PlaceParams {
  /** Place a machine you already own (stored), or buy a new one of `typeId`. */
  machineId?: string;
  typeId?: MachineTypeId;
  lat: number;
  lng: number;
  heading: number;
  placeId?: string;
  termDays: number;
  exclusive: boolean;
}

export function quotePlacement(state: GameState, world: World, p: PlaceParams) {
  const typeId = p.machineId ? getMachine(state, p.machineId)?.typeId : p.typeId;
  if (!typeId) return fail('Pick a machine.');
  const type = getMachineType(typeId);
  const venue = resolveVenue(world, state, p, p.placeId);
  const district = districtOf(world, p);
  const buy = p.machineId ? 0 : type.purchaseCents;
  const install = Math.round(type.installCents * [1, 1.25, 1.6, 2][Math.min(3, district - 1)]);
  const commission = commissionAsk(state, venue, p.termDays, p.exclusive);
  return {
    ok: true as const,
    type,
    venue,
    district,
    buyCents: buy,
    installCents: install,
    totalCents: buy + install,
    commission,
  };
}

export function placeMachine(
  state: GameState,
  world: World,
  p: PlaceParams,
): ActionResult<{ machine: Machine }> {
  const q = quotePlacement(state, world, p);
  if (!q.ok) return q;
  const { type, venue, district } = q;
  if (!(CONTRACT.termsDays as readonly number[]).includes(p.termDays))
    return fail('Pick a contract term.');
  if (!p.machineId && !machineTypeUnlocked(state, type, world.city.countryCode))
    return fail(`${type.name} is locked.`);
  if (!p.machineId && state.chapter < 2 && state.machines.length >= 2)
    return fail('Finish chapter 1 to buy more machines.');
  if (!districtUnlocked(state, district)) return fail('This district unlocks in a later chapter.');
  const blocked = alcoholBlocked(world, state, type, p);
  if (blocked) return fail(blocked);
  const taken = state.machines.find((m) => m.status === 'active' && distanceM(m, p) < 8);
  if (taken) return fail('Another of your machines is already here.');
  const rivalExclusive = state.rival.machines.find((r) => distanceM(r, p) < 8);
  if (rivalExclusive) return fail('Brightvend already has a machine on this spot.');
  if (venue.category !== 'street') {
    const sameVenue = state.machines.find(
      (m) => m.status === 'active' && m.venue.placeId === venue.placeId && m.contract.exclusive,
    );
    if (sameVenue && p.exclusive) return fail('You already hold an exclusive contract here.');
  }
  if (!spend(state, q.totalCents, p.machineId ? 'Install' : 'Machines'))
    return fail('Not enough cash.');

  let machine: Machine;
  if (p.machineId) {
    const existing = getMachine(state, p.machineId);
    if (!existing || existing.status !== 'stored') return fail('That machine is not in storage.');
    machine = existing;
  } else {
    machine = storedMachine(nextId(state, 'm'), type.id, state.now);
    state.machines.push(machine);
  }
  const now = state.now;
  machine.status = 'active';
  machine.lat = p.lat;
  machine.lng = p.lng;
  machine.cellId = world.cellOf(p.lat, p.lng);
  machine.heading = p.heading;
  machine.venue = venue;
  machine.contract = {
    commission: q.commission,
    termDays: p.termDays,
    startedAt: now,
    endsAt: now + businessDaysToMs(p.termDays),
    exclusive: p.exclusive,
    renegotiated: false,
  };
  machine.mood = 0.8;
  machine.lowMoodSince = null;
  machine.placedAt = now;
  machine.lastVisitAt = now;
  machine.broken = null;
  log(state, 'info', `Placed ${type.name} at ${venue.name}`, machine.id);
  if (!p.machineId) bump(state, 'places');
  return { ok: true, machine };
}

/** Move an active machine back to storage (e.g. to relocate it). */
export function pickUpMachine(state: GameState, machineId: string): ActionResult {
  const m = getMachine(state, machineId);
  if (!m || m.status !== 'active') return fail('Machine not found.');
  collectCash(state, machineId);
  m.status = 'stored';
  log(state, 'info', `Picked up machine from ${m.venue.name}`, m.id);
  return { ok: true };
}

export function sellMachine(
  state: GameState,
  machineId: string,
): ActionResult<{ refundCents: number }> {
  const m = getMachine(state, machineId);
  if (!m) return fail('Machine not found.');
  if (state.machines.length <= 1) return fail('Keep at least one machine.');
  if (m.status === 'active') collectCash(state, machineId);
  const refund = Math.round(getMachineType(m.typeId).purchaseCents * 0.4);
  state.machines = state.machines.filter((x) => x.id !== machineId);
  for (const d of state.drivers) d.machineIds = d.machineIds.filter((id) => id !== machineId);
  state.cashCents += refund;
  addLedger(state, 'Machine sales', refund);
  return { ok: true, refundCents: refund };
}

// ------------------------------------------------------------------ service

export interface RestockLine {
  slot: number;
  productId: string;
  qty: number;
}

/** Suggested manual restock: top up current products; fill empty slots with the best default. */
export function suggestRestock(
  state: GameState,
  machineId: string,
  budget?: number,
): RestockLine[] {
  const m = getMachine(state, machineId);
  if (!m) return [];
  const type = getMachineType(m.typeId);
  const cap = slotCapacity(state, type);
  const options = (() => {
    const list = (type.holds as readonly string[]).flatMap((fam) =>
      // stable order: by suggested price margin
      PRODUCTS.filter((p) => p.family === fam && productAllowed(state, type, p)),
    );
    return list.sort(
      (a, b) => b.suggestedCents - b.wholesaleCents - (a.suggestedCents - a.wholesaleCents),
    );
  })();
  const lines: RestockLine[] = [];
  let left = budget ?? vanCapacity(state);
  m.slots.forEach((s, i) => {
    if (left <= 0) return;
    const productId = s.productId ?? options[i % Math.max(1, options.length)]?.id;
    if (!productId) return;
    const room = s.productId && s.productId !== productId ? cap : cap - s.qty;
    const qty = Math.min(room, left);
    if (qty > 0) {
      lines.push({ slot: i, productId, qty });
      left -= qty;
    }
  });
  return lines;
}

export function restockCostCents(state: GameState, lines: readonly RestockLine[]): number {
  return lines.reduce((sum, l) => sum + wholesaleCents(state, getProduct(l.productId)) * l.qty, 0);
}

export function fuelCents(
  state: GameState,
  world: World,
  stops: readonly { lat: number; lng: number }[],
): number {
  if (!stops.length) return 0;
  let d = 0;
  let prev = { lat: world.city.lat, lng: world.city.lng };
  for (const s of stops) {
    d += distanceM(prev, s);
    prev = s;
  }
  d += distanceM(prev, world.city);
  return Math.round((d / 1000) * SERVICE.routeFactor * SERVICE.fuelCentsPerKm);
}

/**
 * Manual restock (the 3D close-up). Van capacity limits items per visit.
 * Gives the +10% "fresh stock" bonus (SPEC §4.2).
 */
export function restockMachine(
  state: GameState,
  world: World,
  machineId: string,
  lines: readonly RestockLine[],
  opts: { manual: boolean; capacity?: number } = { manual: true },
): ActionResult<{ units: number; costCents: number }> {
  const m = getMachine(state, machineId);
  if (!m || m.status !== 'active') return fail('Machine not found.');
  const type = getMachineType(m.typeId);
  const cap = slotCapacity(state, type);
  const limit = opts.capacity ?? vanCapacity(state);
  const units = lines.reduce((a, l) => a + l.qty, 0);
  if (units > limit) return fail(`Your van holds ${limit} items per trip.`);
  for (const l of lines) {
    const product = getProduct(l.productId);
    if (!productAllowed(state, type, product))
      return fail(`${product.name} doesn't fit this machine.`);
    const slot = m.slots[l.slot];
    if (!slot) return fail('Unknown slot.');
    const existing = slot.productId === l.productId ? slot.qty : 0;
    if (existing + l.qty > cap) return fail(`Slot ${l.slot + 1} holds ${cap}.`);
  }
  const fuel = opts.manual ? fuelCents(state, world, [m]) : 0;
  const cost = restockCostCents(state, lines) + fuel;
  if (cost > state.cashCents) return fail('Not enough cash for this stock.');
  state.cashCents -= cost;
  addLedger(state, 'Wholesale', -restockCostCents(state, lines));
  if (fuel) addLedger(state, 'Fuel', -fuel);
  for (const l of lines) {
    const slot = m.slots[l.slot];
    const product = getProduct(l.productId);
    if (slot.productId !== l.productId) {
      slot.productId = l.productId;
      slot.qty = 0;
      slot.priceCents = product.suggestedCents;
    }
    if (slot.priceCents <= 0) slot.priceCents = product.suggestedCents;
    slot.qty += l.qty;
    slot.par = Math.max(slot.par, slot.qty);
    slot.stockedAt = state.now;
  }
  if (opts.manual) {
    bump(state, 'restocks');
    m.freshUntil = state.now + businessDaysToMs(SERVICE.freshStockBusinessDays);
    m.lastVisitAt = state.now;
    m.seen = { at: state.now, qty: m.slots.map((s) => s.qty), cashBoxCents: m.cashBoxCents };
  }
  log(state, 'restock', `Restocked ${units} items`, m.id, -cost);
  return { ok: true, units, costCents: cost };
}

export function setPrice(
  state: GameState,
  machineId: string,
  slot: number,
  priceCents: number,
): ActionResult {
  const m = getMachine(state, machineId);
  if (!m) return fail('Machine not found.');
  if (state.chapter < 2 && !state.chapterDoneAt[1])
    return fail('Price setting unlocks after chapter 1.');
  const s = m.slots[slot];
  if (!s || !s.productId) return fail('Empty slot.');
  const p = getProduct(s.productId);
  const clamped =
    Math.round(
      Math.min(p.suggestedCents * 3, Math.max(Math.round(p.wholesaleCents * 0.5), priceCents)) / 5,
    ) * 5;
  s.priceCents = clamped;
  return { ok: true };
}

export function setPar(
  state: GameState,
  machineId: string,
  slot: number,
  par: number,
): ActionResult {
  const m = getMachine(state, machineId);
  if (!m) return fail('Machine not found.');
  const s = m.slots[slot];
  if (!s) return fail('Unknown slot.');
  s.par = Math.max(0, Math.min(slotCapacity(state, getMachineType(m.typeId)), Math.round(par)));
  return { ok: true };
}

/** Pick a random collectible from a series using the disclosed odds. */
export function rollCollectible(state: GameState, seriesId: string): string | null {
  const series = COLLECTIONS.find((s) => s.id === seriesId);
  if (!series) return null;
  let r = nextRandom(state);
  let rarity: Rarity = 'common';
  for (const [k, p] of Object.entries(RARITY_ODDS) as [Rarity, number][]) {
    if (r < p) {
      rarity = k;
      break;
    }
    r -= p;
  }
  const pool = series.items.filter((i) => i.rarity === rarity);
  const items = pool.length ? pool : series.items;
  return items[Math.floor(nextRandom(state) * items.length) % items.length].id;
}

/** Collect the cash box (coin tray). Pays out gross minus venue commission. */
export function collectCash(
  state: GameState,
  machineId: string,
): ActionResult<{
  grossCents: number;
  netCents: number;
  commissionCents: number;
  pulledItem: string | null;
}> {
  const m = getMachine(state, machineId);
  if (!m) return fail('Machine not found.');
  const gross = m.cashBoxCents;
  const commission = Math.round(gross * m.contract.commission);
  const net = gross - commission;
  m.cashBoxCents = 0;
  state.cashCents += net;
  state.ledger.lifetimeNetCents += net;
  addLedger(state, 'Commission', -commission);
  m.lastVisitAt = state.now;
  m.seen = { at: state.now, qty: m.slots.map((s) => s.qty), cashBoxCents: 0 };
  let pulledItem: string | null = null;
  const type = getMachineType(m.typeId);
  if (
    gross > 0 &&
    type.family === 'capsules' &&
    nextRandom(state) < COLLECTION_PULL.freePullOnCollect
  ) {
    const seriesId = m.slots
      .map((s) => (s.productId ? getProduct(s.productId).series : undefined))
      .find(Boolean);
    if (seriesId) {
      pulledItem = rollCollectible(state, seriesId);
      if (pulledItem) {
        state.collection[pulledItem] = (state.collection[pulledItem] ?? 0) + 1;
        log(state, 'pull', 'Free pull from the cash box', m.id);
      }
    }
  }
  if (gross > 0) {
    log(state, 'collect', `Collected cash`, m.id, net);
    bump(state, 'collects');
  }
  return { ok: true, grossCents: gross, netCents: net, commissionCents: commission, pulledItem };
}

export function repairMachine(state: GameState, machineId: string): ActionResult {
  const m = getMachine(state, machineId);
  if (!m || !m.broken) return fail('Nothing to repair.');
  if (!spend(state, SERVICE.manualRepairCostCents, 'Repairs')) return fail('Not enough cash.');
  m.broken = null;
  m.lastVisitAt = state.now;
  log(state, 'repair', 'Repaired by hand', m.id, -SERVICE.manualRepairCostCents);
  bump(state, 'repairs');
  return { ok: true };
}

export function renegotiate(
  state: GameState,
  machineId: string,
): ActionResult<{ commission: number }> {
  const m = getMachine(state, machineId);
  if (!m || m.status !== 'active') return fail('Machine not found.');
  if (!state.chapterDoneAt[1]) return fail('Renegotiation unlocks after chapter 1.');
  if (m.contract.renegotiated) return fail('Already renegotiated this contract.');
  if (m.mood < 0.6) return fail('The venue is not happy enough to renegotiate.');
  m.contract.commission = Math.max(
    0.1,
    Math.round((m.contract.commission - CONTRACT.renegotiateDiscount) * 1000) / 1000,
  );
  m.contract.renegotiated = true;
  return { ok: true, commission: m.contract.commission };
}

export function rotateMachine(state: GameState, machineId: string, heading: number): ActionResult {
  const m = getMachine(state, machineId);
  if (!m) return fail('Machine not found.');
  m.heading = ((Math.round(heading) % 360) + 360) % 360;
  return { ok: true };
}

// ------------------------------------------------------------------- company

export function buyResearch(
  state: GameState,
  id: ResearchId,
  family?: MachineFamily,
): ActionResult {
  const r = RESEARCH.find((x) => x.id === id);
  if (!r) return fail('Unknown upgrade.');
  if (state.chapter < r.unlockChapter) return fail(`Unlocks in chapter ${r.unlockChapter}.`);
  const key: MachineFamily | '*' = r.global ? '*' : (family ?? 'snacks');
  const list = state.research[id] ?? [];
  if (list.includes(key) || list.includes('*')) return fail('Already researched.');
  if (!spend(state, r.costCents, 'Research')) return fail('Not enough cash.');
  state.research[id] = [...list, key];
  bump(state, 'research');
  return { ok: true };
}

export function buyVan(state: GameState): ActionResult<{ level: number }> {
  const next = state.vanLevel + 1;
  const cost = SERVICE.vanUpgradeCostCents[next];
  if (cost === undefined) return fail('Your van is already the biggest.');
  if (!spend(state, cost, 'Vehicles')) return fail('Not enough cash.');
  state.vanLevel = next;
  return { ok: true, level: next };
}

export function buyWarehouse(state: GameState): ActionResult {
  if (state.warehouse) return fail('You already have a warehouse.');
  if (state.chapter < 3) return fail('Unlocks in chapter 3.');
  if (!spend(state, STAFF.warehouseBuyCents, 'Warehouse')) return fail('Not enough cash.');
  state.warehouse = true;
  return { ok: true };
}

export const LIQUOR_PERMIT_CENTS = 1_500_000;

export function buyLiquorPermit(state: GameState, world: World): ActionResult {
  if (state.liquorPermit) return fail('You already hold a liquor permit.');
  if (state.chapter < 5) return fail('Unlocks in chapter 5.');
  if (!ALCOHOL_ALLOWED_COUNTRIES.includes(world.city.countryCode))
    return fail('Not available in this city.');
  if (!spend(state, LIQUOR_PERMIT_CENTS, 'Permits')) return fail('Not enough cash.');
  state.liquorPermit = true;
  return { ok: true };
}

const DRIVER_NAMES = [
  'Sam',
  'Rosa',
  'Kenji',
  'Amara',
  'Luca',
  'Mina',
  'Theo',
  'Priya',
  'Jonah',
  'Ines',
  'Dae',
  'Nora',
];

export function hireDriver(state: GameState): ActionResult<{ driverId: string }> {
  if (state.chapter < 3 && !state.chapterDoneAt[2]) return fail('Drivers unlock in chapter 3.');
  if (state.vanLevel < 1) return fail('Drivers need a van.');
  if (!spend(state, STAFF.driverHireCents, 'Hiring')) return fail('Not enough cash.');
  const id = nextId(state, 'd');
  state.drivers.push({
    id,
    name: DRIVER_NAMES[state.drivers.length % DRIVER_NAMES.length],
    hiredAt: state.now,
    machineIds: [],
    nextRunAt: state.now,
  });
  log(state, 'driver', 'Hired a driver');
  return { ok: true, driverId: id };
}

export function fireDriver(state: GameState, driverId: string): ActionResult {
  const before = state.drivers.length;
  state.drivers = state.drivers.filter((d) => d.id !== driverId);
  return before === state.drivers.length ? fail('Driver not found.') : { ok: true };
}

export function assignRoute(
  state: GameState,
  driverId: string,
  machineIds: string[],
): ActionResult {
  const d = state.drivers.find((x) => x.id === driverId);
  if (!d) return fail('Driver not found.');
  if (machineIds.length > STAFF.stopsPerRoute)
    return fail(`A route has at most ${STAFF.stopsPerRoute} stops.`);
  const valid = machineIds.filter((id) => state.machines.some((m) => m.id === id));
  // A machine is on at most one route.
  for (const other of state.drivers)
    if (other !== d) other.machineIds = other.machineIds.filter((id) => !valid.includes(id));
  d.machineIds = valid;
  return { ok: true };
}

/** Auto-build routes: nearest-first groups of `stopsPerRoute` (route clipboard "Auto" button). */
export function autoAssignRoutes(state: GameState): ActionResult {
  if (!state.drivers.length) return fail('Hire a driver first.');
  const active = state.machines.filter((m) => m.status === 'active');
  const sorted = [...active].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
  state.drivers.forEach((d, i) => {
    d.machineIds = sorted
      .slice(i * STAFF.stopsPerRoute, (i + 1) * STAFF.stopsPerRoute)
      .map((m) => m.id);
  });
  return { ok: true };
}

// --------------------------------------------------------------- collections

export function buyPull(state: GameState, seriesId: string): ActionResult<{ itemId: string }> {
  if (state.chapter < 3 && !state.chapterDoneAt[2]) return fail('Collections unlock in chapter 3.');
  if (!spend(state, COLLECTION_PULL.pullCostCents, 'Collections')) return fail('Not enough cash.');
  const item = rollCollectible(state, seriesId);
  if (!item) return fail('Unknown series.');
  state.collection[item] = (state.collection[item] ?? 0) + 1;
  bump(state, 'pulls');
  return { ok: true, itemId: item };
}

// ------------------------------------------------------------------ rewards

export type AdReward = 'double-earnings' | 'instant-restock' | 'free-pull' | 'double-offline';

export function applyAdReward(
  state: GameState,
  world: World,
  reward: AdReward,
  arg?: { machineId?: string; seriesId?: string; offlineNetCents?: number },
): ActionResult<{ itemId?: string; bonusCents?: number }> {
  switch (reward) {
    case 'double-earnings':
      state.boosts.doubleEarningsUntil =
        Math.max(state.now, state.boosts.doubleEarningsUntil) + ADS.doubleEarningsMinutes * 60_000;
      return { ok: true };
    case 'instant-restock': {
      if (!arg?.machineId) return fail('Pick a machine.');
      const m = getMachine(state, arg.machineId);
      if (!m) return fail('Machine not found.');
      const type = getMachineType(m.typeId);
      const cap = slotCapacity(state, type);
      for (const s of m.slots)
        if (s.productId) {
          s.qty = cap;
          s.stockedAt = state.now;
        }
      log(state, 'restock', 'Instant restock (reward)', m.id);
      return { ok: true };
    }
    case 'free-pull': {
      const dateKey = localTime(state.now, world.city.timeZone, world.city.countryCode).dateKey;
      if (state.freePulls.dateKey !== dateKey) state.freePulls = { dateKey, count: 0 };
      if (state.freePulls.count >= ADS.freeCapsulePullsPerDay)
        return fail('Come back tomorrow for more free pulls.');
      const item = rollCollectible(state, arg?.seriesId ?? COLLECTIONS[0].id);
      if (!item) return fail('Unknown series.');
      state.freePulls.count += 1;
      state.collection[item] = (state.collection[item] ?? 0) + 1;
      return { ok: true, itemId: item };
    }
    case 'double-offline': {
      const bonus = Math.max(0, Math.round(arg?.offlineNetCents ?? 0));
      state.cashCents += bonus;
      addLedger(state, 'Bonus', bonus);
      return { ok: true, bonusCents: bonus };
    }
  }
}

export function hidePlace(state: GameState, placeId: string): ActionResult {
  if (!state.hiddenPlaces.includes(placeId)) state.hiddenPlaces.push(placeId);
  return { ok: true };
}

export function buyPrestigePerk(state: GameState, perkId: string): ActionResult {
  const perk = PRESTIGE_PERKS.find((p) => p.id === perkId);
  if (!perk) return fail('Unknown perk.');
  const level = state.prestige.perks[perkId] ?? 0;
  if (level >= perk.maxLevel) return fail('Maxed out.');
  if (state.prestige.reputation < perk.costRep) return fail('Not enough Reputation.');
  state.prestige.reputation -= perk.costRep;
  state.prestige.perks[perkId] = level + 1;
  return { ok: true };
}

export function addCash(state: GameState, cents: number, line: string): void {
  state.cashCents += cents;
  addLedger(state, line, cents);
}

/** Dev/tutorial helper: a sensible heading facing the street from a venue. */
export function headingFacing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const y = Math.sin(((to.lng - from.lng) * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180);
  const x =
    Math.cos((from.lat * Math.PI) / 180) * Math.sin((to.lat * Math.PI) / 180) -
    Math.sin((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.cos(((to.lng - from.lng) * Math.PI) / 180);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Starter Pack (one-time purchase, SPEC §9): van upgrade, 2 snack machines, cash. */
export function applyStarterPack(state: GameState): ActionResult {
  state.vanLevel = Math.max(state.vanLevel, 1);
  for (let i = 0; i < 2; i++)
    state.machines.push(storedMachine(nextId(state, 'm'), 'snack', state.now));
  state.cashCents += PURCHASES.starterPackCashCents;
  addLedger(state, 'Starter Pack', PURCHASES.starterPackCashCents);
  log(state, 'info', 'Starter Pack: van upgrade, two snack machines and cash');
  return { ok: true };
}
