# Google Play listing (ready to paste)

Prepared 2026-11-08 for the first Android release. The Android app is built on EAS (`npx eas build -p android --profile production`, project `@wrys/coinline`; the upload keystore is kept by EAS, and Play App Signing holds the app signing key).

## Before anything: the developer account

A Google Play developer account is needed (one-time $25, identity verification). **New personal accounts must run a closed test with at least 12 testers for 14 days before they can apply for production access.** Organization accounts (D-U-N-S number) skip that. Plan: create the app, upload the AAB to **Closed testing**, invite 12+ testers, then apply for production.

## App details

| Field | Value |
|---|---|
| App name (30) | `Coinline: Vending Tycoon` |
| Default language | English (United States) |
| App or game | Game |
| Free or paid | Free |
| Category | Simulation |
| Tags | Business sim, Tycoon, Idle, Casual, Offline |
| Contact email | (your support email) |
| Website | https://coinline.pages.dev/ |
| Privacy policy | https://coinline.pages.dev/privacy |
| Package | `app.coinline.vending` |

## Short description (80 max)

```
Run vending machines on a real map of any city and grow a global empire.
```
(72)

## Full description (4,000 max)

Same text as the App Store description in `docs/app-store/listing.md` (it is under 2,000 characters and has no iOS-only claims).

## Graphics

| Asset | Spec | File |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | `docs/play-store/icon-512.png` |
| Feature graphic | 1024×500 JPG/PNG | `docs/play-store/feature-1024x500.png` |
| Phone screenshots | 2–8, 16:9 or 9:16, 320–3840 px | `docs/app-store/marketing/6.9in-NN.jpg` (1320×2868 is within limits but not 9:16; Play accepts aspect ratios up to 2:1, and 2868/1320 = 2.17, so use the 1080×1920 versions in `docs/play-store/shots/`) |
| Video (optional) | YouTube URL | — |

## Content rating (IARC questionnaire)

Category: Game. Violence none; sexuality none; language none; controlled substances: **references to alcohol** (beer and wine machines in some cities); gambling: no real-money gambling, no simulated gambling; user interaction: no chat, no user content; shares location: **no** (approximate location used on device only); digital purchases: **yes**. Expected: PEGI 12 / ESRB Teen-ish on alcohol references, or lower.

## Target audience

13+ (not designed for children). Not in Designed for Families.

## Ads

Contains ads: **Yes** (optional rewarded ads only, AdMob).

## Data safety

| Data type | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Approximate location | No (used on device only, rounded, not stored) | — | — | — |
| App interactions (Analytics) | Yes (PostHog, anonymous) | No | Analytics | Yes (Settings) |
| Device or other IDs | Yes (advertising ID, AdMob; install ID) | Yes (AdMob) | Advertising, Analytics | Ads ID only when personalized ads are on |
| Crash logs / Diagnostics | Yes (AdMob SDK) | Yes | Advertising | No |
| Purchase history | Yes when store is enabled (RevenueCat) | No | App functionality | — |

Data is encrypted in transit: Yes. Users can request deletion: saves are local only; analytics are anonymous (delete the app to remove everything).

## In-app purchases (later)

The Android build ships without the store (no RevenueCat Android key yet), so the Shop's paid items don't appear. To add them: create the three products in Play Console (same IDs as iOS), link Play to RevenueCat with a service account, set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` in `eas.json`, and ship an update.

## Release notes (first release)

```
The first version of Coinline. Start your vending business on a real map of any city.
```
