import { RANKINGS } from '@/config/rankings';

import { advance, beginAdvance } from './advance';
import { placeMachine, restockMachine, suggestRestock, withClone } from './actions';
import { newGame } from './create';
import { decentSpot, testWorld } from './__fixtures__/world';
import { migrateSave } from './migrate';
import {
  chapterRefCents,
  cityOperators,
  emptyRankings,
  rankChange,
  rankingsStep,
  referenceCents,
  standings,
  tierMultiplier,
  weekDayIndex,
  weekKeyOf,
  weeklyScore,
} from './rankings';
import { SCHEMA_VERSION, type GameState } from './state';
import { localTime } from './time';

const TZ = 'America/New_York';
/** Wednesday 2026-06-10, local hour `h` in New York (EDT, UTC-4). */
const nyAt = (day: number, h: number) => Date.UTC(2026, 5, day, h + 4, 0, 0);
const local = (t: number) => localTime(t, TZ, 'US');

function fresh(cityId = 'new-york'): GameState {
  return newGame({ cityId, now: nyAt(10, 12), seed: 7 });
}

/** Step the board at `t` with no rival sales (sales are set by hand). */
function stepAt(s: GameState, t: number, rivalCents = 0) {
  s.now = t;
  return rankingsStep(s, local(t), rivalCents);
}

describe('calendar', () => {
  it('weeks start on Monday', () => {
    expect(weekDayIndex('2026-06-08')).toBe(0); // Monday
    expect(weekDayIndex('2026-06-14')).toBe(6); // Sunday
    expect(weekKeyOf('2026-06-10')).toBe('2026-06-08');
    expect(weekKeyOf('2026-06-14')).toBe('2026-06-08');
    expect(weekKeyOf('2026-06-15')).toBe('2026-06-15');
    expect(weekKeyOf('2026-01-01')).toBe('2025-12-29');
  });
});

describe('operators', () => {
  it('are stable per city, unique, fictional, and span every tier', () => {
    const a = cityOperators('london');
    expect(a).toEqual(cityOperators('london'));
    expect(a).toHaveLength(RANKINGS.operators);
    expect(new Set(a.map((o) => o.name)).size).toBe(a.length);
    expect(a.map((o) => o.tier).sort()).toEqual(a.map((_, i) => i));
    expect(a.some((o) => o.name === 'Mind the Snack' || o.name === 'Thames Coin Co.')).toBe(true);
    expect(a.map((o) => o.name)).not.toContain('Brightvend');
    // Cities get their own flavor; unknown cities fall back to the shared list.
    expect(cityOperators('tokyo').map((o) => o.name)).not.toEqual(a.map((o) => o.name));
    expect(cityOperators('somewhere-else')).toHaveLength(RANKINGS.operators);
  });

  it('spread from about 0.3x to 3x, and the top tiers soften in later chapters', () => {
    expect(tierMultiplier(0, 1)).toBeCloseTo(3);
    expect(tierMultiplier(RANKINGS.tierMultipliers.length - 1, 1)).toBeCloseTo(0.3);
    expect(tierMultiplier(0, 5)).toBeLessThan(tierMultiplier(0, 2));
    expect(tierMultiplier(6, 5)).toBe(tierMultiplier(6, 1));
  });

  it('scale with the chapter and with the player last week', () => {
    const s = fresh();
    expect(chapterRefCents(3)).toBeGreaterThan(chapterRefCents(1));
    const ch1 = referenceCents(s);
    s.chapter = 3;
    expect(referenceCents(s)).toBeGreaterThan(ch1);
    const base = referenceCents(s);
    s.rankings.lastWeek = { weekKey: '2026-06-01', scoreCents: base * 4, rank: 1, of: 9 };
    expect(referenceCents(s)).toBeCloseTo(base * 2); // geometric blend, weight 0.5
    s.rankings.lastWeek.scoreCents = 0; // an idle week only lowers it to the floor
    expect(referenceCents(s)).toBeCloseTo(base * Math.sqrt(RANKINGS.lastWeekFloor));
  });
});

