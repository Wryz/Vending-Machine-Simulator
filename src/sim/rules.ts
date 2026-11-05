import { CASH, COMPETITION, CONTRACT, OVERHEAD, SERVICE, STAFF, TIME } from '@/config/economy';
import { getMachineType, type MachineType, ALCOHOL_ALLOWED_COUNTRIES } from '@/config/machines';
import {
  ALCOHOL_MIN_DISTANCE_M,
  VENUE_CATEGORIES,
  VENUE_COMMISSION,
  YOUTH_CATEGORIES,
} from '@/config/places';
import { COLLECTIONS, DISTRICTS, PRESTIGE_PERKS } from '@/config/progression';
import { PRODUCTS, getProduct, type Product } from '@/config/products';
import type { NamedPlace } from '@/data/types';

import { hasResearch } from './demand';
import { distanceM, type LatLng } from './geo';
import type { GameState, Machine, Venue, World } from './state';

export function slotCapacity(state: GameState, type: MachineType): number {
  const bigger = hasResearch(state, 'bigger-coil', type.family);
  return Math.round(type.capacityPerSlot * (bigger ? 1.5 : 1));
}

export function cashBoxCapacity(state: GameState, type: MachineType): number {
  return CASH.cashBoxCents * (hasResearch(state, 'cash-vault', type.family) ? 2 : 1);
}

export function vanCapacity(state: GameState): number {
  return SERVICE.vanCapacityByLevel[
    Math.min(state.vanLevel, SERVICE.vanCapacityByLevel.length - 1)
  ];
}

export function driverCapacity(state: GameState): number {
  return state.warehouse ? STAFF.warehouseDriverCapacity : STAFF.driverCapacity;
}

export function wholesaleCents(state: GameState, product: Product): number {
  return Math.round(product.wholesaleCents * (state.warehouse ? 1 - STAFF.warehouseDiscount : 1));
}

export function perkLevel(state: GameState, id: string): number {
  return state.prestige.perks[id] ?? 0;
}

export function prestigePerk(id: string) {
  return PRESTIGE_PERKS.find((p) => p.id === id);
}

/** Global sales multiplier for a machine (collections, prestige, fresh stock). */
export function salesMultiplier(state: GameState, machine: Machine, t: number): number {
  const type = getMachineType(machine.typeId);
  let m = 1 + 0.04 * perkLevel(state, 'sharp-eye');
  for (const s of COLLECTIONS) {
    if (s.perkFamily === type.family && isSeriesComplete(state, s.id)) m *= 1 + s.perkSalesBonus;
  }
  if (machine.freshUntil > t) m *= 1 + SERVICE.freshStockBonus;
  return m;
}

export function isSeriesComplete(state: GameState, seriesId: string): boolean {
  const s = COLLECTIONS.find((c) => c.id === seriesId);
  return !!s && s.items.every((i) => (state.collection[i.id] ?? 0) > 0);
}

export function activeMachines(state: GameState): Machine[] {
  return state.machines.filter((m) => m.status === 'active');
}

/** Management overhead per business day: grows with fleet size (SPEC §5.4). */
export function overheadCentsPerDay(machineCount: number): number {
  return Math.round(
    machineCount * OVERHEAD.perMachineCentsPerDay * (1 + OVERHEAD.growthPerMachine * machineCount),
  );
}

export function districtOf(world: World, p: LatLng): number {
  const d = distanceM(world.city, p) / 1000;
  for (const dist of DISTRICTS) if (d <= dist.radiusKm) return dist.id;
  return DISTRICTS[DISTRICTS.length - 1].id;
}

export function districtUnlocked(state: GameState, districtId: number): boolean {
  const d = DISTRICTS.find((x) => x.id === districtId);
  return !!d && state.chapter >= d.unlockChapter;
}

export function machineTypeUnlocked(
  state: GameState,
  type: MachineType,
  countryCode: string,
): boolean {
  if (state.chapter < type.unlockChapter) return false;
  if (type.countries && !type.countries.includes(countryCode)) return false;
  if (type.requiresPermit === 'liquor' && !ALCOHOL_ALLOWED_COUNTRIES.includes(countryCode))
    return false;
  return true;
}

export function productAllowed(state: GameState, type: MachineType, product: Product): boolean {
  return type.holds.includes(product.family) && state.chapter >= product.unlockChapter;
}

export function productsFor(state: GameState, type: MachineType): Product[] {
  return PRODUCTS.filter((p) => productAllowed(state, type, p));
}

