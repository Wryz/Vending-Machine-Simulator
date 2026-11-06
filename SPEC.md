# Vending Machine Simulator: Product & Build Spec (v1)

> Working brand: **Coinline** (see §3.1 for name options).
> Store title: **Vending Machine Simulator**. Subtitle: **Real-World Vending Tycoon**.
> Platform: iPhone first (Android later, same codebase). React Native via Expo (dev build).
> Target: full v1 in about 4–6 months.

This document is the source of truth for the game's vision, scope and architecture. Read it fully before writing code. When something here conflicts with a library's limits, flag it, propose an alternative, and keep the player-facing goal intact.

---

## 1. Vision in one paragraph

You start a vending side hustle with one used $250 machine and grow it into a citywide vending empire on a **real map of your own city**. Every spot's sales come from real-world data: how many people live and pass nearby, what places surround it (schools, gyms, offices, hospitals, stations), the real local time and the real weather. The look is **calm, premium, low-poly realism**: a muted, model-like city in real daylight that turns to dusk and night with the city's actual clock, where the vending machines are the brightest, most tactile things on screen. Early on you restock by hand in satisfying 3D close-ups. As you grow, you hire drivers and buy smart machines, until the business largely runs itself and you spend your time on strategy: locations, product mix, contracts, collections and expansion to new cities.

### 1.1 Why this game (market context)
- "vending machine simulator" is suggested by App Store and Google Play autocomplete. The iPhone results have no strong vending sim (the only real one has about 50 ratings).
- The theme is proven on PC: *Vending Machine Co.* (April 2026) sold about 48K copies with 84% positive reviews. Its top complaints are the design brief for us:
  - restocking becomes tedious, with no automation;
  - content runs out;
  - timers pad out playtime;
  - too few things to spend money on.
- Mobile vending games get installs (*Idle Vendor Empire* reached 35K Android installs in 3.5 months), but players hate their ads (35% of reviews) and paywalled automation.
- Real-world vending is a popular side-hustle fantasy. Its truths become our mechanics: "location, location, location"; it's not passive; theft and repairs; deals with property managers.
- Real-map business games are proven: *Landlord: Idle Business Empire* has about 12M Android installs. Nobody has combined a real map with vending.

### 1.2 Design pillars
1. **Location is the game.** Placement decisions are the core skill, driven by real data the player can read.
2. **Satisfying to touch.** Restocking, collecting coins and pulling capsules feel physical: weight, sound, haptics.
3. **Effort becomes automation.** Manual work early, automation as the main progression. Never punish the player with timers for the sake of it.
4. **Calm and premium.** No cartoon proportions, no screaming UI, no forced ads. Restraint everywhere except the machines.
5. **Always something to want.** New machine types, districts, collections, contracts and cities on a steady drip.

---

## 2. Scope

### 2.1 In v1 (full launch)
- Real-world map of the player's area (if data is sufficient), or one of 9 fallback cities.
- Place machines anywhere in your current city; unlock districts, then new cities.
- Real-data demand model: population, nearby places (with real names, no logos), local time, real weather.
- Four product families (snacks and drinks, capsules and collectibles, tech and essentials, hot food and specialty) plus adult categories (alcohol) behind a permit.
- 3D close-up restock and cash collection; manual early, automated later.
- Progression story from side hustle to empire, with milestone chapters and a prestige "sell the company" loop.
- Events: real weather, real time of day, generated local events, breakdowns and theft, an AI rival company.
- Capsule and collectible machines with collection books (in-game currency only).
- Day and night lighting that matches the city's real local time.
- Offline progress, opt-in local notifications.
- Monetization: optional rewarded ads and one-time purchases.
- Local-only saves (no accounts).

### 2.2 Not in v1 (planned v2+)
- Shared world: other real players' machines, competing for spots, city leaderboards.
- Accounts, cloud saves, cross-device sync.
- Android store launch (code must stay Android-compatible).
- Seasonal content passes.

---

## 3. Brand & art direction

