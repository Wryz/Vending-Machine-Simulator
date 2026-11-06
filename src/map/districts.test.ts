import {
  buildDistrictIndex,
  districtAt,
  districtName,
  hasDistricts,
  lookUpDistrict,
  type DistrictFile,
} from './districts';

/** Encodes a closed-or-open ring of [lng, lat] degrees like the pipeline does. */
function enc(ring: [number, number][]): number[] {
  const out: number[] = [];
  let px = 0;
  let py = 0;
  for (const [x, y] of ring) {
    const ix = Math.round(x * 1e5);
    const iy = Math.round(y * 1e5);
    out.push(ix - px, iy - py);
    px = ix;
    py = iy;
  }
  return out;
}

const square = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

const file: DistrictFile = {
  v: 1,
  city: 'test',
  d: [
    // A level-8 town with a hole (a lake) and a second, detached island part.
    {
      l: 8,
      n: { '': 'Bigtown', ja: 'ビッグタウン' },
      p: [
        [enc(square(0, 0, 1, 1)), enc(square(0.4, 0.4, 0.6, 0.6))],
        [enc(square(2, 0, 2.2, 0.2))],
      ],
    },
    // A finer level-9 district inside the town.
    { l: 9, n: { '': 'Quartier Nord', en: 'North Quarter' }, p: [[enc(square(0, 0.7, 0.3, 1))]] },
    // A triangle next door.
    {
      l: 8,
      n: { '': 'Otherville' },
      p: [
        [
          enc([
            [1, 0],
            [1.5, 0],
            [1, 1],
          ]),
        ],
      ],
    },
  ],
};

describe('lookUpDistrict (synthetic)', () => {
  const index = buildDistrictIndex(file);

  it('finds the containing polygon', () => {
    expect(lookUpDistrict(index, 0.2, 0.2)).toBe('Bigtown');
    expect(lookUpDistrict(index, 1.1, 0.2)).toBe('Otherville');
  });

  it('respects holes', () => {
    expect(lookUpDistrict(index, 0.5, 0.5)).toBeNull();
  });

  it('handles multipolygons', () => {
    expect(lookUpDistrict(index, 2.1, 0.1)).toBe('Bigtown');
    expect(lookUpDistrict(index, 1.9, 0.1)).toBeNull();
  });

  it('prefers the finer level where districts nest', () => {
    expect(lookUpDistrict(index, 0.1, 0.9)).toBe('North Quarter');
  });

  it('is null outside every polygon (and in the triangle bbox but outside it)', () => {
    expect(lookUpDistrict(index, -1, -1)).toBeNull();
    expect(lookUpDistrict(index, 1.4, 0.9)).toBeNull();
  });

  it('names in the requested language, then English, then local', () => {
    expect(lookUpDistrict(index, 0.2, 0.2, 'ja')).toBe('ビッグタウン');
    expect(lookUpDistrict(index, 0.2, 0.2, 'fr')).toBe('Bigtown');
    expect(lookUpDistrict(index, 0.1, 0.9, 'ko')).toBe('North Quarter');
    expect(districtName({ '': '新宿区', en: 'Shinjuku', zh: '新宿区' }, 'zh-Hans')).toBe('新宿区');
    expect(districtName({ '': 'X', pt: 'Y' }, 'pt-BR')).toBe('Y');
  });
});

describe('districtAt (bundled OSM data)', () => {
  it('has data for all 9 fallback cities', () => {
    for (const id of [
      'new-york',
      'los-angeles',
      'chicago',
      'london',
      'paris',
      'tokyo',
      'seoul',
      'singapore',
      'sydney',
    ]) {
      expect(hasDistricts(id)).toBe(true);
    }
    expect(hasDistricts('nowhere')).toBe(false);
    expect(districtAt('nowhere', 0, 0)).toBeNull();
  });

  it.each([
    ['london', -0.1337, 51.5136, 'Westminster'], // Soho
    ['london', -0.0899, 51.5155, 'City of London'], // Bank
    ['new-york', -73.9855, 40.758, 'Manhattan'], // Times Square
    ['new-york', -73.9903, 40.6928, 'Brooklyn'], // Brooklyn Heights
    ['paris', 2.3464, 48.8462, '5th Arrondissement'], // Panthéon
    ['tokyo', 139.7006, 35.6896, 'Shinjuku'], // Shinjuku station
    ['seoul', 126.977, 37.5796, 'Jongno-gu'], // Gyeongbokgung
    ['chicago', -87.6244, 41.8976, 'Near North Side'], // Water Tower
    ['los-angeles', -118.496, 34.016, 'Santa Monica'], // Third Street Promenade
    ['los-angeles', -118.4004, 34.0736, 'Beverly Hills'], // Rodeo Drive
    ['singapore', 103.8545, 1.2839, 'Downtown Core'], // Raffles Place
    ['sydney', 151.2153, -33.8568, 'City of Sydney'], // Opera House
  ])('%s (%f, %f) → %s', (city, lng, lat, name) => {
    expect(districtAt(city, lng, lat)).toBe(name);
  });

  it('skips the game city itself, in any language', () => {
    const downtownLA: [number, number] = [-118.2437, 34.0522];
    expect(districtAt('los-angeles', ...downtownLA)).toBe('Los Angeles');
    expect(districtAt('los-angeles', ...downtownLA, 'ja', 'Los Angeles')).toBeNull();
    expect(districtAt('los-angeles', -118.4004, 34.0736, 'en', 'Los Angeles')).toBe(
      'Beverly Hills',
    );
  });

  it('localizes', () => {
    expect(districtAt('tokyo', 139.7006, 35.6896, 'ja')).toBe('新宿区');
    expect(districtAt('seoul', 126.977, 37.5796, 'ko')).toBe('종로구');
    expect(districtAt('paris', 2.3464, 48.8462, 'fr')).toBe('5e Arrondissement');
  });
});
