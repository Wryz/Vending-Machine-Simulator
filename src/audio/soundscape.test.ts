import {
  LAYER_NAMES,
  SPICE_NAMES,
  darkness,
  mixDelta,
  musicMoodFor,
  nearness,
  pickSpice,
  soundscapeMix,
  type SoundscapeInput,
  type SoundscapeMix,
  type TodWeights,
} from './soundscape';

const DAY: TodWeights = { night: 0, dawn: 0, day: 1, dusk: 0 };
const NIGHT: TodWeights = { night: 1, dawn: 0, day: 0, dusk: 0 };
const DAWN: TodWeights = { night: 0, dawn: 1, day: 0, dusk: 0 };

const base = (over: Partial<SoundscapeInput> = {}): SoundscapeInput => ({
  zoom: 17.5,
  tod: DAY,
  weather: { condition: 'clear', tempC: 18 },
  traffic: 0.7,
  scene: 'map',
  ...over,
});

const totalSpice = (m: SoundscapeMix) => SPICE_NAMES.reduce((s, k) => s + m.spiceRatePerMin[k], 0);

/** mulberry32, for deterministic tests. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('soundscapeMix', () => {
  it('keeps every value in range, even for odd input', () => {
    const odd: SoundscapeInput[] = [
      base({ zoom: Number.NaN }),
      base({ traffic: 5 }),
      base({ traffic: -1 }),
      base({ tod: { night: 0, dawn: 0, day: 0, dusk: 0 } }),
      base({ tod: { night: 3, dawn: 0, day: 3, dusk: 0 } }),
      base({ weather: null }),
      base({ weather: { condition: 'storm', tempC: Number.NaN } }),
      base({ zoom: 22, scene: 'closeup' }),
    ];
    for (const input of odd) {
      const m = soundscapeMix(input);
      for (const k of LAYER_NAMES) {
        expect(Number.isFinite(m.layers[k])).toBe(true);
        expect(m.layers[k]).toBeGreaterThanOrEqual(0);
        expect(m.layers[k]).toBeLessThanOrEqual(1);
      }
      for (const k of SPICE_NAMES) {
        expect(Number.isFinite(m.spiceRatePerMin[k])).toBe(true);
        expect(m.spiceRatePerMin[k]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is mostly a soft city bed far out, with no spice', () => {
    const m = soundscapeMix(base({ zoom: 12 }));
    expect(m.layers.cityDay).toBeGreaterThan(0.7);
    expect(m.layers.cityNight).toBe(0);
    expect(m.layers.crowd).toBe(0);
    expect(m.layers.birds).toBe(0);
    expect(m.layers.traffic).toBeLessThan(0.1);
    expect(m.layers.hum).toBe(0);
    expect(totalSpice(m)).toBe(0);
  });

  it('brings in traffic, crowd and birds as you zoom in, and spice appears', () => {
    let prev = soundscapeMix(base({ zoom: 14 }));
    for (let z = 14.5; z <= 18; z += 0.5) {
      const m = soundscapeMix(base({ zoom: z }));
      for (const k of ['traffic', 'crowd', 'birds'] as const) {
        expect(m.layers[k]).toBeGreaterThanOrEqual(prev.layers[k]);
      }
      expect(totalSpice(m)).toBeGreaterThanOrEqual(totalSpice(prev));
      expect(m.layers.cityDay).toBeLessThanOrEqual(prev.layers.cityDay);
      prev = m;
    }
    const close = soundscapeMix(base({ zoom: 18 }));
    expect(close.layers.traffic).toBeGreaterThan(0.4);
    expect(close.layers.crowd).toBeGreaterThan(0.3);
    expect(close.layers.birds).toBeGreaterThan(0.3);
    expect(close.spiceRatePerMin.carPass).toBeGreaterThan(1);
    expect(close.spiceRatePerMin.birdChirp).toBeGreaterThan(0);
  });

  it('puts birds at dawn and day, crickets on warm nights', () => {
    const day = soundscapeMix(base());
    const dawn = soundscapeMix(base({ tod: DAWN }));
    const night = soundscapeMix(base({ tod: NIGHT }));
    expect(dawn.layers.birds).toBeGreaterThan(day.layers.birds);
    expect(day.layers.birds).toBeGreaterThan(day.layers.crickets);
    expect(day.layers.crickets).toBe(0);
    expect(night.layers.birds).toBe(0);
    expect(night.layers.crickets).toBeGreaterThan(0.2);
    expect(night.layers.cityNight).toBeGreaterThan(0);
    expect(night.layers.cityDay).toBe(0);
    const cold = soundscapeMix(base({ tod: NIGHT, weather: { condition: 'clear', tempC: 2 } }));
    expect(cold.layers.crickets).toBe(0);
    expect(night.spiceRatePerMin.sirenDistant).toBeGreaterThan(0);
    expect(day.spiceRatePerMin.sirenDistant).toBe(0);
  });

  it('scales the crowd with how busy the area is and with daytime', () => {
    const quiet = soundscapeMix(base({ traffic: 0 }));
    const busy = soundscapeMix(base({ traffic: 1 }));
    const night = soundscapeMix(base({ traffic: 1, tod: NIGHT }));
    expect(busy.layers.crowd).toBeGreaterThan(quiet.layers.crowd * 2);
    expect(night.layers.crowd).toBeLessThan(busy.layers.crowd * 0.3);
    expect(busy.layers.traffic).toBeGreaterThan(quiet.layers.traffic);
  });

  it('follows the weather: rain and wind, rain quiets birds and the crowd', () => {
    const clear = soundscapeMix(base());
    const rain = soundscapeMix(base({ weather: { condition: 'rain', tempC: 12 } }));
    const storm = soundscapeMix(base({ weather: { condition: 'storm', tempC: 12 } }));
    expect(clear.layers.rain).toBe(0);
    expect(rain.layers.rain).toBeGreaterThan(0.5);
    expect(storm.layers.rain).toBeGreaterThanOrEqual(rain.layers.rain);
    expect(storm.layers.wind).toBeGreaterThan(clear.layers.wind);
    expect(rain.layers.birds).toBeLessThan(clear.layers.birds * 0.5);
    expect(rain.layers.crowd).toBeLessThan(clear.layers.crowd);
    expect(rain.layers.crowd).toBeGreaterThan(0);
    const snow = soundscapeMix(base({ weather: { condition: 'snow', tempC: -2 } }));
    expect(snow.layers.rain).toBe(0);
    expect(snow.layers.wind).toBeGreaterThan(clear.layers.wind);
  });

  it('close-up: hum up, street present but lower', () => {
    const street = soundscapeMix(base({ zoom: 18 }));
    const close = soundscapeMix(base({ zoom: 18, scene: 'closeup' }));
    expect(close.layers.hum).toBe(1);
    expect(street.layers.hum).toBe(0);
    for (const k of ['traffic', 'crowd'] as const) {
      expect(close.layers[k]).toBeGreaterThan(0);
      expect(close.layers[k]).toBeLessThan(street.layers[k]);
    }
    // The close-up is street level even if the map camera was far out.
    expect(soundscapeMix(base({ zoom: 10, scene: 'closeup' })).layers.traffic).toBeGreaterThan(0.2);
  });

  it('menu: beds only', () => {
    const m = soundscapeMix(base({ scene: 'menu', weather: { condition: 'storm', tempC: 20 } }));
    for (const k of LAYER_NAMES) {
      if (k === 'cityDay' || k === 'cityNight') continue;
      expect(m.layers[k]).toBe(0);
    }
    expect(m.layers.cityDay).toBeGreaterThan(0);
    expect(totalSpice(m)).toBe(0);
  });

  it('crossfades the city beds through twilight', () => {
    const dusk = soundscapeMix(base({ zoom: 12, tod: { night: 0, dawn: 0, day: 0.5, dusk: 0.5 } }));
    expect(dusk.layers.cityDay).toBeGreaterThan(0);
    expect(dusk.layers.cityNight).toBeGreaterThan(0);
    expect(darkness(DAY)).toBe(0);
    expect(darkness(NIGHT)).toBe(1);
  });
});

describe('nearness / musicMoodFor / mixDelta', () => {
  it('nearness ramps between the zoom thresholds', () => {
    expect(nearness(10)).toBe(0);
    expect(nearness(14)).toBe(0);
    expect(nearness(16)).toBeGreaterThan(0.3);
    expect(nearness(16)).toBeLessThan(0.7);
    expect(nearness(18)).toBe(1);
  });

  it('picks the night loop for evening and night', () => {
    expect(musicMoodFor(DAY)).toBe('day');
    expect(musicMoodFor(DAWN)).toBe('day');
    expect(musicMoodFor(NIGHT)).toBe('night');
    expect(musicMoodFor({ night: 0.2, dawn: 0, day: 0, dusk: 0.8 })).toBe('night');
    expect(musicMoodFor({ night: 0, dawn: 0, day: 0.7, dusk: 0.3 })).toBe('day');
  });

  it('mixDelta is 0 for identical input and grows with change', () => {
    const a = soundscapeMix(base());
    expect(mixDelta(a, soundscapeMix(base()))).toBe(0);
    expect(mixDelta(a, soundscapeMix(base({ zoom: 12 })))).toBeGreaterThan(0.2);
  });
});

describe('pickSpice', () => {
  const close = soundscapeMix(base({ zoom: 18 }));

  it('never fires when nothing can play, and draws no numbers', () => {
    let draws = 0;
    const rng = () => {
      draws++;
      return 0;
    };
    expect(pickSpice(soundscapeMix(base({ zoom: 12 })), rng, 1)).toBeNull();
    expect(pickSpice(soundscapeMix(base({ scene: 'menu' })), rng, 1)).toBeNull();
    expect(pickSpice(close, rng, 0)).toBeNull();
    expect(draws).toBe(0);
  });

  it('is deterministic for a given rng', () => {
    const run = (seed: number) => {
      const rng = seeded(seed);
      return Array.from({ length: 300 }, () => pickSpice(close, rng, 1));
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it('fires at about the mixed rate, in proportion to each rate', () => {
    const rng = seeded(7);
    const seconds = 20_000;
    const counts: Record<string, number> = {};
    let n = 0;
    for (let s = 0; s < seconds; s++) {
      const k = pickSpice(close, rng, 1);
      if (k) {
        n++;
        counts[k] = (counts[k] ?? 0) + 1;
      }
    }
    const total = totalSpice(close);
    const expected = seconds * (1 - Math.exp(-total / 60));
    expect(Math.abs(n - expected) / expected).toBeLessThan(0.08);
    const carShare = (counts.carPass ?? 0) / n;
    expect(Math.abs(carShare - close.spiceRatePerMin.carPass / total)).toBeLessThan(0.05);
    for (const k of SPICE_NAMES) {
      if (close.spiceRatePerMin[k] === 0) expect(counts[k] ?? 0).toBe(0);
    }
  });

  it('only returns sounds with a positive rate', () => {
    const m: SoundscapeMix = {
      layers: soundscapeMix(base()).layers,
      spiceRatePerMin: {
        carPass: 0,
        carPass2: 0,
        hornDistant: 0,
        birdChirp: 0,
        birdChirp2: 0,
        footsteps: 3,
        sirenDistant: 0,
      },
    };
    expect(pickSpice(m, () => 0.999999, 1e6)).toBe('footsteps');
    expect(pickSpice(m, () => 0, 1)).toBe('footsteps');
  });
});
