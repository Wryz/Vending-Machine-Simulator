import { newGame, upcomingFamilies } from './index';
import { NOON_NY, testWorld } from './__fixtures__/world';

describe('upcoming machine families', () => {
  it('chapter 1 shows every other family with the chapter that opens it', () => {
    const w = testWorld();
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    const up = upcomingFamilies(s, w).map((x) => `${x.type.family}:${x.chapter}`);
    expect(up).toEqual(['drinks:2', 'capsules:3', 'tech:4', 'hotFood:4', 'alcohol:5']);
  });
  it('an opened family drops off the list', () => {
    const w = testWorld();
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    s.chapter = 4;
    expect(upcomingFamilies(s, w).map((x) => x.type.family)).toEqual(['alcohol']);
  });
});
