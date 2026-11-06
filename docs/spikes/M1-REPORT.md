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

---

## 7. First native build attempt (2026-11-05, macOS 15.7.4)

This pass ran on a Mac, but **Xcode is not installed** (only the Command Line Tools), so there is still no compiled app, Simulator run or device run. Everything up to the Xcode compile step was done and passes.

### What passes
- `npm run typecheck`, `npm run lint` (now clean on a fresh clone, see below), `npm test`: **157 tests** in 15 suites.
- Worker: 41 tests (`workers/data-api`, vitest).
- `npx expo-doctor`: 18/18 checks.
- `npx expo prebuild --platform ios`: generates the project with every config plugin (MapLibre, expo-gl, google-mobile-ads, RevenueCat, location, notifications, tracking transparency).
- `pod install`: resolves and installs. Key pods: ExpoGL 58.0.4, Google-Mobile-Ads-SDK 13.10.0, RNGoogleMobileAds 17.4.0, RevenueCat 5.99.0 / PurchasesHybridCommon 19.17.0, MapLibreReactNative 11.5.1 (MapLibre Native itself comes in through SwiftPM, resolved by Xcode at build time).
- `expo export --platform ios`: Hermes bytecode bundle, **9.4 MB**.

### Fixed in this pass
1. **RevenueCat pods would not install.** `react-native-purchases` 11.x pins `PurchasesHybridCommon` 20.x, which RevenueCat has not published to CocoaPods: per their 20.0.0 release notes, CocoaPods trunk is read-only until after Nov 7, so 20.x is SwiftPM-only for now. Pinned `react-native-purchases` to **10.16.0** (PurchasesHybridCommon 19.17.0, on trunk). The app only uses `configure`, `getCustomerInfo`, `getProducts`, `purchaseStoreProduct` and `restorePurchases`, which are unchanged. **Return to 11.x once 20.x appears on trunk.**
2. **Location permission strings.** The expo-location plugin added generic "Always" usage strings, a temporary full-accuracy string and a motion string, even with background location off. They're now disabled (`false`), and `NSLocationDefaultAccuracyReduced` is on, so iOS offers approximate location by default. This matches the approximate-only rule; the onboarding request was already `Accuracy.Lowest`.
3. **`newArchEnabled` removed from `app.json`.** It's no longer a valid key: the New Architecture is always on.
4. **Root lint failed on a fresh clone** because `pipeline/` and `workers/data-api/` are separate npm packages whose `node_modules` aren't installed. `import/no-unresolved` is off for those two folders; they have their own `tsc`.
5. **An orbit drag that starts on a slot also selected it.** Found by reading the event path, not on a device:
   - R3F's native canvas fires `click` from `onPanResponderEnd` when the finger moved < 20 pt.
   - The orbit Pan (gesture handler) activates at 12 pt and cancels the JS touch.
   - React Native dispatches `responderEnd` for a cancel as well as for a lift.
   - So every horizontal drag that began on a slot also selected that slot, with a haptic tick.

   `src/three/life/tapGate.ts` holds 3D clicks while the Pan is tracking a touch, and fires them only if the Pan never activated. It doesn't depend on the order of the two event streams; 5 unit tests cover both orders. Orbiting does **not** block taps: the Pan doesn't delay touches, and taps under 12 pt reach the canvas unchanged. The guard window is `CLOSEUP_MOTION.orbitTapGuardMs`.

### Audio, checked offline
Decoded with `afconvert`, which uses the same Core Audio decoder as AVFoundation. expo-audio loops with an `AVQueuePlayer` that re-enqueues the item, so playback is gapless if the decoded file is.

| Loop | Decoded length | Seam jump ÷ file's 99.9th-pct sample step | Silent head/tail |
|---|---|---|---|
| amb-birds / crickets / crowd / rain / traffic / wind | 24 / 16 / 24 / 12 / 20 / 20 s (exact) | 0.24 / 0.00 / 0.62 / 0.13 / 0.41 / 0.24 | none |
| city-day / city-night | 16 / 16 s | 0.74 / 0.51 | none |
| music-day / music-night | 91.429 / 71.111 s | 0.04 / 0.16 | none |
| hum.wav | 2 s | 0.33 | none |

