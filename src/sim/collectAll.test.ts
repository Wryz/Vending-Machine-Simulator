import { REQUESTS } from '@/config/requests';

import {
  advance,
  collectAll,
  newGame,
  placeMachine,
  storedMachine,
  withClone,
  type GameState,
} from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

function twoPlaced(): GameState {
  const world = testWorld();
  const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 });
  const st = withClone(s, (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      ...decentSpot(),
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
  // A second active machine next door (a copy of the first), plus one in storage.
  const first = st.machines[0];
  st.machines.push({ ...structuredClone(first), id: 'm2', lng: first.lng + 0.001 });
  st.machines.push(storedMachine('m3', 'snack', NOON_NY));
  return st;
}

describe('collect all from the cash bubble (owner, 2026-11-08)', () => {
  it('empties every active cash box and pays the total minus commission', () => {
    const s = twoPlaced();
    const active = s.machines.filter((m) => m.status === 'active');
    expect(active).toHaveLength(2);
    active[0].cashBoxCents = 10_000;
    active[1].cashBoxCents = 5_000;
    const cashBefore = s.cashCents;
    const commission =
      Math.round(10_000 * active[0].contract.commission) +
      Math.round(5_000 * active[1].contract.commission);
    const { state, result } = withClone(s, (d) => collectAll(d));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.machines).toBe(2);
    expect(result.grossCents).toBe(15_000);
    expect(result.commissionCents).toBe(commission);
    expect(state.cashCents).toBe(cashBefore + 15_000 - commission);
    expect(state.machines.every((m) => m.cashBoxCents === 0)).toBe(true);
  });

  it('fails when no machine has cash', () => {
    const s = twoPlaced();
    for (const m of s.machines) m.cashBoxCents = 0;
    const { result } = withClone(s, (d) => collectAll(d));
    expect(result.ok).toBe(false);
  });

  it('no customer requests are rolled while they are off', () => {
    expect(REQUESTS.enabled).toBe(false);
    const world = testWorld();
    let s = twoPlaced();
    s.ledger.lifetimeNetCents = 10_000;
    s.requests.nextAt = s.now;
    // Live play: short ticks, for 10 real minutes.
    for (let i = 0; i < 20; i++) s = advance(s, world, s.now + 30_000).state;
    expect(s.requests.open).toHaveLength(0);
  });
});
