import { FAMILY_LABEL, MACHINE_TYPES, type MachineFamily } from '@/config/machines';
import { CATEGORY_LABEL } from '@/config/places';
import { ACHIEVEMENTS, CHAPTERS, EVENT_TEMPLATES, PRESTIGE_PERKS } from '@/config/progression';
import type { PlaceCategory } from '@/data/types';
import { moneyWhole } from '@/ui/format';

import { t } from './index';

/**
 * Display names for config content (src/config stays data-only and English).
 * Each helper takes the config id and the config's English text, which is the
 * fallback when the catalog has no entry yet. Keys live under `content.*`.
 *
 * Plain `t` is fine here: the root navigator re-mounts on a language change.
 * Config text with `{amount}` gets its `amountCents` in the local currency.
 */
const amount = (cents: number | undefined) =>
  cents === undefined ? undefined : { amount: moneyWhole(cents) };

export const content = {
  chapterTitle: (n: number, en: string) => t.or(`content.chapters.c${n}.title`, en),
  chapterGoal: (n: number, en: string) =>
    t.or(`content.chapters.c${n}.goal`, en, amount(CHAPTERS.find((c) => c.n === n)?.amountCents)),
  /** i = index in the chapter's `unlocks` list. */
  chapterUnlock: (n: number, i: number, en: string) =>
    t.or(`content.chapters.c${n}.unlocks.u${i}`, en),
  district: (id: number, en: string) => t.or(`content.districts.d${id}`, en),
  machineType: (id: string, en: string) => t.or(`content.machines.${id}`, en),
  researchName: (id: string, en: string) => t.or(`content.research.${id}.name`, en),
  researchDesc: (id: string, en: string) => t.or(`content.research.${id}.desc`, en),
  /** Daily order title; `{n}` is the target (pass it already formatted, e.g. moneyShort()). */
  goal: (id: string, en: string, n: string | number) => t.or(`content.goals.${id}`, en, { n }),
  achievementTitle: (id: string, en: string) => t.or(`content.achievements.${id}.title`, en),
  achievementDesc: (id: string, en: string) =>
    t.or(
      `content.achievements.${id}.desc`,
      en,
      amount(ACHIEVEMENTS.find((a) => a.id === id)?.amountCents),
    ),
  series: (id: string, en: string) => t.or(`content.series.${id}.name`, en),
  /** Collectible item inside a series (item ids look like "<series>-<k>"). */
  seriesItem: (itemId: string, en: string) => t.or(`content.seriesItems.${itemId}`, en),
  event: (templateId: string, en: string) => t.or(`content.events.${templateId}`, en),
  /** A live event by its English name (sim events carry the template's name). */
  eventByName: (en: string) => {
    const tpl = EVENT_TEMPLATES.find((e) => e.name === en);
    return tpl ? t.or(`content.events.${tpl.id}`, en) : en;
  },
  perkName: (id: string, en: string) => t.or(`content.perks.${id}.name`, en),
  perkDesc: (id: string, en: string) =>
    t.or(
      `content.perks.${id}.desc`,
      en,
      amount(PRESTIGE_PERKS.find((p) => p.id === id)?.amountCents),
    ),
  city: (id: string, en: string) => t.or(`content.cities.${id}`, en),
  /** A city's one-line description (`City.notes`). */
  cityNotes: (id: string, en: string) => t.or(`content.cityNotes.${id}`, en),
  /** Machine family label (FAMILY_LABEL in config/machines). */
  family: (family: MachineFamily) => t.or(`content.families.${family}`, FAMILY_LABEL[family]),
  /** Place / venue category label (CATEGORY_LABEL in config/places); 'street' etc. pass through. */
  placeCategory: (category: string) =>
    t.or(`content.places.${category}`, CATEGORY_LABEL[category as PlaceCategory] ?? category),
  /** A machine type by its English name (sim messages carry `type.name`). */
  machineTypeByName: (en: string) => {
    const type = MACHINE_TYPES.find((m) => m.name === en);
    return type ? t.or(`content.machines.${type.id}`, en) : en;
  },
};
