# Coinline v2: shared customers online

Status: design, 2026-11-08. Owner decisions so far: players should share the same customers (real players' machines compete for the same foot traffic); the game must stay playable offline; the AI rival leaves cities once real players are there. Nothing here ships in 1.0. Groundwork already in the app: the action log (schema v10, `src/sim/actionLog.ts`) and a fully deterministic sim.

## 1. Goal

A city is a shared market. Your machines and other players' machines stand in the same streets, and the customers at a spot are split between everyone's machines (plus shops) by the same rules the game uses today against the rival: distance, price, stock, fit and visibility (`competitors` in `src/sim/advance.ts`). Leaderboards per neighbourhood, city, state, country and world come from the same settled numbers.

## 2. Principles

1. **The sim stays the single source of rules.** The phone and the server run the same TypeScript (`src/sim`), so their numbers agree exactly. No second implementation on the server.
2. **The phone predicts, the server settles.** The phone keeps playing instantly (online or not). The server is the referee for anything shared: the customer split, spot claims, exclusive contracts and scores.
3. **Offline is a first-class mode.** Offline play keeps earning from a snapshot of the city; the server settles the real result on reconnect. Corrections are shown, not hidden.
4. **Everything verifiable.** The server never trusts a save. It rebuilds each player's city from their action log.
5. **Privacy as today.** Player location never leaves the phone. Machine locations are public places (venues, street corners) and are visible to other players: the privacy policy and App Store labels must say so before launch.

## 3. Architecture

| Piece | What | Where |
|---|---|---|
| City referee | One Durable Object per city region (H3 res-5): every player's machines there, the settled sales timeline, spot claims, contracts | Cloudflare Worker `coinline-data-api` + Durable Objects (Workers Paid, from $5/month: owner approval needed) |
| Player record | Player id, company (home, chapter, branches), last settled checkpoint per branch | D1 (SQLite) |
| Boards | Weekly scores per neighbourhood / city / state / country / world | D1 tables written by the referees at settlement; Game Center keeps the world board |
| Identity | Game Center player id (silent sign-in, already integrated). No email, no passwords. Install id as fallback for players without Game Center | |
| City data | Packs, roads, neighbourhoods: same R2 files the app downloads | R2 (exists) |
| Weather | The server keeps the hourly weather it served per region, so replays use the same weather the phone saw | R2/KV cache (the Worker already fetches it) |

## 4. The settlement model

Time is cut into **settlement periods** of one business hour (5 real minutes at 12×). For each period the referee knows every player's machines (position, type, stock, prices, broken or not) from their action logs, and runs the sales step once for the whole city with everyone as competitors. Results: units and cash per machine, stock left, and each player's ledger lines.

- **Lazy, not live.** The referee doesn't tick when nobody looks. When any player in the city connects, or on an hourly Durable Object alarm, it settles all periods since the last one in a batch (the sim is deterministic, so batching is the same as live).
- **Players who are away.** Their machines keep selling in the settlement until they run out, break, or their offline cap passes; drivers and vans run from the logged routes as today.
- **Rival.** In cities with no other player (or fewer than a threshold) the referee runs the AI rival exactly as the phone does today, so empty cities still compete. As real players arrive, the rival's fleet shrinks and leaves.

## 5. The phone

- **Online:** fetch the city's other machines (positions, prices, stock levels rounded) every minute or on change, and simulate with them as competitors. What the phone shows is a prediction that matches settlement except for actions other players take in between.
- **Offline:** keep simulating with the last snapshot. Actions are queued in the action log as now.
- **Reconnect:** upload the action log since the last checkpoint; receive the settled ledger for those periods and a checkpoint (state hash). If settlement differs from the prediction, show one line: "Settled with competitors: −$14 (2 h)". Big differences are rare: competitors only change your share where machines overlap.
- **Checkpoint:** after settlement the phone replaces its save with the server's state for that point and keeps playing from there. The action log is trimmed to after the checkpoint.

## 6. Contested actions

| Action | Rule |
|---|---|
| Place a machine | Provisional offline. On settlement, first claim (server time) wins a spot within the spacing rule; a losing machine returns to storage and its install cost is refunded. |
| Exclusive venue contract | Needs a connection (the button says so offline). |
| Prices, restocks, routes | Never contested; replayed as logged. |
| Branches (expansion ladder) | Unchanged; the company and ladder are per player. |

## 7. Cheating and fairness

- **Edited saves / cash:** irrelevant. The server rebuilds from the action log and its own settlement.
- **Clock changes:** action timestamps must fall between the last checkpoint and the server's receive time; the offline cap applies.
- **Impossible actions:** the replay rejects them (the sim's own checks: cash, unlocks, spacing). A rejected action stops the replay at that point; the player gets the state up to there.
- **Griefing (machine spam):** the existing spacing rule, per-player limits per neighbourhood, and the overhead that grows with machine count.
- **Collusion between accounts:** boards count settled sales only; flag accounts that only ever trade with each other.

## 8. Leaderboards

Weekly (Monday 12:00 UTC, as Game Center): settled sales per player per neighbourhood, city, state, country and world, from the settlement records. Game Center keeps the world board (submitted by the server-verified score, not the phone's).

## 9. What exists today (groundwork)

- Deterministic sim: seeded RNG, no clocks or I/O inside `src/sim` (CLAUDE.md rule).
- **Action log** (schema v10): every successful player action with time and arguments, plus branch money moves (`joinBranch`, `branchesPaid`). Cap 5,000 entries until checkpoints exist.
- Neighbourhood districts and the expansion ladder (state → country → sub-region → continent → world).
- City data, Worker, R2: shared by app and server.

Still to do in the sim before servers: competitors as an input list (other players' machines alongside the rival), so the phone and the referee call the same function with the same data; and recording the weather hours used.

## 10. Phases

1. **v1.x: verified boards.** Upload action logs; the server replays a player alone (no shared customers yet) to verify scores; weekly boards per city/state/country/world. Cheap; proves the replay path.
2. **v2.0: shared cities.** City referees, settlement, snapshots, contested placement. Rival retreats where players exist. Opt-in at first ("Play online in this city"), then default.
3. **v2.x: live moments.** City events with real players, venue auctions, seasons.

## 11. Open questions for the owner

- Paid Cloudflare Workers plan for Durable Objects (from $5/month).
- Minimum players in a city before the AI rival leaves.
- Whether settlement corrections can take money away (fairest) or only pay out the difference (friendliest).
- Online-only features (exclusive contracts) acceptable for offline players?
