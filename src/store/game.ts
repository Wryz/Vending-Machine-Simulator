import { create } from 'zustand';

import { getCity, type CityId } from '@/config/cities';
import { SAVE } from '@/config/economy';
import { loadCityPack, loadRegionPack } from '@/data/cityPack';
import { cellOf, neighbors } from '@/data/h3';
import { fetchWeather } from '@/data/api';
import { syntheticWeather, WeatherBook } from '@/data/weather';
import type { RegionPack } from '@/data/types';
import { readJson, writeJson } from '@/services/storage';
import { ACHIEVEMENTS, CHAPTERS } from '@/config/progression';
import {
  advance,
  calibrateCells,
  checkAchievements,
  goalProgress,
  visibleEvents,
  cloneState,
  localTime,
  migrateSave,
  newGame,
  type AdvanceReport,
  type GameState,
  type World,
} from '@/sim';

import { useCelebrations } from './celebrations';
import { cityKey, useProfile, type CityInfo } from './profile';

export interface TickerEntry {
  at: number;
  machineId: string;
  cents: number;
  units: number;
}

interface GameStore {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  city: CityInfo | null;
  game: GameState | null;
  world: World | null;
  /** Shown as a receipt when returning after a while. */
  offlineReport: AdvanceReport | null;
  ticker: TickerEntry[];
  /** Bumped on every state change (cheap selector for re-renders). */
  version: number;
  lastSavedAt: number;

  openCity(city: CityInfo, opts?: { fresh?: boolean; seed?: number }): Promise<void>;
  tick(now?: number): AdvanceReport | null;
  /** Run a sim action on a draft; commits and saves when it succeeds. */
  act<R extends { ok: boolean }>(fn: (draft: GameState, world: World) => R): R;
  replaceGame(next: GameState): void;
  save(): void;
  dismissOfflineReport(): void;
  close(): void;
}

export function cityInfoFor(id: CityId): CityInfo {
  const c = getCity(id);
  return {
    id: c.id,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    timeZone: c.timeZone,
    countryCode: c.countryCode,
    kind: 'fallback',
  };
}

/** Build the sim World for a city pack (also used by Diagnostics for a throwaway bench world). */
export function buildWorld(city: CityInfo, pack: RegionPack, weather: WeatherBook): World {
  const calibrated = calibrateCells(pack.cells, city);
  const cells = new Map(calibrated.cells.map((c) => [c.id, c]));
  return {
    city: {
      id: city.id,
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      timeZone: city.timeZone,
      countryCode: city.countryCode,
    },
    cells,
    cellOf,
    neighbors,
    weatherAt(t) {
      const live = weather.at(t);
      if (live) return live;
      const lt = localTime(t, city.timeZone, city.countryCode);
      return syntheticWeather(city.id, t, lt.hour, lt.month);
    },
  };
}

const weatherBook = new WeatherBook();
let loadToken = 0;
let lastWeatherFetch = 0;
const WEATHER_REFRESH_MS = 30 * 60_000;
const OFFLINE_REPORT_MIN_MS = 5 * 60_000;

function saveKey(city: CityInfo) {
  return `save-${cityKey(city)}`;
}

function offlineCapMultiplier(): number {
  return useProfile.getState().entitlements.removeAds ? 1.25 : 1;
}