describe('nightly board', () => {
  it('starts the week on the first step and boards at local midnight', () => {
    const s = fresh();
    expect(stepAt(s, nyAt(10, 12))).toBeNull();
    expect(s.rankings.weekKey).toBe('2026-06-08');
    expect(s.rankings.dayShare).toBeCloseTo(0.5);
    expect(stepAt(s, nyAt(10, 23))).toBeNull();
    s.ledger.lifetimeSalesCents = 50_000;
    const b = stepAt(s, nyAt(11, 0) + 60_000);
    expect(b).not.toBeNull();
    expect(b!.day).toBe(3); // Mon, Tue, Wed
    expect(b!.final).toBe(false);
    expect(b!.prevRank).toBeNull();
    expect(b!.entries).toHaveLength(RANKINGS.operators + 1); // no rival yet
    expect(b!.entries.every((e) => e.scoreCents >= 0)).toBe(true);
    expect(b!.entries.filter((e) => e.kind === 'ai').every((e) => e.scoreCents > 0)).toBe(true);
    expect(b!.entries.find((e) => e.kind === 'player')!.scoreCents).toBe(50_000);
    expect(s.rankings.board).toBe(b);
    // Same day: no new board.
    expect(stepAt(s, nyAt(11, 9))).toBeNull();
  });

  it('ranks the player by sales and reports who they passed overnight', () => {
    const s = fresh();
    stepAt(s, nyAt(10, 0) + 60_000);
    const first = stepAt(s, nyAt(11, 0) + 60_000)!;
    expect(first.rank).toBe(RANKINGS.operators + 1); // no sales: last
    const sorted = [...first.entries].filter((e) => e.kind === 'ai');
    // Sell just enough to pass the bottom three after another day.
    const tomorrow = standings(s, 1, '2026-06-11').filter((e) => e.kind === 'ai');
    const third = tomorrow[tomorrow.length - 3].scoreCents;
    s.ledger.lifetimeSalesCents = third + 100;
    const next = stepAt(s, nyAt(12, 0) + 60_000)!;
    expect(next.prevRank).toBe(first.rank);
    expect(next.rank).toBe(first.rank - 3);
    expect(next.passed).toHaveLength(3);
    expect(next.passed.every((id) => sorted.some((e) => e.id === id))).toBe(true);
    expect(rankChange(s)).toEqual({ rank: next.rank, delta: 3, of: next.entries.length });
  });

  it('counts the rival with its real sales', () => {
    const s = fresh();
    stepAt(s, nyAt(10, 12));
    s.rival.active = true;
    stepAt(s, nyAt(10, 13), 12_345);
    stepAt(s, nyAt(10, 14), 655);
    const b = stepAt(s, nyAt(11, 0) + 60_000)!;
    const rival = b.entries.find((e) => e.kind === 'rival')!;
    expect(rival.name).toBe('Brightvend');
    expect(rival.scoreCents).toBe(13_000);
  });

  it('closes the week at the midnight that ends Sunday and starts over', () => {
    const s = fresh();
    stepAt(s, nyAt(10, 12));
    s.ledger.lifetimeSalesCents = 70_000;
    for (let d = 11; d <= 14; d++) stepAt(s, nyAt(d, 0) + 60_000);
    const final = stepAt(s, nyAt(15, 0) + 60_000)!; // Monday 00:01
    expect(final.final).toBe(true);
    expect(final.day).toBe(7);
    expect(final.weekKey).toBe('2026-06-08');
    expect(s.rankings.lastWeek).toEqual({
      weekKey: '2026-06-08',
      scoreCents: 70_000,
      rank: final.rank,
      of: final.entries.length,
    });
    expect(s.rankings.weekKey).toBe('2026-06-15');
    expect(weeklyScore(s)).toBe(0);
    expect(s.rankings.aiWeekCents.every((c) => c === 0)).toBe(true);
    // The new week's first board doesn't compare with last week's.
    const tue = stepAt(s, nyAt(16, 0) + 60_000)!;
    expect(tue.weekKey).toBe('2026-06-15');
    expect(tue.day).toBe(1);
    expect(tue.prevRank).toBeNull();
  });

  it('walks several midnights in one step and returns one board', () => {
    const walked = fresh();
    stepAt(walked, nyAt(10, 12));
    const stepped = JSON.parse(JSON.stringify(walked)) as GameState;
    const once = stepAt(walked, nyAt(13, 9))!; // Wed noon -> Sat 9 am
    for (const d of [11, 12]) stepAt(stepped, nyAt(d, 0) + 60_000);
    const last = stepAt(stepped, nyAt(13, 9))!;
    expect(once.day).toBe(5);
    expect(once.entries.map((e) => [e.id, e.scoreCents])).toEqual(
      last.entries.map((e) => [e.id, e.scoreCents]),
    );
  });

  it('a gap across Sunday ends on a board of the new week', () => {
    const s = fresh();
    stepAt(s, nyAt(10, 12));
    s.ledger.lifetimeSalesCents = 1_000;
    const b = stepAt(s, nyAt(17, 9))!; // following Wednesday
    expect(b.weekKey).toBe('2026-06-15');
    expect(b.day).toBe(2);
    expect(s.rankings.lastWeek?.weekKey).toBe('2026-06-08');
    expect(s.rankings.lastWeek?.scoreCents).toBe(1_000);
  });

  it('is part of the save (schema v5 migration)', () => {
    const s = fresh() as unknown as Record<string, unknown>;
    delete s.rankings;
    s.schemaVersion = 4;
    const m = migrateSave(s);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.rankings).toEqual(emptyRankings());
  });
});

describe('in the simulation', () => {
  function playing() {
    const world = testWorld();
    let s = fresh();
    const p = decentSpot();
    s = withClone(s, (d) =>
      placeMachine(d, world, {
        machineId: d.machines[0].id,
        lat: p.lat,
        lng: p.lng,
        heading: 180,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    const id = s.machines[0].id;
    s = withClone(s, (d) =>
      restockMachine(d, world, id, suggestRestock(d, id), { manual: true }),
    ).state;
    return { s, world };
  }

  it('advance() takes the nightly board and scores this week sales', () => {
    const { s, world } = playing();
    const { state, report } = advance(s, world, nyAt(12, 2));
    expect(report.rankUpdate).toBeDefined();
    expect(report.rankUpdate!.day).toBe(4); // Thursday's board
    expect(state.rankings.board).toEqual(report.rankUpdate);
    expect(weeklyScore(state)).toBe(state.ledger.lifetimeSalesCents);
    expect(weeklyScore(state)).toBeGreaterThan(0);
  });

  it('chunked catch-up gives the same board', () => {
    const { s, world } = playing();
    const to = nyAt(13, 5);
    const once = advance(s, world, to);
    const job = beginAdvance(s, world, to);
    while (!job.run(4));
    expect(job.state.rankings).toEqual(once.state.rankings);
    expect(job.report.rankUpdate).toEqual(once.report.rankUpdate);
  });
});
