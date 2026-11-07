import { getMachineType } from '@/config/machines';
import { EVENT_TEMPLATES } from '@/config/progression';
import { SURPRISES } from '@/config/surprises';

import type { ActionResult } from './actions';
import { bump } from './goals';
import { addLedger, log } from './ledger';
import { hashString, keyedUnit } from './rng';
import { activeMachines, cashBoxCapacity, isEmpty } from './rules';
import type { GameState, Machine, SurpriseState, World } from './state';
import { addDays, isSummer, localTime, localToUtc } from './time';

const MAX_EVENTS_PER_DAY = 6;

/** Deterministic pseudo-random in [0,1) from a key. */
function keyed(key: string): number {
  return hashString(key) / 4294967296;
}

/**
 * Generate local events (SPEC §4.6) for a local date from nearby places.
 * Deterministic per save + date, so the same day yields the same events.
 */
export function generateEventsForDay(state: GameState, world: World, dateKey: string): void {
  if (state.eventDays.includes(dateKey)) return;
  state.eventDays.push(dateKey);
  if (state.eventDays.length > 14) state.eventDays.splice(0, state.eventDays.length - 14);
  const { timeZone, countryCode } = world.city;
  const noon = localToUtc(dateKey, 12, timeZone, countryCode);
  const lt = localTime(noon, timeZone, countryCode);
  let made = 0;
  for (const cell of world.cells.values()) {
    for (const place of cell.places) {
      for (const tpl of EVENT_TEMPLATES) {
        if (made >= MAX_EVENTS_PER_DAY) return;
        if (tpl.host !== place.category) continue;
        if (state.hiddenPlaces.includes(place.id)) continue;
        if (tpl.weekendOnly && !lt.restDay) continue;
        if (tpl.summerOnly && !isSummer(lt.month, countryCode)) continue;
        const key = `${state.id}|${dateKey}|${place.id}|${tpl.id}`;
        if (keyed(key) >= tpl.chancePerDay) continue;
        const startHour = tpl.startHours[Math.floor(keyed(`${key}|h`) * tpl.startHours.length)];
        const startsAt = localToUtc(dateKey, startHour, timeZone, countryCode);
        const leadHours = 1 + Math.floor(keyed(`${key}|lead`) * 23);
        const [lo, hi] = tpl.multiplier;
        state.events.push({
          id: `ev-${hashString(key).toString(36)}`,
          templateId: tpl.id,
          name: tpl.name,
          placeId: place.id,
          placeName: place.name,
          lat: place.lat,
          lng: place.lng,
          startsAt,
          endsAt: startsAt + tpl.durationHours * 3_600_000,
          announcedAt: startsAt - leadHours * 3_600_000,
          multiplier: Math.round((lo + (hi - lo) * keyed(`${key}|m`)) * 100) / 100,
          tagBoost: { ...(tpl.tagBoost ?? {}) } as Record<string, number>,
        });
        made++;
      }
    }
  }
}

/** Keep events for today and tomorrow generated; drop finished ones. */
export function maintainEvents(state: GameState, world: World, t: number): void {
  const today = localTime(t, world.city.timeZone, world.city.countryCode).dateKey;
  const before = state.events.length;
  generateEventsForDay(state, world, today);
  generateEventsForDay(state, world, addDays(today, 1));
  for (let i = before; i < state.events.length; i++) {
    const e = state.events[i];
    log(state, 'event', `${e.name} at ${e.placeName}`);
  }
  state.events = state.events.filter((e) => e.endsAt > t - 3_600_000);
}

/** Events the player can see on the map (announced, not finished). */
export function visibleEvents(state: GameState, t: number) {
  return state.events.filter((e) => e.announcedAt <= t && e.endsAt > t);
}

// ---------------------------------------------------------------------------
// Surprise moments (SPEC §4.6): a VIP customer, a jackpot hour, a venue deal.
// Small, rare and positive. Rolled only during live play (the caller passes
// live ticks only), so they never pile up from an offline catch-up. Keyed
// randomness: the sim's RNG stream is untouched.
// ---------------------------------------------------------------------------

export type SurpriseKind = 'vip' | 'jackpot' | 'deal';

