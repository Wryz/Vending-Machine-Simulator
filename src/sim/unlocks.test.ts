import {
  advance,
  collectCash,
  featureUnlocked,
  newGame,
  placeMachine,
  restockMachine,
  suggestRestock,
  tutorialStep,
  unlockedFeatures,
  withClone,
} from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

const world = testWorld();

function fresh() {
  return newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 });
}

function placedAndStocked() {
  const p = decentSpot();
  let s = withClone(fresh(), (d) =>
    placeMachine(d, world, {
      machineId: d.machines[0].id,
      lat: p.lat,
      lng: p.lng,
      heading: 180,
      termDays: 30,
      exclusive: false,
    }),
  ).state;
  const id = s.machines[0].id;
  s = withClone(s, (d) =>
    restockMachine(d, world, id, suggestRestock(d, id), { manual: true }),
  ).state;
  return s;
}

describe('feature unlocks', () => {
  it('a new game shows only the map basics', () => {
    expect(unlockedFeatures(fresh())).toEqual([]);
  });

  it('opens features as milestones are reached', () => {
    const stocked = placedAndStocked();
    expect(featureUnlocked(stocked, 'locate')).toBe(true);
    expect(featureUnlocked(stocked, 'orders')).toBe(false);
    const sold = advance(stocked, world, stocked.now + 6 * 3600_000).state;
    expect(sold.ledger.lifetimeUnits).toBeGreaterThan(0);
    expect(featureUnlocked(sold, 'orders')).toBe(true);
    expect(featureUnlocked(sold, 'company')).toBe(false);
    const collected = withClone(sold, (d) => collectCash(d, d.machines[0].id)).state;
    expect(featureUnlocked(collected, 'company')).toBe(true);
    expect(featureUnlocked(collected, 'routes')).toBe(false);
  });

  it('chapter 2 opens everything (older saves)', () => {
    const s = fresh();
    s.chapter = 2;
    expect(unlockedFeatures(s)).toEqual(['locate', 'orders', 'company', 'keys', 'routes', 'topDown']);
  });
});

describe('first-machine tutorial', () => {
  it('walks place -> stock -> wait -> collect -> goal', () => {
    expect(tutorialStep(fresh())).toBe('place');
    const p = decentSpot();
    const placed = withClone(fresh(), (d) =>
      placeMachine(d, world, {
        machineId: d.machines[0].id,
        lat: p.lat,
        lng: p.lng,
        heading: 180,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    expect(tutorialStep(placed)).toBe('stock');
    const stocked = placedAndStocked();
    expect(tutorialStep(stocked)).toBe('wait');
    const sold = advance(stocked, world, stocked.now + 6 * 3600_000).state;
    expect(tutorialStep(sold)).toBe('collect');
    const collected = withClone(sold, (d) => collectCash(d, d.machines[0].id)).state;
    expect(tutorialStep(collected)).toBe('goal');
    collected.chapter = 2;
    expect(tutorialStep(collected)).toBeNull();
  });
});
