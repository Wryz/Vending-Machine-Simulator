import { distanceM, evaluateSpot, newGame, placeMachine, suggestSpot, withClone } from './index';
import { deadSpot, decentSpot, NOON_NY, NYC, testWorld } from './__fixtures__/world';

const world = testWorld();

function fresh() {
  return newGame({ cityId: 'new-york', now: NOON_NY, seed: 7 });
}

describe('tutorial: show me a good spot', () => {
  it('finds a spot that sells at least as well as the obvious one', () => {
    const s = fresh();
    const pick = suggestSpot(s, world, NYC, NOON_NY)!;
    expect(pick).not.toBeNull();
    const typeId = s.machines[0].typeId;
    const decent = evaluateSpot(s, world, decentSpot(), typeId, NOON_NY);
    expect(pick.dailySalesCents).toBeGreaterThanOrEqual(decent.dailySalesCents);
    expect(evaluateSpot(s, world, pick, typeId, NOON_NY).dailySalesCents).toBe(
      pick.dailySalesCents,
    );
  });

  it('keeps clear of your machines', () => {
    const first = suggestSpot(fresh(), world, NYC, NOON_NY)!;
    const placed = withClone(fresh(), (d) =>
      placeMachine(d, world, {
        machineId: d.machines[0].id,
        lat: first.lat,
        lng: first.lng,
        heading: 180,
        termDays: 30,
        exclusive: false,
      }),
    ).state;
    // Another stored machine to place (the tutorial suggests for the next one too).
    const next = suggestSpot(placed, world, NYC, NOON_NY);
    expect(next).not.toBeNull();
    expect(distanceM(next!, first)).toBeGreaterThanOrEqual(150);
  });

  it('searches from the city center when the map is somewhere locked', () => {
    const fromFar = suggestSpot(fresh(), world, deadSpot(), NOON_NY);
    const fromCenter = suggestSpot(fresh(), world, NYC, NOON_NY);
    expect(fromFar).toEqual(fromCenter);
  });

  it('is deterministic', () => {
    expect(suggestSpot(fresh(), world, NYC, NOON_NY)).toEqual(
      suggestSpot(fresh(), world, NYC, NOON_NY),
    );
  });
});