- **Loop clicks: none in the files.** The MP4 edit lists are honored: lengths are exact with no AAC priming or padding, and every seam is smaller than the file's normal sample-to-sample motion. A click heard on a device would come from the player (queue item hand-off), not the assets.
- **Crowd vs. hiss:** `amb-crowd` has 99% of its energy below 1 kHz, spectral flatness 0.002 (white noise ≈ 1) and 35% of its envelope modulation at the 2–8 Hz syllable rate. It shouldn't read as hiss. With only 3% of energy in 1–3 kHz, it may sound muffled. Rain is the only hiss-like bed (flatness 0.59), which is correct for rain.

### Still not measured (need Xcode and a device)
- Diagnostics: h3 on Hermes, offline catch-up (15 and 200 machines), 3D fps.
- Playthrough: onboarding, first machine, restock, sale, collect, zoom 17+ street life, close-up transition, frame drops, visual bugs, audio heard on hardware, and orbit-vs-tap on a real touchscreen.

To continue, install Xcode (Xcode 26+ from the App Store), run `sudo xcode-select -s /Applications/Xcode.app`, then `npx expo run:ios`. The `ios/` folder is generated and gitignored; `npx expo prebuild --clean` regenerates it.

### Update: first native build (same day, Xcode 26.3)

**The app builds, installs and runs on the iPhone 17 Simulator (iOS 26.2).** Two blocking bugs were fixed:

1. **`expo-modules-jsi` 58.0.22 doesn't compile with Xcode 26 (Swift 6.2.4):** "sending 'slot' risks causing data races" in `withEncodedValue`. Expo builds SDK 58 against Xcode 27 (Swift 6.4), and 58.0.21 added the function. `patches/expo-modules-jsi+58.0.22.patch` (patch-package, applied on `npm install`) passes the pointer through the package's own `UncheckedSendable`, the same idiom its host-function path uses. **Drop the patch when Expo ships a fix, or when the project moves to Xcode 27.**
2. **Every screen with the 3D scene failed to load** ("undefined is not a function"). R3F's native bundle `require`s three, which resolves to `three.cjs`. Since r18x that file calls `process.emitWarning` at load, a Node API that React Native lacks. It was also a second copy of three next to the ESM build. `metro.config.js` now resolves every `three` import to `three.module.js`. Jest and the headless renders couldn't catch this: Node has `process.emitWarning`.

**Unattended QA:** `EXPO_PUBLIC_QA_ROUTE='/diagnostics?run=all' npm start` opens Diagnostics at launch in dev builds. It runs every check and prints `[diag]` lines to the Metro log. Ignored in release builds.

**Diagnostics on the iPhone 17 Simulator (Hermes, Apple-silicon Mac; a proxy, not the device):**

| Check | Result | Target |
|---|---|---|
| h3-js on Hermes | works: 2,000 × latLngToCell + gridDisk in 203–215 ms | — |
| Offline catch-up 72 h, 15 machines | **186–214 ms** | < 300 ms ✅ |
| Offline catch-up 72 h, 200 machines | **1,401–1,434 ms** | < 300 ms ❌ (§4 options still apply) |
| 3D close-up, busy street | **59.1 fps avg, 53 min** (10 s), 5 walkers, 2 cars, 6,742 tris | 60 fps |

**iPhone 13 mini (iOS 26.6.2): not built yet.** xcodebuild: "The developer disk image could not be mounted on this device". Xcode 26.3 doesn't support iOS 26.6. Fix: update Xcode (26.4+), then `npx expo run:ios --device`. The signing team is set only in the generated, gitignored `ios/` project.

**Playthrough:** not done. This session has no way to tap the Simulator: no Accessibility permission, and installing a third-party Simulator driver was not allowed. Onboarding and Diagnostics render. The user's review of the first screens asked for a UI redesign (full-screen map, bottom sheets, less text, globe zoom-out), which supersedes a QA pass of the current screens.