/** Places near a point (cell + neighbours), nearest first, excluding hidden ones. */
export function nearbyPlaces(
  world: World,
  state: GameState,
  p: LatLng,
  radiusM: number,
): (NamedPlace & { distanceM: number })[] {
  const cellId = world.cellOf(p.lat, p.lng);
  const out: (NamedPlace & { distanceM: number })[] = [];
  const seen = new Set<string>();
  for (const id of world.neighbors(cellId, 2)) {
    const cell = world.cells.get(id);
    if (!cell) continue;
    for (const place of cell.places) {
      if (seen.has(place.id) || state.hiddenPlaces.includes(place.id)) continue;
      seen.add(place.id);
      const d = distanceM(p, place);
      if (d <= radiusM) out.push({ ...place, distanceM: d });
    }
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

/** The venue a spot is attached to: the nearest suitable real place (SPEC §4.5). */
export function resolveVenue(world: World, state: GameState, p: LatLng, placeId?: string): Venue {
  const candidates = nearbyPlaces(world, state, p, 120).filter((x) =>
    (VENUE_CATEGORIES as readonly string[]).includes(x.category),
  );
  const chosen = placeId ? candidates.find((c) => c.id === placeId) : candidates[0];
  if (!chosen) {
    return {
      placeId: `street:${world.cellOf(p.lat, p.lng)}`,
      name: 'Street corner',
      category: 'street',
      distanceM: 0,
    };
  }
  return {
    placeId: chosen.id,
    name: chosen.name,
    category: chosen.category,
    distanceM: Math.round(chosen.distanceM),
  };
}

/** Commission the venue asks for a term (SPEC §4.5: 10–35%). */
export function commissionAsk(
  state: GameState,
  venue: Venue,
  termDays: number,
  exclusive: boolean,
): number {
  const base =
    venue.category === 'street' ? CONTRACT.commissionMin : VENUE_COMMISSION[venue.category];
  const c =
    base -
    (CONTRACT.termDiscount[termDays] ?? 0) +
    (exclusive ? CONTRACT.exclusivityCommission : 0) -
    0.01 * perkLevel(state, 'smooth-talker');
  return (
    Math.round(Math.min(CONTRACT.commissionMax, Math.max(CONTRACT.commissionMin, c)) * 1000) / 1000
  );
}

/** Alcohol placement rules (SPEC §4.3): permit, local rules, 300 m from youth places. */
export function alcoholBlocked(
  world: World,
  state: GameState,
  type: MachineType,
  p: LatLng,
): string | null {
  if (type.requiresPermit !== 'liquor') return null;
  if (!ALCOHOL_ALLOWED_COUNTRIES.includes(world.city.countryCode))
    return 'Alcohol vending is not allowed in this city.';
  if (!state.liquorPermit) return 'Requires a liquor permit.';
  const youth = nearbyPlaces(world, state, p, ALCOHOL_MIN_DISTANCE_M).find((x) =>
    (YOUTH_CATEGORIES as readonly string[]).includes(x.category),
  );
  if (youth)
    return `Too close to ${youth.name} (${Math.round(youth.distanceM)} m). Keep 300 m from schools.`;
  return null;
}

/** Spatial hash for radius queries (~radius-sized buckets). */
function bucketKey(lat: number, lng: number, cellDeg: number): string {
  return `${Math.floor(lat / cellDeg)}:${Math.floor(lng / cellDeg)}`;
}

function buildIndex<T extends LatLng>(items: readonly T[], cellDeg: number): Map<string, T[]> {
  const idx = new Map<string, T[]>();
  for (const it of items) {
    const k = bucketKey(it.lat, it.lng, cellDeg);
    const list = idx.get(k);
    if (list) list.push(it);
    else idx.set(k, [it]);
  }
  return idx;
}

function countWithin<T extends LatLng>(
  idx: Map<string, T[]>,
  p: LatLng,
  radiusM: number,
  cellDeg: number,
  skip?: T,
): number {
  const r = Math.floor(p.lat / cellDeg);
  const c = Math.floor(p.lng / cellDeg);
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const list = idx.get(`${r + dr}:${c + dc}`);
      if (!list) continue;
      for (const it of list) if (it !== skip && distanceM(p, it) <= radiusM) n++;
    }
  }
  return n;
}

/**
 * Effective competitors around each active player machine (key = machine id)
 * and around each rival machine (key = `rival:{id}`, counting player machines).
 * Player machines count 1, rival machines 1.25 (they undercut), real stores
 * per `COMPETITION.storeWeight`. Uses a spatial hash: O(n) per rebuild.
 */
export function competitorMap(state: GameState, world: World): Map<string, number> {
  const out = new Map<string, number>();
  const mine = activeMachines(state);
  // Bucket size >= radius (1° lat ≈ 111 km; lng buckets are smaller in m, which is safe).
  const cellDeg =
    ((COMPETITION.radiusM / 111_000) * 1.05) /
    Math.max(0.2, Math.cos((world.city.lat * Math.PI) / 180));
  const mineIdx = buildIndex(mine, cellDeg);
  const rivalIdx = buildIndex(state.rival.machines, cellDeg);
  for (const m of mine) {
    let n = countWithin(mineIdx, m, COMPETITION.radiusM, cellDeg, m);
    n += 1.25 * countWithin(rivalIdx, m, COMPETITION.radiusM, cellDeg);
    const cell = world.cells.get(m.cellId);
    if (cell) n += cell.competitors * COMPETITION.storeWeight * 0.5;
    out.set(m.id, n);
  }
  for (const r of state.rival.machines)
    out.set(`rival:${r.id}`, countWithin(mineIdx, r, COMPETITION.radiusM, cellDeg));
  return out;
}

export function getProductSafe(id: string | null): Product | null {
  if (!id) return null;
  try {
    return getProduct(id);
  } catch {
    return null;
  }
}

export function isEmpty(m: Machine): boolean {
  return m.slots.every((s) => s.qty <= 0);
}

export function stockUnits(m: Machine): number {
  return m.slots.reduce((a, s) => a + s.qty, 0);
}

export function maxOfflineMs(state: GameState, capMultiplier = 1): number {
  const hours = TIME.offlineCapHours * capMultiplier + 12 * perkLevel(state, 'long-weekend');
  return hours * 3_600_000;
}

export function machineTypeOf(m: Machine): MachineType {
  return getMachineType(m.typeId);
}
