# Build report: Milestone 1 spikes and the v1 build

Date: 2026-11-05 · Branch: `claude/blissful-franklin-vjegr0`

This started as the week 1–2 spikes (SPEC §12). Then the brief changed to "build all milestones without stopping for confirmation". So this report covers both:
- the spike findings;
- what the full build contains, what is verified, what isn't, and the spec decisions I made without asking.

> **The most important caveat.** All the work ran in a Linux cloud container with **no iPhone, no simulator and no Xcode**.
>
> Verified here:
> - TypeScript strict type-check, ESLint and 85 Jest tests;
> - 40 Worker tests, plus a `wrangler dev` run with local R2;
> - a production iOS JS bundle compiled to Hermes bytecode (`expo export`);
> - headless renders of the map style and the 3D scenes.
>
> **Not verified:** a native build, on-device rendering, fps, gestures and store flows. I added a Diagnostics screen (long-press the version in Settings) so the on-device numbers can be collected in one pass.

---

## 1. Spike results

### 1.1 Scaffold
**Worked.**
- **App:** Expo SDK **58** (current stable), React Native 0.88.1, React 19.3, New Architecture, TypeScript 6 strict, expo-router.
- **Tooling:** ESLint (`eslint-config-expo` flat config, with a purity guard on `src/sim`), Prettier, and Jest with `ts-jest` (transpile only; `tsc` does the type-checking).
- **Layout:** SPEC §7.2.
- **Builds:** `eas.json` has development, preview and production profiles.

### 1.2 Map
**`pmtiles://` works natively. No Worker tile route is required.**
- `@maplibre/maplibre-react-native` 11.5.1 bundles MapLibre Native **iOS 6.31.0 / Android 13.6.1**. PMTiles support arrived in iOS 6.10 and Android 11.8.
- Remote `pmtiles://https://…` uses HTTP range requests. `pmtiles://file:///…` also works.
- The Worker still provides both routes:
  - `/pmtiles/{name}.pmtiles`, a raw archive with Range support, for native `pmtiles://`;
  - `/tiles/{name}/{z}/{x}/{y}.mvt` as a fallback.
- The app accepts either through `EXPO_PUBLIC_TILES_URL`.

**Custom style** (`src/map/style.ts`):
- Built over the Protomaps v4 schema: warm-gray land, slate water, sage parks, cooler roads.
- Buildings are `fill-extrusion` with OSM height (10 m default), so they read as an architect's model.
- Labels are minimal (districts, plus major roads from z16.5). No POI icons.

**Time of day** (`src/map/timeOfDay.ts`):
- suncalc gives the sun altitude and whether it's rising.
- Four presets (night, dawn, day, dusk) are blended by altitude, so at most two are active at once.
- The map `light` follows the sun's real bearing and elevation.
- The style is built once per city. Layers are rendered as RN `<Layer>` children, so the palette repaints in place every minute **without a style reload**. *Needs on-device confirmation.*

**Verified in headless Chromium:** I rendered the real style with MapLibre GL JS against a 6.6 MB Manhattan PMTiles extract at dawn, day, dusk and night. The results are in `docs/spikes/images/map-*.png`. There were no style errors and no missing images.

**Fixes found by rendering:**
- A saturated sun color turned every building orange at dusk. The light is now blended 70% toward white.
- Protomaps tags most Manhattan streets as `major_road`, so road labels now start at z16.5.

**Limitation (SPEC §3.5):** symbol layers always draw *over* fill-extrusions. A machine behind a tower looks like it sits on the roof. Options:
- (a) accept it;
- (b) fade sprites when pitch > 45° and zoom < 17;
- (c) move to a custom 3D layer if MapLibre RN ever exposes one.

### 1.3 3D close-up
**Built.** `src/three/MachineScene.tsx` is an R3F native scene:
- the procedural low-poly machine at real proportions (1.83 × 0.9 × 0.9 m), flat-shaded;
- one shadow-casting directional light, placed from the real sun bearing and altitude;
- hemisphere ambient, plus a warm light spill on the sidewalk after dusk;
- emissive fronts (screen, interior, header) ramping with `machineEmissive`.

