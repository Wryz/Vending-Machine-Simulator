import { CATEGORY_LABEL, VENUE_CATEGORIES } from '@/config/places';
import {
  getMachineType,
  MACHINE_TYPES,
  type MachineFamily,
  type MachineTypeId,
} from '@/config/machines';
import { COMPETITION, DEMAND_SCALE, FIT, RISK, SPOT_CARD } from '@/config/economy';
import { TUTORIAL } from '@/config/tutorial';
import { getProduct, PRODUCTS } from '@/config/products';
import type { CellData, PlaceCategory } from '@/data/types';

import { baseTraffic, competitionShare, productFit, priceResponse, visibility } from './demand';
import { distanceM } from './geo';
import { storedMachine } from './create';
import {
  activeMachines,
  alcoholBlocked,
  commissionAsk,
  districtOf,
  districtUnlocked,
  machineTypeUnlocked,
  nearbyPlaces,
  resolveVenue,
  rivalWeight,
  storeCompetitors,
} from './rules';
import type { CategoryNumbers } from '@/data/types';
import type { GameState, Venue, World } from './state';
import { localTime } from './time';

/** Everything the Spot Card shows (SPEC §4.1, §8), with readable reasons. */
export interface SpotReport {
  cellId: string;
  venue: Venue;
  nearby: { id: string; name: string; category: PlaceCategory; label: string; distanceM: number }[];
  /** Expected customers per business hour at each real local hour (0..23), today's day type. */
  hourly: number[];
  /** People passing by per business hour at each local hour (all foot traffic, not just buyers). */
  footfall: number[];
  /** The area's open data: residents, places by category (in this ~0.1 km² cell) and night quiet (0 busy … 1 isolated). */
  area: { residents: number; places: CategoryNumbers; isolation: number };
  /** Customers over one business day (sum of the hourly curve). */
  dailyCustomers: number;
  /** Expected sales per business day with a typical full machine at suggested prices. */
  dailySalesCents: number;
  /** Estimated customers per business hour right now. */
  nowCustomers: number;
  bestFamilies: { family: MachineFamily; score: number }[];
  competitors: { yours: number; rival: number; stores: number };
  commission: number;
  reasons: { good: boolean; text: string }[];
  /** 0..5 stars for at-a-glance quality. */
  rating: number;
  district: number;
  districtLocked: boolean;
  blocked: string | null;
  theftRisk: 'low' | 'medium' | 'high';
}

const FAMILY_SAMPLE: Record<MachineFamily, MachineTypeId> = {
  snacks: 'snack',
  drinks: 'cold-drinks',
  capsules: 'capsule',
  tech: 'chargers',
  hotFood: 'hot-noodles',
  alcohol: 'beer-wine',
};

/** Customers/business-hour that counts as a "decent" spot (used for ratings). */
const DECENT_CUSTOMERS = SPOT_CARD.decentCustomersPerHour;

