import { ACTION_LOG } from '@/config/progression';

import { collectCash, newGame, placeMachine, recordAction, setPrice, withClone } from './index';
import { decentSpot, NOON_NY, testWorld } from './__fixtures__/world';

describe('action log', () => {
  it('records successful player actions with their arguments, not the city data', () => {
    const w = testWorld();
    const s0 = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    const args = { machineId: s0.machines[0].id, ...decentSpot(), heading: 90, termDays: 30, exclusive: false };
    const s = withClone(s0, (d) => placeMachine(d, w, args)).state;
    expect(s.actionLog).toHaveLength(1);
    expect(s.actionLog[0]).toEqual({ t: NOON_NY, a: 'placeMachine', p: [null, args] });
    // A failed action is not logged.
    const failed = withClone(s, (d) => setPrice(d, 'nope', 0, 100)).state;
    expect(failed.actionLog).toHaveLength(1);
    const collected = withClone(s, (d) => collectCash(d, d.machines[0].id)).state;
    expect(collected.actionLog.map((x) => x.a)).toEqual(['placeMachine', 'collectCash']);
  });

  it('keeps the newest entries and counts the dropped ones', () => {
    const s = newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });
    for (let i = 0; i < ACTION_LOG.cap + 3; i++) recordAction(s, 'test', [i]);
    expect(s.actionLog).toHaveLength(ACTION_LOG.cap);
    expect(s.actionLogDropped).toBe(3);
    expect(s.actionLog[0].p).toEqual([3]);
  });
});
