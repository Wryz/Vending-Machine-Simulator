import { branchesUnlocked, companyOf, joinCompany, maxCities, newGame } from './index';
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

  it('unlocks branches in chapter 3 and more cities later', () => {
    expect(branchesUnlocked(2)).toBe(false);
    expect(branchesUnlocked(3)).toBe(true);
    expect(maxCities(2)).toBe(1);
    expect(maxCities(3)).toBe(3);
    expect(maxCities(4)).toBe(5);
    expect(maxCities(6)).toBe(Infinity);
  });
});
