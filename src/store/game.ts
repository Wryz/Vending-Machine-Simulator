import { create } from 'zustand';

import { getCity, type CityId } from '@/config/cities';
import { ROADS } from '@/config/deliveries';
import { PURCHASES, SAVE, TIME } from '@/config/economy';
import {
  loadCityPack,
  loadCityRoads,
  loadRegionHoods,
  loadRegionPack,
  loadRegionRoads,
} from '@/data/cityPack';
import { cellOf, neighbors } from '@/data/h3';
import { fetchWeather } from '@/data/api';
import { syntheticWeather, WeatherBook } from '@/data/weather';
import type { RegionPack, RoadNet } from '@/data/types';
import { readJson, writeJson } from '@/services/storage';
import { ACHIEVEMENTS, BRANCHES, CHAPTERS } from '@/config/progression';
import { t } from '@/i18n';
import { content } from '@/i18n/content';
import { moneyShort } from '@/ui/format';
import {
  recordAction,
  addToFootprint,
  addToCompany,
  branchDelta,
  branchMark,
  branchesUnlocked,
  companyOf,
  joinCompany,
  type BranchMark,
  assignHoods,
  type HoodPoint,
  advance,
  beginAdvance,
  calibrateCells,
  checkAchievements,
  goalProgress,
  visibleEvents,
  cloneState,
  localTime,
  migrateSave,
  newGame,
  buildRoadGraph,
  routeOnRoads,
  type AdvanceReport,
  type RoadGraph,
  type RoadRoute,
  type GameState,
  type SimOptions,
  type World,
} from '@/sim';

import { useCelebrations } from './celebrations';
import { setCurrencyForCountry } from './currency';
import { announceRanking } from './rankMoments';
import {
  announceDeliveries,
  announceRequests,
  announceRival,
  announceSurprises,
} from './rivalMoments';
import { cityKey, useProfile, type CityInfo } from './profile';

import { readCompany, whereaboutsOf, writeCompany } from './company';
import { clockVerified, syncClock, trustedNow } from '@/services/clock';

export interface TickerEntry {
  at: number;
  /** Your machine, or for a rival sting the rival machine the customer went to. */
  machineId: string;
  cents: number;
  units: number;
  /** A VIP customer's row (gold pop), or a sale lost to the rival (red pop). */
  kind?: 'vip' | 'rival';
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
  /** True while a long catch-up runs after returning to the app (shows an overlay). */
  catchingUp: boolean;
  /** Share of the catch-up done, 0..1 (drives the overlay's meter). */
  catchUpProgress: number;
  /** Bumped on every state change (cheap selector for re-renders). */
  version: number;
  lastSavedAt: number;

  openCity(city: CityInfo, opts?: { fresh?: boolean; seed?: number }): Promise<void>;
  tick(now?: number): AdvanceReport | null;
  /** Back from the background: tick now, or after one frame with an overlay if the gap is long. */
  resume(): void;
  /** Run a sim action on a draft; commits and saves when it succeeds. */
  act<R extends { ok: boolean }>(fn: (draft: GameState, world: World) => R): R;
  replaceGame(next: GameState): void;
  /** Catch up the company's other branches and pay what they earned into the cash (throttled). */
  syncBranches(force?: boolean): Promise<void>;
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
export function buildWorld(
  city: CityInfo,
  pack: RegionPack,
  weather: WeatherBook,
  roads: RoadNet | null = null,
  hoodPoints: readonly HoodPoint[] | null = null,
): World {
  // The street graph is built on the first van route, not while the city opens.
  let graph: RoadGraph | null = null;
  const routeCache = new Map<string, RoadRoute | null>();
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
    // Districts follow real neighbourhoods, measured from where this city started.
    hoods:
      (hoodPoints && assignHoods(hoodPoints, calibrated.cells, city, cellOf(city.lat, city.lng))) ??
      undefined,
    suppliers: pack.suppliers ?? [],
    route: roads
      ? (a, b) => {
          // Quotes ask for the same routes on every render: keep the recent ones.
          const key = `${a.lat},${a.lng}|${b.lat},${b.lng}`;
          const hit = routeCache.get(key);
          if (hit !== undefined) return hit;
          const r = routeOnRoads((graph ??= buildRoadGraph(roads)), a, b);
          if (routeCache.size >= ROADS.routeCacheSize)
            routeCache.delete(routeCache.keys().next().value!);
          routeCache.set(key, r);
          return r;
        }
      : undefined,
    weatherAt(t) {
      const live = weather.at(t);
      if (live) return live;
      const lt = localTime(t, city.timeZone, city.countryCode);
      return syntheticWeather(city.id, t, lt.hour, lt.month);
    },
  };
}

