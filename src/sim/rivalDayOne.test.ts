import { COMPETITION, RIVAL } from '@/config/economy';

import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';
import { placeMachine, restockMachine, suggestRestock, withClone } from './actions';
import { advance } from './advance';
import { newGame } from './create';
import { distanceM, offsetPoint } from './geo';
import { migrateSave } from './migrate';
import { rivalMatchup, rivalSting, undercutRival, updateLead } from './rival';
import { competitorMap, rivalWeight } from './rules';
import { SCHEMA_VERSION, type GameState, type World } from './state';

const MIN = 60_000;

function placed(world: World, seed = 99): GameState {
  let s = newGame({ cityId: 'new-york', now: NOON_NY, seed });
  const spot = decentSpot();
  s = withClone(s, (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      lat: spot.lat,
      lng: spot.lng,
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
  return withClone(s, (d) =>
    restockMachine(d, world, d.machines[0].id, suggestRestock(d, d.machines[0].id), {
      manual: true,
    }),
  ).state;
}

/** As if the player had sold enough and collected once (the tutorial is through). */
function pastTutorial(s: GameState): GameState {
  s.ledger.lifetimeUnits = 100;
  s.ledger.lifetimeSalesCents = RIVAL.early.afterSalesCents;
  s.ledger.lifetimeNetCents = 1_000;
  return s;
}

describe('day-one rival (SPEC §4.6)', () => {
  const world = testWorld();

  it('waits for the tutorial: no rival before the first sale and collect', () => {
    const s = placed(world);
    const { state, report } = advance(s, world, s.now + 3 * MIN);
    expect(state.rival.active).toBe(false);
    expect(report.rival).toEqual([]);
    // Sold, but never collected: still no rival.
    const sold = placed(world);
    sold.ledger.lifetimeUnits = 50;
    sold.ledger.lifetimeSalesCents = RIVAL.early.afterSalesCents * 2;
    expect(advance(sold, world, sold.now + MIN).state.rival.active).toBe(false);
  });

  it('opens one machine near your first machine, inside the competition radius', () => {
    const s = pastTutorial(placed(world));
    const { state, report } = advance(s, world, s.now + MIN);
    expect(state.rival.active).toBe(true);
    expect(state.rival.ramped).toBe(false);
    expect(state.rival.machines).toHaveLength(1);
    const d = distanceM(state.rival.machines[0], state.machines[0]);
    expect(d).toBeGreaterThanOrEqual(RIVAL.early.placeMinM - 1);
    expect(d).toBeLessThanOrEqual(COMPETITION.radiusM);
    expect(report.rival[0]).toMatchObject({
      kind: 'arrives',
      rivalId: state.rival.machines[0].id,
      machineId: state.machines[0].id,
    });
  });

  it('stays gentle before chapter 3: capped fleet, half weight, never leaves the map', () => {
    const s = pastTutorial(placed(world));
    let r = advance(s, world, s.now + MIN).state;
    expect(rivalWeight(r)).toBe(RIVAL.early.competitorWeight);
    const comp = competitorMap(r, world).get(r.machines[0].id)!;
    const without = competitorMap({ ...r, rival: { ...r.rival, machines: [] } }, world);
    expect(comp - without.get(r.machines[0].id)!).toBeCloseTo(RIVAL.early.competitorWeight, 5);
    // A whole business week of decisions in chapter 1, even while you dominate.
    r.ledger.recentPlayerCents = 1e9;
    r.ledger.recentRivalCents = 1;
    r = advance(r, world, r.now + 3 * 3_600_000).state;
    expect(r.rival.machines.length).toBe(1);
    // Chapter 2 allows a second machine.
    r.chapter = 2;
    r.ledger.recentPlayerCents = 1;
    r.ledger.recentRivalCents = 1e9;
    r = advance(r, world, r.now + 3 * 3_600_000).state;
    expect(r.rival.machines.length).toBeLessThanOrEqual(RIVAL.early.maxMachines[2]);
    expect(r.rival.ramped).toBe(false);
  });

  it('ramps up at chapter 3: full fleet, full weight, and it can be beaten', () => {
    const s = pastTutorial(placed(world));
    let r = advance(s, world, s.now + MIN).state;
    const early = r.rival.machines.length;
    r.chapter = 3;
    const step = advance(r, world, r.now + MIN);
    r = step.state;
    expect(r.rival.ramped).toBe(true);
    expect(r.rival.machines.length).toBeGreaterThan(early);
    expect(step.report.rival.some((n) => n.kind === 'ramp')).toBe(true);
    expect(rivalWeight(r)).toBe(RIVAL.competitorWeight);
    // Dominate: it pulls machines out, all the way down if need be.
    r.ledger.recentPlayerCents = 1e12;
    r.ledger.recentRivalCents = 1;
    const fleet = r.rival.machines.length;
    const later = advance(r, world, r.now + 6 * 3_600_000);
    expect(later.state.rival.machines.length).toBeLessThan(fleet + 1);
  });

  it('old saves (rival already active) arrive ramped after migration', () => {
    const s = placed(world);
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    raw.schemaVersion = 3;
    raw.rival = { active: true, machines: [], nextDecisionAt: 0 };
    delete raw.surprises;
    const m = migrateSave(raw);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.rival).toMatchObject({ active: true, ramped: true, lastStingAt: 0, lead: null });
    expect(m.surprises).toEqual({ nextAt: 0, jackpot: null, deal: null });
    const fresh = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    fresh.schemaVersion = 3;
    fresh.rival = { active: false, machines: [], nextDecisionAt: 0 };
    expect(migrateSave(fresh).rival.ramped).toBe(false);
    // A save from the ranking-board version (v5) steps up the same way.
    const v5 = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    v5.schemaVersion = 5;
    v5.rival = { active: false, machines: [], nextDecisionAt: 0 };
    delete v5.surprises;
    const m5 = migrateSave(v5);
    expect(m5.rankings).toEqual(s.rankings);
    expect(m5.surprises).toEqual({ nextAt: 0, jackpot: null, deal: null });
    expect(m5.rival.lead).toBeNull();
  });
});

describe('rival moments', () => {
  const world = testWorld();

  function withRival(): GameState {
    const s = pastTutorial(placed(world));
    return advance(s, world, s.now + MIN).state;
  }

  it('stings only in live play, rate-limited, deterministically', () => {
    const s = withRival();
    let stings = 0;
    let r = s;
    let lastAt = 0;
    // 20 live minutes of 5-second ticks.
    for (let i = 0; i < 240; i++) {
      const step = advance(r, world, r.now + 5_000);
      r = step.state;
      for (const st of step.report.stings) {
        stings++;
        expect(st.rivalId).toBe(r.rival.machines[0].id);
        expect(st.machineId).toBe(r.machines[0].id);
        expect(st.cents).toBeGreaterThan(0);
        if (lastAt) expect(r.now - lastAt).toBeGreaterThanOrEqual(RIVAL.sting.minGapMs - 5_000);
        lastAt = r.now;
      }
    }
    expect(stings).toBeGreaterThan(0);
    expect(stings).toBeLessThanOrEqual(Math.ceil((20 * MIN) / RIVAL.sting.minGapMs));
    // Same inputs, same stings.
    expect(rivalSting(JSON.parse(JSON.stringify(s)), s.now + 7 * MIN)).toEqual(
      rivalSting(JSON.parse(JSON.stringify(s)), s.now + 7 * MIN),
    );
    // A long catch-up never stings.
    expect(advance(s, world, s.now + 3 * 3_600_000).report.stings).toEqual([]);
  });

  it('reports passing and being passed in market share, with hysteresis', () => {
    const s = withRival();
    s.ledger.recentPlayerCents = 10_000;
    s.ledger.recentRivalCents = 10_000;
    const out: Parameters<typeof updateLead>[1] = [];
    updateLead(s, out);
    expect(s.rival.lead).toBeNull();
    s.ledger.recentRivalCents = 20_000;
    updateLead(s, out);
    expect(s.rival.lead).toBe('rival');
    expect(out).toEqual([]); // the first judgement is silent
    s.ledger.recentPlayerCents = 21_000; // 51%: inside the hysteresis band
    updateLead(s, out);
    expect(s.rival.lead).toBe('rival');
    s.ledger.recentPlayerCents = 40_000;
    updateLead(s, out);
    expect(s.rival.lead).toBe('player');
    expect(out.map((n) => n.kind)).toEqual(['passed']);
    s.ledger.recentRivalCents = 80_000;
    updateLead(s, out);
    expect(out.map((n) => n.kind)).toEqual(['passed', 'behind']);
  });
});

describe('counter-move: undercut', () => {
  const world = testWorld();

  it('needs price setting, reprices only nearby machines and never raises a price', () => {
    let s = pastTutorial(placed(world));
    s = advance(s, world, s.now + MIN).state;
    const rid = s.rival.machines[0].id;
    expect(undercutRival(s, rid).ok).toBe(false);
    s.chapterDoneAt[1] = s.now;
    s.chapter = 2;
    s.cashCents = 1e9;
    // A second machine far away keeps its prices.
    const far = offsetPoint(decentSpot(), 90, 900);
    s = withClone(s, (d) =>
      placeMachine(d, world, {
        typeId: 'snack',
        lat: far.lat,
        lng: far.lng,
        heading: 0,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    s = withClone(s, (d) =>
      restockMachine(d, world, d.machines[1].id, suggestRestock(d, d.machines[1].id), {
        manual: false,
      }),
    ).state;
    const farBefore = s.machines[1].slots.map((x) => x.priceCents);
    const match = rivalMatchup(s, rid)!;
    expect(match.nearbyIds).toEqual([s.machines[0].id]);
    expect(match.theirsCents!).toBeLessThan(match.yoursCents!);
    const r = withClone(s, (d) => undercutRival(d, rid));
    expect(r.result.ok).toBe(true);
    const after = r.state;
    const near = after.machines[0];
    for (const slot of near.slots.filter((x) => x.productId))
      expect(slot.priceCents).toBeLessThanOrEqual(
        s.machines[0].slots[near.slots.indexOf(slot)].priceCents,
      );
    expect(rivalMatchup(after, rid)!.yoursCents!).toBeLessThan(match.theirsCents!);
    expect(after.machines[1].slots.map((x) => x.priceCents)).toEqual(farBefore);
    // Again: nothing left to lower.
    const again = undercutRival(after, rid);
    expect(again.ok && again.slots).toBe(0);
  });
});

describe('contract steals', () => {
  const world = testWorld();

  it('count the stolen spot as a competitor from the same catch-up on', () => {
    // A ramped rival, and a contract ending on an unhappy venue: the rival bids.
    let base: GameState | null = null;
    for (let seed = 1; seed < 40 && !base; seed++) {
      let s = pastTutorial(placed(world, seed));
      s.chapter = 3;
      s.cashCents = 1_000_000;
      // A neighbour that keeps its contract: the stolen spot competes with it.
      const near = offsetPoint(decentSpot(), 90, 40);
      s = withClone(s, (d) => {
        const r = placeMachine(d, world, {
          typeId: 'snack',
          lat: near.lat,
          lng: near.lng,
          heading: 0,
          termDays: 30,
          exclusive: false,
        });
        if (r.ok)
          restockMachine(d, world, r.machine.id, suggestRestock(d, r.machine.id, 10_000), {
            manual: true,
            capacity: 10_000,
          });
        return r;
      }).state;
      expect(s.machines.filter((m) => m.status === 'active')).toHaveLength(2);
      const ramped = advance(s, world, s.now + MIN).state;
      const m = ramped.machines[0];
      m.mood = RIVAL.stealMoodBelow / 2;
      m.contract.endsAt = ramped.now + MIN / 2;
      const one = advance(ramped, world, ramped.now + MIN);
      if (one.report.rival.some((n) => n.kind === 'steal')) base = ramped;
    }
    expect(base).not.toBeNull();
    const s = base!;
    // One catch-up across the steal must match one that restarts right after it
    // (a fresh start rebuilds the competition index from scratch). Gaps up to
    // 15 minutes run in 1-minute steps, so both take exactly the same steps.
    const to = s.now + 15 * MIN;
    const whole = advance(s, world, to).state;
    const split = advance(advance(s, world, s.now + MIN).state, world, to).state;
    expect(whole.ledger.recentRivalCents).toBe(split.ledger.recentRivalCents);
    expect(whole.cashCents).toBe(split.cashCents);
  });
});
