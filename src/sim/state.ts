import type { MachineFamily, MachineTypeId } from '@/config/machines';
import type { CurveKey } from '@/config/curves';
import type { ResearchId } from '@/config/progression';
import type { RequestReason } from '@/config/requests';
import type { CellData, PlaceCategory, Supplier, WeatherHour } from '@/data/types';

import type { GoalsState } from './goals';
import type { RankingsState } from './rankings';
import type { HoodMap } from './hoods';

/**
 * Game state. Plain JSON (no classes, Maps or Dates) so it can be saved,
 * exported and migrated (SPEC §7.5). All money in integer cents, all times in
 * epoch ms (real time).
 */

export const SCHEMA_VERSION = 9;

export interface Slot {
  productId: string | null;
  qty: number;
  priceCents: number;
  /** Auto-reorder par level (drivers restock to this). */
  par: number;
  /** When the current batch was stocked (spoilage). */
  stockedAt: number;
}

export type VenueCategory = PlaceCategory | 'street';

export interface Venue {
  placeId: string;
  name: string;
  category: VenueCategory;
  distanceM: number;
}

export interface Contract {
  commission: number;
  termDays: number;
  startedAt: number;
  endsAt: number;
  exclusive: boolean;
  renegotiated: boolean;
}

export interface Breakdown {
  kind: 'jam' | 'fridge';
  since: number;
  /** When a technician will have fixed it (research), or null. */
  techFixAt: number | null;
}

export interface MachineStats {
  unitsTotal: number;
  revenueTotalCents: number;
  /** Rolling (exponentially decayed, half-life one business day) revenue. */
  revenueRecentCents: number;
  lastSaleAt: number | null;
}

export interface Machine {
  id: string;
  typeId: MachineTypeId;
  lat: number;
  lng: number;
  cellId: string;
  /** Compass bearing the front faces. */
  heading: number;
  status: 'active' | 'stored';
  venue: Venue;
  contract: Contract;
  /** Venue satisfaction 0..1. */
  mood: number;
  lowMoodSince: number | null;
  slots: Slot[];
  /** Gross cash in the box (commission is settled on collection). */
  cashBoxCents: number;
  broken: Breakdown | null;
  /** Manual restock "fresh stock" bonus active until. */
  freshUntil: number;
  placedAt: number;
  lastVisitAt: number;
  /** What the player last saw (used without telemetry). */
  seen: { at: number; qty: number[]; cashBoxCents: number };
  stats: MachineStats;
}

export interface Driver {
  id: string;
  name: string;
  hiredAt: number;
  machineIds: string[];
  nextRunAt: number;
}

export interface RivalMachine {
  id: string;
  lat: number;
  lng: number;
  cellId: string;
  typeId: MachineTypeId;
  placedAt: number;
}

export interface RivalState {
  active: boolean;
  machines: RivalMachine[];
  nextDecisionAt: number;
  /** The chapter-3 ramp happened: full fleet, contract bids, full competitor weight (schema v6). */
  ramped: boolean;
  /** Last "a customer went to the rival instead" moment (real ms, schema v6). */
  lastStingAt: number;
  /** Who leads the market share, once judged (schema v6). */
  lead: 'player' | 'rival' | null;
}

/** Surprise moments (SPEC §4.6, schema v6): see src/sim/events.ts. */
/** A passer-by asking one of your machines for something (SPEC §4.6, schema v7). */
export interface CustomerRequest {
  id: string;
  /** The machine they asked at. */
  machineId: string;
  /** Where they came from: a real named place nearby, or the homes around (no name). */
  from: { placeId?: string; name: string; category: CurveKey };
  reason: RequestReason;
  productId: string;
  at: number;
  /** They give up at this time. */
  until: number;
}

/** One coil's share of a restock order. */
export interface RestockLine {
  slot: number;
  productId: string;
  qty: number;
}

/**
 * A restock order on its way (schema v8): a van loads at the nearest
 * supermarket or wholesaler, drives to the machine and fills it on arrival.
 * Paid when ordered.
 */
export interface Delivery {
  id: string;
  machineId: string;
  lines: RestockLine[];
  units: number;
  /** Where the van loads; kind 'depot' (city center) when the pack lists no warehouse. */
  from: { id: string; name: string; kind: Supplier['kind'] | 'depot'; lat: number; lng: number };
  /** The street route as [lng, lat] (straight line when the city has no road data; old saves: none). */
  path?: [number, number][];
  orderedAt: number;
  /** Leaves the warehouse (after loading). */
  departAt: number;
  arriveAt: number;
  /** Wholesale paid for the stock (refunded if the machine is gone on arrival). */
  wholesaleCents: number;
  fuelCents: number;
  /**
   * The van's trip: stops of one run share it and are driven in `leg` order
   * (each leg's path starts at the previous stop). Old saves: none (own id, leg 0).
   */
  run?: string;
  leg?: number;
  /** A hired driver's van: collects the cash box too, no fresh-stock bonus, not one of the player's vans. */
  driverId?: string;
  /**
   * The placement the van drives to (the machine's spot and `placedAt` when
   * ordered). A machine picked up and placed elsewhere meanwhile is a
   * different placement: the stock goes back. Old saves: none (not checked).
   */
  to?: { lat: number; lng: number; placedAt: number };
}