/** What happened, for the moment cards and the map. */
export interface SurpriseNews {
  kind: SurpriseKind;
  machineId: string;
  /** VIP: units bought and what they paid (gross). */
  units?: number;
  cents?: number;
  /** Jackpot: boost and end time. */
  multiplier?: number;
  until?: number;
  /** Deal: offer id, the venue's commission now and during the deal. */
  dealId?: string;
  commission?: number;
  dealCommission?: number;
}

export function emptySurprises(): SurpriseState {
  return { nextAt: 0, jackpot: null, deal: null };
}

/** Demand multiplier from surprises for a machine (jackpot hour). */
export function surpriseBoost(state: GameState, machineId: string, t: number): number {
  const j = state.surprises.jackpot;
  return j && j.machineId === machineId && t < j.until ? j.multiplier : 1;
}

/** The venue deal running on this machine right now, if any. */
export function activeDeal(state: GameState, machineId: string, t: number) {
  const d = state.surprises.deal;
  return d && d.machineId === machineId && d.activeUntil > t ? d : null;
}

/**
 * Commission saved on a sale during an accepted venue deal, paid at once
 * (commission is settled on collection at the contract rate, so the saving is
 * credited per sale and can't be stretched by collecting late).
 */
export function dealSavingCents(state: GameState, m: Machine, revenue: number, t: number): number {
  const d = activeDeal(state, m.id, t);
  if (!d) return 0;
  return Math.max(0, Math.round(revenue * (m.contract.commission - d.commission)));
}

/** Accept a venue deal before its offer runs out (the UI says "that offer is gone" on failure). */
export function acceptDeal(state: GameState, dealId: string): ActionResult<{ until: number }> {
  const d = state.surprises.deal;
  if (!d || d.id !== dealId) return { ok: false, error: 'Machine not found.' };
  if (d.activeUntil > 0) return { ok: true, until: d.activeUntil };
  if (state.now > d.offerUntil) return { ok: false, error: 'Machine not found.' };
  const m = state.machines.find((x) => x.id === d.machineId && x.status === 'active');
  if (!m) return { ok: false, error: 'Machine not found.' };
  d.activeUntil = state.now + SURPRISES.deal.durationMs;
  return { ok: true, until: d.activeUntil };
}

/** Drop finished jackpots and lapsed or finished deals. */
export function expireSurprises(state: GameState, t: number): void {
  const sp = state.surprises;
  if (sp.jackpot && t >= sp.jackpot.until) sp.jackpot = null;
  if (sp.deal) {
    const d = sp.deal;
    const gone = d.activeUntil > 0 ? t >= d.activeUntil : t > d.offerUntil;
    if (gone) sp.deal = null;
  }
}

function sellable(m: Machine): boolean {
  return m.status === 'active' && !m.broken && !isEmpty(m);
}

/**
 * Book `units` sold from one slot outside the hourly demand model (VIP
 * customers, served requests): stock, cash box, ledger, stats and goals.
 * Returns the revenue.
 */
export function sellUnits(
  state: GameState,
  m: Machine,
  slot: Machine['slots'][number],
  units: number,
  t: number,
  salesBonus: number,
): number {
  const revenue = units * slot.priceCents;
  slot.qty -= units;
  m.cashBoxCents += revenue;
  addLedger(state, 'Sales', revenue);
  const bonusShare = (t < state.boosts.doubleEarningsUntil ? 1 : 0) + salesBonus;
  if (bonusShare > 0) {
    const bonus = Math.round(revenue * bonusShare);
    state.cashCents += bonus;
    addLedger(state, 'Bonus', bonus);
  }
  m.stats.unitsTotal += units;
  m.stats.revenueTotalCents += revenue;
  m.stats.revenueRecentCents += revenue;
  m.stats.lastSaleAt = t;
  state.ledger.lifetimeSalesCents += revenue;
  state.ledger.lifetimeUnits += units;
  state.ledger.recentPlayerCents += revenue;
  bump(state, 'sales', revenue);
  bump(state, 'units', units);
  return revenue;
}

