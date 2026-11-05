import { EVENT_TEMPLATES } from '@/config/progression';

import { log } from './ledger';
import { hashString } from './rng';
import type { GameState, World } from './state';
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
