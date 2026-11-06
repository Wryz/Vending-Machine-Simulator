import { HOURLY_CURVES, TAG_HOUR_BOOST, type Curve, type CurveKey } from '@/config/curves';
import { COMPETITION, DEMAND_SCALE, FIT, PRICE_RESPONSE, VISIBILITY } from '@/config/economy';
import { getMachineType, type MachineFamily, type MachineType } from '@/config/machines';
import { PLACE_WEIGHT, RESIDENTIAL_WEIGHT } from '@/config/places';
import { PLACE_TAG_AFFINITY } from '@/config/progression';
import type { Product, ProductTag } from '@/config/products';
import { PLACE_CATEGORIES, type CellData, type WeatherHour } from '@/data/types';

import type { GameState, LocalEvent, Machine } from './state';
import type { LocalTime } from './time';
import { distanceM } from './geo';

/** Linear interpolation into a 24-h curve at a fractional hour. */
export function curveAt(c: Curve, hour: number): number {
  const h0 = Math.floor(hour) % 24;
  const h1 = (h0 + 1) % 24;
  const t = hour - Math.floor(hour);
  return c[h0] + (c[h1] - c[h0]) * t;
}

export interface TrafficBreakdown {
  total: number;
  /** Contribution per source (place categories + residential). */
  parts: Partial<Record<CurveKey, number>>;
}

/**
 * base_traffic(cell, hour, day) = Σ weight(cat) × nearby(cat) × curve(cat, hour, day)
 *                               + residential(pop) × curve(residential, hour, day)
 * (SPEC §5.2). `nearby` is already distance-decayed by the pipeline.
 */
export function baseTraffic(cell: CellData, hour: number, restDay: boolean): TrafficBreakdown {
  const parts: Partial<Record<CurveKey, number>> = {};
  let total = 0;
  for (const cat of PLACE_CATEGORIES) {
    const n = cell.nearby[cat];
    if (!n) continue;
    const curves = HOURLY_CURVES[cat];
    const v = PLACE_WEIGHT[cat] * n * curveAt(restDay ? curves.weekend : curves.weekday, hour);
    if (v > 0) {
      parts[cat] = v;
      total += v;
    }
  }
  const res = HOURLY_CURVES.residential;
  const r = RESIDENTIAL_WEIGHT * cell.pop * curveAt(restDay ? res.weekend : res.weekday, hour);
  if (r > 0) {
    parts.residential = r;
    total += r;
  }
  return { total, parts };
}

/** Outdoor-heavy categories lose traffic in rain (SPEC §4.6). */
const OUTDOOR: readonly CurveKey[] = ['park', 'beach', 'stadium', 'residential', 'shopping'];

export function weatherTrafficFactor(parts: TrafficBreakdown, weather: WeatherHour | null): number {
  if (!weather || parts.total <= 0) return 1;
  let outdoorShare = 0;
  for (const k of OUTDOOR) outdoorShare += parts.parts[k] ?? 0;
  outdoorShare /= parts.total;
  let f = 1;
  if (weather.condition === 'rain' || weather.condition === 'storm') f -= 0.45 * outdoorShare;
  if (weather.condition === 'snow') f -= 0.3 * outdoorShare;
  if (weather.condition === 'clear' && weather.tempC > 18 && weather.tempC < 30)
    f += 0.15 * outdoorShare;
  return Math.max(0.3, f);
}

/** price_response(ratio): logistic, ≈1 at 0.9×, ≈0.5 at 1.3×, ≈0.15 at 1.8×. */
export function priceResponse(ratio: number): number {
  const { midpoint, steepness, ceilingAt } = PRICE_RESPONSE;
  const raw = (r: number) => 1 / (1 + Math.exp(steepness * (r - midpoint)));
  return Math.min(1.05, raw(ratio) / raw(ceilingAt));
}

/** Product weather multiplier (heat/cold per °C, rain). */
export function productWeatherFactor(product: Product, weather: WeatherHour | null): number {
  if (!weather || !product.weather) return 1;
  let f = 1;
  const w = product.weather;
  if (w.heat && weather.tempC > 24) f *= 1 + w.heat * (weather.tempC - 24);
  if (w.cold && weather.tempC < 12) f *= 1 + w.cold * (12 - weather.tempC);
  if (w.rain && (weather.condition === 'rain' || weather.condition === 'storm')) f *= w.rain;
  if (w.rain && !(weather.condition === 'rain' || weather.condition === 'storm')) f *= 0.25;
  return Math.max(0.05, f);
}

/**
 * fit(product.tags, place mix, hour): traffic-weighted affinity of the
 * surrounding place mix for the product's tags, times hour-of-day tag boosts.
 */
