import { CLOCK } from '@/config/economy';
import { ENV } from '@/data/env';

import { readJson, writeJson } from './storage';

/**
 * Trusted time for the simulation (owner's call, 2026-11-08). The phone's clock
 * can be changed to fast-forward the machines; the data API's clock can't.
 *
 * - After a check against the server (`syncClock`), time is the server's time
 *   plus the phone's monotonic timer (`performance.now()`), which a clock change
 *   doesn't move.
 * - That timer pauses while the phone sleeps, so going to the background drops
 *   the anchor (`dropClockAnchor`); until the next check, time is the phone's
 *   clock corrected by the last known difference.
 * - A save that ran ahead of trusted time simply waits for real time to catch
 *   up (the sim never runs backwards), and Game Center scores wait for a
 *   verified clock (src/services/gameCenter.ts).
 */
interface Stored {
  /** Server time minus phone time at the last check (ms). */
  offset: number;
}

const KEY = 'clock';
let anchor: { server: number; perf: number } | null = null;
let offset = readJson<Stored>(KEY)?.offset ?? 0;
let inFlight: Promise<boolean> | null = null;

const perfNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/** Now, for the simulation: the server's clock when known, else the phone's corrected by the last difference. */
export function trustedNow(): number {
  if (anchor) return Math.round(anchor.server + (perfNow() - anchor.perf));
  return Date.now() + offset;
}

/** Checked against the server since the app came to the foreground. */
export function clockVerified(): boolean {
  return anchor !== null;
}

/** The app went to the background: the monotonic timer can't be trusted across sleep. */
export function dropClockAnchor(): void {
  anchor = null;
}

/** Ask the data API for its time (no cache). Resolves true when the clock is anchored. */
export function syncClock(): Promise<boolean> {
  if (!ENV.dataApiUrl) return Promise.resolve(false);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLOCK.timeoutMs);
    try {
      const t0 = perfNow();
      const res = await fetch(`${ENV.dataApiUrl}/health`, {
        signal: ctrl.signal,
        headers: { 'Cache-Control': 'no-store' },
      });
      const t1 = perfNow();
      if (!res.ok) return false;
      const body = (await res.json()) as { time?: string };
      const server = Date.parse(body.time ?? '');
      if (!Number.isFinite(server)) return false;
      // The server stamped its reply about halfway through the round trip.
      const at = server + (t1 - t0) / 2;
      anchor = { server: at, perf: t1 };
      offset = Math.round(at - Date.now());
      writeJson(KEY, { offset } satisfies Stored);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      inFlight = null;
    }
  })();
  return inFlight;
}

/** How far a save's time is ahead of trusted time (0 when it isn't). */
export function aheadBy(saveNow: number): number {
  return Math.max(0, saveNow - trustedNow() - CLOCK.toleranceMs);
}
