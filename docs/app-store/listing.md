# App Store listing (ready to paste)

Everything App Store Connect asks for, with Apple's limits checked. Prepared on 2026-11-06.

## App information

| Field | Value | Notes |
|---|---|---|
| Name | `Coinline: Vending Tycoon` | 24/30. A game called "Coin Line" (Naoya Sangu) already exists, so the bare name risks a clash; this one is unique and carries search words |
| Subtitle | `Run machines on a real map` | 26/30 |
| Bundle ID | `app.coinline.vending` | Register it under Certificates, IDs & Profiles first |
| SKU | `coinline-ios-1` | Any unique string |
| Primary category | Games › Simulation | |
| Secondary category | Games › Strategy | |
| Content rights | Uses third-party content: **Yes** | OpenStreetMap / OpenFreeMap map data (ODbL), credited in-app |
| Privacy policy URL | https://wryz.github.io/Vending-Machine-Simulator/site/privacy.html | Live |
| Support URL | https://wryz.github.io/Vending-Machine-Simulator/site/support.html | Live |
| Marketing URL | https://wryz.github.io/Vending-Machine-Simulator/site/ | Optional |
| Copyright | `2026 <your legal name or company>` | |
| Price | Free | |
| Availability | All countries, or start with the US, UK, Canada, Australia | The 9 data-rich cities include New York, LA, Chicago, London, Paris, Tokyo, Seoul, Singapore, Sydney |

## Promotional text (170 max, editable without review)

```
Your city, real sales. Place vending machines on a real map, watch customers walk up to buy, and grow one used machine into a citywide empire.
```
(142)

## Description (4,000 max)

```
Start with one used vending machine and grow it into a citywide empire, on a real map of your own city.

Every spot sells like the real world: how many people live and walk by, what's around it (offices, schools, gyms, stations, parks), the real local time and the real weather. A cold drink by a station sells out in a heatwave. A coffee machine outside an office crowds at 8 am and goes quiet on Sunday.

FIND THE SPOT
• Tap anywhere on your city to see who passes by, when, and why it's a good spot (or not)
• Sign a deal with the venue, pick your machine, and set it facing the street

STOCK WHAT SELLS
• Snacks, cold drinks, coffee, hot food, capsule toys and more, all invented brands
• Set your prices, fill the coils, and watch customers walk up to buy
• Collect the coins before the cash box fills

GROW THE BUSINESS
• Five chapters, from side hustle to empire
• Hire drivers, plan routes, rent a warehouse and buy smart machines with telemetry
• Research upgrades, complete collections, outplay a rival operator

A LIVING CITY
• A bright, low-poly city that follows your real day and night, with real weather
• Cars and people on the streets, busy at rush hour and quiet at night
• Zoom out to the globe to see every city you run

PLAY YOUR WAY
• Your machines keep selling while you're away
• No accounts: your save stays on your phone
• Ads are optional rewards only; there are never forced ads

Map data © OpenStreetMap contributors, © OpenFreeMap, © OpenMapTiles. Weather from MET Norway. All products and brands in the game are invented.
```

## Keywords (100 bytes max, comma-separated, no spaces after commas)

```
simulator,idle,business,empire,snack,drink,shop,store,manager,city,cash,coin,money,gps,real world
```
(97). Words already in the name and subtitle (vending, tycoon, machines, real, map) are indexed anyway, so they're not repeated.

## What's New (version 1.0)

```
The first version of Coinline. Start your vending business on a real map of your city.
```

## Age rating questionnaire