R3F 9.8.2 still ships the native entry. `expo-gl` 58.0.4 fixes the WebGL2 `instanceof` regression that made three r163+ reject contexts.

**Bugs found while rendering, now fixed:**
- The cabinet was solid in front, so the products were invisible. It now has an open window bay.
- Night presets were too dark: unlit sides rendered black. Night and dusk ambient and key light are raised.

**Triangle counts:**

| Model | Triangles |
|---|---|
| Snacks | 812 |
| Rival | 812 |
| Alcohol | 680 |
| Tech | 572 |
| Drinks | 524 |
| Hot food | 476 |
| Capsules | 452 |

Five of the seven are below the SPEC's 800–3,000 range. That's fine for performance; add detail when real art arrives.

**fps:** *not measured* (no device). The close-up shows an fps readout in dev builds, and Diagnostics → "Show scene and measure fps" averages the last 10 seconds.

### 1.4 Map → 3D transition
**Built:**
1. Tapping a machine flies the map camera to zoom 20.5, pitch 60, facing the machine's front, over 1.2 s.
2. `mapCameraToScene()` converts that exact map frame into a three.js camera. It uses MapLibre's 36.87° vertical FOV and 512-pt tiles, and is unit-tested.
3. The close-up opens as a transparent modal, cross-fades in over 350 ms, then dollies to the close-up framing.
4. Back plays the reverse, and the map flies back to where you were.

Sprites are sized to true scale at high zoom (`iconSizeStops`), so the sprite and the 3D machine match at the crossfade. *The seamlessness needs eyes on a device.*

### 1.5 Sprite pipeline
**Built and run.** `npm run sprites`:
1. builds each model, exports a GLB (`assets/models/*.glb`), and loads the GLB back with GLTFLoader;
2. renders it orthographically in headless Chromium: 8 relative headings × 2 pitches (30°, 60°) × 3 lights (day, dusk, night);
3. covers 6 family models plus Brightvend: **336 PNGs, 1.02 MB**;
4. also writes an atlas (`assets/sprites/atlas.{png,json}`, MapLibre format, pixelRatio 2) for a future R2-hosted `sprite` URL.

The generated `src/map/spriteImages.ts` feeds the `<Images>` component.

**Spec conflict:** the spec says sprites should be "pitch-aligned". In MapLibre terms, `icon-pitch-alignment: map` would lay a standing machine flat on the ground. I used viewport alignment and chose the pre-rendered pitch and heading instead. MapLibre expressions can't read the camera bearing, so the current bearing bucket is injected into `icon-image` and only changes when the camera crosses a 45° boundary.

