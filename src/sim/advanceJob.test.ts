import { advance, beginAdvance } from './advance';
import { placeMachine, restockMachine, suggestRestock, withClone } from './actions';
import { newGame } from './create';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';
import { offsetPoint } from './geo';
import type { GameState } from './state';

function fleet(n: number): { s: GameState; world: ReturnType<typeof testWorld> } {
  const world = testWorld();
  let s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 });
  s.chapter = 5;
  s.cashCents = 1e10;
  const spot = decentSpot();
  for (let i = 0; i < n; i++) {
    const p = offsetPoint(spot, (i * 71) % 360, 20 + (i % 9) * 35);
    s = withClone(s, (d) => {
      const r = placeMachine(d, world, {
        typeId: 'snack',
        lat: p.lat,
        lng: p.lng,
        heading: 0,
        termDays: 180,
        exclusive: false,
      });
      if (r.ok)
        restockMachine(d, world, r.machine.id, suggestRestock(d, r.machine.id, 10_000), {
          manual: false,
          capacity: 10_000,
        });
    }).state;
  }
  return { s, world };
}

describe('chunked catch-up', () => {
  it('gives exactly the same state and report as a one-shot advance', () => {
    const { s, world } = fleet(12);
    const to = s.now + 50 * 3_600_000;
    const once = advance(s, world, to);

    const job = beginAdvance(s, world, to);
    const seen: number[] = [];
    let chunks = 0;
    while (!job.run(3)) {
      seen.push(job.progress());
      chunks++;
    }
    expect(chunks).toBeGreaterThan(5);
    expect(job.done()).toBe(true);
    expect(job.progress()).toBe(1);
    // Progress only moves forward.
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    expect(job.state).toEqual(once.state);
    expect(job.report).toEqual(once.report);
  });

  it('leaves the input state untouched', () => {
    const { s, world } = fleet(3);
    const before = JSON.stringify(s);
    const job = beginAdvance(s, world, s.now + 10 * 3_600_000);
    job.run(Infinity);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('is done at once when there is nothing to catch up', () => {
    const { s, world } = fleet(1);
    const job = beginAdvance(s, world, s.now);
    expect(job.done()).toBe(true);
    expect(job.run(1)).toBe(true);
  });
});

describe('Double Profits (salesBonus, SPEC §9)', () => {
  it('pays every sale twice in cash but leaves lifetime sales untouched', () => {
    const { s, world } = fleet(6);
    const to = s.now + 6 * 3_600_000;
    const plain = advance(s, world, to);
    const doubled = advance(s, world, to, { salesBonus: 1 });
    const sales = plain.report.salesCents;
    expect(sales).toBeGreaterThan(0);
    // Same customers, same sales, same progression.
    expect(doubled.report.salesCents).toBe(sales);
    expect(doubled.state.ledger.lifetimeSalesCents).toBe(plain.state.ledger.lifetimeSalesCents);
    expect(doubled.state.ledger.lifetimeUnits).toBe(plain.state.ledger.lifetimeUnits);
    // The bonus is the sales revenue again, paid straight to cash.
    expect(doubled.state.cashCents - plain.state.cashCents).toBe(sales);
  });

  it('stacks additively with the rewarded-ad ×2 boost', () => {
    const { s, world } = fleet(4);
    const to = s.now + 3 * 3_600_000;
    const plain = advance(s, world, to);
    const boosted = { ...s, boosts: { doubleEarningsUntil: to + 1 } };
    const both = advance(boosted, world, to, { salesBonus: 1 });
    expect(both.state.cashCents - plain.state.cashCents).toBe(2 * plain.report.salesCents);
  });

  it('chunked catch-up matches one-shot with the bonus on', () => {
    const { s, world } = fleet(5);
    const to = s.now + 20 * 3_600_000;
    const once = advance(s, world, to, { salesBonus: 1 });
    const job = beginAdvance(s, world, to, { salesBonus: 1 });
    while (!job.run(2));
    expect(job.state).toEqual(once.state);
    expect(job.report).toEqual(once.report);
  });
});