/** Live weather for the open city (a new book per city, so one city's hours never leak into another). */
let weatherBook = new WeatherBook();
/** A branch catch-up is running (one at a time). */
let syncing = false;
let loadToken = 0;
let lastWeatherFetch = 0;
const WEATHER_REFRESH_MS = 30 * 60_000;
const OFFLINE_REPORT_MIN_MS = 5 * 60_000;
/** How long opening a city waits for the clock check before using the last known difference. */
const CLOCK_WAIT_MS = 1500;

function saveKey(city: CityInfo) {
  return `save-${cityKey(city)}`;
}

/** Sim options from what the player bought (Remove Ads cap, Double Profits bonus). */
function simOptions(): SimOptions {
  const e = useProfile.getState().entitlements;
  return {
    offlineCapMultiplier: e.removeAds ? PURCHASES.removeAdsOfflineCapMultiplier : 1,
    salesBonus: e.doubleProfits ? PURCHASES.doubleProfitsSalesBonus : 0,
  };
}

/**
 * Download (or find in the cache) everything a city needs, without touching
 * the running game. Switching cities calls this first, so a failed download
 * leaves the player in the city they were in.
 */
export async function prefetchCity(city: CityInfo): Promise<boolean> {
  try {
    await Promise.all([
      city.kind === 'fallback' ? loadCityPack(city.id) : loadRegionPack(city.res5 ?? ''),
      city.kind === 'fallback' ? loadCityRoads(city.id) : loadRegionRoads(city.res5 ?? ''),
      city.kind === 'fallback' ? null : loadRegionHoods(city.res5 ?? ''),
    ]);
    return true;
  } catch {
    return false;
  }
}

