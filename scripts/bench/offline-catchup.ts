import { advance, newGame, placeMachine, restockMachine, suggestRestock, withClone } from '../../src/sim';
import { decentSpot, NOON_NY, testWorld } from '../../src/sim/__fixtures__/world';
import { offsetPoint } from '../../src/sim/geo';
const world = testWorld();
let s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
s.chapter = 5; s.cashCents = 1e12;
const spot = decentSpot();
for (let i = 0; i < 200; i++) {
  const p = offsetPoint(spot, (i * 37) % 360, 20 + (i % 40) * 12);
  s = withClone(s, (d) => { const r = placeMachine(d, world, { typeId: 'snack', lat: p.lat, lng: p.lng, heading: 0, termDays: 180, exclusive: false }); if (r.ok) restockMachine(d, world, r.machine.id, suggestRestock(d, r.machine.id, 10000), { manual: false, capacity: 10000 }); }).state;
}
for (let k = 0; k < 3; k++) { const t0 = performance.now(); advance(s, world, s.now + 72 * 3600000); console.log('ms', Math.round(performance.now() - t0)); }