### 3.1 Name
- **Store title (search-critical):** `Vending Machine Simulator` (25 characters).
- **Subtitle:** `Real-World Vending Tycoon` (25 characters).
- **Keyword field (100 characters, comma-separated, no spaces after commas):** `vending,machine,game,tycoon,idle,business,snack,capsule,gacha,map,gps,city,side hustle,empire` (trim to fit).
- **In-game brand (splash, icon, company name). Options; check trademarks before choosing:**
  - **Coinline** (recommended): calm, premium, evokes routes and coins.
  - **Vendroute**
  - **Corner Supply**
  - **Late Shift Vending**
  - **Slotwise**

### 3.2 Brand personality
Fun, bright and lively, like a sunny toy-town version of your own city, with a warm sense of humor. Cheerful but never noisy. Copy is short and plain ("Cash box full", "Restocked 14 items"); the screen shows numbers and icons before sentences.

### 3.3 Visual style: bright flat-shaded low-poly
*(Revised 2026-11-05: from "calm, premium, low-poly realism" to bright and flat, at the owner's request.)*
- **Proportions stay real.** A snack machine is about 1.83 m tall, 0.9 m wide, 0.9 m deep. No chibi or bobble proportions, no thick outlines. Motion is lively but restrained: springy pop-ins on UI, no squash-and-stretch on objects.
- **Flat and saturated.** Sunny, candy-but-harmonious colors; flat shading over subtle gradients.
- **Geometry:** flat-shaded low-poly. Hero machines run 800–3,000 triangles; small props 50–400. Chamfers are suggested by single bevels.
- **Materials:** simple PBR (base color, roughness, light metalness), baked ambient occlusion. Color comes from material, not textures. Small texture atlases only for labels, product faces and screens.
- **Machines are the color.** The city is bright but soft; machines carry the most saturated accents, by product family:
  - snacks: warm red;
  - drinks: deep blue;
  - capsules: teal;
  - tech: graphite and white;
  - hot food: amber;
  - alcohol: oxblood.
- **Night:** cozy, not dark. The city turns indigo and lavender and stays readable; machine fronts glow warm. Not neon-arcade.

### 3.4 Lighting tied to real time
- Compute the sun's position from the city's latitude, longitude and real local time (e.g., `suncalc`).
- **Map style:** interpolate between four presets (night, dawn, day, dusk) for background, building fill, extrusion color and label color. Transitions are smooth, updated every minute.
- **3D scenes:** the directional light's angle and color follow the sun; ambient intensity follows the preset; machine emissives turn on at dusk.
- Weather tints the scene: overcast desaturates, rain darkens and adds wet-road reflection hints (cheap: a darker road color plus a subtle specular), snow brightens.

### 3.5 Map style (must match the 3D)
Custom MapLibre style, not a default basemap:
- **Base:** warm cream land, white streets with butter-yellow main roads, fresh green parks, candy-blue water.
- **Buildings:** `fill-extrusion` using building height where available (default about 3 floors, 10 m). Soft near-white pastel blocks tinted by the time-of-day preset.
- **Labels:** minimal. Districts and major roads only at mid zoom; place names appear only near selected spots. Typeface matches the UI (§3.7).
- **POIs:** never use default POI icons. When a spot is selected, nearby places appear as small, consistent low-poly-style category glyphs (school, gym, office, hospital, station, café, park, stadium, university, nightlife).
- **Machines on the map:** rendered as pre-rendered low-poly sprites of the actual 3D models (§7.3) with a soft glowing pad in the family color. They never shrink below a readable size (about 32 pt tall), so machines are always the stars of the map. Status rings: low stock is amber, cash full is green, broken is red.
- **Views:** a tilted 3D view and a straight top-down view (one toggle). Zooming far out hands off to a low-poly globe showing every city and machine (MapLibre Native has no globe projection yet, so the globe is a three.js scene).

### 3.6 UI: soft, rounded, map-first
The map is always the screen. Controls float over it as round buttons and pills; details open in bottom sheets (`@gorhom/bottom-sheet`) instead of new pages. Buttons are pills, cards are rounded and borderless with soft shadows; no boxy panels, no all-caps labels. Show numbers and icons before text.

Physical objects remain as themes for specific moments, drawn in the same bright flat style:

| Object | Used for |
|---|---|
| Thermal receipt | Earnings summaries, sale tickers, offline report ("While you were away…") |
| Route clipboard | Restock route list, driver assignments |
| Key ring | Owned machines; each key tag shows machine type and status |
| Coin tray | Cash collection moment (coins slide and stack; haptic ticks) |
| Contract sheet | Location deals: commission %, term, signature swipe |
| Permit card | Licenses (alcohol permit, district permits) |
| Collection binder | Capsule and card collections |
| Spec tag | Machine stats and upgrades, as a printed tag hanging from the machine |

- Touch targets are at least 44 pt. Use Dynamic Type where possible.
- Haptics: light tick per coin, medium thunk when a product slots in, success notification on milestones.
- Sound: soft mechanical clicks, coin clinks, compressor hum near machines, distant city ambience by time of day. No loud jingles.

### 3.7 Typography & color tokens (proposal)
- **Type** (Google Fonts, OFL licensed; bundle the fonts):
  - Everything: **Nunito** (rounded and friendly; fallback: system). Numbers use its tabular figures so counters don't jitter.
- **Color tokens** (`src/ui/theme.ts`):
  - `brand` #FF6B2C (tangerine: primary actions, splash, icon)
  - `ink` #23264A
  - `paper` #FFF8EE
  - `signal` #1FB36B (success, money)
  - `amber` #FFB020 (warnings, low stock)
  - `alert` #FF4F45 (broken, theft)
  - machine family accents as in §3.3
- The night UI is a cozy indigo built from the same tokens. The UI theme follows the city's real time, not the phone's setting (configurable in Settings).

---

## 4. Core gameplay

### 4.1 Loop
1. **Scout:** pan the real map; heat overlay (toggle) shows estimated foot traffic by hex cell; tap a spot to see its *Spot Card*: nearby places (real names), estimated daily customers by hour, best product families, competition, commission ask.
2. **Place:** choose machine type, sign the location contract (commission %, term), pay purchase and install cost.
3. **Stock & price:** choose products for slots; set prices (with a suggested price and a demand curve hint).
4. **Earn:** machines sell continuously in real time via the simulation (§5), including while the app is closed.
5. **Service:** restock and collect cash. This is done by hand early (3D close-up plus a drive along the real roads, abstracted as a time cost), and by drivers and smart machines later.
6. **Grow:** buy machines, unlock machine types and districts, hire staff, upgrade, complete contracts and collections, expand to new cities, eventually sell the company (prestige).

### 4.2 Manual → automated progression (core promise)

| Stage | Restocking | Cash collection | Information |
|---|---|---|---|
| Chapter 1 | Manual close-up | Manual (coin tray) | Must visit to see stock |
| Chapter 2 | Manual; van holds more | Manual | Basic telemetry upgrade per machine |
| Chapter 3 | Hire first driver (auto-restocks one route) | Card readers deposit directly | Telemetry for all machines |
| Chapter 4 | Warehouse + multiple drivers; auto-reorder rules | Automatic | Smart machines suggest prices |
| Chapter 5 | Fully automated; player sets policies | Automatic | Analytics dashboard (receipts) |

- Upgrades apply **globally per machine family** once researched, not per machine. This fixes a top complaint about Vending Machine Co.
- Manual restocking must stay fun when players choose to do it. Give it a small bonus (for example, a +10% "fresh stock" sales boost for a day) so it's never mandatory.

### 4.3 Machine types (v1)

| Family | Machines | Notes |
|---|---|---|
| Snacks & drinks | Used snack machine (starter), Snack, Cold drinks, Combo, Coffee | Core income |
| Capsules & collectibles | Capsule toy, Card pack, Blind box | Feeds collections; in-game money only |
| Tech & essentials | Chargers & cables, Earbuds & accessories, Pharmacy essentials, Hygiene | High margin, low volume; strong near stations, airports, hospitals |
| Hot food & specialty | Hot noodles, Pizza, Fresh food (spoils), Flowers, Umbrellas (weather-driven), Ice | Higher upkeep, event-sensitive |
| Adult (17+/18+) | Beer & wine, Sake/soju (Asia cities) | Requires a liquor permit; can't be placed within 300 m of schools or youth places; ID-check upgrade reduces fines and incidents |

Each machine has:
- slots;
- capacity per slot;
- power cost per day;
- breakdown rate;
- theft risk;
- install cost;
- appearance variants (paint, wrap, lighting);
- an upgrade tree (card reader, telemetry, cooler or heater, security cage, camera, LED panel, bigger coil).

### 4.4 Products
- Original products only: **no real brands, logos or packaging**. Use invented brands with distinct low-poly packaging (for example, "Kettle Crisp", "Northfield Cola", "Volt Bar").
- Product data:
  - wholesale cost;
  - suggested price;
  - category tags (snack, sweet, salty, caffeine, hydration, protein, hot, cold, collectible, tech, adult);
  - shelf life (fresh and hot food);
  - weather sensitivity;
  - time-of-day curve.
- Products unlock by chapter and by wholesaler contracts.

### 4.5 Location contracts (real names)
- Each spot is attached to the nearest suitable real place (from map data) by **real name, no logos**. Example: "Lakeview Fitness · Gym · 40 m".
- The contract sets the commission % the venue takes (10–35%), the term (30, 90 or 180 game-days) and exclusivity options.
- Venue "mood" depends on service quality: empty or broken machines lower satisfaction, which can lead to contract termination.
- Show a small in-game disclaimer: "Places shown from open map data. No affiliation or endorsement." Add a "Report this place" option that hides a venue.

### 4.6 Events
- **Real weather** (hourly, cached per city or cell):
  - heat raises cold drinks and ice;
  - cold raises coffee and hot food;
  - rain raises umbrellas and lowers outdoor foot traffic.
- **Real time:** demand curves by place category (offices peak 7–10 and 12–14; schools 15–16 on weekdays; nightlife 21–02; hospitals flat 24 hours; stations at rush hours). Weekends and public holidays shift curves; use per-country holiday data.
- **Local events (generated from nearby places):**
  - stadium → game night (×2–4 nearby for 4 hours);
  - university → exam week (caffeine up);
  - park → festival;
  - convention center → expo;
  - beach → summer weekend.
  Announced 1–24 hours ahead on the map with a pin.
- **Breakdowns:** jams and refrigeration failures. Fix by hand (quick 3D repair interaction) or with a technician upgrade.
- **Theft and vandalism:** risk by area (night foot traffic, isolation) minus security upgrades. The loss is cash and stock, never machine deletion.
- **Rival company (AI):** "Brightvend" places machines in high-demand cells near yours, undercuts prices, and bids for contracts. Players counter with service quality, exclusivity contracts, pricing and upgrades. The rival must be beatable and readable, never unfair.

### 4.7 Collections (capsules & cards)
- Original collectible series (for example, "City Critters", "Transit Tokens", "Night Market Minis"), each with 12–24 items across rarity tiers (common, uncommon, rare, ultra).
- Capsule and card machines generate collectibles for the player through:
  - a **free pull** when collecting cash from that machine (chance-based);
  - pulls bought with **in-game money only**;
  - a free pull from an optional rewarded ad (capped per day).
- **No real-money randomized purchases in v1.** Disclose odds in-game anyway.
- Completing a set grants permanent perks (for example, +5% sales for that family) and a trophy prop for the HQ.

### 4.8 Progression: side hustle to empire

| Chapter | Goal | Unlocks |
|---|---|---|
| 1. Side Hustle | Earn $1,000 with your used machine | Second machine, price setting, first contract renegotiation |
| 2. The Route | Run 5 machines, buy a van | Telemetry, drinks and coffee machines, district 2 |
| 3. LLC | 15 machines, hire a driver | Card readers, capsules, warehouse, rival appears |
| 4. Operator | 40 machines, 3 drivers | Smart machines, tech and essentials, hot food, events board |
| 5. Empire | Top operator in the city (beat the rival's share) | All machine types, new city unlock, liquor permit |
| Prestige | "Sell the company" | Prestige currency ("Reputation") for permanent perks; restart in a new city with a head start |

- New cities can be the player's other real nearby city (if data is sufficient) or any of the 9 fallback cities.
- The economy is tuned so chapter 1 takes about 20–30 minutes and chapter 3 is reached around day 2–3 of casual play. Prestige becomes attractive around week 2–4.

---

## 5. Simulation & economy

### 5.1 Principles
- Deterministic, pure TypeScript module (`src/sim/`), with no React or rendering dependencies and full unit tests.
- Time-based: the simulation advances in fixed ticks (1 game-minute = 1 real minute by default). On resume, it fast-forwards the elapsed time in coarse steps (15-minute buckets), capped at 72 hours of offline progress (extended by upgrades).
- All numbers live in config (`src/config/economy.ts`, `products.ts`, `machines.ts`, `places.ts`) for tuning without code changes.

### 5.2 Demand model (per machine, per hour)
```
customers_per_hour = base_traffic(cell, hour, day)
                   × visibility(machine)          // placement quality, lighting at night, signage upgrade
                   × capture_rate(machine_type)   // % of passers who look
                   × weather_factor(product_mix, weather)
                   × event_factor(cell, time)
                   × (1 − competition_share(cell, radius))

base_traffic(cell, hour, day) = Σ over nearby places p within 400 m:
      weight(p.category) × hourly_curve(p.category, hour, day) × distance_decay(dist)
   + residential(pop_density(cell)) × hourly_curve("residential", hour, day)

purchase_prob(product, price) = fit(product.tags, place mix, hour)
                              × price_response(price / suggested_price)
// price_response: logistic curve, ~1.0 at 0.9× suggested, ~0.5 at 1.3×, ~0.15 at 1.8×
```
- Precompute per hex cell (H3 resolution 9, about 0.1 km²): `pop`, counts and weights of places by category, an "isolation" index for theft risk, and the nearest named place for each category.
- At runtime, combine the precomputed cell data with time, weather, events and the player's machines.
- Competition share: the player's own machines, the rival's machines, and real existing vending or convenience stores (from map data, as fixed competitors).

### 5.3 Costs
- Machine purchase and install, venue commission %, wholesale product cost, power per day, repairs, driver wages, warehouse rent, van fuel by route length (real road distance between stops, approximated with straight-line distance × 1.3 if routing isn't available).

### 5.4 Balancing targets
- Starter machine profit: about $40–80 per day in a decent spot.
- Bad placement must be visibly bad, and the Spot Card must make the reasons readable.
- Avoid runaway inflation: costs scale with machine count (management overhead) and new districts carry higher costs.
- Never gate core automation behind real money.

---

## 6. Location, data & the 9-city fallback

### 6.1 Starting flow
1. Intro: a short cold open of a lone machine glowing on a real street at the city's current time.
2. Ask for **approximate location** (When In Use, once), explaining why: "to build your city."
3. Call the data API `GET /area/check?lat=&lng=`. It returns `{ playable: boolean, cityName, reason, centroid }`.
4. If playable, start there. If not (or permission is denied), show the **9-city picker**: "Your area doesn't have enough map data yet. Pick a city to start your business."
5. The player can always switch to a fallback city later (a separate save slot per city).

### 6.2 "Enough data" rule (tunable)
An area is playable if, within 2 km of the start point:
- at least 150 named places in at least 6 categories;
- at least 20,000 residents (from population raster);
- and the region's cell data has been computed (see 6.4).

### 6.3 Fallback cities (pre-computed and bundled or cached)

| City | Center (lat, lng) | Notes |
|---|---|---|
| New York | 40.7128, −74.0060 | Dense, 24-hour; subway stations |
| Los Angeles | 34.0522, −118.2437 | Car-heavy; beaches; studios |
| Chicago | 41.8781, −87.6298 | Strong seasons; "L" stations |
| London | 51.5074, −0.1278 | Tube; rain-driven umbrellas |
| Paris | 48.8566, 2.3522 | Cafés; metro |
| Tokyo | 35.6762, 139.6503 | Vending capital; beer machines allowed |
| Seoul | 37.5665, 126.9780 | Night life; soju |
| Singapore | 1.3521, 103.8198 | Hot all year; strict rules (alcohol limits) |
| Sydney | −33.8688, 151.2093 | Beaches; seasons reversed |

- City-specific flavor: local holidays and per-country alcohol rules. Currency stays in-game dollars in v1.
- The 9 cities ship as downloadable data packs from the data API, with the first chosen city cached locally.

### 6.4 Data sources & licensing (verify before shipping)
- **Basemap:** OpenStreetMap via Protomaps (PMTiles) on Cloudflare R2. Attribution "© OpenStreetMap contributors" is always visible (ODbL).
- **Places (names and categories):** Overture Maps Places (check the license and attribution on the Overture attribution page), optionally supplemented by OSM tags. Map categories to the game's place taxonomy (school, university, gym, office, hospital, clinic, station, stadium, park, beach, nightlife, café, restaurant, shopping, hotel, airport, convention, religious, residential, convenience/vending competitor).
- **Population:** WorldPop or GHSL (global rasters); US Census for higher US resolution (optional).
- **Weather:**
  - **Apple WeatherKit:** a monthly call allowance is included with the Apple Developer Program; verify current limits.
  - **Open-Meteo:** check commercial-use terms.
  - Cache per city or region, hourly, in the data API so client calls stay minimal.
- **Holidays:** a static per-country table bundled with the app (for example, generated from the `date-holidays` package at build time).
- **Do not use** Google Maps or Places data (terms don't allow this use).
- Credits screen lists all sources and licenses.

### 6.5 Data pipeline (offline, server side)
- Batch job (Python or DuckDB) reads Overture Places (GeoParquet) and population rasters, then aggregates to **H3 resolution 9** cells:
  - `cell_id`, `pop`, `category_counts`, `category_weights`;
  - top named places per category, with name, category, lat/lng and distance to the cell center;
  - `competitor_count`, `isolation_index`.
- Output is region files keyed by H3 resolution 5 parent cells (about 250 km²), compact binary (e.g., FlatBuffers or gzip-compressed JSON), stored on R2.
- Coverage strategy for "anywhere with enough data":
  1. the 9 fallback cities;
  2. the US;
  3. Western Europe, Japan, Korea, Australia, Canada;
  4. the rest of the world in batches.

  Regions not yet computed fall back to the 9-city picker. Log those requests (counts only, no location stored) to prioritize the next batch.

### 6.6 Data API (stateless, read-only; Cloudflare Workers + R2)
- `GET /area/check?lat&lng` returns the playability result (uses resolution 5 coverage plus the thresholds).
- `GET /cells/{res5}.bin` returns the region's cell data (cached on device after first download).
- `GET /city/{cityId}/pack` returns a fallback city pack.
- `GET /weather?cell={res5}` returns cached hourly weather.
- Tiles: `pmtiles` served from R2 (directly if the native MapLibre version supports `pmtiles://`; otherwise via a Worker that serves `/{z}/{x}/{y}.mvt` from the PMTiles archive).
- No user accounts and no saves server-side in v1. Never send or store precise location: the client sends a coarse point only for `area/check`, rounded to about 1 km.

---

## 7. Technical architecture

### 7.1 Stack
- **App:** Expo (SDK current stable), TypeScript strict, Expo dev build (native modules required), EAS Build and Submit.
- **Map:** `@maplibre/maplibre-react-native` with a custom style JSON (§3.5).
- **3D:** `@react-three/fiber/native` + `expo-gl`, `@react-three/drei/native` where supported. Models in **glTF/GLB**, Draco or Meshopt compressed, with a shared texture atlas.
- **State:** Zustand (UI and app state) plus the pure `sim` module. Persistence via `react-native-mmkv` (fast key-value) or `expo-sqlite` for larger state (machines, history).
- **Hex grid:** `h3-js` (verify on Hermes; if it fails, include `cell_id` in API responses and do lookups by nearest cell center).
- **Sun position:** `suncalc`.
- **Notifications:** `expo-notifications` (local only), scheduled from the simulation's projections.
- **Ads:** `react-native-google-mobile-ads` (rewarded only), with App Tracking Transparency prompt handling.
- **Purchases:** RevenueCat (`react-native-purchases`) or `react-native-iap`.
- **Haptics and audio:** `expo-haptics`, `expo-audio` (or `expo-av`).
- **Analytics:** privacy-light, event counts only (e.g., PostHog or Firebase Analytics); no precise location.

### 7.2 Project structure
```
app/                     # expo-router screens
  (onboarding)/
  (game)/map.tsx
  (game)/machine/[id].tsx    # 3D close-up
  (game)/routes.tsx
  (game)/collections.tsx
  (game)/company.tsx
  settings.tsx
src/
  sim/                   # pure TS: economy, demand, events, rival AI, offline catch-up (100% unit tested)
  config/                # economy, machines, products, places, chapters, cities (data only)
  data/                  # API client, cell cache, region downloads, weather cache
  map/                   # MapLibre style builder, time-of-day interpolation, layers, sprites
  three/                 # R3F scenes: MachineCloseup, CapsulePull, HQ; models; lighting rig
  ui/                    # physical-object components: Receipt, Clipboard, KeyRing, CoinTray, ContractSheet...
  store/                 # Zustand stores; persistence adapters
  services/              # ads, purchases, notifications, haptics, audio, analytics
assets/models/ assets/textures/ assets/audio/ assets/fonts/
workers/data-api/        # Cloudflare Worker (separate package)
pipeline/                # offline data pipeline (Python/DuckDB), not shipped in app
```

### 7.3 Rendering approach (decision)
- MapLibre Native in React Native has no supported way to draw arbitrary 3D models inside the map. So:
  - **On the map:** machines are **pre-rendered sprites** of the real 3D models (rendered at 8 headings × 2 pitch angles, at 3 lighting presets: day, dusk, night), placed with a `SymbolLayer`. Buildings use `fill-extrusion`. This keeps the map fast and consistent with the low-poly look.
  - **Close-ups and moments:** full R3F scenes (restock, repair, capsule pull, HQ) with real-time lighting matching the sun.
  - **Transition:** when a machine is tapped, animate the map camera toward it, crossfade into the R3F scene framed identically, and reverse on exit.
- Sprite generation is a build-time script (headless three.js) that renders the GLB models into a sprite atlas.
- Spike in week 1–2 to validate. If a better native 3D-on-map option exists for this stack, propose it.

### 7.4 Performance targets
- 60 fps on iPhone 12 and newer, 30 fps minimum on iPhone XR or 11.
- Cold start under 3 s to the map (cached city).
- At most 500 machine sprites visible; cluster at low zoom.
- R3F close-ups: about 30K triangles per scene and 2 shadow-casting lights at most.
- Region data downloads under 2 MB each; tiles cached.
- Offline catch-up computes in under 300 ms for 72 hours.

### 7.5 Saves
- Local only (MMKV/SQLite). One save per city slot, with autosave every 30 s and on background.
- A versioned save schema with migrations.
- Export and import a save (JSON) in Settings, for support and debugging.

---

## 8. Screens

| Screen | Contents |
|---|---|
| Onboarding | Cold open → location explanation → permission → area check → city or picker → first machine tutorial (place, stock, price, first sale) |
| Map (home) | Full-screen map with time-of-day style; machine sprites with family pads and status rings; event pins; rival machines. Floating: cash pill, one status pill (clock and weather, or the latest sale), round buttons for settings, 3D/top-down, busy streets (heat) and locate. One persistent bottom sheet: chapter goal and actions (keys, routes, orders, company, shop) when collapsed, the fleet when pulled up. Zoom far out to the globe |
| Spot Card | A bottom sheet over the map: place name and rating, customers per hour and sales per day, hourly sparkline, the top reasons, machine choice, Place button; nearby places further down |
| Machine close-up (3D) | Machine front, slot grid, drag-to-restock from van crate, price tags editable, cash box → coin tray, repair interaction, upgrade spec tag |
| Route clipboard | Restock route builder, van capacity, drivers and their routes, auto-reorder rules |
| Company | Chapter progress, finances (receipt-style P&L), staff, warehouse, permits, research (global upgrades), prestige |
| Collections binder | Series pages, rarity, completion perks |
| City switcher | Current city, other unlocked cities, 9-city fallback list |
| Shop | Remove ads, starter pack, cosmetic machine wraps, premium machines (non-pay-to-win) |
| Settings | Sound, haptics, notifications, UI theme (follow city time or system), data credits, save export and import, privacy |

---

## 9. Monetization (fair by design)
- **Rewarded ads, optional only:**
  - ×2 earnings for 30 minutes;
  - instant restock of one machine;
  - one free capsule pull (daily cap);
  - double the offline report payout.
  - Never interstitials, never on launch, never mid-interaction.
- **One-time purchases** (prices indicative):
  - Remove Ads + permanent ×1.25 offline cap: $4.99;
  - Starter Pack (van upgrade, 2 machines, cash): $2.99, offered once after chapter 1;
  - Cosmetic machine wraps and lighting packs: $0.99–$2.99;
  - Premium machine models: cosmetic or slightly better stats, never required.
- No subscriptions, no energy systems, no paywalled automation.

---

## 10. Notifications (opt-in, few, useful)
- Types: "Machine empty", "Cash box full", "Local event starting nearby".
- At most 3 per day, none between 22:00 and 08:00 local time. Each type can be toggled in Settings.
- Scheduled locally from simulation projections; no server push in v1.

---

## 11. Age rating, legal & privacy
- **Target audience:** adults. Alcohol machines → expect a high App Store age rating (Apple's current scale, likely 17+/18+); answer the App Store Connect questionnaire honestly. Ads must use mature-audience settings accordingly.
- No real-money gambling. Capsules use in-game money only, with odds disclosed.
- No real brands or logos on products or machines. Real place names come from open data, with a non-affiliation note and a report or hide option.
- **Privacy:**
  - approximate location only, used once at onboarding (and when the player chooses "Use my area");
  - no location stored server-side;
  - local saves;
  - App Tracking Transparency prompt before personalized ads;
  - privacy nutrition labels must match.
- Credits and licenses screen (OSM ODbL, Overture, population source, weather source, fonts).

---

## 12. Milestones (about 24 weeks)

| Weeks | Milestone | Exit criteria |
|---|---|---|
| 1–2 | **Spikes** | MapLibre + custom style + PMTiles on device; fill-extrusion buildings with time-of-day interpolation; R3F close-up at 60 fps on iPhone 12; sprite atlas pipeline; h3-js on Hermes; Worker serving one city's cells |
| 3–6 | **Map & placement** | Real map, Spot Card from real cell data, place a machine, contract, sim produces sales in real time, local save |
| 5–9 | **Data pipeline** (parallel) | H3 res-9 pipeline for 9 cities + US; area check API; region downloads |
| 7–10 | **Close-up & service** | 3D restock, cash collection, repair, pricing, van capacity, offline catch-up + receipt |
| 10–13 | **Progression & automation** | Chapters 1–5, drivers, warehouse, telemetry, global upgrades, prestige |
| 12–16 | **World systems** | Real weather, time curves, local events, theft and breakdowns, AI rival |
| 14–17 | **Content** | All machine types and products, capsule and card series, collections binder, 9-city flavor and rules |
| 17–20 | **Monetization & services** | Rewarded ads, IAP, notifications, ATT, analytics, credits |
| 18–22 | **Polish** | Audio, haptics, onboarding, performance targets, accessibility, balancing pass |
| 22–24 | **Launch prep** | ASO assets (icon, 6.7" screenshots, preview video), TestFlight beta, App Store review |

Start an **App Store pre-order page** as soon as the art direction is locked (around week 6–8) to measure impressions for "vending machine simulator".

---

## 13. Acceptance checklist for v1
- [ ] A new player in a data-rich US city places a first machine and makes a first sale within 3 minutes.
- [ ] A player in a data-poor area (or who denies location) sees the 9-city picker with a clear explanation and can start immediately.
- [ ] Map lighting and 3D close-up lighting visibly match the city's real local time (for example, Tokyo at night while it's day in Chicago).
- [ ] Spot Cards show real nearby place names and categories, with a clear reason why a spot is good or bad.
- [ ] Restocking by hand is satisfying, and by chapter 3 nothing requires manual restocking.
- [ ] Offline report summarizes earnings, events and issues on return.
- [ ] Weather changes demand in ways the player can see (cold drinks spike in a heatwave).
- [ ] The rival places machines, competes and can be beaten.
- [ ] No forced ads; all ads are opt-in rewards.
- [ ] Performance targets met on iPhone 12; acceptable on iPhone XR or 11.
- [ ] Attribution and credits present; no real brand logos anywhere.

---

## 14. Open questions (decide during build)
1. Final in-game brand name (Coinline vs. alternatives); trademark check.
2. Exact commission and price-response numbers (balancing pass).
3. Whether van routes animate along real roads (needs routing data) or stay abstract (straight-line × 1.3).
4. Whether alcohol machines are available in all 9 cities, or follow local rules (recommended: follow local rules).
5. iCloud save backup in v1.1 vs. accounts in v2.
6. Which v2 shared-world model (per-city shards, async competition) to prepare for in the data model now.
