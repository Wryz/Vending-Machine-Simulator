import { DAILY_GOALS } from '@/config/progression';

import {
  advance,
  checkAchievements,
  claimGoal,
  claimRewards,
  collectCash,
  goalProgress,
  migrateSave,
  newGame,
  pickGoals,
  placeMachine,
  restockMachine,
  rollGoalsDay,
  suggestRestock,
  withClone,
  SCHEMA_VERSION,
} from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

const world = testWorld();

function placed() {
  let s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 });
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
  return s;
}

describe('daily orders', () => {
  it('rolls three deterministic, chapter-eligible orders per local day', () => {
    const s = advance(placed(), world, NOON_NY + 60_000).state;
    expect(s.goals.dateKey).toBe('2026-06-10');
    expect(s.goals.items).toHaveLength(3);
    expect(new Set(s.goals.items.map((g) => g.id)).size).toBe(3);
    expect(
      s.goals.items.every((g) => DAILY_GOALS.find((t) => t.id === g.id)!.minChapter <= 1),
    ).toBe(true);
    expect(pickGoals(s, '2026-06-10')).toEqual(
      s.goals.items.map((g) => ({ ...g, claimed: false })),
    );
    expect(pickGoals(s, '2026-06-11')).not.toEqual(pickGoals(s, '2026-06-10'));
  });

  it('counts actions and sales, and pays out when claimed', () => {
    let s = placed();
    s = withClone(s, (d) =>
      restockMachine(d, world, d.machines[0].id, suggestRestock(d, d.machines[0].id), {
        manual: true,
      }),
    ).state;
    s = advance(s, world, NOON_NY + 10 * 60_000).state;
    s = withClone(s, (d) => collectCash(d, d.machines[0].id)).state;
    // Restocked before the day rolled in advance(): counters start at the first roll.
    expect(s.goals.day.units).toBeGreaterThan(0);
    expect(s.goals.day.sales).toBeGreaterThan(0);
    expect(s.goals.day.collects).toBe(1);
    // Force a claimable order.
    s.goals.items = [
      {
        id: 'units',
        kind: 'units',
        title: 'Sell {n} items',
        target: 1,
        rewardCents: 4_000,
        claimed: false,
      },
    ];
    expect(goalProgress(s, s.goals.items[0])).toBe(1);
    const cash = s.cashCents;
    const r = claimGoal(s, 'units');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.streakBonusCents).toBeGreaterThan(0); // the only order -> all done
    expect(s.cashCents).toBeGreaterThan(cash + 4_000);
    expect(s.goals.streak).toBe(1);
    expect(claimGoal(s, 'units').ok).toBe(false);
    expect(claimGoal(s, 'nope').ok).toBe(false);
  });

  it('refuses unfinished orders; a missed day breaks the streak', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    rollGoalsDay(s, '2026-06-10');
    expect(claimGoal(s, s.goals.items[0].id).ok).toBe(false);
    s.goals.streak = 5;
    s.goals.streakDateKey = '2026-06-10';
    rollGoalsDay(s, '2026-06-11');
    expect(s.goals.streak).toBe(5); // yesterday counts
    rollGoalsDay(s, '2026-06-13');
    expect(s.goals.streak).toBe(0);
  });
});

describe('trophies', () => {
  it('unlock once; the reward waits until claimed', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    s.ledger.lifetimeUnits = 150;
    const cash = s.cashCents;
    expect(checkAchievements(s).sort()).toEqual(['first-sale', 'units-100']);
    expect(s.cashCents).toBe(cash);
    expect(s.unclaimed.reduce((a, r) => a + r.cents, 0)).toBe(7_000);
    expect(claimRewards(s)).toEqual({ ok: true, cents: 7_000 });
    expect(s.cashCents).toBe(cash + 7_000);
    expect(s.unclaimed).toEqual([]);
    expect(claimRewards(s).ok).toBe(false);
    expect(checkAchievements(s)).toEqual([]);
  });
  it('are reported by advance', () => {
    let s = placed();
    s = withClone(s, (d) =>
      restockMachine(d, world, d.machines[0].id, suggestRestock(d, d.machines[0].id), {
        manual: true,
      }),
    ).state;
    const { report } = advance(s, world, NOON_NY + 5 * 60_000);
    expect(report.achievements).toContain('first-sale');
  });
});

describe('save migration v2 -> v3', () => {
  it('drops the old cosmetic wrap from machines', () => {
    const s = JSON.parse(
      JSON.stringify(newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 })),
    ) as Record<string, unknown>;
    const machine = { id: 'm1', wrap: 'wrapNight', typeId: 'snack' };
    s.machines = [machine];
    s.schemaVersion = 2;
    const m = migrateSave(s);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.machines[0]).toEqual({ id: 'm1', typeId: 'snack' });
  });
});

describe('save migration v1 -> v2', () => {
  it('adds goals and achievements to old saves', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 }) as unknown as Record<
      string,
      unknown
    >;
    delete s.goals;
    delete s.achievements;
    s.schemaVersion = 1;
    const m = migrateSave(s);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.goals.items).toEqual([]);
    expect(m.achievements).toEqual({});
  });
});
