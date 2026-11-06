import { newGame } from './create';
import { placeMachine, restockMachine, suggestRestock, withClone } from './actions';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';
import { offsetPoint } from './geo';
import { competition, competitorMap } from './rules';
import type { GameState, RivalMachine } from './state';

/** A fleet packed close enough that most machines compete with each other. */
function fleet(n: number): { s: GameState; world: ReturnType<typeof testWorld> } {
  const world = testWorld();
  let s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 3 });
  s.chapter = 5;
  s.cashCents = 1e12;
  const spot = decentSpot();
  for (let i = 0; i < n; i++) {
    const p = offsetPoint(spot, (i * 53) % 360, 15 + (i % 12) * 30);
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

function rival(id: string, lat: number, lng: number): RivalMachine {
  return { id, lat, lng, cellId: '', typeId: 'snack', placedAt: 0 };
}

describe('incremental competition', () => {
  it('matches a full rebuild exactly after machines leave', () => {
    const { s, world } = fleet(40);
    const comp = competition(s, world);
    expect(comp.values).toEqual(competitorMap(s, world));

    const gone = s.machines.filter((_, i) => i % 3 === 0);
    for (const m of gone) m.status = 'stored';
    comp.remove(gone);
    expect(comp.values).toEqual(competitorMap(s, world));
  });

  it('matches a full rebuild exactly after rival moves', () => {
    const { s, world } = fleet(30);
    const spot = decentSpot();
    s.rival.machines = [0, 1, 2].map((i) => {
      const p = offsetPoint(spot, i * 120, 60);
      return rival(`r${i}`, p.lat, p.lng);
    });
    const comp = competition(s, world);
    expect(comp.values).toEqual(competitorMap(s, world));

    const removed = [s.rival.machines[1]];
    const p = offsetPoint(spot, 45, 90);
    const added = [rival('r9', p.lat, p.lng)];
    s.rival.machines = [s.rival.machines[0], s.rival.machines[2], ...added];
    comp.updateRivals(removed, added);
    expect(comp.values).toEqual(competitorMap(s, world));
  });
});
