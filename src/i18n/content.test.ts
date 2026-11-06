import { FALLBACK_CITIES } from '@/config/cities';
import { FAMILY_LABEL, MACHINE_TYPES, type MachineFamily } from '@/config/machines';
import { CATEGORY_LABEL } from '@/config/places';
import {
  ACHIEVEMENTS,
  CHAPTERS,
  COLLECTIONS,
  DAILY_GOALS,
  DISTRICTS,
  EVENT_TEMPLATES,
  PRESTIGE_PERKS,
  RESEARCH,
} from '@/config/progression';

import { CATALOGS } from './catalogs';
import { content } from './content';
import { t } from './index';

/**
 * Every config item must have its `content.*` key in the English catalog,
 * with the same English text as the config, so a new config entry can't
 * silently miss a translation (the helpers would fall back to English).
 */
describe('content catalog covers src/config', () => {
  const en = CATALOGS.en ?? {};
  let keys: string[] = [];
  let spy: jest.SpyInstance;
  beforeEach(() => {
    keys = [];
    const orig = t.or;
    spy = jest.spyOn(t, 'or').mockImplementation((key, fallback, vars) => {
      keys.push(key);
      return orig(key, fallback, vars);
    });
  });
  afterEach(() => spy.mockRestore());

  /** Config text with its `{amount}` filled in (whole US dollars in tests). */
  function withAmount(en: string, cents: number | undefined): string {
    expect(en.includes('{amount}')).toBe(cents !== undefined);
    return cents === undefined
      ? en
      : en.replace('{amount}', `$${(cents / 100).toLocaleString('en-US')}`);
  }

  /** Calls a helper, checks the key it used exists and renders to `expected`. */
  function check(call: () => string, expected: string) {
    const out = call();
    expect(keys).toHaveLength(1);
    const key = keys[0];
    keys = [];
    if (!(key in en)) throw new Error(`Missing en catalog key ${key} ("${expected}")`);
    expect(out).toBe(expected);
  }

  it('chapters', () => {
    for (const c of CHAPTERS) {
      check(() => content.chapterTitle(c.n, c.title), c.title);
      check(() => content.chapterGoal(c.n, c.goal), withAmount(c.goal, c.amountCents));
      c.unlocks.forEach((u, i) => check(() => content.chapterUnlock(c.n, i, u), u));
    }
  });

  it('districts, machines, families', () => {
    for (const d of DISTRICTS) check(() => content.district(d.id, d.name), d.name);
    for (const m of MACHINE_TYPES) {
      check(() => content.machineType(m.id, m.name), m.name);
      check(() => content.machineTypeByName(m.name), m.name);
    }
    for (const f of Object.keys(FAMILY_LABEL) as MachineFamily[])
      check(() => content.family(f), FAMILY_LABEL[f]);
  });

  it('research, goals, achievements, perks', () => {
    for (const r of RESEARCH) {
      check(() => content.researchName(r.id, r.name), r.name);
      check(() => content.researchDesc(r.id, r.description), r.description);
    }
    for (const g of DAILY_GOALS)
      check(() => content.goal(g.id, g.title, '$45'), g.title.replace('{n}', '$45'));
    for (const a of ACHIEVEMENTS) {
      check(() => content.achievementTitle(a.id, a.title), a.title);
      check(
        () => content.achievementDesc(a.id, a.description),
        withAmount(a.description, a.amountCents),
      );
    }
    for (const p of PRESTIGE_PERKS) {
      check(() => content.perkName(p.id, p.name), p.name);
      check(() => content.perkDesc(p.id, p.description), withAmount(p.description, p.amountCents));
    }
  });

  it('collections, events, cities, places', () => {
    for (const s of COLLECTIONS) {
      check(() => content.series(s.id, s.name), s.name);
      for (const item of s.items) check(() => content.seriesItem(item.id, item.name), item.name);
    }
    for (const e of EVENT_TEMPLATES) {
      check(() => content.event(e.id, e.name), e.name);
      check(() => content.eventByName(e.name), e.name);
    }
    for (const c of FALLBACK_CITIES) {
      check(() => content.city(c.id, c.name), c.name);
      check(() => content.cityNotes(c.id, c.notes), c.notes);
    }
    for (const [cat, label] of Object.entries(CATEGORY_LABEL))
      check(() => content.placeCategory(cat), label);
  });

  it('unknown ids fall back to the English text', () => {
    expect(content.machineType('nope', 'Nope')).toBe('Nope');
    expect(content.eventByName('Not an event')).toBe('Not an event');
    expect(content.placeCategory('street')).toBe('street');
  });
});