export function productFit(
  product: Product,
  traffic: TrafficBreakdown,
  hour: number,
  /** Optional per-step cache of `placeAffinity` by tag for this traffic (same results). */
  affinity?: Map<string, number>,
): number {
  let f = 1;
  let parts: [CurveKey, number][] | null = null;
  for (const tag of product.tags) {
    let placeAff = affinity?.get(tag);
    if (placeAff === undefined) {
      parts ??= Object.entries(traffic.parts) as [CurveKey, number][];
      placeAff = placeAffinityOf(parts, tag);
      affinity?.set(tag, placeAff);
    }
    const hourBoost = TAG_HOUR_BOOST[tag] ? curveAt(TAG_HOUR_BOOST[tag] as Curve, hour) : 1;
    f *= placeAff * hourBoost;
  }
  return Math.min(FIT.max, Math.max(FIT.min, f));
}

/** Traffic-weighted affinity of a place mix for one product tag. */
function placeAffinityOf(parts: [CurveKey, number][], tag: string): number {
  let aff = 0;
  let weight = 0;
  for (const [k, v] of parts) {
    const a = PLACE_TAG_AFFINITY[k]?.[tag as keyof (typeof PLACE_TAG_AFFINITY)[CurveKey]];
    aff += (a ?? 1) * v;
    weight += v;
  }
  return weight > 0 ? aff / weight : 1;
}

export function hasResearch(
  state: Pick<GameState, 'research'>,
  id: keyof GameState['research'],
  family: MachineFamily,
): boolean {
  const r = state.research[id];
  return !!r && (r.includes('*') || r.includes(family));
}

export function visibility(
  machine: Machine,
  type: MachineType,
  state: GameState,
  hour: number,
): number {
  let v = VISIBILITY.base;
  // Being right at the venue door helps; across the street less so.
  if (machine.venue.category !== 'street') v *= 1.1 - Math.min(0.25, machine.venue.distanceM / 400);
  const night = hour < 6 || hour >= 20;
  if (night)
    v *= hasResearch(state, 'led-panel', type.family) ? VISIBILITY.ledPanel : VISIBILITY.nightUnlit;
  else if (hasResearch(state, 'led-panel', type.family)) v *= 1.03;
  return v;
}

/** Share of customers lost to `n` effective competitors (diminishing). */
export function competitionShare(effectiveCompetitors: number): number {
  if (effectiveCompetitors <= 0) return 0;
  const share = 1 - (1 - COMPETITION.perCompetitorShare) ** effectiveCompetitors;
  return Math.min(COMPETITION.maxShare, share);
}

/** The tag boost when no event is nearby (shared and frozen: never mutate). */
const NO_BOOST: Record<string, number> = Object.freeze({}) as Record<string, number>;

/** True when there is no event tag boost, so tagBoostFactor would be 1. */
export function isNoBoost(boost: Record<string, number>): boolean {
  return boost === NO_BOOST;
}

/** Event multiplier for a point at time t (strongest active event nearby). */
export function eventFactor(
  events: readonly LocalEvent[],
  lat: number,
  lng: number,
  t: number,
): { factor: number; tagBoost: Record<string, number>; event: LocalEvent | null } {
  let best = {
    factor: 1,
    tagBoost: NO_BOOST,
    event: null as LocalEvent | null,
  };
  for (const e of events) {
    if (t < e.startsAt || t >= e.endsAt) continue;
    const d = distanceM({ lat, lng }, e);
    if (d > 600) continue;
    const f = 1 + (e.multiplier - 1) * (1 - d / 600);
    if (f > best.factor) best = { factor: f, tagBoost: e.tagBoost, event: e };
  }
  return best;
}

export function tagBoostFactor(product: Product, boost: Record<string, number>): number {
  let f = 1;
  for (const tag of product.tags) f *= boost[tag as ProductTag] ?? 1;
  return f;
}

export interface DemandContext {
  cell: CellData;
  local: LocalTime;
  weather: WeatherHour | null;
  /** Effective number of competitors around the machine. */
  competitors: number;
  events: readonly LocalEvent[];
  t: number;
  /** Precomputed `baseTraffic(cell, local.hour, local.restDay)` (catch-up caches it per cell per step). */
  traffic?: TrafficBreakdown;
}

/** customers_per_hour (business hour) for a machine (SPEC §5.2). */
export function customersPerHour(
  machine: Machine,
  state: GameState,
  ctx: DemandContext,
): { customers: number; traffic: TrafficBreakdown; tagBoost: Record<string, number> } {
  const type = getMachineType(machine.typeId);
  const traffic = ctx.traffic ?? baseTraffic(ctx.cell, ctx.local.hour, ctx.local.restDay);
  const ev = eventFactor(ctx.events, machine.lat, machine.lng, ctx.t);
  const customers =
    traffic.total *
    visibility(machine, type, state, ctx.local.hour) *
    type.captureRate *
    DEMAND_SCALE *
    weatherTrafficFactor(traffic, ctx.weather) *
    ev.factor *
    (1 - competitionShare(ctx.competitors));
  return { customers, traffic, tagBoost: ev.tagBoost };
}
