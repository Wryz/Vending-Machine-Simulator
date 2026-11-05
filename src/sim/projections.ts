import { FIT, NOTIFICATIONS } from '@/config/economy';
import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';

import { cashBoxCapacity, isEmpty } from './rules';
import { customersPerHour, priceResponse } from './demand';
import type { GameState, World } from './state';
import { businessHours, localTime } from './time';
import { visibleEvents } from './events';

export type AlertKind = 'machine-empty' | 'cash-full' | 'event';

export interface ProjectedAlert {
  kind: AlertKind;
  at: number;
  machineId?: string;
  title: string;
  body: string;
}

/**
 * Projects when machines will run empty or fill their cash box, using the
 * expected-value demand at each hour (no randomness), to schedule local
 * notifications (SPEC §10). Respects quiet hours and the daily cap.
 */
export function projectAlerts(
  state: GameState,
  world: World,
  from: number,
  horizonMs: number,
): ProjectedAlert[] {
  const out: ProjectedAlert[] = [];
  const hourMs = 3_600_000;
  for (const m of state.machines) {
    if (m.status !== 'active' || m.broken || isEmpty(m)) continue;
    const type = getMachineType(m.typeId);
    const cell = world.cells.get(m.cellId);
    if (!cell) continue;
    let stock = m.slots.reduce((a, s) => a + s.qty, 0);
    let cash = m.cashBoxCents;
    const cap = cashBoxCapacity(state, type);
    const avgPrice =
      m.slots.filter((s) => s.qty > 0 && s.productId).reduce((a, s) => a + s.priceCents, 0) /
      Math.max(1, m.slots.filter((s) => s.qty > 0).length);
    const avgResp =
      m.slots
        .filter((s) => s.qty > 0 && s.productId)
        .reduce(
          (a, s) => a + priceResponse(s.priceCents / getProduct(s.productId!).suggestedCents),
          0,
        ) / Math.max(1, m.slots.filter((s) => s.qty > 0).length);
    let emptyAt: number | null = null;
    let fullAt: number | null = null;
    for (
      let t = from;
      t < from + horizonMs && (emptyAt === null || fullAt === null);
      t += hourMs / 4
    ) {
      const local = localTime(t, world.city.timeZone, world.city.countryCode);
      const { customers } = customersPerHour(m, state, {
        cell,
        local,
        weather: world.weatherAt(t),
        competitors: 0,
        events: state.events,
        t,
      });
      const bh = businessHours(hourMs / 4);
      const units = customers * bh * FIT.baseBuy * avgResp * 0.8;
      stock -= units;
      cash += units * avgPrice;
      if (stock <= 0 && emptyAt === null) emptyAt = t;
      if (cash >= cap && fullAt === null) fullAt = t;
    }
    const where = m.venue.name;
    if (emptyAt !== null)
      out.push({
        kind: 'machine-empty',
        at: emptyAt,
        machineId: m.id,
        title: 'Machine empty',
        body: `Your ${type.name} at ${where} has sold out.`,
      });
    if (fullAt !== null)
      out.push({
        kind: 'cash-full',
        at: fullAt,
        machineId: m.id,
        title: 'Cash box full',
        body: `Collect cash at ${where}.`,
      });
  }
  for (const e of visibleEvents(state, from).concat(
    state.events.filter((e) => e.announcedAt > from),
  )) {
    if (e.startsAt > from && e.startsAt < from + horizonMs) {
      out.push({
        kind: 'event',
        at: e.startsAt - 30 * 60_000,
        title: 'Local event starting nearby',
        body: `${e.name} at ${e.placeName}.`,
      });
    }
  }
  return limitAlerts(out, world);
}

/** At most N per day, none in quiet hours (moved to the end of quiet hours). */
export function limitAlerts(alerts: ProjectedAlert[], world: World): ProjectedAlert[] {
  const sorted = [...alerts].sort((a, b) => a.at - b.at);
  const perDay = new Map<string, number>();
  const out: ProjectedAlert[] = [];
  for (const a of sorted) {
    let at = a.at;
    const lt = localTime(at, world.city.timeZone, world.city.countryCode);
    const h = lt.hour;
    if (h >= NOTIFICATIONS.quietStartHour || h < NOTIFICATIONS.quietEndHour) {
      const hoursUntil =
        h >= NOTIFICATIONS.quietStartHour
          ? 24 - h + NOTIFICATIONS.quietEndHour
          : NOTIFICATIONS.quietEndHour - h;
      at += hoursUntil * 3_600_000;
    }
    const day = localTime(at, world.city.timeZone, world.city.countryCode).dateKey;
    const n = perDay.get(day) ?? 0;
    if (n >= NOTIFICATIONS.maxPerDay) continue;
    // Collapse duplicates of the same kind within an hour.
    if (out.some((o) => o.kind === a.kind && Math.abs(o.at - at) < 3_600_000)) continue;
    perDay.set(day, n + 1);
    out.push({ ...a, at });
  }
  return out;
}
