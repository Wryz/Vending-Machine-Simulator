import { syntheticWeather, WeatherBook } from './weather';

describe('synthetic weather', () => {
  it('is deterministic and seasonal', () => {
    const t = Date.UTC(2026, 6, 15, 19);
    expect(syntheticWeather('new-york', t, 15, 7)).toEqual(syntheticWeather('new-york', t, 15, 7));
    const summer = syntheticWeather('new-york', t, 15, 7).tempC;
    const winter = syntheticWeather('new-york', Date.UTC(2026, 0, 15, 19), 15, 1).tempC;
    expect(summer).toBeGreaterThan(winter + 10);
    expect(syntheticWeather('singapore', t, 15, 7).tempC).toBeGreaterThan(25);
  });
  it('has rain sometimes in London', () => {
    let rainy = 0;
    for (let i = 0; i < 400; i++) {
      const w = syntheticWeather('london', Date.UTC(2026, 10, 1) + i * 6 * 3_600_000, 12, 11);
      if (w.condition === 'rain' || w.condition === 'storm') rainy++;
    }
    expect(rainy).toBeGreaterThan(20);
    expect(rainy).toBeLessThan(150);
  });
  it('WeatherBook looks up by hour', () => {
    const b = new WeatherBook();
    b.load([{ time: '2026-06-10T16:00:00Z', tempC: 30, condition: 'clear', precipitation: 0 }]);
    expect(b.at(Date.UTC(2026, 5, 10, 16, 40))?.tempC).toBe(30);
    expect(b.at(Date.UTC(2026, 5, 10, 18))).toBeNull();
    expect(b.live).toBe(true);
    expect(b.coverageUntil()).toBe(Date.UTC(2026, 5, 10, 17));
  });
});
