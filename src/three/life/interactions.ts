import { CLOSEUP_MOTION } from '@/config/streetLife';

import { hash01 } from './random';

/**
 * Timing for the close-up's machine interactions (pure). The scene animates
 * from these and the screen fires sounds and haptics from the same numbers,
 * so what you hear lines up with what you see.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const smoothstep = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

export interface RestockPlan {
  /** Start delay per restocked slot (ms), same order as the input. */
  delaysMs: number[];
  /** When to play a "thunk" tick (ms after commit), at most `maxTicks`. */
  ticksMs: number[];
  /** When the last block has landed (ms). */
  doneMs: number;
}

/** Stagger restocked slots; spread at most `maxTicks` ticks evenly over them. */
export function restockPlan(slotCount: number, cfg = CLOSEUP_MOTION.restock): RestockPlan {
  const delaysMs = Array.from({ length: slotCount }, (_, i) => i * cfg.staggerMs);
  const ticks = Math.min(cfg.maxTicks, slotCount);
  const ticksMs: number[] = [];
  for (let j = 0; j < ticks; j++) {
    const idx = ticks === 1 ? 0 : Math.round((j * (slotCount - 1)) / (ticks - 1));
    ticksMs.push(delaysMs[idx] + cfg.slideMs);
  }
  return { delaysMs, ticksMs, doneMs: slotCount ? delaysMs[slotCount - 1] + cfg.slideMs : 0 };
}

/** 0 (at the back of the coil) → 1 (in place) for a slot that started at `delayMs`. */
export function slideProgress(elapsedMs: number, delayMs: number, cfg = CLOSEUP_MOTION.restock) {
  return easeOutCubic((elapsedMs - delayMs) / cfg.slideMs);
}

/** Times (ms after opening the cash box) at which each coin glints. */
export function coinGlintsMs(cfg = CLOSEUP_MOTION.coins): number[] {
  return Array.from(
    { length: cfg.count },
    (_, i) => cfg.firstCoinMs + i * cfg.staggerMs + cfg.slideMs * 0.5,
  );
}

/**
 * Which slots sold between two stock snapshots: one entry per unit sold,
 * capped (a long catch-up shouldn't rain products).
 */
export function soldSlots(prev: readonly number[], next: readonly number[], max = 3): number[] {
  const out: number[] = [];
  for (let i = 0; i < Math.min(prev.length, next.length) && out.length < max; i++) {
    const d = prev[i] - next[i];
    for (let u = 0; u < d && out.length < max; u++) out.push(i);
  }
  return out;
}

/**
 * Broken screen flicker: mostly steady with a faint hum, occasionally
 * dropping out for a bin. Deterministic in time.
 */
export function flicker(tS: number, seed = 1, cfg = CLOSEUP_MOTION.flicker): number {
  const bin = Math.floor(tS / cfg.binS);
  const hum = 0.9 + 0.1 * Math.sin(tS * 37.7);
  return hash01(seed, bin, 31) < cfg.dimChance ? 0.12 + 0.2 * hash01(seed, bin, 32) : hum;
}

/** Soft 0..1 pulse for the selected slot (sinusoidal, not bouncy). */
export function pulse(tS: number, periodS = CLOSEUP_MOTION.selectedPulseS): number {
  return 0.5 - 0.5 * Math.cos((tS / periodS) * Math.PI * 2);
}

export interface DropPose {
  /** Forward (z) offset from the slot. */
  dz: number;
  /** Downward distance fallen. */
  dy: number;
  /** Tip angle around x. */
  tip: number;
  /** Still in flight. */
  falling: boolean;
}

/** A product tipping off its coil, then falling under gravity. */
export function dropPose(
  out: DropPose,
  elapsedMs: number,
  fallHeightM: number,
  cfg = CLOSEUP_MOTION.drop,
): DropPose {
  const tip = clamp01(elapsedMs / cfg.tipMs);
  out.tip = 0.55 * smoothstep(tip) + (elapsedMs > cfg.tipMs ? (elapsedMs - cfg.tipMs) / 260 : 0);
  out.dz = 0.035 * smoothstep(tip);
  const ft = Math.max(0, elapsedMs - cfg.tipMs) / 1000;
  out.dy = Math.min(fallHeightM, 0.5 * 9.81 * ft * ft);
  out.falling = out.dy < fallHeightM && elapsedMs < cfg.tipMs + cfg.fallMs + 400;
  return out;
}
