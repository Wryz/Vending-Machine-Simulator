import { TREES } from './catalogs';
import { flatten, isPlural, placeholders, translate, type Leaf } from './core';
import { applyLanguage, t, useLocale } from './index';
import {
  LANGUAGES,
  matchLanguage,
  pickLanguage,
  pluralCategory,
  resolveLanguage,
} from './languages';

describe('language detection', () => {
  it('maps phone locales to the nearest supported language', () => {
    expect(matchLanguage('en-US')).toBe('en');
    expect(matchLanguage('ja_JP')).toBe('ja');
    expect(matchLanguage('ko-KR')).toBe('ko');
    expect(matchLanguage('de-CH')).toBe('de');
    expect(matchLanguage('fr-CA')).toBe('fr');
    expect(matchLanguage('es-419')).toBe('es');
    expect(matchLanguage('zh-Hans-CN')).toBe('zh-Hans');
    expect(matchLanguage('zh-Hant-TW')).toBe('zh-Hans');
    expect(matchLanguage('zh_TW')).toBe('zh-Hans');
    expect(matchLanguage('pt-PT')).toBe('pt-BR');
    expect(matchLanguage('pt_BR')).toBe('pt-BR');
    expect(matchLanguage('en_GB@calendar=gregorian')).toBe('en');
    expect(matchLanguage('it-IT')).toBeNull();
    expect(matchLanguage('')).toBeNull();
    expect(matchLanguage(undefined)).toBeNull();
  });

  it('picks the first supported language in preference order, else English', () => {
    expect(pickLanguage(['it-IT', 'fr-FR', 'en-US'])).toBe('fr');
    expect(pickLanguage(['nl-NL', 'sv-SE'])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });

  it('uses the saved choice, or the phone when none is saved', () => {
    expect(resolveLanguage(null, 'ja')).toBe('ja');
    expect(resolveLanguage(undefined, 'de')).toBe('de');
    expect(resolveLanguage('ko', 'ja')).toBe('ko');
    expect(resolveLanguage('xx', 'fr')).toBe('fr');
  });
});

describe('translate', () => {
  const catalogs = {
    en: {
      hello: 'Hello, {name}!',
      items: { one: '{n} item', other: '{n} items' },
      onlyEn: 'English only',
    } as Record<string, Leaf>,
    ja: { hello: 'こんにちは、{name}!', items: { one: '{n}個', other: '{n}個' } } as Record<
      string,
      Leaf
    >,
    fr: { items: { one: '{n} article', other: '{n} articles' } } as Record<string, Leaf>,
  };

  it('interpolates placeholders and leaves unknown ones', () => {
    expect(translate(catalogs, 'en', 'hello', { name: 'Ana' })).toBe('Hello, Ana!');
    expect(translate(catalogs, 'ja', 'hello', { name: 'Ana' })).toBe('こんにちは、Ana!');
    expect(translate(catalogs, 'en', 'hello')).toBe('Hello, {name}!');
  });

  it('chooses plural forms per language', () => {
    expect(translate(catalogs, 'en', 'items', { n: 1 })).toBe('1 item');
    expect(translate(catalogs, 'en', 'items', { n: 0 })).toBe('0 items');
    expect(translate(catalogs, 'fr', 'items', { n: 0 })).toBe('0 article');
    expect(translate(catalogs, 'fr', 'items', { n: 2 })).toBe('2 articles');
    expect(translate(catalogs, 'ja', 'items', { n: 1 })).toBe('1個');
    expect(pluralCategory('ko', 1)).toBe('other');
    expect(pluralCategory('de', 1)).toBe('one');
    expect(pluralCategory('pt-BR', 0)).toBe('one');
  });

  it('falls back to English, then the given fallback, then the key', () => {
    expect(translate(catalogs, 'ja', 'onlyEn')).toBe('English only');
    expect(translate(catalogs, 'ja', 'missing', undefined, 'Config text')).toBe('Config text');
    expect(translate(catalogs, 'ja', 'missing')).toBe('missing');
  });
});

describe('runtime', () => {
  afterEach(() => applyLanguage('en', null));

  it('follows the saved language and the phone', () => {
    applyLanguage('ja', null);
    expect(useLocale.getState()).toEqual({ lang: 'ja', device: 'ja' });
    expect(t.lang).toBe('ja');
    applyLanguage('ja', 'de');
    expect(t.lang).toBe('de');
    expect(t('settings.language')).toBe(flatten(TREES.de)['settings.language']);
    expect(t.or('no.such.key', 'Fallback {n}', { n: 3 })).toBe('Fallback 3');
  });
});

describe('catalogs', () => {
  const en = flatten(TREES.en);
  const enKeys = Object.keys(en).sort();
  const forms = (leaf: Leaf): string[] => (isPlural(leaf) ? [leaf.one, leaf.other] : [leaf]);
  const vars = (leaf: Leaf) => [...new Set(forms(leaf).flatMap(placeholders))].sort();

  it('has English source strings', () => {
    expect(enKeys.length).toBeGreaterThan(0);
    for (const k of enKeys) for (const s of forms(en[k])) expect(s.trim()).not.toBe('');
  });

  it.each(LANGUAGES.filter((l) => l !== 'en'))('%s has the same keys and placeholders', (lang) => {
    const cat = flatten(TREES[lang]);
    expect(Object.keys(cat).sort()).toEqual(enKeys);
    for (const k of enKeys) {
      expect({ key: k, plural: isPlural(cat[k]) }).toEqual({ key: k, plural: isPlural(en[k]) });
      expect({ key: k, vars: vars(cat[k]) }).toEqual({ key: k, vars: vars(en[k]) });
      for (const s of forms(cat[k]))
        expect({ key: k, empty: s.trim() === '' }).toEqual({ key: k, empty: false });
    }
  });
});