---

## 8. Simulator QA and the redesign (2026-11-05, later the same day)

### Latest numbers (iPhone 17 Simulator, Hermes, Apple-silicon Mac)

| Check | Result | Target |
|---|---|---|
| h3-js, 2,000 × latLngToCell + gridDisk | 180 ms | — |
| Offline catch-up 72 h, 16 machines | **140 ms** | < 300 ms ✅ |
| Offline catch-up 72 h, 200 machines | **1,015 ms** (was 1,400–1,700); **1,442 ms** after the balance fix below, with adaptive steps | < 300 ms ❌ |
| 3D close-up, busy street | 58 fps avg, 55 min | 60 fps |

The catch-up speedups keep the simulation bit-identical. Tests compare the incremental competition against a full rebuild, and the benchmarks' final cash, units, lost contracts and rival fleet are unchanged:
- competition is updated incrementally instead of rebuilt; it had been rebuilt every step once any contract was lost;
- nested fit caches replace string keys;
- place affinity is cached per cell and tag.

In Node: 274 → 98 ms (synthetic) and 150 → 115 ms (`scripts/bench/offline-catchup-real.ts`, which mirrors Diagnostics).

**Still over target at 200 machines.** The remaining lever changes the simulated outcome, so it's the owner's call. Options:
- coarser steps for long absences, e.g. 15 min for the first 6 h, then 60 min (`TIME.offlineStepMinutes`; about 3× faster);
- run catch-up off the JS thread;
- show the "While you were away" receipt printing while it computes.

**Balance note:** in both 200-machine benchmarks every contract is lost within 72 h when nobody restocks or collects. Worth checking that venue mood isn't too harsh for absent players with drivers.

**Update: balance fixed, catch-up reworked.**
- Venue mood, breakdowns, theft and alcohol fines ran per *business* day (the clock is 60×), so one real night away cost most contracts. They now run on real time:
  - mood changes per real hour; a venue ends the contract after 24 real hours below 0.2 (`CONTRACT`);
  - risks roll at `RISK.riskDaysPerRealDay` = 4.
  - In the realistic bench only 17 of 200 contracts are lost in 72 h.
