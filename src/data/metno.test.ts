import { METNO, metnoUrl, parseMetno, symbolToCondition, type MetnoCompact } from './metno';

describe('MET Norway weather', () => {
  it('maps symbol codes to game conditions', () => {
    expect(symbolToCondition('clearsky_day')).toBe('clear');
    expect(symbolToCondition('fair_night')).toBe('clear');
    expect(symbolToCondition('partlycloudy_day')).toBe('cloudy');
    expect(symbolToCondition('cloudy')).toBe('cloudy');
    expect(symbolToCondition('fog')).toBe('fog');
    expect(symbolToCondition('lightrainshowers_day')).toBe('rain');
    expect(symbolToCondition('heavyrain')).toBe('rain');
    expect(symbolToCondition('lightsleet')).toBe('snow');
    expect(symbolToCondition('heavysnowshowersandthunder_night')).toBe('storm');
    expect(symbolToCondition(undefined)).toBe('clear');
  });

  it('builds a URL with at most 4 decimals', () => {
    const url = metnoUrl(40.712812, -74.006012);
    expect(url).toBe(`${METNO.endpoint}?lat=40.71&lon=-74.01`);
    expect(url).not.toMatch(/\d\.\d{5}/);
  });

  it('parses hourly then 6-hourly steps into one value per hour', () => {
    const payload: MetnoCompact = {
      properties: {
        timeseries: [
          {
            time: '2026-11-06T09:00:00Z',
            data: {
              instant: { details: { air_temperature: 5 } },
              next_1_hours: {
                summary: { symbol_code: 'cloudy' },
                details: { precipitation_amount: 0 },
              },
            },
          },
          {
            time: '2026-11-06T10:00:00Z',
            data: {
              instant: { details: { air_temperature: 6.04 } },
              next_1_hours: {
                summary: { symbol_code: 'rain' },
                details: { precipitation_amount: 3 },
              },
            },
          },
          {
            time: '2026-11-06T11:00:00Z',
            data: {
              instant: { details: { air_temperature: 7 } },
              next_6_hours: {
                summary: { symbol_code: 'heavyrain' },
                details: { precipitation_amount: 60 },
              },
            },
          },
          {
            time: '2026-11-06T17:00:00Z',
            data: {
              instant: { details: { air_temperature: 3 } },
              next_6_hours: {
                summary: { symbol_code: 'clearsky_night' },
                details: { precipitation_amount: 0 },
              },
            },
          },
        ],
      },
    };
    const hours = parseMetno(payload, new Date('2026-11-06T10:20:00Z'), 10);
    expect(hours[0]).toEqual({
      time: '2026-11-06T10:00:00Z',
      tempC: 6,
      condition: 'rain',
      precipitation: 0.5,
    });
    // 11:00 step covers 11..16 (6 hours), heavy rain capped at 1.
    expect(hours.slice(1, 7).map((h) => h.time.slice(11, 13))).toEqual([
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
    ]);
    expect(hours[1].precipitation).toBe(1);
    expect(hours[7]).toMatchObject({ time: '2026-11-06T17:00:00Z', condition: 'clear', tempC: 3 });
    expect(hours).toHaveLength(10);
  });

  it('rejects empty payloads', () => {
    expect(() => parseMetno({}, new Date())).toThrow(/timeseries/);
  });
});
