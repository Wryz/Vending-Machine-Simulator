# Coinline data pipeline

This is the offline pipeline. It turns open map data into H3 resolution-9 `CellData` packs
(`src/data/types.ts`) for the simulation (SPEC §5.2, §6.5). It is not shipped in the app.

## Run

```sh
cd pipeline
npm install
# needs the go-pmtiles CLI: https://github.com/protomaps/go-pmtiles/releases
export GO_PMTILES=/path/to/pmtiles                         # default: `pmtiles` on PATH
export PLANET_URL=https://build.protomaps.com/20261104.pmtiles   # default shown
npx tsx build-city.ts --all                 # all 9 fallback cities (~40 s, ~45 MB download)
npx tsx build-city.ts tokyo paris           # some cities
npx tsx build-city.ts --all --skip-extract  # rebuild from cached out/extracts/*.pmtiles
npx tsx inspect-kinds.ts out/extracts/tokyo.pmtiles   # list POI/landuse kinds in an extract
npm run typecheck
```

Outputs:

| File | What |
|---|---|
| `assets/cities/{cityId}.json.gz` | `RegionPack` (gzip JSON), bundled in the app and uploaded to R2 as `city/{cityId}.json.gz` |
| `pipeline/out/{cityId}.meta.json` | `RegionMeta` summary (`workers/data-api/src/meta.ts`): per-cell named-place count, category bitmask and residents, which the data API uses for the SPEC §6.2 rule |
| `pipeline/out/stats.json` | per-city stats |
| `pipeline/out/extracts/*.pmtiles` | z15 extracts (cache, gitignored) |

Protomaps deletes daily planet builds after a while. Pin a build you have archived, or pick a
current one from <https://maps.protomaps.com/builds/>, and record it: the build date goes into each
pack's `sources`.

## Method (v1)

1. **Extract.** `pmtiles extract` takes z15 of the Protomaps daily planet (OSM, basemap schema v4)
   for a box of ±3.6 km around the SPEC §6.3 center. That is the 6×6 km game area plus the 400 m
   demand radius, so cells near the edge still see all their neighbours.
2. **Decode** the `pois`, `landuse` and `buildings` layers. POIs are deduplicated by keeping only
   points inside each tile's extent. Building polygons are clipped to the tile, so each building
   part is counted once. Place ids come from the Planetiler feature id (`type·2⁴⁴ + osmId`), giving
   `osm:n123`, `osm:w456` or `osm:r789`. Names use `name:en` when present, else `name`.
3. **Categorise** POIs with the table below. Unlisted kinds (benches, ATMs, bus stops, artwork…)
   are ignored.
4. **Estimate population and office space** from buildings (see the next section).
5. **Aggregate** to H3 res 9 with `h3-js`. For each cell inside the 6×6 km square that has
   residents, a place or a building footprint:
   - `counts`: places in the cell per category, including unnamed ones.
   - `nearby`: Σ `distanceDecay(d)` per category over places within `DEMAND_RADIUS_M` (400 m) of the
     cell center. Both come from `src/config/places.ts`.
   - `places`: named places in the cell, at most 4 per category (closest to the center first). The
     cap drops automatically if a pack would exceed 1.5 MB gzip.
   - `competitors`: convenience stores, vending machines and kiosks within 400 m.
   - `pop`: estimated residents (building centroids in the cell).
   - `isolation = 1 / (1 + activity / 5)`, where `activity = Σ nearby (excluding competitors) + pop / 200`.
     The result runs from 0 (busy, overlooked) to 1 (isolated). The constants are fixed rather than
     per city, so values compare across regions.

### Category mapping (Protomaps `pois.kind` → `PlaceCategory`)

| Category | Kinds |
|---|---|
| school | school, kindergarten, childcare, prep_school, language_school, music_school, dancing_school |
| university | university, college |
| gym | fitness_centre, sports_centre, sports_hall, dojo, swimming_pool*, ice_rink, climbing |
| office | office, coworking_space, company, government, research_institute, courthouse, townhall, public_building, embassy, diplomatic, **plus synthetic office places from office floor space** |
| hospital | hospital |
| clinic | clinic, doctors, dentist, healthcare |
| station | station, railway_station, train_station, halt, bus_station, ferry_terminal, subway_station (entrances are not counted) |
| stadium | stadium, arena |
| park | park, garden*, playground*, dog_park, recreation_ground, common, village_green, nature_reserve |
| beach | beach |
| nightlife | bar, pub, nightclub, biergarten, karaoke(_box), music_venue, lounge, hookah_lounge, casino, stripclub, theatre, cinema |
| cafe | cafe, coffee, ice_cream, internet_cafe, bubble_tea |
| restaurant | restaurant, fast_food, food_court, bbq |
| shopping | supermarket, mall, department_store, marketplace, the retail shop kinds (`SHOP_KINDS` in `build-city.ts`), bank, post_office |
| hotel | hotel, hostel, motel, guest_house, apartment*, resort |
| airport | aerodrome*, airport*, terminal* (heliports and seaplane bases excluded) |
| convention | conference_centre, exhibition_centre, events_venue, convention_centre |
| religious | place_of_worship, church, mosque, temple, shrine, synagogue |
| competitor | convenience, vending_machine, kiosk, newsagent, general |

