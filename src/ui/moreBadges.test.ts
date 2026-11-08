import { newGame } from '@/sim';
import { NOON_NY } from '@/sim/__fixtures__/world';

import { moreBadges, researchStartable } from './moreBadges';

const game = () => newGame({ cityId: 'new-york', now: NOON_NY, seed: 1 });

describe('Company → More badges', () => {
  it('counts research the player can start now', () => {
    const g = game();
    g.chapter = 2;
    g.cashCents = 0;
    expect(researchStartable(g)).toBe(0);
    g.cashCents = 10_000_000;
    const open = researchStartable(g);
    expect(open).toBeGreaterThan(0);
    g.research.telemetry = ['*'];
    expect(researchStartable(g)).toBe(open - 1);
    g.lab = { id: 'cooler', key: 'snacks', startedAt: 0, doneAt: 1 };
    expect(researchStartable(g)).toBe(0);
  });

  it('shows 1 for finished research not yet seen', () => {
    const g = game();
    g.research.telemetry = ['*'];
    g.lab = { id: 'cooler', key: 'snacks', startedAt: 0, doneAt: 1 };
    expect(moreBadges(g, {}).research).toBe(1);
    expect(moreBadges(g, { research: 1 }).research).toBe(0);
  });

  it('counts unclaimed or newly unlocked trophies', () => {
    const g = game();
    expect(moreBadges(g, {}).trophies).toBe(0);
    g.achievements = { 'first-sale': 1 };
    expect(moreBadges(g, {}).trophies).toBe(1);
    expect(moreBadges(g, { trophies: 1 }).trophies).toBe(0);
    g.unclaimed = [{ id: 'first-sale', cents: 2_000 }];
    expect(moreBadges(g, { trophies: 1 }).trophies).toBe(1);
  });

  it('flags prestige once selling opens, until seen', () => {
    const g = game();
    expect(moreBadges(g, {}).prestige).toBe(0);
    g.chapter = 8;
    expect(moreBadges(g, {}).prestige).toBe(1);
    expect(moreBadges(g, { prestige: true }).prestige).toBe(0);
  });
});
