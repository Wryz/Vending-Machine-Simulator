import { useMemo } from 'react';
import { create } from 'zustand';

import { CATALOGS, type TKey } from './catalogs';
import { translate, type Vars } from './core';
import { isLang, resolveLanguage, type Lang } from './languages';

export { LANGUAGES, LANGUAGE_NAMES, type Lang } from './languages';
export type { TKey } from './catalogs';
export type { Vars } from './core';

/**
 * UI language at runtime. `lang` follows the profile's saved choice, or the
 * phone when none is saved. Components read strings through `useT()` so they
 * re-render on a change; the root layout also re-keys the navigator on `lang`
 * so plain `t()` calls (helpers, stores, alerts) pick it up everywhere.
 */
interface LocaleState {
  /** The language the UI shows. */
  lang: Lang;
  /** The phone's language (shown as "System (...)" in Settings). */
  device: Lang;
}

/** Dev builds only: force a language for screenshots (EXPO_PUBLIC_QA_LANG=ja). */
const QA_LANG =
  typeof __DEV__ !== 'undefined' && __DEV__ ? (process.env.EXPO_PUBLIC_QA_LANG ?? '') : '';

/**
 * Starts in English; src/i18n/init.ts (app startup) sets the phone language
 * and the saved choice. Kept free of React Native imports so pure helpers and
 * their Jest tests can import `t`.
 */
export const useLocale = create<LocaleState>(() => ({ lang: 'en', device: 'en' }));

/** Applies the phone language and the profile's saved choice (null = the phone). */
export function applyLanguage(device: Lang, saved: string | null | undefined): void {
  const lang = isLang(QA_LANG) ? QA_LANG : resolveLanguage(saved, device);
  const cur = useLocale.getState();
  if (cur.lang !== lang || cur.device !== device) useLocale.setState({ lang, device });
}

export function currentLang(): Lang {
  return useLocale.getState().lang;
}

export interface TFn {
  (key: TKey, vars?: Vars): string;
  /** A computed key (e.g. from a config id), with English text as the fallback. */
  or(key: string, fallback: string, vars?: Vars): string;
  lang: Lang;
}

function makeT(lang: Lang): TFn {
  const fn = ((key: TKey, vars?: Vars) => translate(CATALOGS, lang, key, vars)) as TFn;
  fn.or = (key, fallback, vars) => translate(CATALOGS, lang, key, vars, fallback);
  fn.lang = lang;
  return fn;
}

const cache = new Map<Lang, TFn>();
function tFor(lang: Lang): TFn {
  let f = cache.get(lang);
  if (!f) {
    f = makeT(lang);
    cache.set(lang, f);
  }
  return f;
}

/**
 * Translate in the current language. For event handlers, stores and helpers;
 * inside components prefer `useT()`.
 */
export const t: TFn = Object.assign(
  (key: TKey, vars?: Vars) => tFor(currentLang())(key, vars),
  {
    or: (key: string, fallback: string, vars?: Vars) => tFor(currentLang()).or(key, fallback, vars),
  },
) as TFn;
Object.defineProperty(t, 'lang', { get: currentLang });

/** Translator bound to the current language; re-renders the component on a change. */
export function useT(): TFn {
  const lang = useLocale((s) => s.lang);
  return useMemo(() => tFor(lang), [lang]);
}

export function useLang(): Lang {
  return useLocale((s) => s.lang);
}
