import {
  branchesUnlocked,
  canBranchTo,
  chapterFor,
  companyOf,
  joinCompany,
  migrateSave,
  newGame,
  reachNeeded,
} from './index';
import { NOON_NY } from './__fixtures__/world';

describe('one company, many cities', () => {
  it('hands the shared state to the branch you open and adds what it earned meanwhile', () => {
    const hanoi = newGame({ cityId: 'area-hanoi', now: NOON_NY, seed: 1 });
    hanoi.cashCents = 500_000;
    hanoi.chapter = 3;
    hanoi.research.telemetry = ['*'];
    const company = companyOf(hanoi);
    const austin = newGame({ cityId: 'area-austin', now: NOON_NY, seed: 2 });
    austin.cashCents = 12_000; // it held 10,000 when you left and earned 2,000 since
    austin.ledger.lifetimeSalesCents = 9_000;
    austin.machines = [];
    const mark = { cashCents: 10_000, salesCents: 6_000, netCents: 0, units: 0 };
    const before = company.ledger.lifetimeSalesCents;
    const { state, delta } = joinCompany(austin, company, mark);
    expect(delta.cashCents).toBe(2_000);
    expect(state.cashCents).toBe(502_000);
    expect(state.ledger.lifetimeSalesCents).toBe(before + 3_000);
    expect(state.chapter).toBe(3);
    expect(state.research.telemetry).toEqual(['*']);
    // The branch keeps its own city: machines, rival, id.
    expect(state.cityId).toBe('area-austin');
    expect(state.machines).toEqual([]);
    // A copy, not shared references.
    state.research.telemetry!.push('snacks');
    expect(company.research.telemetry).toEqual(['*']);
  });

  it('opens the world one step at a time: state, country, region, continent, world', () => {
    const austin = { cc: 'US', state: 'US-TX' };
    const dallas = { cc: 'US', state: 'US-TX' };
    const nyc = { cc: 'US', state: 'US-NY' };
    const toronto = { cc: 'CA', state: 'CA-ON' };
    const mexico = { cc: 'MX', state: 'MX-CMX' };
    const hanoi = { cc: 'VN', state: 'VN-HN' };
    expect(reachNeeded(austin, dallas)).toBe('state');
    expect(reachNeeded(austin, nyc)).toBe('country');
    expect(reachNeeded(austin, toronto)).toBe('region'); // Northern America
    expect(reachNeeded(austin, mexico)).toBe('continent'); // Central America, North America
    expect(reachNeeded(austin, hanoi)).toBe('world');
    expect(branchesUnlocked(2)).toBe(false);
    expect(canBranchTo(2, austin, dallas)).toBe(false);
    expect(canBranchTo(3, austin, dallas)).toBe(true);
    expect(canBranchTo(3, austin, nyc)).toBe(false);
    expect(canBranchTo(4, austin, nyc)).toBe(true);
    expect(canBranchTo(6, austin, hanoi)).toBe(false);
    expect(canBranchTo(7, austin, hanoi)).toBe(true);
    expect(chapterFor(austin, hanoi)).toBe(7);
    expect(chapterFor(austin, toronto)).toBe(5);
    // No states mapped: the state step is the whole country.
    expect(reachNeeded({ cc: 'SG' }, { cc: 'SG' })).toBe('state');
  });

  it('moves old saves in Prestige (old chapter 6) to the new Prestige (8)', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 }) as unknown as Record<string, unknown>;
    s.schemaVersion = 8;
    s.chapter = 6;
    s.chapterDoneAt = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
    delete s.footprint;
    const m = migrateSave(s);
    expect(m.chapter).toBe(8);
    expect(m.chapterDoneAt[7]).toBe(5);
    expect(m.footprint).toEqual({ countries: [], continents: [] });
  });
});
