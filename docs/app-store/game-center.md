# Game Center setup (App Store Connect)

Everything App Store Connect needs for Coinline's Game Center: 1 worldwide weekly leaderboard, 1 all-time leaderboard and 16 achievements (our trophies). The ids are the single source in `src/config/gameCenter.ts` and must match exactly. Prepared 2026-11-06.

What the app does (`src/services/gameCenter.ts`, native code in `modules/game-center`):
- At launch it signs in silently only if the player already uses Game Center. It never shows Apple's sign-in sheet by itself; Settings has a "Sign in to Game Center" button for that.
- Scores: this week's sales (from the in-game city ranking, `src/sim/rankings.ts` `weeklyScore`) to the city's weekly board, and lifetime sales to the all-time board. Sent at most every 5 minutes while playing and when the app goes to the background. Values are **cents** (12345 = $123.45).
- Achievements: each trophy is reported at 100% when unlocked (and all earned ones again on each launch; Game Center ignores repeats). The completion banner is off because the game already celebrates trophies.

## 1. Developer portal

1. Certificates, IDs & Profiles → Identifiers → `app.coinline.vending` → enable **Game Center** (usually on by default for App IDs). Save.
2. Regenerate/refresh provisioning profiles (automatic signing does this). The app's entitlements now include `com.apple.developer.game-center` (from `app.json` → `ios.entitlements`).

## 2. App Store Connect → app 6831590229 → Features (or Services) → Game Center

Enable Game Center for the app if asked. Then create:

### Leaderboard: 1 recurring (weekly, worldwide) *(2026-11-08; replaces the 9 per-city boards, deleted before release)*

| Leaderboard ID | Reference name | Display name (en) | Start | Duration / restart |
|---|---|---|---|---|
| `coinline.weekly.world` | Weekly: worldwide | This week: worldwide | Monday 12:00 UTC (06:00 CST) | 7 days / 7 days |

Score format **Money – Dollar with decimal** (we submit cents), **Best score**, **High to low**. The start is Monday 12:00 UTC so every city's in-game week (local Monday 00:00) has begun before a new period opens. Per-city, state and country boards come later with our own server (SPEC §6.3).

### Leaderboard: 1 classic (all-time)

| Leaderboard ID | Reference name | Display name (en) | Type |
|---|---|---|---|
| `coinline.alltime` | All-time sales | All-time sales | Classic |

Same score format (Money, two decimals), Best score, High to low.

### Achievements: 16

For each: Reference name, Achievement ID, **Point value** (total 835 of 1000), **Hidden** as listed, **Achievable more than once: No**. Localization (English (U.S.) at least): **Title** = title below, **Pre-earned description** = description, **Earned description** = description. **Image: required**, 512×512 or 1024×1024 PNG (one trophy image reused for all is fine; flat low-poly style, no brands).

| Achievement ID | Reference name | Points | Hidden | Title (en) | Description (en) |
|---|---|---|---|---|---|
| `coinline.ach.first_sale` | Trophy: Open for business | 10 | No | Open for business | Make your first sale. |
| `coinline.ach.units_100` | Trophy: Regulars | 15 | No | Regulars | Sell 100 items. |
| `coinline.ach.units_10k` | Trophy: Household name | 60 | No | Household name | Sell 10,000 items. |
| `coinline.ach.sales_1k` | Trophy: Side hustle | 20 | No | Side hustle | Take $1,000 in sales. |
| `coinline.ach.sales_100k` | Trophy: Real business | 60 | No | Real business | Take $100,000 in sales. |
| `coinline.ach.sales_1m` | Trophy: Seven figures | 100 | No | Seven figures | Take $1,000,000 in sales. |
| `coinline.ach.machines_5` | Trophy: A route | 20 | No | A route | Run 5 machines. |
| `coinline.ach.machines_15` | Trophy: A network | 40 | No | A network | Run 15 machines. |
| `coinline.ach.machines_40` | Trophy: An operator | 70 | No | An operator | Run 40 machines. |
| `coinline.ach.machines_100` | Trophy: Coinline everywhere | 100 | No | Coinline everywhere | Run 100 machines. |
| `coinline.ach.first_driver` | Trophy: Delegation | 30 | No | Delegation | Hire your first driver. |
| `coinline.ach.first_research` | Trophy: Upgrades | 20 | No | Upgrades | Research your first upgrade. |
| `coinline.ach.full_set` | Trophy: Completionist | 60 | No | Completionist | Complete a collectible set. |
| `coinline.ach.beat_rival` | Trophy: Top operator | 100 | Yes | Top operator | Beat Brightvend for the city. |
| `coinline.ach.streak_7` | Trophy: Every day | 50 | No | Every day | Finish your daily orders 7 days in a row. |
| `coinline.ach.sold_company` | Trophy: Exit | 80 | Yes | Exit | Sell the company. |

Other languages: titles/descriptions exist in the game's i18n content catalogs (`src/i18n/locales/*/content.ts`, achievement entries) if you want to localize in ASC; English alone is enough to ship.

## 3. Attach to the version

App Store Connect → the iOS version (1.0) → **Game Center** section → turn on, then **add both leaderboards and all 16 achievements** to this version. Leaderboards/achievements go live with the version's review; after first release they can't be deleted (only hidden), and ids can't be reused.

## 4. Testing

- Simulator: Game Center sign-in mostly doesn't work; the app stays silent (the Settings section shows "Not signed in"). Use a device.
- Device (dev or TestFlight build): sign in under Settings app → Game Center with a **sandbox / test** Apple Account, open the game, play a few minutes or background the app, then Settings → Game Center → "Leaderboards and trophies". Leaderboards/achievements must exist in ASC (they work in sandbox before review).
