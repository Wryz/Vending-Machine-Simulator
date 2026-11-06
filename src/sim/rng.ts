/**
 * Seeded PRNG (mulberry32). The generator's state lives in GameState so
 * simulations are reproducible from a save.
 */
export interface RngState {
  rng: number;
}

export function nextRandom(s: RngState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Poisson sample (Knuth for small λ, normal approximation for large λ). */
export function poisson(s: RngState, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 12) {
    // Box–Muller normal approximation.
    const u1 = Math.max(1e-12, nextRandom(s));
    const u2 = nextRandom(s);
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }
  // Knuth, with nextRandom inlined: it runs once per draw, and calls are costly in Hermes.
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  let r = s.rng;
  do {
    k++;
    let t = (r = (r + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    p *= ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  } while (p > L);
  s.rng = r;
  return k - 1;
}

/** Chance that an event with `ratePerUnit` happens at least once over `units`. */
export function happens(s: RngState, ratePerUnit: number, units: number): boolean {
  if (ratePerUnit <= 0 || units <= 0) return false;
  return nextRandom(s) < 1 - Math.exp(-ratePerUnit * units);
}

/** Deterministic 32-bit hash of a string (FNV-1a), for seeding per-day events. */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick<T>(s: RngState, items: readonly T[]): T {
  return items[Math.floor(nextRandom(s) * items.length) % items.length];
}

/**
 * Deterministic uniform [0,1) from a key, well mixed (FNV-1a then the murmur3
 * finalizer: keys that differ by one character still land far apart). For
 * keyed rolls that must not touch the sim's RNG stream.
 */
export function keyedUnit(key: string): number {
  let h = hashString(key);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
