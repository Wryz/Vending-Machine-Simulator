import { CATEGORY_LABEL } from '@/config/places';
import {
  getMachineType,
  MACHINE_TYPES,
  type MachineFamily,
  type MachineTypeId,
} from '@/config/machines';
import { FIT, RISK } from '@/config/economy';
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
} from './rules';
import type { GameState, Venue, World } from './state';
import { localTime } from './time';

/** Everything the Spot Card shows (SPEC §4.1, §8), with readable reasons. */
export interface SpotReport {
  cellId: string;
  venue: Venue;
  nearby: { id: string; name: string; category: PlaceCategory; label: string; distanceM: number }[];
  /** Expected customers per business hour at each real local hour (0..23), today's day type. */
  hourly: number[];
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

/** Rough customers/business-hour that counts as a "decent" spot (used for ratings). */
const DECENT_CUSTOMERS = 18;

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
  const yours = activeMachines(state).filter((m) => distanceM(m, p) <= 250).length;
  const rival = state.rival.machines.filter((m) => distanceM(m, p) <= 250).length;
  const effective = yours + rival * 1.25 + cell.competitors * 0.3;
  const compFactor = 1 - competitionShare(effective);

  const hourly: number[] = [];
  for (let h = 0; h < 24; h++) {
    const traffic = baseTraffic(cell, h + 0.5, local.restDay);
    hourly.push(
      traffic.total * visibility(probe, type, state, h + 0.5) * type.captureRate * compFactor,
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

  const nearby = nearbyPlaces(world, state, p, 400)
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
  if (dailyCustomers / 24 < DECENT_CUSTOMERS * 0.35)
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
      text: `Brightvend has ${rival} machine${rival > 1 ? 's' : ''} within 250 m.`,
    });
  const nightShare =
    (hourly
      .slice(22)
      .concat(hourly.slice(0, 6))
      .reduce((a, b) => a + b, 0) || 0) / Math.max(1, dailyCustomers);
  const theftScore =
    RISK.theftBasePerDay *
    type.theftRisk *
    (1 + RISK.theftIsolationWeight * cell.isolation) *
    (1 + nightShare);
  const theftRisk: SpotReport['theftRisk'] =
    theftScore > 0.09 ? 'high' : theftScore > 0.05 ? 'medium' : 'low';
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
