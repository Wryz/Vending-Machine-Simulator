import { CONTRACT } from '@/config/economy';

import { advance, newGame, placeMachine, restockMachine, suggestRestock } from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

/** The starter machine, placed at a good spot and filled by hand. */
function starter() {
  const world = testWorld();
  const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 5 });
  const stored = s.machines.find((m) => m.status === 'stored')!;
  const p = decentSpot();
  const r = placeMachine(s, world, {
    machineId: stored.id,
    lat: p.lat,
    lng: p.lng,
    heading: 0,
    termDays: 30,
    exclusive: false,
  });
  if (!r.ok) throw new Error(r.error);
  restockMachine(s, world, r.machine.id, suggestRestock(s, r.machine.id), { manual: true });
  return { s, world, id: r.machine.id };
}

describe('venue mood runs on real time', () => {
  it('keeps the contract through a night away, even after selling out', () => {
    const { s, world, id } = starter();
    const out = advance(s, world, s.now + 12 * 3_600_000);
    const m = out.state.machines.find((x) => x.id === id)!;
    expect(m.slots.reduce((a, x) => a + x.qty, 0)).toBe(0); // it did sell out
    expect(m.status).toBe('active');
    expect(out.report.contractsLost).toHaveLength(0);
  });

  it('keeps it for a full day away', () => {
    const { s, world, id } = starter();
    const out = advance(s, world, s.now + 24 * 3_600_000);
    expect(out.state.machines.find((x) => x.id === id)!.status).toBe('active');
  });

  it('ends it after days of an empty machine', () => {
    const { s, world, id } = starter();
    const out = advance(s, world, s.now + 72 * 3_600_000);
    expect(out.state.machines.find((x) => x.id === id)!.status).toBe('stored');
    expect(out.report.contractsLost).toEqual([id]);
  });

  it('needs a full real day below the line before a venue walks away', () => {
    expect(CONTRACT.terminateAfterHours).toBeGreaterThanOrEqual(24);
    // An empty machine needs at least half a day to sink from a calm mood to the line.
    expect((0.5 - CONTRACT.terminateBelow) / CONTRACT.moodLossEmptyPerHour).toBeGreaterThanOrEqual(
      12,
    );
  });
});
