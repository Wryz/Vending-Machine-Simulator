# Free hosting: map tiles and weather

Last checked: 2026-11-06. Free tiers and terms change, so re-check before launch.

## Map tiles

**Default: [OpenFreeMap](https://openfreemap.org) public instance.** No server or account needed.

- Free, **no API key, no registration**, "no limits on the number of map views or requests".
- **Commercial use is allowed** (their FAQ: "Is commercial usage allowed? Yes.").
- OpenMapTiles schema. TileJSON is at `https://tiles.openfreemap.org/planet`, and Noto Sans glyphs are at `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`.
- Attribution is required: "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors". The source carries it, the map shows it, and the Credits screen lists it.
- **Risk:** it's donation-funded, with **no SLA**, and the public service can change or stop. Their whole stack is MIT-licensed and the planet is downloadable weekly, so we can self-host the same schema.
- In the app, `src/map/tiles.ts` uses OpenFreeMap whenever `EXPO_PUBLIC_TILES_URL` is empty. `src/map/style.ts` renders the same look and layer ids over OpenMapTiles or Protomaps. Verified in headless MapLibre GL JS against live OpenFreeMap tiles; see `docs/spikes/images/map-*-openfreemap.png`.

**Fallback: self-host Protomaps PMTiles on Cloudflare R2.** This costs nothing at our size.

- R2 free tier: 10 GB-month storage, 1M Class A and 10M Class B operations a month, and **no egress fees**.
- Workers free tier: 100k requests a day.
- City extracts at z0–15 are about 5–10 MB each (Manhattan's 6×6 km box is 6.6 MB). All nine cities fit easily; a full planet (about 120 GB) doesn't fit the free tier.
- The Worker serves `/pmtiles/{name}.pmtiles` with HTTP Range support for native `pmtiles://`, and `/tiles/{name}/{z}/{x}/{y}.mvt` as a fallback.
- In the app, set `EXPO_PUBLIC_TILES_URL=https://<worker>/pmtiles/{name}.pmtiles`.

Rejected options:
- **Protomaps hosted API and Stadia Maps:** free tiers are non-commercial.
- **MapTiler:** the free plan is non-commercial.
- **Protomaps daily planet builds** (`build.protomaps.com`): fine for the offline pipeline, but builds are deleted after about a week, so never point the app at them.

## Weather

**Default: [MET Norway Locationforecast 2.0](https://api.met.no/weatherapi/locationforecast/2.0/documentation).**

- Free, global, hourly, no API key.
- Data is under **CC BY 4.0 and NLOD 2.0**, which allow commercial use with credit.
- Terms we follow:
  - an identifying User-Agent with a contact;
  - cache responses and don't re-request before `Expires`;
  - at most 4 coordinate decimals (we send 2, and only city or region centers);
  - stay under 20 requests per second in total.
- Credit: "Weather: MET Norway", on the Credits screen.
- **Worker:** `/weather` proxies MET with a shared 1-hour edge cache per city or region.
- **App without a Worker:** calls MET directly, caches on device, and honors `Expires` (minimum 30 minutes).

Notes:
- MET asks large users to contact them. With the Worker's shared cache, each city costs at most 24 requests a day, whatever the player count.
- If the app calls MET directly at scale (no Worker), contact MET first.

Other options considered:
- **US National Weather Service** (`api.weather.gov`): free and public domain, but US only. A fine US-only fallback.
- **Open-Meteo:** the free endpoint is non-commercial only. The Worker uses its paid endpoint only if `OPEN_METEO_API_KEY` is set.
- **Apple WeatherKit:** 500k calls a month are included with the Apple Developer Program. It needs a JWT signed with your developer key in a server, and Apple attribution in the UI. A good second source if MET ever becomes a problem.
- **OpenWeatherMap and WeatherAPI:** keyed, with small free tiers.

Offline, or if every source fails, the game synthesizes plausible weather from each city's climate normals (`src/data/weather.ts`).
