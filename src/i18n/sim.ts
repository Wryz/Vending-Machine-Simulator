import { CATEGORY_LABEL } from '@/config/places';
import { ACHIEVEMENTS, DAILY_GOALS, EVENT_TEMPLATES } from '@/config/progression';
import type { PlaceCategory } from '@/data/types';
import type { AlertKind, ProjectedAlert } from '@/sim';

import { CATALOGS, type TKey } from './catalogs';
import { content } from './content';
import { isPlural, type Leaf, type Vars } from './core';
import { t } from './index';

/**
 * Sim messages at the UI edge. src/sim stays pure and returns English text
 * (ActionResult errors, log lines, ledger categories, spot reasons, projected
 * alerts); these map them to the current language and pass unknown text
 * through unchanged.
 *
 * Matching is driven by the English catalog itself (locales/en/sim.ts and
 * notify.ts): a leaf without placeholders matches exactly, a leaf with
 * `{name}` placeholders becomes an anchored pattern. Captured values are
 * translated by name (machine type, venue, event...) before re-rendering, so
 * English output is identical to the sim's text. sim.test.ts scans src/sim so
 * a new or changed sim string fails the tests until the catalog follows.
 */

/** English templates under a key prefix (plural leaves give both forms). */
function enLeaves(prefix: string): [string, string][] {
  const out: [string, string][] = [];
  const flat: Record<string, Leaf> = CATALOGS.en ?? {};
  for (const [key, leaf] of Object.entries(flat)) {
    if (!key.startsWith(prefix)) continue;
    if (isPlural(leaf)) out.push([key, leaf.one], [key, leaf.other]);
    else out.push([key, leaf]);
  }
  return out;
}

interface Template {
  key: string;
  re: RegExp;
  names: string[];
}