`*` = counted only when named. Vending machines are always stored **without a name**, because OSM
names them after their operator or brand and the game must not show brands (CLAUDE.md).

### Population and office estimate (known limitation)

> **Deviation from SPEC §6.4 and §6.5.** The spec calls for Overture Places plus WorldPop or GHSL
> population rasters. v1 uses OSM through Protomaps for places, and estimates population from OSM
> building footprints. The OSM data already ships in the app's basemap under ODbL, so this adds no
> new data source or license.

Protomaps v4 buildings carry `height` but no `building=*` type, so the residential share of each
building is a heuristic:

- gross floor area = footprint (m², clipped) × floors, where floors = `round(height / 3.2 m)`.
  Buildings with no height count as 8 m (about 2–3 floors).
- The residential and office shares come from the landuse polygon at the building centroid:

  | Landuse | Residential | Office |
  |---|---|---|
  | residential | 0.90 | 0 |
  | commercial or retail | 0.15 | 0.60 |
  | industrial, railway, school, university, hospital, park, … | 0 | 0 |
  | none, height < 25 m | 0.75 | 0.10 |
  | none, 25–60 m | 0.55 | 0.30 |
  | none, > 60 m | 0.35 | 0.55 |

- residents = residential floor area ÷ 45 m² per person.
- Office floor area ÷ 15,000 m² gives fractional synthetic `office` places. OSM, and therefore
  Protomaps, has very few office POIs, and without these the office demand curve would be empty.

Sanity check (2026-11-05 run; density is over kept land cells): New York (Lower Manhattan,
Downtown Brooklyn, Jersey City) has a median of about 26,000 per km² and a total of about 740,000.
Paris comes out at about 39,000 per km² (real figure for the central arrondissements: 20,000–40,000).
Tokyo (Suginami and Nakano) comes out at about 17,000 per km² (real: about 17,000). The order of
magnitude is right, but individual cells can be off by 2× or more, especially:

- where heights are sparsely tagged (Seoul has heights on 16% of buildings, Singapore 18%), which
  undercounts towers;
- in mixed office and residential cores, where the split is guessed.

Tunables sit at the top of `build-city.ts`.

## Upgrade path: Overture Places + WorldPop/GHSL via DuckDB

The output contract (`RegionPack`, `RegionMeta`) is independent of the sources, so a v2 pipeline
can replace steps 1–4:

1. **Places:** read Overture Places GeoParquet straight from S3 or Azure with DuckDB (`spatial` and
   `httpfs` extensions), filtered by the region's bbox. Map `categories.primary` (and
   `alternate`) to `PlaceCategory`, keep `confidence ≥ 0.6`, and use `names.primary` and the GERS
   id as `NamedPlace.id`. Use the DuckDB `h3` community extension (`h3_latlng_to_cell`) to bucket
   into res 9. Keep the OSM path as a supplement for stations and competitors.
2. **Population:** sample WorldPop (100 m, constrained) or GHSL GHS-POP rasters into res-9 cells.
   Either sum the raster cells by H3 index of their centers (rasterio or exactextract, or
   DuckDB/GDAL), or use the US Census blocks for the US. This replaces the building heuristic; the
   building split can stay for `office`.
3. **Regions:** iterate over H3 res-5 cells by coverage priority (SPEC §6.5), and write
   `cells/{res5}.json.gz` plus `cells/{res5}.meta.json` to R2. The data API already serves and
   evaluates those.

Check each dataset's license and attribution before shipping. Overture Places is CDLA-Permissive 2.0
with some sources under other terms. WorldPop is CC BY 4.0. GHSL is CC BY 4.0.

## Licenses and attribution

- **OpenStreetMap:** © OpenStreetMap contributors, **ODbL 1.0**. The packs are derivative
  databases of OSM. They must keep the attribution (in each pack's `sources` and on the always
  visible map attribution and credits screen), and the packs themselves are offered under ODbL.
  They are publicly downloadable from the data API, which satisfies the share-alike requirement
  for the derived data. Verify with counsel before launch (SPEC §6.4).
- **Protomaps basemap build:** the tiles are OSM-derived (ODbL); the Protomaps schema and tooling
  are BSD/ISC licensed.
- **H3:** Apache 2.0.