export const useGame = create<GameStore>((set, get) => {
  /** Applies a finished advance: ticker, moments, the away report and autosave. */
  const commitAdvance = (
    now: number,
    gap: number,
    state: GameState,
    report: AdvanceReport,
  ): AdvanceReport => {
    const ticker = [...get().ticker];
    for (const [machineId, v] of Object.entries(report.perMachine)) {
      if (v.cents > 0) ticker.push({ at: now, machineId, cents: v.cents, units: v.units });
    }
    // Live moments on the map: a VIP's row, a customer who went to the rival instead.
    for (const v of report.surprises)
      if (v.kind === 'vip' && v.cents)
        ticker.push({ at: now, machineId: v.machineId, cents: v.cents, units: 1, kind: 'vip' });
    for (const st of report.stings)
      ticker.push({ at: now, machineId: st.rivalId, cents: st.cents, units: 1, kind: 'rival' });
    announceMoments(state, report);
    set({
      game: state,
      ticker: ticker.slice(-30),
      offlineReport: gap >= OFFLINE_REPORT_MIN_MS ? report : get().offlineReport,
      version: get().version + 1,
    });
    if (now - get().lastSavedAt >= SAVE.autosaveMs) get().save();
    return report;
  };

  return {
    status: 'idle',
    error: null,
    city: null,
    game: null,
    world: null,
    offlineReport: null,
    ticker: [],
    catchingUp: false,
    catchUpProgress: 0,
    version: 0,
    lastSavedAt: 0,

    async openCity(city, opts = {}) {
      const token = ++loadToken;
      set({ status: 'loading', error: null });
      // Catch up on the server's clock when it answers quickly (offline: the last known difference).
      if (!clockVerified())
        await Promise.race([syncClock(), new Promise((r) => setTimeout(r, CLOCK_WAIT_MS))]);
      try {
        const [pack, roads, hoods] = await Promise.all([
          city.kind === 'fallback' ? loadCityPack(city.id) : loadRegionPack(city.res5 ?? ''),
          city.kind === 'fallback' ? loadCityRoads(city.id) : loadRegionRoads(city.res5 ?? ''),
          city.kind === 'fallback' ? Promise.resolve(null) : loadRegionHoods(city.res5 ?? ''),
        ]);
        // A newer openCity() started while we were loading: let it win.
        if (token !== loadToken) return;
        // A late answer for an earlier city lands in that city's (discarded) book.
        const book = new WeatherBook();
        weatherBook = book;
        const world = buildWorld(city, pack, book, roads, hoods);
        lastWeatherFetch = Date.now();
        fetchWeather(city)
          .then((w) => book.load(w.hours))
          .catch(() => undefined);
        const now = trustedNow();
        let game: GameState | null = null;
        let hadSave = false;
        if (!opts.fresh) {
          const raw = readJson<unknown>(saveKey(city));
          if (raw) {
            try {
              game = migrateSave(raw);
              hadSave = true;
            } catch {
              // Unreadable here (e.g. written by a newer build): keep a copy before
              // the fresh game below takes this save slot, so progress isn't lost.
              writeJson(`${saveKey(city)}-unreadable-${now}`, raw);
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
          const { state, report } = advance(game, world, now, simOptions());
          if (now - game.now >= OFFLINE_REPORT_MIN_MS) offlineReport = report;
          game = state;
        }
        // One company, many cities: this city takes the company's cash and progress,
        // plus whatever it earned since you left it.
        const company = readCompany();
        if (company && branchesUnlocked(company.state.chapter)) {
          const mark =
            company.branches[cityKey(city)] ??
            // A new branch starts level; a city saved before branches brings all its cash.
            (hadSave ? { cashCents: 0, salesCents: 0, netCents: 0, units: 0 } : branchMark(game));
          const joined = joinCompany(game, company.state, mark);
          game = joined.state;
          recordAction(game, 'joinBranch', [cityKey(city), joined.delta]);
        }
        // The company's footprint (countries, continents) counts for chapters 6 and 7.
        addToFootprint(game, whereaboutsOf(city).cc);
        useProfile.getState().update((p) => {
          p.cities[cityKey(city)] = city;
          p.lastCityKey = cityKey(city);
        });
        // Money shows in the city's currency (fixed game rates; the sim keeps US cents).
        setCurrencyForCountry(city.countryCode);
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
        // Other cities of the company catch up and pay in (after the map is up).
        setTimeout(() => void get().syncBranches(true), 1500);
      } catch (e) {
        if (token === loadToken)
          set({ status: 'error', error: loadError(e instanceof Error ? e.message : String(e)) });
      }
    },

    tick(now = trustedNow()) {
      const { game, world, city } = get();
      if (!game || !world || now <= game.now) return null;
      // Keep live weather fresh (cached; MET's Expires is respected in fetchWeather).
      if (city && now - lastWeatherFetch > WEATHER_REFRESH_MS) {
        lastWeatherFetch = now;
        const book = weatherBook;
        fetchWeather(city)
          .then((w) => book.load(w.hours))
          .catch(() => undefined);
      }
      const { state, report } = advance(game, world, now, simOptions());
      return commitAdvance(now, now - game.now, state, report);
    },
    resume() {
      const { game, world, catchingUp } = get();
      if (!game || !world || catchingUp) return;
      const now = trustedNow();
      if (now - game.now < OFFLINE_REPORT_MIN_MS) {
        get().tick(now);
        return;
      }
      // Long absence: run the catch-up a slice at a time so the "while you were away"
      // overlay paints and its meter moves. Same result as one advance() call.
      const job = beginAdvance(game, world, now, simOptions());
      set({ catchingUp: true, catchUpProgress: 0 });
      const slice = () => {
        // The city was closed or replaced meanwhile: drop this catch-up.
        if (get().game !== game) {
          set({ catchingUp: false });
          return;
        }
        try {
          const until = Date.now() + TIME.catchUpSliceMs;
          while (!job.done() && Date.now() < until) job.run(1);
        } catch (e) {
          set({ catchingUp: false });
          throw e;
        }
        if (!job.done()) {
          set({ catchUpProgress: job.progress() });
          setTimeout(slice, 0);
          return;
        }
        commitAdvance(now, now - game.now, job.state, job.report);
        set({ catchingUp: false, catchUpProgress: 1 });
        // Time kept moving while we caught up: bring it to the present (a short, live tick).
        get().tick();
      };
      setTimeout(slice, 50);
    },
    act(fn) {
      const { game, world, catchingUp } = get();
      if (catchingUp) return { ok: false, error: t('store.stillCounting') } as never;
      if (!game || !world) return { ok: false, error: t('store.noGame') } as never;
      // Bring the sim up to date first so actions happen "now".
      let current: GameState;
      let caught: { state: GameState; report: AdvanceReport } | null = null;
      const nowT = trustedNow();
      if (nowT > game.now) {
        caught = advance(game, world, nowT, simOptions());
        current = caught.state;
      } else current = cloneState(game);
      const result = fn(current, world);
      if (result.ok) {
        // Only now: a failed action drops the catch-up, and the next tick
        // re-simulates (and announces) the same moments.
        if (caught) announceMoments(caught.state, caught.report);
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

    async syncBranches(force = false) {
      const { game, city } = get();
      if (!game || !city || !branchesUnlocked(game.chapter) || syncing) return;
      const company = readCompany();
      if (!company) return;
      if (!force && Date.now() - company.syncedAt < BRANCHES.syncEveryMinutes * 60_000) return;
      syncing = true;
      try {
        const here = cityKey(city);
        const cities = useProfile.getState().cities;
        const total: BranchMark = { cashCents: 0, salesCents: 0, netCents: 0, units: 0 };
        for (const [key, mark] of Object.entries(company.branches) as [string, BranchMark][]) {
          if (key === here || !cities[key]) continue;
          const info = cities[key];
          const raw = readJson<unknown>(saveKey(info));
          if (!raw) continue;
          try {
            const [pack, roads, hoods] = await Promise.all([
              info.kind === 'fallback' ? loadCityPack(info.id) : loadRegionPack(info.res5 ?? ''),
              info.kind === 'fallback' ? loadCityRoads(info.id) : loadRegionRoads(info.res5 ?? ''),
              info.kind === 'fallback' ? Promise.resolve(null) : loadRegionHoods(info.res5 ?? ''),
            ]);
            const w = buildWorld(info, pack, new WeatherBook(), roads, hoods);
            let st = migrateSave(raw);
            const now = trustedNow();
            if (now > st.now) st = advance(st, w, now, simOptions()).state;
            const d = branchDelta(st, mark);
            total.cashCents += d.cashCents;
            total.salesCents += d.salesCents;
            total.netCents += d.netCents;
            total.units += d.units;
            writeJson(saveKey(info), st);
            company.branches[key] = branchMark(st);
          } catch {
            // Offline with no cached data for that city: it catches up next time.
          }
          // Let a frame through between branches.
          await new Promise((r) => setTimeout(r, 0));
        }
        company.syncedAt = Date.now();
        writeCompany(company);
        // Still the same city: pay the branches' earnings into the company cash.
        if (get().city && cityKey(get().city!) === here && get().game) {
          const next = structuredClone(get().game!);
          addToCompany(next, total);
          recordAction(next, 'branchesPaid', [total]);
          set({ game: next, version: get().version + 1 });
          get().save();
        }
      } finally {
        syncing = false;
      }
    },

    save() {
      const { game, city } = get();
      if (!game || !city) return;
      writeJson(saveKey(city), game);
      if (branchesUnlocked(game.chapter)) {
        const prev = readCompany();
        writeCompany({
          state: companyOf(game),
          branches: { ...prev?.branches, [cityKey(city)]: branchMark(game) },
          syncedAt: prev?.syncedAt ?? 0,
          home: prev?.home ?? whereaboutsOf(city),
        });
      }
      set({ lastSavedAt: Date.now() });
    },

    dismissOfflineReport() {
      set({ offlineReport: null });
    },

    close() {
      // An openCity() still loading must not land after this.
      loadToken++;
      get().save();
      set({ status: 'idle', game: null, world: null, city: null, ticker: [] });
    },
  };
});

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
  rival: [],
  stings: [],
  surprises: [],
  requests: [],
  deliveries: [],
};

/** A city-load failure (src/data errors are English) in the UI language; unknown text passes through. */
function loadError(message: string): string {
  if (message === 'Data API is not configured.') return t('store.load.noApi');
  if (message === 'Unsupported region pack.') return t('store.load.badPack');
  const pack = /^No bundled pack for (.+)$/.exec(message);
  if (pack) return t('store.load.noPack', { id: pack[1] });
  const http = /^HTTP (\d+)$/.exec(message);
  if (http) return t('store.load.http', { status: http[1] });
  return message;
}

const seenEvents = new Set<string>();
const readyOrders = new Set<string>();

function goalLabel(g: { id: string; title: string; kind: string; target: number }): string {
  const n = g.kind === 'sales' ? moneyShort(g.target) : String(g.target);
  return content.goal(g.id, g.title, n);
}

/** Turn sim outcomes into celebration moments: chapters, trophies, events, orders ready. */
function announceMoments(state: GameState, report: AdvanceReport): void {
  const push = useCelebrations.getState().push;
  for (const ch of report.chaptersCompleted) {
    const done = CHAPTERS.find((c) => c.n === ch);
    const next = CHAPTERS.find((c) => c.n === ch + 1);
    push({
      kind: 'chapter',
      title: t('celebrate.moment.chapterTitle', {
        n: ch,
        title: done ? content.chapterTitle(ch, done.title) : '',
      }),
      subtitle: next
        ? t('celebrate.moment.next', { goal: content.chapterGoal(next.n, next.goal) })
        : undefined,
      lines: (done?.unlocks ?? []).map((u, i) => ({
        label: t('celebrate.moment.unlocked', { unlock: content.chapterUnlock(ch, i, u) }),
        value: '',
      })),
    });
  }
  for (const id of report.achievements) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a)
      push({
        kind: 'trophy',
        title: content.achievementTitle(a.id, a.title),
        subtitle: content.achievementDesc(a.id, a.description),
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
      title: t('celebrate.moment.eventTitle', {
        event: content.event(e.templateId, e.name),
        place: e.placeName,
      }),
      subtitle:
        mins < 90
          ? t('celebrate.moment.startsMin', { n: mins })
          : t('celebrate.moment.startsHours', { n: Math.round(mins / 60) }),
    });
  }
  announceRival(state, report.rival);
  announceRanking(state, report, useGame.getState().world?.city.name);
  announceSurprises(state, report.surprises);
  announceRequests(state, report.requests);
  announceDeliveries(state, report.deliveries);
  for (const g of state.goals.items) {
    const key = `${state.goals.dateKey}|${g.id}`;
    if (g.claimed || readyOrders.has(key) || goalProgress(state, g) < 1) continue;
    readyOrders.add(key);
    push({ kind: 'info', title: t('celebrate.moment.orderReady'), subtitle: goalLabel(g) });
  }
}

export function hasSave(city: CityInfo): boolean {
  return readJson<unknown>(saveKey(city)) !== null;
}