export function evaluateSpot(
  state: GameState,
  world: World,
  p: { lat: number; lng: number },
  typeId: MachineTypeId,
  t: number,
  placeId?: string,
): SpotReport {
  const cellId = world.cellOf(p.lat, p.lng);
  const cell: CellData = world.cells.get(cellId) ?? {
    id: cellId,
    lat: p.lat,
    lng: p.lng,
    pop: 0,
    counts: {},
    nearby: {},
    places: [],
    competitors: 0,
    isolation: 1,
  };
  const type = getMachineType(typeId);
  const venue = resolveVenue(world, state, p, placeId);
  const probe = storedMachine('probe', typeId, t);
  probe.lat = p.lat;
  probe.lng = p.lng;
  probe.cellId = cellId;
  probe.venue = venue;

  const local = localTime(t, world.city.timeZone, world.city.countryCode);
  // Same competition and demand numbers as the sim (rules.competition, demand.customersPerHour).
  const R = COMPETITION.radiusM;
  const yours = activeMachines(state).filter((m) => distanceM(m, p) <= R).length;
  const rival = state.rival.machines.filter((m) => distanceM(m, p) <= R).length;
  const effective = yours + rivalWeight(state) * rival + storeCompetitors(cell.competitors);
  const compFactor = 1 - competitionShare(effective);

  const hourly: number[] = [];
  const footfall: number[] = [];
  for (let h = 0; h < 24; h++) {
    const traffic = baseTraffic(cell, h + 0.5, local.restDay);
    footfall.push(traffic.total);
    hourly.push(
      traffic.total *
        visibility(probe, type, state, h + 0.5) *
        type.captureRate *
        DEMAND_SCALE *
        compFactor,
    );
  }
  const dailyCustomers = hourly.reduce((a, b) => a + b, 0);
  const nowCustomers = hourly[Math.floor(local.hour) % 24];

  const trafficNoon = baseTraffic(cell, 12.5, local.restDay);
  const products = PRODUCTS.filter(
    (x) =>
      type.holds.includes(x.family) && x.unlockChapter <= Math.max(state.chapter, x.unlockChapter),
  );
  const avgFit = products.length
    ? products.reduce((a, x) => a + productFit(x, trafficNoon, 12.5), 0) / products.length
    : 1;
  const avgPrice = products.length
    ? products.reduce((a, x) => a + x.suggestedCents, 0) / products.length
    : 0;
  const dailySalesCents = Math.round(
    dailyCustomers * FIT.baseBuy * Math.min(1, avgFit) * priceResponse(1) * avgPrice,
  );

  const bestFamilies = (Object.keys(FAMILY_SAMPLE) as MachineFamily[])
    .map((family) => {
      const sampleType = getMachineType(FAMILY_SAMPLE[family]);
      const famProducts = PRODUCTS.filter((x) => sampleType.holds.includes(x.family));
      const fit =
        famProducts.reduce((a, x) => a + productFit(x, trafficNoon, 12.5), 0) /
        Math.max(1, famProducts.length);
      return { family, score: Math.round(fit * 100) / 100 };
    })
    .filter((f) => f.family !== 'alcohol' || state.chapter >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const nearby = nearbyPlaces(world, state, p, SPOT_CARD.nearbyRadiusM)
    .slice(0, 12)
    .map((x) => ({
      id: x.id,
      name: x.name,
      category: x.category,
      label: CATEGORY_LABEL[x.category],
      distanceM: Math.round(x.distanceM),
    }));

  const reasons: SpotReport['reasons'] = [];
  const parts = Object.entries(trafficNoon.parts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const top = parts[0];
  if (top && (top[1] ?? 0) > 0) {
    const label =
      top[0] === 'residential'
        ? 'residents'
        : CATEGORY_LABEL[top[0] as PlaceCategory].toLowerCase();
    reasons.push({ good: true, text: `Most foot traffic comes from ${label}.` });
  }
  const peakHour = hourly.indexOf(Math.max(...hourly));
  if (dailyCustomers > 0)
    reasons.push({ good: true, text: `Busiest around ${String(peakHour).padStart(2, '0')}:00.` });
  if (dailyCustomers / 24 < DECENT_CUSTOMERS * SPOT_CARD.fewPeopleShare)
    reasons.push({ good: false, text: 'Few people pass here. Sales will be slow.' });
  if (cell.pop < 300 && Object.keys(cell.nearby).length < 2)
    reasons.push({ good: false, text: 'Almost nothing nearby: no homes or places within 400 m.' });
  if (venue.category === 'street')
    reasons.push({
      good: false,
      text: 'No venue to host the machine. Street spots are less visible.',
    });
  else
    reasons.push({
      good: true,
      text: `Hosted by ${venue.name} (${CATEGORY_LABEL[venue.category as PlaceCategory]}).`,
    });
  if (effective >= 2)
    reasons.push({
      good: false,
      text: `Crowded: ${Math.round((1 - compFactor) * 100)}% of customers go to competitors.`,
    });
  else if (effective === 0) reasons.push({ good: true, text: 'No competition nearby.' });
  if (rival > 0)
    reasons.push({
      good: false,
      text: `Brightvend has ${rival} machine${rival > 1 ? 's' : ''} within ${R} m.`,
    });
  const nightShare =
    (hourly
      .slice(RISK.nightStartHour)
      .concat(hourly.slice(0, RISK.nightEndHour))
      .reduce((a, b) => a + b, 0) || 0) / Math.max(1, dailyCustomers);
  const theftScore =
    RISK.theftBasePerDay *
    type.theftRisk *
    (1 + RISK.theftIsolationWeight * cell.isolation) *
    (1 + nightShare);
  const theftRisk: SpotReport['theftRisk'] =
    theftScore > SPOT_CARD.theftHighAbove
      ? 'high'
      : theftScore > SPOT_CARD.theftMediumAbove
        ? 'medium'
        : 'low';
  if (theftRisk === 'high')
    reasons.push({ good: false, text: 'Isolated at night: higher theft risk.' });
  const best = bestFamilies[0];
  if (best && getMachineType(typeId).family !== best.family && best.score > 1.15) {
    reasons.push({
      good: false,
      text: `A ${best.family === 'hotFood' ? 'hot food' : best.family} machine would fit this spot better.`,
    });
  }

  const district = districtOf(world, p);
  const blocked =
    alcoholBlocked(world, state, type, p) ??
    (machineTypeUnlocked(state, type, world.city.countryCode) ? null : `${type.name} is locked.`);
  const rating = Math.max(
    0,
    Math.min(5, Math.round((dailyCustomers / 24 / DECENT_CUSTOMERS) * 3 * 2) / 2),
  );

  return {
    cellId,
    venue,
    nearby,
    hourly,
    footfall,
    area: { residents: cell.pop, places: { ...cell.counts }, isolation: cell.isolation },
    dailyCustomers,
    dailySalesCents,
    nowCustomers,
    bestFamilies,
    competitors: { yours, rival, stores: cell.competitors },
    commission: commissionAsk(state, venue, 90, false),
    reasons,
    rating,
    district,
    districtLocked: !districtUnlocked(state, district),
    blocked,
    theftRisk,
  };
}

/** Machine types the player can place right now in this city. */
export function availableMachineTypes(state: GameState, world: World) {
  return MACHINE_TYPES.filter(
    (t) => t.id !== 'used-snack' && machineTypeUnlocked(state, t, world.city.countryCode),
  );
}

export function productName(id: string | null): string {
  return id ? getProduct(id).name : 'Empty';
}

/**
 * "Show me a good spot" for the tutorial: the spot near `near` (the map's
 * center) expected to sell the most per day, in an open district and clear of
 * every machine. It stands on a real venue when the cell has one (a hosted
 * machine is easier to see). Null when nothing nearby is open.
 */
export function suggestSpot(
  state: GameState,
  world: World,
  near: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number; dailySalesCents: number } | null {
  // Outside the open districts (e.g. panned far away): search from the center.
  const from = districtUnlocked(state, districtOf(world, near)) ? near : world.city;
  const typeId =
    state.machines.find((m) => m.status === 'stored')?.typeId ?? state.machines[0]?.typeId;
  if (!typeId) return null;
  const local = localTime(t, world.city.timeZone, world.city.countryCode);
  const taken = [...activeMachines(state), ...state.rival.machines];

  const cells: { cell: CellData; point: { lat: number; lng: number }; traffic: number }[] = [];
  for (const id of world.neighbors(world.cellOf(from.lat, from.lng), TUTORIAL.spotSearchRings)) {
    const cell = world.cells.get(id);
    if (!cell) continue;
    const venue = cell.places
      .filter(
        (x) =>
          (VENUE_CATEGORIES as readonly string[]).includes(x.category) &&
          !state.hiddenPlaces.includes(x.id),
      )
      .sort((a, b) => distanceM(a, cell) - distanceM(b, cell))[0];
    const point = venue ? { lat: venue.lat, lng: venue.lng } : { lat: cell.lat, lng: cell.lng };
    if (!districtUnlocked(state, districtOf(world, point))) continue;
    if (taken.some((m) => distanceM(m, point) < TUTORIAL.spotClearanceM)) continue;
    let traffic = 0;
    for (let h = 0; h < 24; h++) traffic += baseTraffic(cell, h + 0.5, local.restDay).total;
    cells.push({ cell, point, traffic });
  }

  let best: { lat: number; lng: number; dailySalesCents: number } | null = null;
  for (const c of cells.sort((a, b) => b.traffic - a.traffic).slice(0, TUTORIAL.spotCandidates)) {
    const report = evaluateSpot(state, world, c.point, typeId, t);
    if (report.blocked || report.districtLocked) continue;
    if (!best || report.dailySalesCents > best.dailySalesCents)
      best = { ...c.point, dailySalesCents: report.dailySalesCents };
  }
  return best;
}
