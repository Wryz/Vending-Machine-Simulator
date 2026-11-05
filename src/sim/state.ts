import type { MachineFamily, MachineTypeId } from '@/config/machines';
import type { ResearchId } from '@/config/progression';
import type { CellData, PlaceCategory, WeatherHour } from '@/data/types';

/**
 * Game state. Plain JSON (no classes, Maps or Dates) so it can be saved,
 * exported and migrated (SPEC §7.5). All money in integer cents, all times in
 * epoch ms (real time).
 */

export const SCHEMA_VERSION = 1;

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
  wrap: string | null;
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
  events: LocalEvent[];
  /** Local dates for which events were generated. */
  eventDays: string[];
  collection: Record<string, number>;
  freePulls: { dateKey: string; count: number };
  boosts: { doubleEarningsUntil: number };
  prestige: { reputation: number; perks: Record<string, number>; sales: number };
  hiddenPlaces: string[];
  tutorial: { step: number; done: boolean };
  ledger: Ledger;
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
}

export interface SimOptions {
  /** Offline cap multiplier from purchases (Remove Ads + ×1.25). */
  offlineCapMultiplier?: number;
}
