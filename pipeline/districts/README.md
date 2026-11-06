# District boundaries

`build-districts.ts` downloads OpenStreetMap administrative boundaries for the 9 fallback cities
(`src/config/cities.ts`) from the public Overpass API and writes one compact file per city to
`assets/cities/districts/{cityId}.json`. The app reads them in `src/map/districts.ts` to show the
borough / ward / municipality under the map center in the tab bar ("District · City").

## Run

```sh
cd pipeline
npm install
npx tsx districts/build-districts.ts                 # all 9 cities (~2 min, one query per city)
npx tsx districts/build-districts.ts tokyo paris     # some cities
npx tsx districts/build-districts.ts --cached        # rebuild from pipeline/out/districts/raw/*.json
npm run typecheck
```

`OVERPASS_URL` overrides the endpoint (default `https://overpass-api.de/api/interpreter`). Queries run
one at a time with a pause between cities and a `Coinline-pipeline` User-Agent; 429/5xx responses
are retried twice after 60 s. Raw responses are cached in `pipeline/out/` (gitignored).

## Levels

`RULES` in the script picks the `admin_level`s per city, verified with `is_in` at each center.
Where levels nest (Paris arrondissements in communes, Chicago community areas next to suburbs), the
app picks the finest level containing the point.

| City | Levels | What |
|---|---|---|
| New York | 7, 8 | the 5 boroughs; New Jersey municipalities |
| Los Angeles | 8 | cities (Los Angeles, Santa Monica, Beverly Hills…). No admin neighbourhoods in OSM |
| Chicago | 10, 8 | community areas; suburbs (Chicago itself excluded) |
| London | 8 (+ City of London, 6) | London boroughs; districts outside Greater London |
| Paris | 9, 8 | arrondissements; surrounding communes (Paris itself excluded) |
| Tokyo | 7 | special wards; Tama and neighbouring cities |
| Seoul | 6 | gu; Gyeonggi cities |
| Singapore | 6 | URA planning areas (plus Johor Bahru / Batam across the water) |
| Sydney | 6 | LGAs (councils only; "Council" suffixes trimmed) |

## Method

1. Overpass `rel(around:…)[boundary=administrative][admin_level~…]; out geom;` with a radius of
   √2 × the clip half-size.
2. Join each relation's outer and inner way pieces into closed rings; holes go to the outer ring
   that contains them.
3. Clip every ring to a square of ±`radiusKm` (12–26 km) around the center (Sutherland-Hodgman),
   simplify with Douglas-Peucker (25 m) and drop slivers under 100 × 100 m.
4. Store coordinates as integers of 1e-5° (~1 m), delta-encoded per ring, closing point dropped.

Names: `name`, plus `name:en`, `ja`, `ko`, `zh` (`zh-Hans` first), `fr`, `es`, `de`, `pt`
(`pt-BR` first) when they differ from `name`. Per-city `rename` rules trim prefixes such as
"London Borough of" and "Paris ".

File format (`DistrictFile` in `src/map/districts.ts`):

```json
{ "v": 1, "city": "london", "source": "...", "d": [
  { "l": 8, "n": { "": "Camden", "ja": "カムデン" }, "p": [[[x0, y0, dx1, dy1, ...], [hole...]]] }
] }
```

Total size is about 340 KB for the 9 cities.

Data © OpenStreetMap contributors, ODbL 1.0 (credited on the Credits screen).
