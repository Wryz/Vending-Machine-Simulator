/**
 * Which name tag a map label (or the tab bar's area name) shows for the UI
 * language. Both tile schemas carry OSM `name:<lang>` tags (OpenMapTiles has
 * `name:zh`, Protomaps `name:zh-Hans`). Order: the UI language, then the
 * local name when the city speaks the UI language (Tokyo in Japanese), then
 * English / Latin, then the local name. CJK glyphs come from the same Noto Sans
 * font stack on OpenFreeMap (its CJK ranges are populated), so labels never go blank.
 */
export interface LabelLanguage {
  /** UI language (BCP 47), e.g. 'ja', 'zh-Hans', 'pt-BR'. */
  lang: string;
  /** City's ISO country code, to put local names first where they match. */
  countryCode?: string;
}

const NAME_KEYS: Record<string, string[]> = {
  es: ['name:es'],
  fr: ['name:fr'],
  de: ['name:de'],
  ja: ['name:ja'],
  ko: ['name:ko'],
  'zh-Hans': ['name:zh-Hans', 'name:zh'],
  'pt-BR': ['name:pt'],
};

/** Main language by country, for the cities we may start in. */
const COUNTRY_LANG: Record<string, string> = {
  JP: 'ja',
  KR: 'ko',
  CN: 'zh-Hans',
  TW: 'zh-Hans',
  HK: 'zh-Hans',
  FR: 'fr',
  BE: 'fr',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  BR: 'pt-BR',
  PT: 'pt-BR',
};

/** Name tags to try, best first (without the final plain `name`). */
export function labelNameKeys(
  schema: 'openmaptiles' | 'protomaps',
  l: LabelLanguage = { lang: 'en' },
): string[] {
  const own = NAME_KEYS[l.lang] ?? [];
  const localFirst =
    own.length > 0 && !!l.countryCode && COUNTRY_LANG[l.countryCode.toUpperCase()] === l.lang;
  const keys = [...own];
  if (localFirst) keys.push('name');
  keys.push('name:en');
  if (schema === 'openmaptiles') keys.push('name:latin');
  return keys;
}

/** MapLibre `text-field` expression for a label. */
export function labelNameExpr(
  schema: 'openmaptiles' | 'protomaps',
  l?: LabelLanguage,
): ['coalesce', ...['get', string][]] {
  const keys = labelNameKeys(schema, l).map((k): ['get', string] => ['get', k]);
  return ['coalesce', ...keys, ['get', 'name']];
}

/** The same choice over a feature's properties (null if it has no name). */
export function pickName(
  props: Record<string, unknown>,
  schema: 'openmaptiles' | 'protomaps',
  l?: LabelLanguage,
): string | null {
  for (const k of [...labelNameKeys(schema, l), 'name']) {
    const v = props[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}