export interface RequestsState {
  /** When the next request may come (0 = not scheduled yet). */
  nextAt: number;
  open: CustomerRequest[];
  /** Requests served so far. */
  served: number;
}

export interface SurpriseState {
  /** When the next surprise may happen (0 = not scheduled yet). */
  nextAt: number;
  /** Jackpot hour: a spot's demand is boosted until `until`. */
  jackpot: { machineId: string; until: number; multiplier: number } | null;
  /** Venue deal: offered until `offerUntil`; once accepted, active until `activeUntil`. */
  deal: {
    id: string;
    machineId: string;
    venueName: string;
    /** The venue's commission during the deal. */
    commission: number;
    offerUntil: number;
    activeUntil: number;
  } | null;
}

export interface LocalEvent {
  id: string;
  templateId: string;
  name: string;
  placeId: string;
  placeName: string;
  lat: number;
  lng: number;
  startsAt: number;
  endsAt: number;
  announcedAt: number;
  multiplier: number;
  tagBoost: Record<string, number>;
}

export type LogKind =
  | 'sale'
  | 'empty'
  | 'cash-full'
  | 'breakdown'
  | 'repair'
  | 'theft'
  | 'spoiled'
  | 'contract-ended'
  | 'contract-renewed'
  | 'contract-lost'
  | 'chapter'
  | 'rival'
  | 'event'
  | 'driver'
  | 'collect'
  | 'restock'
  | 'pull'
  | 'fine'
  | 'info';

export interface LogEntry {
  at: number;
  kind: LogKind;
  text: string;
  machineId?: string;
  amountCents?: number;
}

export interface Ledger {
  lifetimeSalesCents: number;
  /** Cash actually received (after commission), the "earn" in chapter goals. */
  lifetimeNetCents: number;
  lifetimeCostsCents: number;
  lifetimeUnits: number;
  /** Rolling (half-life one business day) revenue for market share. */
  recentPlayerCents: number;
  recentRivalCents: number;
  /** Today's P&L by line (local date of the city). */
  day: { dateKey: string; lines: Record<string, number> };
  yesterday: { dateKey: string; lines: Record<string, number> } | null;
}

export interface GameState {
  schemaVersion: number;
  id: string;
  cityId: string;
  createdAt: number;
  now: number;
  rng: number;
  cashCents: number;
  chapter: number;
  /** Chapter completion timestamps (index = chapter). */
  chapterDoneAt: Record<number, number>;
  vanLevel: number;
  warehouse: boolean;
  liquorPermit: boolean;
  /** Researched upgrades: list of families, or ['*'] for global ones. */
  research: Partial<Record<ResearchId, (MachineFamily | '*')[]>>;
  machines: Machine[];
  drivers: Driver[];
  rival: RivalState;
  /** Surprise moments (schema v6). */
  surprises: SurpriseState;
  /** Customer requests (schema v7). */
  requests: RequestsState;
  /** Restock vans on the road (schema v8). */
  deliveries: Delivery[];
  events: LocalEvent[];
  /** Local dates for which events were generated. */
  eventDays: string[];
  collection: Record<string, number>;
  freePulls: { dateKey: string; count: number };
  boosts: { doubleEarningsUntil: number };
  prestige: { reputation: number; perks: Record<string, number>; sales: number };
  hiddenPlaces: string[];
  tutorial: { step: number; done: boolean };
  /** Daily orders + counters + streak (schema v2). */
  goals: GoalsState;
  /** Trophy id -> unlocked at (schema v2). */
  achievements: Record<string, number>;
  /** City ranking board: this week's standings, nightly boards (schema v5). */
  rankings: RankingsState;
  ledger: Ledger;
  /** Countries and continents the company has branches in (schema v9; kept by the app). */
  footprint: { countries: string[]; continents: string[] };
  /** Company lifetime sales when the current chapter began (chapters 6–7 count sales since). */
  chapterStartSalesCents: number;
  log: LogEntry[];
  nextId: number;
}

/** Per-city world data the sim reads but never stores. */
export interface World {
  city: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    timeZone: string;
    countryCode: string;
  };
  cells: ReadonlyMap<string, CellData>;
  /** H3 res-9 cell containing a point (injected so the sim stays testable). */
  cellOf(lat: number, lng: number): string;
  /** Cell ids within `k` rings (includes the cell). */
  neighbors(cellId: string, k: number): string[];
  /** Hourly weather, or null when unknown (neutral). */
  weatherAt(t: number): WeatherHour | null;
  /** Real neighbourhoods the districts follow (absent: plain rings around the start point). */
  hoods?: HoodMap;
  /** Warehouses delivery vans load at (none: vans leave from a depot at the city center). */
  suppliers?: readonly Supplier[];
  /** The fastest street route between two points (injected; absent = straight line). */
  route?(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): { path: [number, number][]; lengthM: number } | null;
}

export interface SimOptions {
  /** Offline cap multiplier from purchases (Remove Ads + ×1.25). */
  offlineCapMultiplier?: number;
  /**
   * Extra cash per sale as a share of its revenue (Double Profits = 1, SPEC §9).
   * Paid as ledger 'Bonus'; it does not count toward lifetime sales.
   */
  salesBonus?: number;
}
