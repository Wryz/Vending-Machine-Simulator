import { flatten, type CatalogTree, type KeyPaths, type Leaf } from './core';
import type { Lang } from './languages';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import ja from './locales/ja';
import ko from './locales/ko';
import ptBR from './locales/pt-BR';
import zhHans from './locales/zh-Hans';

export type TKey = KeyPaths<typeof en>;

export const TREES: Record<Lang, CatalogTree> = {
  en,
  es,
  fr,
  de,
  ja,
  ko,
  'zh-Hans': zhHans,
  'pt-BR': ptBR,
};

const flat: Partial<Record<Lang, Record<string, Leaf>>> = {};

/** Flat catalogs, built on first use per language. */
export const CATALOGS = new Proxy(flat, {
  get(target, lang: string) {
    const l = lang as Lang;
    if (!target[l] && TREES[l]) target[l] = flatten(TREES[l]);
    return target[l];
  },
});