### 1.6 Data: h3-js on Hermes and the Worker
**h3-js:**
- **Compiles under Hermes.** RN 0.88's `hermesc` compiles it (315 KB bytecode), and the whole app bundle compiles to Hermes bytecode in `expo export`.
- **Runtime problem, fixed:** h3-js calls `new TextDecoder('utf-16le')` at module load (uber/h3-js#203). A UTF-8-only TextDecoder throws.
  - `src/data/textDecoderShim.ts` wraps TextDecoder with a small UTF-16LE decoder, without patching the package.
  - `src/data/h3.test.ts` reproduces the failure on a UTF-8-only decoder and passes with the shim.
- **Not run on a real Hermes VM.** Building Hermes from source here was blocked by the sandbox. Diagnostics → "h3-js on this engine" confirms it on the device.

**Worker** (`workers/data-api`), with **40 tests** that also passed under `wrangler dev` with local R2:
- `/area/check`: rounds the point to about 1 km first, applies the SPEC §6.2 thresholds, and logs only the res-5 cell for misses;
- `/cells/{res5}.bin` and `/city/{id}/pack`;
- `/weather`: an Open-Meteo proxy cached for 1 hour;
- `/tiles/...` and `/pmtiles/...` (Range support);
- `/health`.

---

## 2. What the v1 build contains

**Simulation** (`src/sim`, pure TypeScript, 85 tests across the repo, about 91% line coverage on the sim):
- the SPEC §5.2 demand model;
- logistic price response: ≈1.0 at 0.9×, 0.56 at 1.3×, 0.11 at 1.8×;
- weather in two ways: product fit, and how many people stop;
- events, competition, cash-box capacity and card readers;
- contracts with venue mood, renewal, termination and rival bids;
- breakdowns, a technician, theft (never deletes a machine), spoilage and alcohol fines;
- drivers with routes and auto-reorder, plus a warehouse;
- research applied globally per family;
- chapters 1–5, Brightvend (arrives in chapter 3, capped at 1.1× your fleet, retreats when you dominate), collections with disclosed odds, and prestige;
- offline catch-up (15-minute steps, 72 h cap, Remove Ads ×1.25);
- notification projections (max 3 a day, none 22:00–08:00);
- versioned save migrations.

**Data:**
- Bundled packs for the 9 cities, generated by `pipeline/` from the Protomaps OSM planet build: H3 res-9 cells with real named places in 15–18 categories. 1.1 MB in total.
- Per-city traffic calibration.
- Synthetic weather from climate normals when offline.

**Screens:**
- onboarding: cold open in your city's real light, approximate-location explanation, area check, 9-city picker;
- map: time-of-day style, machine sprites with status rings, clusters, rival machines, event pins, heat overlay, district boundary, live sale ticker, chapter goal, tutorial hints, ODbL attribution;
- Spot Card, with readable reasons and a "Report this place" option;
- contract sheet with a swipe-to-sign signature;
- 3D close-up: van crate, slot grid, price tags with a demand hint, coin tray with haptics and clinks, repair, renegotiation, wraps and spec tag;
- key ring, route clipboard, company (receipt-style P&L, research, permits, market share, prestige), collection binder, city switcher, shop, offline receipt, settings (including save export and import), credits, diagnostics.

**Services:**
- **Rewarded ads only:** AdMob, MA content rating, non-personalized unless you opt in under Settings, which is when ATT is asked.
- **RevenueCat purchases:** Remove Ads, Starter Pack (once, after chapter 1), cosmetic wraps.
- **Other:** local notifications, haptics, synthesized audio (10 WAVs, 1.8 MB), and PostHog event counts with no location and an allow-listed set of keys.

**Assets:** app icon, splash, Android adaptive icons, GLBs, sprites, audio and preview renders.

---

## 3. Spec conflicts and the decisions I made (please review)

You asked me not to stop for confirmation, so I picked an option for each of these and kept it to one knob or one file where possible.

1. **Pacing vs. the 1:1 clock (SPEC §4.8 vs §5.1 vs §5.4).** "Chapter 1 ($1,000 with the used machine) in 20–30 minutes" can't coexist with "$40–80 a day per starter machine" when one game minute equals one real minute: that's about 16 days.
   - **Decision:** the *world clock* stays real (hourly curves, lighting, weather). The *business clock* runs `TIME.salesTimeScale = 60`× faster.
   - All "per day" values (power, wages, contract terms of 30/90/180 days) are per business day, which is 24 real minutes.
   - **Result:** chapter 1 takes **24 minutes** in the test world and **25 minutes** at a 75th-percentile Manhattan spot (real-data test).
   - Knobs: `src/config/economy.ts` (`TIME.salesTimeScale`, `DEMAND_SCALE`, `CALIBRATION`).
2. **Per-city traffic calibration.** OSM density varies a lot: district-1 75th-percentile noon traffic was 53 in Singapore and 4,867 in Paris. Each city's cells are scaled so downtown p75 hits the same target. Pacing is equal everywhere, and spots within a city keep their real differences.
3. **City centers.**
   - Singapore's spec coordinate (1.3521, 103.8198) sits inside the central nature reserve, with almost no places. Moved to **Downtown Core** (1.2834, 103.851).
   - Tokyo's (35.6762, 139.6503) is residential Setagaya. Moved to **Shinjuku** (35.6896, 139.7006).
   - Both packs were rebuilt: Singapore went from 531 to 2,238 named places.
4. **Data sources.**
   - Places come from **OpenStreetMap** (via the Protomaps planet build), not Overture.
   - Population is **estimated from OSM building footprints and heights**, not WorldPop or GHSL. Magnitudes are right, but per-cell numbers are rough.
   - Both are in the SPEC §6.4 family, and `pipeline/README.md` documents the Overture/WorldPop upgrade path.
5. **Persistence:** JSON files through `expo-file-system` (atomic temp file and move) instead of MMKV or SQLite. There's no extra native module, and saves are small.
6. **Typeface on the map:** map labels use Protomaps' hosted **Noto Sans** glyphs. Instrument Sans needs generated SDF glyph PBFs (maplibre/font-maker) hosted on R2.
7. **Restocking interaction:** "drag to restock" is implemented as **tap to load** (pick a product, tap a slot, or "Fill all"), plus one commit per van trip. Drag is a polish item.
8. **Telemetry** is one global research item from chapter 2, not a per-machine upgrade. Without it you see what you saw on your last visit.
9. **Starting cash:** $300 plus the owned used machine. **Price setting** unlocks after chapter 1, as SPEC §4.8 says; the tutorial shows suggested prices.
10. **Alcohol** follows local rules (SPEC §14 Q4): allowed in JP, KR, US, GB, FR and AU, not in Singapore. Sake/soju machines are JP and KR only.

---

## 4. Performance numbers

| Measure | Result | Target |
|---|---|---|
| Offline catch-up, 72 h, early game (1–15 machines) | ≪ 100 ms (V8) | < 300 ms |
| Offline catch-up, 72 h, 200 machines | 500–800 ms (V8, `scripts/bench/offline-catchup.ts`) | < 300 ms |
| iOS JS bundle (Hermes bytecode) | 8.9 MB | — |
| City packs | 21–238 KB each, 1.1 MB total | < 2 MB per region |
| Sprites | 336 × 96×144 PNG, 1.02 MB | — |
| fps, cold start, map memory | **not measured (no device)** | 60 fps on iPhone 12, < 3 s cold start |

Hermes has no JIT, so expect the 200-machine catch-up to take about 2–4 s on a device. Three ways to cut it:
- coarser steps while nothing changes;
- run catch-up off the JS thread (worklets);
- show the "While you were away…" receipt printing while it computes.

The late-game number needs work before launch.

---

## 5. Not production-ready yet: what's left and who has to do it

| Item | Who / what |
|---|---|
| ~~Tile hosting~~ **Resolved (2026-11-06):** the default is OpenFreeMap's free public instance (no key, commercial use allowed, no SLA). Self-hosting on the R2 free tier is the fallback (`docs/hosting.md`) | Optional: deploy the Worker + R2 as a backup |
| Native build and device QA (fps, transition, gestures, MapLibre `<Layer>` live repaint, R3F GLView under new architecture) | Run `eas build --profile development` and use Diagnostics |
| AdMob app IDs and units (currently Google **test** IDs in `app.json`), RevenueCat keys, App Store Connect products (`coinline.*`) | Your accounts |
| ~~Weather licensing~~ **Resolved (2026-11-06):** MET Norway (free, no key, CC BY 4.0, commercial use allowed), via the Worker or directly from the app | — |
| "Your area" regions: only the 9 cities are computed, so other areas get the city picker | Run the pipeline over regions (US first, per SPEC §6.5) |
| Holidays table covers 2026–2028 | Regenerate with `date-holidays` |
| Trademark check for "Coinline" (SPEC §14 Q1), ASO screenshots and preview video, privacy nutrition labels, age-rating questionnaire | Launch prep |
| Accessibility audit (VoiceOver pass, Dynamic Type at the largest sizes) | Device |
| Balancing beyond chapter 1 (chapters 2–5, prestige timing) | Playtest; all numbers are in `src/config` |

## 6. Testing on a device

```bash
npm install
```

```bash
npx eas-cli@latest build --profile development --platform ios
```

```bash
cd workers/data-api && npm install && npx wrangler dev --ip 0.0.0.0
```

```bash
EXPO_PUBLIC_DATA_API_URL=http://<your-mac-lan-ip>:8787 npm start
```

Then on the phone, go to Settings and long-press the version number to open Diagnostics. Run:
- h3;
- offline catch-up with 15 and 200 machines;
- "Show scene and measure fps".

These are the remaining spike numbers.
