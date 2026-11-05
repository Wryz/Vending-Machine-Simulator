# CLAUDE.md

Mobile game: **Vending Machine Simulator** (working brand "Coinline"). A real-world-map vending tycoon in React Native (Expo dev build), iPhone first.

**Read `SPEC.md` before any task.** It is the source of truth for vision, scope, style and architecture.

## Ground rules
- TypeScript strict. No `any` without a comment explaining why.
- Game logic lives in `src/sim/` as pure, deterministic functions with unit tests. No React, rendering or I/O imports there.
- All tunable numbers (prices, rates, costs, thresholds) live in `src/config/`. Never hard-code them in components or the sim.
- Art direction is **calm, premium, low-poly realism** (SPEC §3). No cartoon proportions, outlines or bouncy UI. The map style and 3D lighting must follow the city's real local time.
- UI elements are physical objects (receipts, clipboard, key ring, coin tray, contract sheet). Build them as reusable components in `src/ui/`.
- No real brands or logos on products or machines. Real place names come from open map data, without logos.
- Privacy: approximate location only, never stored server-side; saves are local only in v1.
- Ads are opt-in rewarded only. Never add interstitials or forced ads.
- Keep Android compatibility in mind even though iPhone ships first.

## Workflow
- Do the week 1–2 spikes (SPEC §12) first and report findings before building features on top of them.
- When a library limit conflicts with the spec, stop and propose options. Don't silently change the player-facing design.
- Ask before adding any paid service, new native module, or data source not listed in SPEC §6.4 and §7.1.
- Write or update tests for every sim change; run tests and type-check before calling a task done.

## Layout
- `app/`: expo-router screens
- `src/`: sim, config, data, map, three, ui, store, services
- `workers/data-api/`: Cloudflare Worker
- `pipeline/`: offline data pipeline (Python or DuckDB), not shipped in the app
