# App Store listing (ready to paste)

> **Status (2026-11-06):** entered in App Store Connect (app 6831590229): everything below, plus the review contact and notes. Left for the account holder: accept the updated Paid Apps agreement (Business), publish App Privacy (an attestation), and add in-app purchase review screenshots from a build with the store live. AdMob payments are set to the United States; identity verification comes later, at the earnings threshold. The public site is Cloudflare Pages (`coinline.pages.dev`, from `docs/site`, deployed with `npm run site:deploy`); `app-ads.txt` is at its root for AdMob.

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
| Privacy policy URL | https://coinline.pages.dev/privacy | Live |
| Support URL | https://coinline.pages.dev/support | Live |
| Marketing URL | https://coinline.pages.dev/ | Optional |
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

RESTOCK BY VAN
• Order stock and a delivery van loads at a real warehouse nearby
• Watch it drive the actual streets of your city to your machine
• One tap sends a van around every machine that's running low

GROW THE BUSINESS
• Five chapters, from side hustle to empire
• Hire drivers whose vans run your routes for you, rent a warehouse and buy smart machines with telemetry
• Research upgrades, complete collections, outplay a rival operator

A LIVING CITY
• A bright, low-poly city that follows your real day and night, with real weather
• People out on the streets, busy at rush hour and quiet at night
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
- Identifiers › **Device ID**: only when the player turns on personalized ads in Settings and allows tracking (AdMob). Purpose: third-party advertising. Entered as **linked to identity** (an advertising ID is device-level), and used for tracking.

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
| `coinline.double_profits` | Double Profits | Double Profits | Every sale pays double, forever | $4.99 |

Description lengths: 41, 40, 31 (all ≤ 45).

The cosmetic products (`coinline.wrap_night`, `coinline.wrap_linen`, `coinline.lighting_warm`) were dropped on 2026-11-06 and are no longer in the app. If they were created in App Store Connect, remove them before submission (or leave them unsubmitted so they never go to review).

**Double Profits review note:**
```
Double Profits is a one-time, non-consumable upgrade. After purchase, every in-game sale in every city also pays a bonus equal to the sale (in-game money only, so income from sales is doubled). It shows as "x2" on the cash display and "Owned" in the Shop, and is restored with Restore purchases. Everything in the game can still be reached without buying it.
```

## App Review information

**Sign-in required:** No.

**Notes for the reviewer:**
```
Coinline is a single-player vending business game on a real map. No account or login.

- On first launch the player can "Use my location" (approximate location, asked once, rounded to about 1 km on the device, never stored on a server) to play their own area, or pick one of 9 cities. Denying location simply shows the city list.
- Ads are optional rewarded ads only (for example, "x2 earnings"). They are requested as non-personalized. The App Tracking Transparency prompt appears only if the player turns on "Personalized ads" in Settings.
- In-app purchases are in Company tab › Shop, with a Restore purchases button. Double Profits (one-time) doubles in-game income from sales.
- The Starter Pack appears after chapter 1 (about 10 minutes of play: place the first machine, stock it, collect $1,000 in sales).
- Map data © OpenStreetMap contributors (ODbL), credited in Settings › Credits and licenses.
```

**Contact:** your name, phone and email (Apple only).

## Screenshots and preview video

Uploaded to App Store Connect in this order (video first):

0. `marketing/preview-iphone-886x1920.mp4`: 28 s App Preview. London map overview, the camera flies to The Grand Caffè, people walk up and sales pop. 886×1920, H.264 30 fps, silent stereo AAC track (Apple's spec).
1. `marketing/6.3in-01.jpg`: "Watch customers walk up and buy"
2. `marketing/6.3in-02.jpg`: "Build an empire on a real map"
3. `marketing/6.3in-03.jpg`: "Grow a side hustle into a tycoon"
4. `marketing/6.3in-04.jpg`: "Hit daily orders, earn trophies"

The 6.9" versions (`marketing/6.9in-NN.jpg`, 1320×2868) are there too if Apple asks for that size. `node scripts/brand/build-store-shots.mjs` rebuilds the framed versions from the raw Simulator captures in `screenshots/` (headlines are in the script).

Brand care: only machines at non-chain venues sell in these captures, so no real chain names appear (the game shows real place names from open map data, but store art shouldn't feature other companies' brands, guideline 5.2.1).

To retake the video: dev build on the iPhone 17 Pro Max Simulator, Metro started with
`EXPO_PUBLIC_QA_ROUTE='/qa?city=london&machines=3&stockOnly=2&cash=1840&sales=9&saleAt=m2&focusAt=m2&focusAfter=6000'`,
record with `xcrun simctl io <udid> recordVideo --codec=h264`, then encode as in `preview` above (scale to 886 wide, crop to 1920, 30 fps, add `anullsrc` audio). Hide the dev menu with `defaults write app.coinline.vending EXDevMenuShowFloatingActionButton -bool NO` (and `EXDevMenuShowsAtLaunch NO`).