interface Table {
  exact: Map<string, string>;
  templates: Template[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Longest first, so a name that prefixes another can't cut it short. */
const oneOf = (names: readonly string[]) =>
  [...names]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');

/**
 * What each placeholder can hold. Known sets (event, trophy, order, category,
 * family, source) are spelled out so free text around them (real venue names
 * with " at " or parentheses) splits in the right place; anything else is lazy.
 */
function varPattern(name: string): string {
  switch (name) {
    case 'event':
      return oneOf(EVENT_TEMPLATES.map((e) => e.name));
    case 'title':
      return oneOf(ACHIEVEMENTS.map((a) => a.title));
    case 'order':
      return DAILY_GOALS.map((g) => g.title.split('{n}').map(escape).join('.+?')).join('|');
    case 'category':
      return oneOf(Object.values(CATEGORY_LABEL));
    case 'source':
    case 'family':
      return oneOf(
        enLeaves(`sim.spot.${name === 'source' ? 'sources' : 'families'}.`).map(([, en]) => en),
      );
    default:
      return '.+?';
  }
}

function buildTable(prefix: string): Table {
  const exact = new Map<string, string>();
  const templates: Template[] = [];
  for (const [key, en] of enLeaves(prefix)) {
    const names: string[] = [];
    const parts = en.split(/\{(\w+)\}/g);
    if (parts.length === 1) {
      if (!exact.has(en)) exact.set(en, key);
      continue;
    }
    let src = '';
    parts.forEach((p, i) => {
      if (i % 2) {
        names.push(p);
        src += `(${varPattern(p)})`;
      } else src += escape(p);
    });
    templates.push({ key, re: new RegExp(`^${src}$`), names });
  }
  return { exact, templates };
}

const tables = new Map<string, Table>();
function table(prefix: string): Table {
  let tb = tables.get(prefix);
  if (!tb) {
    tb = buildTable(prefix);
    tables.set(prefix, tb);
  }
  return tb;
}

/** English text → its key under a prefix (exact leaves only). */
function reverse(prefix: string, en: string): string | undefined {
  return table(prefix).exact.get(en);
}

/** A sim placeholder venue ("Street corner", "Storage"); real place names pass through. */
export function venueName(name: string): string {
  const key = reverse('sim.venues.', name);
  return key ? t.or(key, name) : name;
}

function orderTitle(en: string): string | null {
  for (const g of DAILY_GOALS) {
    const [before, after] = g.title.split('{n}');
    if (after === undefined) {
      if (g.title === en) return content.goal(g.id, g.title, '');
      continue;
    }
    if (en.startsWith(before) && en.endsWith(after) && en.length > before.length + after.length)
      return content.goal(g.id, g.title, en.slice(before.length, en.length - after.length));
  }
  return null;
}

/**
 * Translates a captured value by its placeholder name. Returns null when the
 * value is not what that placeholder holds, so the template does not match.
 */
function translateVar(name: string, value: string): string | number | null {
  switch (name) {
    case 'type':
      return content.machineTypeByName(value);
    case 'venue':
      return venueName(value);
    case 'event': {
      const e = EVENT_TEMPLATES.find((x) => x.name === value);
      return e ? content.event(e.id, e.name) : null;
    }
    case 'title': {
      const a = ACHIEVEMENTS.find((x) => x.title === value);
      return a ? content.achievementTitle(a.id, a.title) : null;
    }
    case 'order':
      return orderTitle(value);
    case 'source':
    case 'family': {
      const key = reverse(`sim.spot.${name === 'source' ? 'sources' : 'families'}.`, value);
      return key ? t.or(key, value) : null;
    }
    case 'category': {
      const cat = (Object.keys(CATEGORY_LABEL) as PlaceCategory[]).find(
        (c) => CATEGORY_LABEL[c] === value,
      );
      return cat ? content.placeCategory(cat) : null;
    }
    case 'n':
      return /^-?\d+$/.test(value) ? Number(value) : value;
    default:
      return value;
  }
}

/** The catalog key and (English) vars for a sim text, or null if unknown. */
export function matchSimText(prefix: string, text: string): { key: string; vars?: Vars } | null {
  const tb = table(prefix);
  const exact = tb.exact.get(text);
  if (exact) return { key: exact };
  for (const tpl of tb.templates) {
    const m = tpl.re.exec(text);
    if (!m) continue;
    const vars: Vars = {};
    let ok = true;
    tpl.names.forEach((name, i) => {
      const v = translateVar(name, m[i + 1]);
      if (v === null) ok = false;
      else vars[name] = v;
    });
    if (ok) return { key: tpl.key, vars };
  }
  return null;
}

function render(prefix: string, text: string): string {
  const hit = matchSimText(prefix, text);
  return hit ? t.or(hit.key, text, hit.vars) : text;
}

/** An ActionResult / ClaimResult error message (also SaveError and spot `blocked`). */
export function simError(message: string): string {
  return render('sim.errors.', message);
}

/**
 * A sim log line (state.log entry text) for display. `kind` 'spotReason'
 * renders a spot-report reason (same as `spotReason`).
 */
export function logText(kind: string, text: string): string {
  return render(kind === 'spotReason' ? 'sim.spot.' : 'sim.log.', text);
}

/** A ledger category name ("Repairs", "Research", ...). */
export function ledgerCategory(name: string): string {
  return render('sim.ledger.', name);
}

/** A spot-report reason (`SpotReport.reasons[].text`). */
export function spotReason(text: string): string {
  return render('sim.spot.', text);
}

/** A product slot's name when it is empty (`productName(null)` in the sim). */
export function productLabel(name: string): string {
  return name === 'Empty' ? t('sim.emptyProduct') : name;
}

const ALERT_KEY: Record<AlertKind, 'machineEmpty' | 'cashFull' | 'event'> = {
  'machine-empty': 'machineEmpty',
  'cash-full': 'cashFull',
  event: 'event',
};

/** Title and body of a projected notification (src/sim/projections.ts). */
export function alertText(a: Pick<ProjectedAlert, 'kind' | 'title' | 'body'>): {
  title: string;
  body: string;
} {
  const k = ALERT_KEY[a.kind];
  const titleKey: TKey = `notify.${k}.title`;
  const title = CATALOGS.en?.[titleKey] === a.title ? t(titleKey) : a.title;
  return { title, body: render(`notify.${k}.body`, a.body) };
}
