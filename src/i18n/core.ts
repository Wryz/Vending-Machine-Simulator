import { pluralCategory, type Lang } from './languages';

/**
 * Tiny i18n core: nested catalogs, `{name}` interpolation and one/other plurals.
 * Pure (no React Native imports) so it can be unit-tested.
 */
export interface Plural {
  one: string;
  other: string;
}
export type Leaf = string | Plural;
export interface CatalogTree {
  [key: string]: Leaf | CatalogTree;
}

/** The same shape as a source catalog, with any strings (what translations must satisfy). */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Shape<T[K]>;
};

/** Dotted key paths of a catalog's leaves, e.g. "settings.language". */
export type KeyPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf ? `${P}${K}` : KeyPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

export function isPlural(x: unknown): x is Plural {
  if (!x || typeof x !== 'object') return false;
  const keys = Object.keys(x);
  return (
    keys.length === 2 &&
    typeof (x as Plural).one === 'string' &&
    typeof (x as Plural).other === 'string'
  );
}

/** Flattens a nested catalog to dotted keys. */
export function flatten(tree: CatalogTree, prefix = '', out: Record<string, Leaf> = {}) {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || isPlural(v)) out[key] = v;
    else flatten(v, key, out);
  }
  return out;
}

/** `{name}` placeholders in a string. */
export function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

export function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (whole, name: string) =>
    vars[name] === undefined ? whole : String(vars[name]),
  );
}

/** Plural count: `n` (preferred) or `count`. */
function countOf(vars?: Vars): number {
  const n = vars?.n ?? vars?.count;
  return typeof n === 'number' ? n : Number(n ?? 0);
}

export function renderLeaf(lang: Lang, leaf: Leaf, vars?: Vars): string {
  const s = typeof leaf === 'string' ? leaf : leaf[pluralCategory(lang, countOf(vars))];
  return interpolate(s, vars);
}

/**
 * Looks a key up in the language's flat catalog, then English, then returns
 * `fallback` (or the key itself) so a missing string never crashes the UI.
 */
export function translate(
  catalogs: Partial<Record<Lang, Record<string, Leaf>>>,
  lang: Lang,
  key: string,
  vars?: Vars,
  fallback?: string,
): string {
  const own = catalogs[lang]?.[key];
  if (own !== undefined) return renderLeaf(lang, own, vars);
  const en = catalogs.en?.[key];
  if (en !== undefined) return renderLeaf('en', en, vars);
  return interpolate(fallback ?? key, vars);
}