export const useGame = create<GameStore>((set, get) => ({
  status: 'idle',
  error: null,
  city: null,
  game: null,
  world: null,
  offlineReport: null,
  ticker: [],
  version: 0,
  lastSavedAt: 0,

  async openCity(city, opts = {}) {
    const token = ++loadToken;
    set({ status: 'loading', error: null });
    try {
      const pack =
        city.kind === 'fallback'
          ? await loadCityPack(city.id)
          : await loadRegionPack(city.res5 ?? '');
      // A newer openCity() started while we were loading: let it win.
      if (token !== loadToken) return;
      const world = buildWorld(city, pack, weatherBook);
      lastWeatherFetch = Date.now();
      fetchWeather(city)
        .then((w) => weatherBook.load(w.hours))
        .catch(() => undefined);
      const now = Date.now();
      let game: GameState | null = null;
      if (!opts.fresh) {
        const raw = readJson<unknown>(saveKey(city));
        if (raw) {
          try {
            game = migrateSave(raw);
          } catch {
            game = null;
          }
        }
      }
      let offlineReport: AdvanceReport | null = null;
      if (!game) {
        game = newGame({
          cityId: city.id,
          now,
          seed: opts.seed ?? Math.floor(Math.random() * 2 ** 31),
        });
      } else if (now - game.now > 0) {
        const { state, report } = advance(game, world, now, {
          offlineCapMultiplier: offlineCapMultiplier(),
        });
        if (now - game.now >= OFFLINE_REPORT_MIN_MS) offlineReport = report;
        game = state;
      }
      useProfile.getState().update((p) => {
        p.cities[cityKey(city)] = city;
        p.lastCityKey = cityKey(city);
      });
      set({
        status: 'ready',
        city,
        game,
        world,
        offlineReport,
        ticker: [],
        version: get().version + 1,
      });
      get().save();
    } catch (e) {
      if (token === loadToken)
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  tick(now = Date.now()) {
    const { game, world, city } = get();
    if (!game || !world || now <= game.now) return null;
    // Keep live weather fresh (cached; MET's Expires is respected in fetchWeather).
    if (city && now - lastWeatherFetch > WEATHER_REFRESH_MS) {
      lastWeatherFetch = now;
      fetchWeather(city)
        .then((w) => weatherBook.load(w.hours))
        .catch(() => undefined);
    }
    const gap = now - game.now;
    const { state, report } = advance(game, world, now, {
      offlineCapMultiplier: offlineCapMultiplier(),
    });
    const ticker = [...get().ticker];
    for (const [machineId, v] of Object.entries(report.perMachine)) {
      if (v.cents > 0) ticker.push({ at: now, machineId, cents: v.cents, units: v.units });
    }
    announceMoments(state, report);
    set({
      game: state,
      ticker: ticker.slice(-30),
      offlineReport: gap >= OFFLINE_REPORT_MIN_MS ? report : get().offlineReport,
      version: get().version + 1,
    });
    if (now - get().lastSavedAt >= SAVE.autosaveMs) get().save();
    return report;
  },

  act(fn) {
    const { game, world } = get();
    if (!game || !world) return { ok: false, error: 'No game loaded.' } as never;
    // Bring the sim up to date first so actions happen "now".
    let current: GameState;
    if (Date.now() > game.now) {
      const caught = advance(game, world, Date.now(), {
        offlineCapMultiplier: offlineCapMultiplier(),
      });
      announceMoments(caught.state, caught.report);
      current = caught.state;
    } else current = cloneState(game);
    const result = fn(current, world);
    if (result.ok) {
      // Trophies earned by the action itself (first restock, first driver, ...).
      for (const id of checkAchievements(current))
        announceMoments(current, { ...EMPTY_REPORT, achievements: [id] });
      set({ game: current, version: get().version + 1 });
      get().save();
    }
    return result;
  },

  replaceGame(next) {
    set({ game: next, version: get().version + 1, ticker: [] });
    get().save();
  },

  save() {
    const { game, city } = get();
    if (!game || !city) return;
    writeJson(saveKey(city), game);
    set({ lastSavedAt: Date.now() });
  },

  dismissOfflineReport() {
    set({ offlineReport: null });
  },

  close() {
    get().save();
    set({ status: 'idle', game: null, world: null, city: null, ticker: [] });
  },
}));

const EMPTY_REPORT: AdvanceReport = {
  fromAt: 0,
  toAt: 0,
  skippedMs: 0,
  salesCents: 0,
  units: 0,
  cashDeltaCents: 0,
  costsCents: 0,
  breakdowns: 0,
  thefts: 0,
  becameEmpty: [],
  cashBoxFull: [],
  contractsLost: [],
  spoiledUnits: 0,
  driverRuns: 0,
  chaptersCompleted: [],
  events: [],
  perMachine: {},
  achievements: [],
};

const seenEvents = new Set<string>();
const readyOrders = new Set<string>();

function goalLabel(g: { title: string; kind: string; target: number }): string {
  const n =
    g.kind === 'sales'
      ? `$${Math.round(g.target / 100).toLocaleString('en-US')}`
      : String(g.target);
  return g.title.replace('{n}', n);
}

/** Turn sim outcomes into celebration moments: chapters, trophies, events, orders ready. */
function announceMoments(state: GameState, report: AdvanceReport): void {
  const push = useCelebrations.getState().push;
  for (const ch of report.chaptersCompleted) {
    const done = CHAPTERS.find((c) => c.n === ch);
    const next = CHAPTERS.find((c) => c.n === ch + 1);
    push({
      kind: 'chapter',
      title: `${ch}. ${done?.title ?? ''}`,
      subtitle: next ? `Next: ${next.goal}` : undefined,
      lines: (done?.unlocks ?? []).map((u) => ({ label: `Unlocked: ${u}`, value: '' })),
    });
  }
  for (const id of report.achievements) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a)
      push({
        kind: 'trophy',
        title: a.title,
        subtitle: a.description,
        amountCents: a.rewardCents || undefined,
      });
  }
  for (const e of visibleEvents(state, state.now)) {
    if (seenEvents.has(e.id)) continue;
    seenEvents.add(e.id);
    if (e.startsAt <= state.now) continue;
    const mins = Math.round((e.startsAt - state.now) / 60_000);
    push({
      kind: 'event',
      title: `${e.name} at ${e.placeName}`,
      subtitle: mins < 90 ? `Starts in ${mins} min` : `Starts in ${Math.round(mins / 60)} h`,
    });
  }
  for (const g of state.goals.items) {
    const key = `${state.goals.dateKey}|${g.id}`;
    if (g.claimed || readyOrders.has(key) || goalProgress(state, g) < 1) continue;
    readyOrders.add(key);
    push({ kind: 'info', title: 'Order ready to claim', subtitle: goalLabel(g) });
  }
}

export function hasSave(city: CityInfo): boolean {
  return readJson<unknown>(saveKey(city)) !== null;
}