Answer as below; expect **13+** (Apple's current tiers), driven only by alcohol references.

| Question | Answer | Why |
|---|---|---|
| Alcohol, tobacco or drug use or references | **Infrequent/mild** | Beer machines exist in some cities (age-check upgrade, fines for underage sales) |
| Violence (cartoon/realistic), horror, profanity, mature themes, sexual content, nudity | None | |
| Medical or treatment information | None | |
| Gambling (real money) | No | |
| Simulated gambling | None | |
| Contests | No | |
| Loot boxes (paid random items) | **No** | Capsule pulls are free or earned with an optional ad; no paid item contains pulls. Keep it that way, or Apple requires published odds |
| Unrestricted web access | No | Only fixed links to the privacy and support pages |
| User-generated content / messaging / chat | No | |
| Advertising | Yes | Optional rewarded ads |
| Age assurance / parental controls | No | |

## App Privacy ("nutrition labels")

Based on the code (`src/services/analytics.ts`, `ads.ts`, `purchases.ts`, `src/data/api.ts`) and the SDKs' own disclosures. Google publishes AdMob's data list; RevenueCat its own.

**Data used to track you**
- Identifiers › **Device ID**: only when the player turns on personalized ads in Settings and allows tracking (AdMob). Purpose: third-party advertising.

**Data not linked to you**
| Data type | Collected by | Purposes |
|---|---|---|
| Usage Data › Product Interaction | PostHog (optional, on by default), AdMob | Analytics; Third-party advertising |
| Usage Data › Advertising Data | AdMob | Third-party advertising |
| Location › Coarse Location | AdMob (derived from IP for ads) | Third-party advertising |
| Diagnostics › Crash Data, Performance Data | AdMob SDK | Third-party advertising |
| Purchases › Purchase History | RevenueCat | App functionality |
| Identifiers › User ID | Random install ID (PostHog, RevenueCat) | Analytics; App functionality |

**Not collected:** the player's location for gameplay. The approximate position is rounded to about 1 km, used once to choose the map area, and not stored. Apple doesn't count data processed only in real time and not retained, so it isn't declared. No contact info, contacts, photos, health or financial data are collected.

## In-app purchases

Create these under **Monetization › In-App Purchases** (all **Non-Consumable**). Each needs a localized display name (30 max), description (45 max), price, and a review screenshot of the Shop.

| Product ID | Reference name | Display name | Description | Price |
|---|---|---|---|---|
| `coinline.remove_ads` | Remove Ads | Remove Ads + Longer Breaks | No ad offers, 25% longer offline earnings | $4.99 |
| `coinline.starter_pack` | Starter Pack | Starter Pack | Van upgrade, 2 snack machines and $2,000 | $2.99 |
| `coinline.wrap_night` | Night Shift Wrap | Night Shift Wrap | A dark, quiet machine wrap. Cosmetic. | $0.99 |
| `coinline.wrap_linen` | Linen Wrap | Linen Wrap | A warm off-white machine wrap. Cosmetic. | $0.99 |
| `coinline.lighting_warm` | Warm Lighting | Warm Lighting Pack | Warm product lighting at night. Cosmetic. | $1.99 |

Description lengths: 41, 40, 37, 40, 41 (all ≤ 45).

## App Review information

**Sign-in required:** No.

**Notes for the reviewer:**
```
Coinline is a single-player vending business game on a real map. No account or login.

- On first launch the game asks for approximate location to build your city. You can decline; the game then offers a list of 9 cities and plays the same.
- Ads are optional rewarded ads only (for example, "x2 earnings"). They are requested as non-personalized. The App Tracking Transparency prompt appears only if the player turns on "Personalized ads" in Settings.
- In-app purchases are in Company tab › Shop, with a Restore purchases button.
- The Starter Pack appears after chapter 1 (about 10 minutes of play: place the first machine, stock it, collect $1,000 in sales).
- Map data © OpenStreetMap contributors (ODbL), credited in Settings › Credits and licenses.
```

**Contact:** your name, phone and email (Apple only).

## Screenshots

6.9" (1320 × 2868, iPhone 17 Pro Max Simulator, standard 9:41 status bar), in `docs/app-store/screenshots/`. Apple scales them down for smaller iPhones. Upload in this order:
1. `6.9in-01-sheet-2.jpg`: a customer reaches the machine at Trafalgar Square and the sale lands; the machine's sheet below
2. `6.9in-02-map-1.jpg`: the London map with three machines, real daylight
3. `6.9in-03-company-1.jpg`: chapter progress and finances
4. `6.9in-04-orders-1.jpg`: daily orders and trophies

Left out on purpose: frames naming real chains (the key ring listed Costa and Waterstones; Tokyo's sale pills named GU and Maruhan). The game shows real place names from open map data, but store art shouldn't feature other companies' brands (guideline 5.2.1).

To retake: run the dev build on the iPhone 17 Pro Max Simulator with `EXPO_PUBLIC_QA_ROUTE='/qa?city=london&machines=6&cash=1840&sales=5&saleAt=m2&to=%2Fmap%3Ffocus%3Dm2'` (see `app/qa.tsx`), and hide the dev menu with `xcrun simctl spawn <udid> defaults write app.coinline.vending EXDevMenuShowFloatingActionButton -bool NO`.
