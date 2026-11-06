/**
 * Supported UI languages. Pure (no React Native imports) so it can be tested.
 *
 * Picked for our nine cities (New York, LA, Chicago, London, Paris, Tokyo,
 * Seoul, Singapore, Sydney) and the biggest mobile game markets.
 */
export const LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh-Hans', 'pt-BR'] as const;
export type Lang = (typeof LANGUAGES)[number];

/** Each language in its own name, for the picker. */
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  'zh-Hans': '简体中文',
  'pt-BR': 'Português (Brasil)',
};

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && (LANGUAGES as readonly string[]).includes(x);
}

/**
 * Nearest supported language for a BCP 47 / POSIX locale tag ("ja-JP",
 * "zh_TW", "pt-PT", "de-CH@calendar=..."), or null if none fits. Any Chinese
 * maps to Simplified Chinese and any Portuguese to Brazilian Portuguese.
 */
export function matchLanguage(tag: string | null | undefined): Lang | null {
  if (!tag || typeof tag !== 'string') return null;
  const base = tag.trim().replace(/_/g, '-').split('@')[0].toLowerCase();
  const primary = base.split('-')[0];
  switch (primary) {
    case 'en':
    case 'es':
    case 'fr':
    case 'de':
    case 'ja':
    case 'ko':
      return primary;
    case 'zh':
      return 'zh-Hans';
    case 'pt':
      return 'pt-BR';
    default:
      return null;
  }
}

/** First supported language in a preference list, else English. */
export function pickLanguage(candidates: readonly (string | null | undefined)[]): Lang {
  for (const c of candidates) {
    const m = matchLanguage(c);
    if (m) return m;
  }
  return 'en';
}

/** Saved profile choice (null = follow the phone) resolved against the phone language. */
export function resolveLanguage(saved: string | null | undefined, device: Lang): Lang {
  return isLang(saved) ? saved : device;
}

/**
 * CLDR plural category for the languages we ship. Japanese, Korean and
 * Chinese have no plural forms; French treats 0 and 1 as singular.
 */
export function pluralCategory(lang: Lang, n: number): 'one' | 'other' {
  switch (lang) {
    case 'ja':
    case 'ko':
    case 'zh-Hans':
      return 'other';
    case 'fr':
    case 'pt-BR':
      return n === 0 || n === 1 ? 'one' : 'other';
    default:
      return n === 1 ? 'one' : 'other';
  }
}