/** A VIP buys a whole row: the fullest slot, up to `vip.maxUnits`, room in the cash box allowing. */
function vipSale(state: GameState, m: Machine, salesBonus: number, t: number): SurpriseNews | null {
  const slot = m.slots.reduce<(typeof m.slots)[number] | null>(
    (a, s) => (s.productId && s.qty > (a?.qty ?? 0) ? s : a),
    null,
  );
  if (!slot || slot.qty < SURPRISES.vip.minUnits || slot.priceCents <= 0) return null;
  const room = Math.max(0, cashBoxCapacity(state, getMachineType(m.typeId)) - m.cashBoxCents);
  const units = Math.min(slot.qty, SURPRISES.vip.maxUnits, Math.floor(room / slot.priceCents));
  if (units < SURPRISES.vip.minUnits) return null;
  const revenue = sellUnits(state, m, slot, units, t, salesBonus);
  return { kind: 'vip', machineId: m.id, units, cents: revenue };
}

/**
 * Maybe start a surprise (call on live ticks only). Returns what happened, or
 * null. The first one waits `firstAfterMs` after the tutorial is through,
 * then one every `gapMinMs`–`gapMaxMs`.
 */
export function rollSurprise(
  state: GameState,
  t: number,
  opts: { salesBonus?: number } = {},
): SurpriseNews | null {
  const sp = state.surprises;
  // Tutorial first: the first sale and the first collect.
  if (state.ledger.lifetimeNetCents <= 0) return null;
  const machines = activeMachines(state).filter(sellable);
  if (!machines.length) return null;
  if (sp.nextAt === 0) {
    sp.nextAt = t + SURPRISES.firstAfterMs;
    return null;
  }
  if (t < sp.nextAt) return null;
  const key = `${state.id}|surprise|${sp.nextAt}`;
  const r = (k: string) => keyedUnit(`${key}|${k}`);
  sp.nextAt =
    t + SURPRISES.gapMinMs + Math.round(r('gap') * (SURPRISES.gapMaxMs - SURPRISES.gapMinMs));

  const w = SURPRISES.weights;
  const roll = r('kind') * (w.vip + w.jackpot + w.deal);
  const first: SurpriseKind = roll < w.vip ? 'vip' : roll < w.vip + w.jackpot ? 'jackpot' : 'deal';
  const order: SurpriseKind[] = [
    first,
    ...(['vip', 'jackpot', 'deal'] as const).filter((k) => k !== first),
  ];
  const pickFrom = <T>(items: T[], k: string): T | null =>
    items.length ? items[Math.floor(r(k) * items.length) % items.length] : null;

  for (const kind of order) {
    if (kind === 'vip') {
      // Shuffle-free: start at a keyed machine and take the first that can sell a row.
      const start = Math.floor(r('vip') * machines.length);
      for (let i = 0; i < machines.length; i++) {
        const m = machines[(start + i) % machines.length];
        const sale = vipSale(state, m, opts.salesBonus ?? 0, t);
        if (sale) return sale;
      }
    } else if (kind === 'jackpot') {
      if (sp.jackpot) continue;
      const m = pickFrom(machines, 'jackpot');
      if (!m) continue;
      sp.jackpot = {
        machineId: m.id,
        until: t + SURPRISES.jackpot.durationMs,
        multiplier: SURPRISES.jackpot.multiplier,
      };
      return {
        kind,
        machineId: m.id,
        multiplier: sp.jackpot.multiplier,
        until: sp.jackpot.until,
      };
    } else {
      if (sp.deal) continue;
      const m = pickFrom(
        machines.filter(
          (x) =>
            x.venue.category !== 'street' && x.contract.commission >= SURPRISES.deal.minCommission,
        ),
        'deal',
      );
      if (!m) continue;
      sp.deal = {
        id: `deal-${hashString(key).toString(36)}`,
        machineId: m.id,
        venueName: m.venue.name,
        commission: SURPRISES.deal.commission,
        offerUntil: t + SURPRISES.deal.offerMs,
        activeUntil: 0,
      };
      return {
        kind,
        machineId: m.id,
        dealId: sp.deal.id,
        commission: m.contract.commission,
        dealCommission: sp.deal.commission,
        until: sp.deal.offerUntil,
      };
    }
  }
  return null;
}
