import { gunzipSync } from 'node:zlib';
import { cellToLatLng, cellToParent, gridDisk, latLngToCell } from 'h3-js';
import { PMTiles } from 'pmtiles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { AreaCheckResponse, WeatherResponse } from '../../../src/data/types';
import { PLACE_CATEGORIES } from '../../../src/data/types';
import type { RegionMeta } from '../src/meta';
import { roundCoord } from '../src/geo';
import { parseRange } from '../src/tiles';
import { wmoToCondition } from '../src/weather';
import { buildPmtiles, FakeBucket, FakeCache, gz, makeCtx, makeEnv } from './fakes';

const BASE = 'https://api.test';

async function call(env: ReturnType<typeof makeEnv>, path: string, init?: RequestInit) {
  const ctx = makeCtx();
  const res = await worker.fetch(new Request(BASE + path, init), env, ctx);
  await Promise.all(ctx.pending);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
describe('routing, CORS, health', () => {
  it('GET /health', async () => {
    const res = await call(makeEnv(), '/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('unknown routes are 404 with CORS', async () => {
    const res = await call(makeEnv(), '/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('answers CORS preflight, allowing Range', async () => {
    const res = await call(makeEnv(), '/pmtiles/x.pmtiles', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Range');
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('Content-Range');
  });

  it('rejects non-GET methods', async () => {
    const res = await call(makeEnv(), '/health', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// ---------------------------------------------------------------------------
describe('/area/check', () => {
  // Berlin: far (>25 km) from all 9 fallback cities.
  const LAT = 52.52;
  const LNG = 13.4;
  const res5 = latLngToCell(LAT, LNG, 5);

  function regionMeta(opts: {
    namedPerCell: number;
    cats: number;
    popPerCell: number;
  }): RegionMeta {
    const cells = gridDisk(latLngToCell(LAT, LNG, 9), 10)
      .filter((h) => cellToParent(h, 5) === res5)
      .map((h): [string, number, number, number] => [
        h,
        opts.namedPerCell,
        (1 << opts.cats) - 1,
        opts.popPerCell,
      ]);
    return {
      schemaVersion: 1,
      res5,
      name: 'Test Region',
      generatedAt: '2026-11-05T00:00:00Z',
      totals: { cells: cells.length, namedPlaces: 0, categories: opts.cats, pop: 0 },
      cells,
    };
  }

  function envWith(meta: RegionMeta | null) {
    const b = new FakeBucket().put(`cells/${res5}.json.gz`, gz('{}'));
    if (meta) b.put(`cells/${res5}.meta.json`, JSON.stringify(meta));
    return makeEnv(b);
  }

  const check = async (
    env: ReturnType<typeof makeEnv>,
    lat: number | string,
    lng: number | string,
  ) => {
    const res = await call(env, `/area/check?lat=${lat}&lng=${lng}`);
    return { status: res.status, body: (await res.json()) as AreaCheckResponse, res };
  };

  it('plays a fallback city within 25 km', async () => {
    const { status, body } = await check(makeEnv(), 35.68, 139.77); // Tokyo Station
    expect(status).toBe(200);
    expect(body).toEqual({
      playable: true,
      cityName: 'Tokyo',
      reason: 'ok',
      centroid: { lat: 35.6896, lng: 139.7006 },
      cityId: 'tokyo',
    });
  });

  it('reports region_not_computed and logs only the res5 counter', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { body } = await check(makeEnv(), '52.520481', '13.404954');
    expect(body.playable).toBe(false);
    expect(body.reason).toBe('region_not_computed');
    expect(body.res5).toBe(res5);
    expect(log).toHaveBeenCalledWith(`area_check_miss res5=${res5}`);
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).not.toMatch(/52\.5|13\.4/);
  });

  it('rounds coordinates to 2 decimals before any lookup', async () => {
    expect(roundCoord(52.520481)).toBe(52.52);
    expect(roundCoord(-0.004)).toBe(0);
    expect(Object.is(roundCoord(-0.004), -0)).toBe(false);
    // Find a precise point whose raw res5 differs from its rounded res5.
    let found: { lat: number; lng: number } | null = null;
    for (let i = 0; i < 4000 && !found; i++) {
      const lat = 45 + (i % 200) * 0.0137 + 0.0049;
      const lng = 20 + Math.floor(i / 200) * 0.0311 + 0.0049;
      if (latLngToCell(lat, lng, 5) !== latLngToCell(roundCoord(lat), roundCoord(lng), 5))
        found = { lat, lng };
    }
    expect(found).not.toBeNull();
    const { lat, lng } = found!;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const env = makeEnv();
    const { body } = await check(env, lat, lng);
    expect(body.res5).toBe(latLngToCell(roundCoord(lat), roundCoord(lng), 5));
    expect(env.DATA.calls[0]?.key).toBe(`cells/${body.res5}.json.gz`);
  });

  it('is playable when the §6.2 thresholds are met', async () => {
    const { body } = await check(
      envWith(regionMeta({ namedPerCell: 5, cats: 8, popPerCell: 1500 })),
      LAT,
      LNG,
    );
    expect(body).toMatchObject({ playable: true, reason: 'ok', res5, cityName: 'Test Region' });
    const [cLat, cLng] = cellToLatLng(res5);
    expect(body.centroid).toEqual({ lat: roundCoord(cLat), lng: roundCoord(cLng) });
  });

  it('not_enough_places when too few named places', async () => {
    const { body } = await check(
      envWith(regionMeta({ namedPerCell: 1, cats: 8, popPerCell: 1500 })),
      LAT,
      LNG,
    );
    expect(body).toMatchObject({ playable: false, reason: 'not_enough_places' });
  });

  it('not_enough_places when too few categories', async () => {
    const { body } = await check(
      envWith(regionMeta({ namedPerCell: 5, cats: 5, popPerCell: 1500 })),
      LAT,
      LNG,
    );
    expect(body).toMatchObject({ playable: false, reason: 'not_enough_places' });
  });

  it('not_enough_population when residents < 20k within 2 km', async () => {
    const { body } = await check(
      envWith(regionMeta({ namedPerCell: 5, cats: 8, popPerCell: 10 })),
      LAT,
      LNG,
    );
    expect(body).toMatchObject({ playable: false, reason: 'not_enough_population' });
  });

  it('a computed region without a summary is playable', async () => {
    const { body } = await check(envWith(null), LAT, LNG);
    expect(body).toMatchObject({ playable: true, reason: 'ok', res5 });
  });

  it.each([
    ['', ''],
    ['abc', '1'],
    ['91', '0'],
    ['0', '-181'],
    ['NaN', '0'],
    ['Infinity', '0'],
  ])('400 bad_request for lat=%s lng=%s', async (lat, lng) => {
    const { status, body } = await check(makeEnv(), lat, lng);
    expect(status).toBe(400);
    expect(body).toEqual({
      playable: false,
      cityName: null,
      reason: 'bad_request',
      centroid: null,
    });
  });

  it('category bitmask covers every PlaceCategory', () => {
    expect(PLACE_CATEGORIES.length).toBeLessThanOrEqual(31);
  });
});

// ---------------------------------------------------------------------------
describe('packs', () => {
  const res5 = latLngToCell(52.52, 13.4, 5);
  const packJson = JSON.stringify({ schemaVersion: 1, name: 'x', cells: [] });

  it('GET /cells/{res5}.bin serves raw gzip bytes (client gunzips)', async () => {
    const env = makeEnv(new FakeBucket().put(`cells/${res5}.json.gz`, gz(packJson)));
    const res = await call(env, `/cells/${res5}.bin`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Encoding')).toBeNull();
    expect(res.headers.get('Cache-Control')).toContain('max-age=86400');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(gunzipSync(bytes).toString()).toBe(packJson);
  });

  it('supports If-None-Match → 304', async () => {
    const env = makeEnv(new FakeBucket().put(`cells/${res5}.json.gz`, gz(packJson)));
    const etag = (await call(env, `/cells/${res5}.bin`)).headers.get('ETag')!;
    const res = await call(env, `/cells/${res5}.bin`, { headers: { 'If-None-Match': etag } });
    expect(res.status).toBe(304);
  });

  it('404 for a missing region, 400 for a non-res5 id', async () => {
    expect((await call(makeEnv(), `/cells/${res5}.bin`)).status).toBe(404);
    const res9 = latLngToCell(52.52, 13.4, 9);
    expect((await call(makeEnv(), `/cells/${res9}.bin`)).status).toBe(400);
    expect((await call(makeEnv(), `/cells/8f1234567890abc.bin`)).status).toBe(400);
  });

  it('GET /city/{cityId}/pack', async () => {
    const env = makeEnv(new FakeBucket().put('city/paris.json.gz', gz(packJson)));
    const res = await call(env, '/city/paris/pack');
    expect(res.status).toBe(200);
    expect(gunzipSync(new Uint8Array(await res.arrayBuffer())).toString()).toBe(packJson);
    expect((await call(env, '/city/london/pack')).status).toBe(404); // known, not uploaded
    expect((await call(env, '/city/atlantis/pack')).status).toBe(404); // unknown
  });
});

// ---------------------------------------------------------------------------
describe('/weather', () => {
  const NOW = new Date('2026-11-05T13:20:00Z');

  function openMeteoPayload() {
    const time: string[] = [];
    const temperature_2m: number[] = [];
    const precipitation: number[] = [];
    const weather_code: number[] = [];
    const codes = [0, 2, 45, 61, 71, 95];
    for (let i = 0; i < 72; i++) {
      const d = new Date(Date.UTC(2026, 10, 5, i));
      time.push(d.toISOString().slice(0, 16));
      temperature_2m.push(10 + i / 10);
      precipitation.push(i % 6 === 3 ? 2.5 : i % 6 === 5 ? 12 : 0);
      weather_code.push(codes[i % 6]);
    }
    return { hourly: { time, temperature_2m, precipitation, weather_code } };
  }

  function metnoPayload() {
    const timeseries = [];
    const symbols = ['cloudy', 'clearsky_day', 'lightrain', 'heavysnow', 'rainandthunder'];
    for (let i = 0; i < 72; i++) {
      timeseries.push({
        time: new Date(Date.UTC(2026, 10, 5, i)).toISOString().replace('.000Z', 'Z'),
        data: {
          instant: { details: { air_temperature: 8 + i / 10 } },
          next_1_hours: {
            summary: { symbol_code: symbols[i % 5] },
            details: { precipitation_amount: i % 5 === 2 ? 3 : 0 },
          },
        },
      });
    }
    return { properties: { timeseries } };
  }

  function stubFetch(payload: unknown = metnoPayload(), status = 200) {
    const fn = vi.fn(async (_url: string | URL | Request) => Response.json(payload, { status }));
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  it('uses MET Norway by default (free, no key) with an identifying User-Agent', async () => {
    const fetchFn = stubFetch();
    const res5 = latLngToCell(52.52, 13.4, 5);
    const res = await call(makeEnv(), `/weather?cell=${res5}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as WeatherResponse;
    expect(body.source).toContain('MET Norway');
    expect(body.hours).toHaveLength(48);
    expect(body.hours[0]).toEqual({
      time: '2026-11-05T13:00:00Z',
      tempC: 9.3,
      condition: 'snow',
      precipitation: 0,
    });
    expect(body.hours[1]).toMatchObject({ condition: 'storm' });
    expect(body.hours[4]).toMatchObject({ condition: 'rain', precipitation: 0.5 });
    const [req, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const url = new URL(String(req));
    expect(url.host).toBe('api.met.no');
    expect(url.searchParams.get('lat')).toMatch(/^-?\d+(\.\d{1,4})?$/);
    expect(new Headers(init.headers).get('User-Agent')).toMatch(/Coinline/);
  });

  it('proxies Open-Meteo (commercial key) for a res5 cell and maps the next 48 h', async () => {
    const fetchFn = stubFetch(openMeteoPayload());
    const res5 = latLngToCell(52.52, 13.4, 5);
    const res = await call(
      makeEnv(undefined, { OPEN_METEO_API_KEY: 'k' }),
      `/weather?cell=${res5}`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as WeatherResponse;
    expect(body.region).toBe(`cell:${res5}`);
    expect(body.hours).toHaveLength(48);
    expect(body.hours[0]).toEqual({
      time: '2026-11-05T13:00:00Z',
      tempC: 11.3,
      condition: 'cloudy',
      precipitation: 0,
    });
    expect(body.hours[2]).toMatchObject({ condition: 'rain', precipitation: 0.5 });
    expect(body.hours[4]).toMatchObject({ condition: 'storm', precipitation: 1 });
    expect(body.hours[47].time).toBe('2026-11-07T12:00:00Z');

    const url = new URL(String(fetchFn.mock.calls[0][0]));
    expect(url.host).toBe('customer-api.open-meteo.com');
    expect(url.searchParams.get('hourly')).toBe('temperature_2m,precipitation,weather_code');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    const [cLat, cLng] = cellToLatLng(res5);
    expect(Number(url.searchParams.get('latitude'))).toBe(roundCoord(cLat));
    expect(Number(url.searchParams.get('longitude'))).toBe(roundCoord(cLng));
  });

  it('accepts ?city= and uses the commercial endpoint when a key is set', async () => {
    const fetchFn = stubFetch(openMeteoPayload());
    const res = await call(
      makeEnv(undefined, { OPEN_METEO_API_KEY: 'k123' }),
      '/weather?city=tokyo',
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as WeatherResponse).region).toBe('city:tokyo');
    const url = new URL(String(fetchFn.mock.calls[0][0]));
    expect(url.host).toBe('customer-api.open-meteo.com');
    expect(url.searchParams.get('apikey')).toBe('k123');
  });

  it('caches per region for 1 h via the Cache API', async () => {
    const cache = new FakeCache();
    vi.stubGlobal('caches', { default: cache });
    const fetchFn = stubFetch();
    const a = await call(makeEnv(), '/weather?city=paris');
    const b = await call(makeEnv(), '/weather?city=paris&x=1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(await b.json()).toEqual(await a.json());
    expect(b.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const stored = [...cache.store.values()][0];
    expect(stored.headers.get('Cache-Control')).toContain('s-maxage=3600');
    await call(makeEnv(), '/weather?city=london');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('400 for missing/invalid region, 502 on upstream failure', async () => {
    stubFetch({}, 500);
    expect((await call(makeEnv(), '/weather')).status).toBe(400);
    expect((await call(makeEnv(), '/weather?city=atlantis')).status).toBe(400);
    expect((await call(makeEnv(), `/weather?cell=${latLngToCell(1, 1, 9)}`)).status).toBe(400);
    expect((await call(makeEnv(), '/weather?cell=zzz')).status).toBe(400);
    expect((await call(makeEnv(), '/weather?city=seoul')).status).toBe(502);
    stubFetch({ properties: {} });
    expect((await call(makeEnv(), '/weather?city=seoul')).status).toBe(502);
  });

  it('maps WMO codes', () => {
    expect([0, 1, 2, 3, 45, 48, 51, 63, 66, 80, 71, 77, 85, 95, 99].map(wmoToCondition)).toEqual([
      'clear',
      'clear',
      'cloudy',
      'cloudy',
      'fog',
      'fog',
      'rain',
      'rain',
      'rain',
      'rain',
      'snow',
      'snow',
      'snow',
      'storm',
      'storm',
    ]);
  });
});

// ---------------------------------------------------------------------------
describe('tiles', () => {
  const t0 = new TextEncoder().encode('tile-z0');
  const t1 = new TextEncoder().encode('tile-z1-x1-y0');
  const archive = buildPmtiles([
    { z: 0, x: 0, y: 0, data: t0 },
    { z: 1, x: 1, y: 0, data: t1 },
  ]);
  const env = () => makeEnv(new FakeBucket().put('tiles/basemap.pmtiles', archive));

  it('serves /tiles/{name}/{z}/{x}/{y}.mvt out of the archive in R2', async () => {
    const e = env();
    const res = await call(e, '/tiles/basemap/1/1/0.mvt');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.mapbox-vector-tile');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(t1);
    expect(e.DATA.calls.some((c) => c.op === 'get' && c.range)).toBe(true);
  });

  it('decompresses gzip tiles', async () => {
    const e = makeEnv(
      new FakeBucket().put(
        'tiles/gz.pmtiles',
        buildPmtiles([{ z: 0, x: 0, y: 0, data: t0 }], true),
      ),
    );
    const res = await call(e, '/tiles/gz/0/0/0.mvt');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(t0);
  });

  it('204 for an empty in-range tile, 404 outside zooms or missing archive, 400 bad coords', async () => {
    expect((await call(env(), '/tiles/basemap/1/0/0.mvt')).status).toBe(204);
    expect((await call(env(), '/tiles/basemap/5/0/0.mvt')).status).toBe(404);
    expect((await call(env(), '/tiles/missing/0/0/0.mvt')).status).toBe(404);
    expect((await call(env(), '/tiles/basemap/1/2/0.mvt')).status).toBe(400);
    expect((await call(env(), '/tiles/..%2Fsecret/0/0/0.mvt')).status).toBe(400);
  });

  it('serves TileJSON', async () => {
    const res = await call(env(), '/tiles/basemap.json');
    expect(res.status).toBe(200);
    const tj = (await res.json()) as { tiles: string[]; maxzoom: number };
    expect(tj.tiles[0]).toBe(`${BASE}/tiles/basemap/{z}/{x}/{y}.mvt`);
    expect(tj.maxzoom).toBe(1);
  });

  describe('/pmtiles/{name}.pmtiles (HTTP Range)', () => {
    const get = (range?: string, method = 'GET') =>
      call(env(), '/pmtiles/basemap.pmtiles', { method, headers: range ? { Range: range } : {} });

    it('200 full body without Range', async () => {
      const res = await get();
      expect(res.status).toBe(200);
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
      expect(res.headers.get('Content-Length')).toBe(String(archive.byteLength));
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(archive);
    });

    it('206 for bytes=a-b', async () => {
      const res = await get('bytes=0-126');
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe(`bytes 0-126/${archive.byteLength}`);
      expect(res.headers.get('Content-Length')).toBe('127');
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(archive.slice(0, 127));
    });

    it('206 for open-ended and suffix ranges; end is clamped', async () => {
      const n = archive.byteLength;
      let res = await get(`bytes=${n - 5}-`);
      expect(res.status).toBe(206);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(archive.slice(n - 5));
      res = await get('bytes=-7');
      expect(res.headers.get('Content-Range')).toBe(`bytes ${n - 7}-${n - 1}/${n}`);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(archive.slice(n - 7));
      res = await get('bytes=0-99999999');
      expect(res.headers.get('Content-Range')).toBe(`bytes 0-${n - 1}/${n}`);
    });

    it('416 when unsatisfiable; multi-range falls back to 200', async () => {
      const res = await get(`bytes=${archive.byteLength}-`);
      expect(res.status).toBe(416);
      expect(res.headers.get('Content-Range')).toBe(`bytes */${archive.byteLength}`);
      expect((await get('bytes=0-1,5-6')).status).toBe(200);
    });

    it('HEAD returns headers only', async () => {
      const res = await get('bytes=0-9', 'HEAD');
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Length')).toBe('10');
      expect(res.body).toBeNull();
    });

    it('404 for a missing archive', async () => {
      expect((await call(env(), '/pmtiles/nope.pmtiles')).status).toBe(404);
    });

    it('works end-to-end with the pmtiles FetchSource client', async () => {
      const e = env();
      vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
        worker.fetch(new Request(input, init), e, makeCtx()),
      );
      const pm = new PMTiles(`${BASE}/pmtiles/basemap.pmtiles`);
      const t = await pm.getZxy(0, 0, 0);
      expect(new Uint8Array(t!.data)).toEqual(t0);
    });
  });

  it('parseRange edge cases', () => {
    expect(parseRange(null, 10)).toBeNull();
    expect(parseRange('items=0-1', 10)).toBeNull();
    expect(parseRange('bytes=-', 10)).toBeNull();
    expect(parseRange('bytes=-0', 10)).toBe('unsatisfiable');
    expect(parseRange('bytes=-20', 10)).toEqual({ offset: 0, length: 10 });
    expect(parseRange('bytes=5-2', 10)).toBe('unsatisfiable');
    expect(parseRange('bytes=2-4', 10)).toEqual({ offset: 2, length: 3 });
  });
});