- Because machines keep selling while you're away, catch-up does more work. **Adaptive steps** (owner's choice): 15-minute steps for the first 3 hours away, then 1-hour steps (`TIME.offlineFineHours`, `offlineCoarseStepMinutes`).
- Hermes numbers: 16 machines **146 ms** ✅; 200 machines **1,442 ms** ❌. In Node the same 200-machine run takes 133 ms.
- Returning to the app after 5+ minutes shows a "While you were away… COUNTING COINS" overlay for one frame, then runs the catch-up (`useGame.resume`, `src/ui/CatchUpOverlay.tsx`). The cold start already shows the loading screen.
- 200 machines is a late-game fleet. If the wait feels long on a device, the next step is moving catch-up off the JS thread (a worklet or a native module, which needs the owner's OK).

**Update 2: Release build, exact speedups, sliced catch-up (2026-11-06).**
- Profiling: `node --jitless` (V8 without its JIT) runs the realistic bench in ~1.3 s, close to Hermes. It's a usable local proxy for profiling Hermes.
- Exact speedups (final cash, units and lost contracts unchanged in both benches):
  - traffic and fit cached per (local hour, day type) across steps;
  - sales multiplier cached per family per step;
  - scratch arrays in `sellStep`, plain loops instead of `map`/`forEach`;
  - RNG inlined into the Knuth Poisson loop;
  - no tag-boost work when no event is near;
  - one sell context per step.
  - About 15–20% faster in the interpreter proxy (Node with JIT: 124 → 99 ms).
- **Release build, Hermes, iPhone 17 Simulator** (`diagnostics?run=all`, 3 runs):

  | Check | Result | Target |
  |---|---|---|
  | h3-js, 2,000 × latLngToCell + gridDisk | 82 ms | — |
  | Offline catch-up 72 h, 16 machines | **84–88 ms** | < 300 ms ✅ |
  | Offline catch-up 72 h, 200 machines | **752–784 ms** (debug, old code: 1,442) | < 300 ms ❌ |

  Most of the gain is Release vs debug; I didn't measure the old code in Release.
- **Sliced catch-up.** `beginAdvance()` runs the catch-up a few steps at a time. Any chunking gives exactly the same state and report as `advance()` (`src/sim/advanceJob.test.ts`).
  - Returning after 5+ minutes runs it in ~12 ms slices (`TIME.catchUpSliceMs`), so the app never freezes. The coin-counting overlay's LED meter fills as it goes, and actions wait until it finishes.
  - The 300 ms target was about a frozen screen; with slicing the screen stays live, so 200 machines now means a short progress meter rather than a hang.
  - Cold start still catches up in one go behind the loading screen (native spinner).
- The Diagnostics auto-run (`coinline://diagnostics?run=all`) also writes its log to `Documents/saves/diagnostics-log.json`. Release builds don't send `console.log` to the system log, so this is how to read device numbers.

### Bugs found on the Simulator and fixed
- **Every map overlay was invisible on iOS** (machines, cars and people, events, district boundary, heat). MapLibre RN adds a GeoJSON source to the style that's current when it mounts. On iOS the map first loads its default style, then ours, so all overlay sources were dropped. Overlays now mount after our style loads.
- Three.js CJS build crash (`process.emitWarning`) on every 3D screen; patched `expo-modules-jsi` for Xcode 26. See §7.
- Orbit drag selected the slot it started on. See §7.

### Redesign (owner's direction)
- **Art direction** (SPEC §3, CLAUDE.md): bright flat-shaded low-poly. The UI is a **vending machine skin**, not app panels:
  - cabinet backgrounds, marquee titles and glass windows;
  - keypad keys that press down;
  - LED displays and segment bars;
  - chrome label plates.
- **Map-first:** full-screen map with LED cash, an LED clock/weather strip with day/night and weather icons, and round keypad buttons (settings, 3D/top-down, busy streets, locate). A gorhom home sheet holds the chapter goal, actions and fleet; the spot sheet opens over the map.
- **Globe:** pinch far out for a flat-shaded low-poly SVG globe lit by the real sun, with the unlit side dark and a pin per city.
- **Less text everywhere:** icon chips, locked-feature cards, numbers before sentences.
- **Product art:** 48 unbranded game icons, made with ChatGPT image generation (`scripts/products/PROMPTS.md`) and sliced by `scripts/products/slice.mjs`. They show on the coils, in the restock picker and in the cold open.
- **Brand:** Nunito font, tangerine icon and splash (`scripts/brand/build-flat-brand.mjs`).

### Open issues
- **3D in the Simulator is unreliable.** After many relaunches its GL stops presenting frames until the Simulator is rebooted. The close-up opened from the map shows only sky, and its JS frame loop stalls; the scene renders fine from Diagnostics. The likely cause is software GL in the Simulator with a far start camera (the whole street, with shadows, at 1206² px), but it isn't proven. **Check on a real iPhone first.** That needs Xcode 26.4+ for iOS 26.6.
- **expo-gl only presents the first frame or two in the iOS 26.2 Simulator.** Two screenshots 3 s apart show 0 changed pixels in any 3D view (Diagnostics included), while the JS frame loop runs at ~58 fps; the "fps" numbers above are JS loop rates, not presented frames. This explains the blank close-ups and the camera that looked stuck at the map frame (it is at the close-up position, 3.71 m, but those frames never reach the screen). Antialiasing on or off makes no difference. **Check 3D on a real iPhone**; if it reproduces there, it's an expo-gl bug to report upstream.
- **The close-up as a transparent modal over the live map deadlocked the JS thread** (no timers fire after its second render). It's now a regular screen with a fade (`app/(game)/_layout.tsx`), and JS stays alive.
- No tap automation was available here, so the full playthrough (place, restock, collect, orbit) hasn't been done by hand. The flows were checked with temporary auto-triggers and screenshots.
