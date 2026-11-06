import { advance, newGame, placeMachine, restockMachine, suggestRestock } from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

/** Share of seeds (deterministic) in which a stocked starter machine had a breakdown / theft. */
function rates(hours: number, seeds = 40) {
  const world = testWorld();
  let broke = 0;
  let robbed = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed });
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
    const { report } = advance(s, world, s.now + hours * 3_600_000);
    if (report.breakdowns) broke++;
    if (report.thefts) robbed++;
  }
  return { broke: broke / seeds, robbed: robbed / seeds };
}

describe('breakdowns and theft roll on real time', () => {
  it('a night away is a small risk, not a near-certainty', () => {
    const night = rates(8);
    expect(night.broke).toBeLessThan(0.3);
    expect(night.robbed).toBeLessThan(0.3);
  });

  it('they still happen over a few days', () => {
    const days = rates(72);
    expect(days.broke).toBeGreaterThan(0.2);
    expect(days.robbed).toBeGreaterThan(0.2);
  });
});
