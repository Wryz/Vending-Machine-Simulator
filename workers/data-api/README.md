# coinline-data-api

Stateless, read-only Cloudflare Worker in front of R2 (SPEC §6.6). No accounts, no saves, no
location storage. Every route is `GET` (plus `HEAD`/`OPTIONS`), returns CORS `*`, and is safe to
cache.

```sh
npm install
npm test          # vitest: calls the handler's fetch() with a fake R2 bucket, no network
npm run typecheck
npm run dev       # wrangler dev (local R2 via --local uploads, see below)
npm run deploy
```

## Routes

| Route | Returns |
|---|---|
| `GET /health` | `{ ok: true, service, time }` |
| `GET /area/check?lat&lng` | `AreaCheckResponse` (`src/data/types.ts`) |
| `GET /cells/{res5}.bin` | region pack: raw **gzip** bytes of a `RegionPack` JSON |
| `GET /city/{cityId}/pack` | fallback city pack: raw **gzip** bytes of a `RegionPack` JSON |
| `GET /weather?cell={res5}` or `?city={cityId}` | `WeatherResponse`: next 48 h, hourly |
| `GET /pmtiles/{name}.pmtiles` | raw PMTiles archive with HTTP Range (`206`, `416`, `HEAD`) for native `pmtiles://https://…/pmtiles/{name}.pmtiles` |
| `GET /tiles/{name}/{z}/{x}/{y}.mvt` | one tile read out of `tiles/{name}.pmtiles` (fallback if native `pmtiles://` is unavailable); `204` = empty tile |
| `GET /tiles/{name}.json` | TileJSON for the route above |

### Pack format (`/cells`, `/city`)

Packs are stored in R2 as `*.json.gz` and served **as the gzip bytes themselves**:
`Content-Type: application/octet-stream`, no `Content-Encoding`. This stops any HTTP layer
(fetch, CDN) from transparently decompressing them, so the app can cache the exact bytes on
device and gunzip them itself, the same way it reads the bundled `assets/cities/*.json.gz`.
Responses carry an `ETag`; send `If-None-Match` to get `304`.

### `/area/check` logic

1. `lat`/`lng` must be finite and in range, otherwise `400` with `reason: "bad_request"`.
2. Both are **rounded to 2 decimals (~1 km) before any use**. They are never logged.
3. Within 25 km of one of the 9 fallback cities (`src/config/cities.ts`) → playable, `cityId` set.
4. Otherwise take the H3 res-5 parent. If `cells/{res5}.json.gz` is not in R2 →
   `region_not_computed`, and the Worker logs `area_check_miss res5=<res5>`. The res-5 cell
   covers about 250 km², so the log holds counts per coarse region only. Use Workers Logs, or swap
   in Workers Analytics Engine later, to rank the next pipeline batch (SPEC §6.5).
5. If the region is computed, the Worker reads `cells/{res5}.meta.json` (plus the metas of
   neighbouring res-5 regions that the 2 km disk touches). It then sums named places, category
   bitmasks and residents over the res-9 cells within 2 km and applies SPEC §6.2: at least 150
   named places in at least 6 categories, then at least 20,000 residents. The response is
   `not_enough_places`, `not_enough_population` or `ok`. A computed region without a meta file is
   treated as playable.

Thresholds live in `src/config.ts`. The meta format is `RegionMeta` in `src/meta.ts`; the
pipeline writes it.

### Weather

Default provider: **MET Norway Locationforecast 2.0** (`api.met.no`). It is free, global and
hourly, needs no API key, and its data is CC BY 4.0 / NLOD 2.0, so **commercial use is allowed**
with credit ("Weather: MET Norway"). The parser is shared with the app (`src/data/metno.ts`). MET's
terms, all handled here:

- an identifying `User-Agent` with a contact (`Coinline/1.0 (+https://github.com/…)`; override with
  the `WEATHER_USER_AGENT` var);
- at most 4 coordinate decimals (we send 2: city or res-5 centers, never a player's position);
- cache responses (edge Cache API, 1 h per region `city:<id>` / `cell:<res5>`, so a city costs at
  most 24 upstream calls a day);
- stay under 20 requests per second in total.

MET returns hourly steps for about 2.5 days, then 6-hourly steps; 6-hourly steps are expanded to
hourly values. Symbol codes map to `clear | cloudy | fog | rain | snow | storm`, and intensity is
`min(1, mm/h ÷ 6)`.

Optional: set a paid Open-Meteo key (`npx wrangler secret put OPEN_METEO_API_KEY`) to use
`customer-api.open-meteo.com` instead. The free Open-Meteo endpoint is non-commercial, so it is
never used.

## R2 layout (bucket `coinline-data`, binding `DATA`)

```
city/{cityId}.json.gz        fallback city packs        (pipeline → assets/cities/*.json.gz)
cells/{res5}.json.gz         region packs               (future pipeline batches)
cells/{res5}.meta.json       region summaries (RegionMeta)
tiles/{name}.pmtiles         Protomaps basemap extracts
```

Upload example:

```sh
npx wrangler r2 object put coinline-data/city/tokyo.json.gz --file ../../assets/cities/tokyo.json.gz --remote
npx wrangler r2 object put coinline-data/tiles/tokyo.pmtiles --file tokyo.pmtiles --remote
```

Use `--local` instead of `--remote` to fill the local bucket for `wrangler dev`.

## Privacy

- `/area/check` rounds coordinates before doing anything with them. The code logs no URLs or
  coordinates: errors log only their class name, and misses log only the res-5 id.
- `wrangler.toml` sets `observability.redact_query_string = true`, so Workers Logs and traces do
  not record `?lat&lng`.
- The Worker keeps no state and has no KV or database. The only cache is the shared weather cache,
  keyed by region.

## Tiles

The `/pmtiles/` route supports single-range `Range` requests (`bytes=a-b`, `bytes=a-`, `bytes=-n`),
`HEAD`, `416` with `Content-Range: bytes */size`, and exposes `Content-Range` and `ETag` to CORS.
A multi-range request gets a plain `200`. Object sizes are cached per isolate for 5 minutes, so a
range request costs one R2 read. The `/tiles/` route uses the `pmtiles` library with an R2-backed
`Source` and a `ResolvedValueCache`, because Workers cannot share promises across requests.
