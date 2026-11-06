import { PRESETS } from '@/config/timeOfDay';

import { labelNameExpr, labelNameKeys, pickName } from './labelLanguage';
import { buildBaseLayers } from './style';

describe('label language', () => {
  it('keeps the English chains unchanged', () => {
    expect(labelNameExpr('protomaps')).toEqual(['coalesce', ['get', 'name:en'], ['get', 'name']]);
    expect(labelNameExpr('openmaptiles', { lang: 'en', countryCode: 'US' })).toEqual([
      'coalesce',
      ['get', 'name:en'],
      ['get', 'name:latin'],
      ['get', 'name'],
    ]);
  });

  it('puts the UI language first, then English', () => {
    expect(labelNameKeys('openmaptiles', { lang: 'ja', countryCode: 'US' })).toEqual([
      'name:ja',
      'name:en',
      'name:latin',
    ]);
    expect(labelNameKeys('protomaps', { lang: 'zh-Hans' })).toEqual([
      'name:zh-Hans',
      'name:zh',
      'name:en',
    ]);
    expect(labelNameKeys('protomaps', { lang: 'pt-BR' })[0]).toBe('name:pt');
  });

  it('prefers the local name when the city speaks the UI language', () => {
    expect(labelNameKeys('openmaptiles', { lang: 'ja', countryCode: 'JP' })).toEqual([
      'name:ja',
      'name',
      'name:en',
      'name:latin',
    ]);
    // Japanese UI in Seoul: English beats Hangul.
    const seoul = { name: '홍대', 'name:en': 'Hongdae' };
    expect(pickName(seoul, 'openmaptiles', { lang: 'ja', countryCode: 'KR' })).toBe('Hongdae');
    expect(pickName({ ...seoul, 'name:ja': 'ホンデ' }, 'openmaptiles', { lang: 'ja' })).toBe(
      'ホンデ',
    );
    expect(
      pickName({ name: '新宿', 'name:en': 'Shinjuku' }, 'protomaps', {
        lang: 'ja',
        countryCode: 'JP',
      }),
    ).toBe('新宿');
    expect(pickName({}, 'protomaps')).toBeNull();
  });

  it('keeps layer ids identical across languages and schemas', () => {
    for (const schema of ['protomaps', 'openmaptiles'] as const) {
      const en = buildBaseLayers(PRESETS.day, schema).map((l) => l.id);
      const ja = buildBaseLayers(PRESETS.day, schema, undefined, { lang: 'ja', countryCode: 'JP' });
      expect(ja.map((l) => l.id)).toEqual(en);
      const label = ja.find((l) => l.id === 'label-districts');
      expect(JSON.stringify(label)).toContain('name:ja');
    }
  });
});
