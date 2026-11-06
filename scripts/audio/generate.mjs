#!/usr/bin/env node
/**
 * Procedural SFX, ambience layers and "spice" one-shots (SPEC §3.6: soft
 * mechanical clicks, coin clinks, compressor hum, distant city by time of day;
 * no loud jingles). Music lives in music.mjs.
 *
 *   node scripts/audio/generate.mjs [name ...]   (needs ffmpeg for the .m4a files)
 *
 * - UI/SFX one-shots -> assets/audio/<name>.wav (short, 16-bit mono 44.1 kHz,
 *   peaks about -14..-22 dBFS; the engine sets per-sound volume).
 * - Ambience loops -> assets/audio/<name>.m4a (AAC mono, ~-20 LUFS, built
 *   circularly so the seam is continuous; the engine plays them far quieter).
 * - Spice one-shots (birds, steps) -> .m4a.
 *
 * Deterministic (seeded noise); prints size, loudness, peaks and seam checks.
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SR,
  TAU,
  addAt,
  addReverb,
  biquad,
  biquadTV,
  brown,
  buf,
  circular,
  describe,
  fadeIn,
  fadeOut,
  limit,
  loopify,
  master,
  mix,
  noise,
  normalize,
  onePole,
  pink,
  range,
  rng,
  scale,
  writeAudio,
} from './lib.mjs';
import { ep, vibes } from './synth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets/audio');

// ---------- primitives ----------
/** Add a damped sine partial: amp·e^(-t/decay)·sin(2πft), starting at t0. */
function partial(out, { f, amp, decay, t0 = 0, attack = 0.001, glide = 0 }) {
  const s0 = Math.round(t0 * SR);
  let ph = 0;
  for (let i = s0; i < out.length; i++) {
    const t = (i - s0) / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    if (env < 1e-5 && t > attack) break;
    const freq = f * (1 + glide * Math.exp(-t / 0.03));
    ph += (TAU * freq) / SR;
    out[i] += amp * env * Math.sin(ph);
  }
}

/** Short filtered noise burst (contact / transient). */
function burst(out, { t0 = 0, dur, amp, lp = 6000, hp = 200, seed = 1, decay }) {
  const n = Math.round(dur * SR);
  const x = biquad(biquad(noise(n, seed), 'lowpass', lp), 'highpass', hp);
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    out[s0 + i] += amp * x[i] * Math.exp(-t / (decay ?? dur / 4));
  }
}

function rms(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length) || 1;
}
const unit = (x) => scale(x, 1 / rms(x));

/** One coin clink: two inharmonic damped partials + a tiny contact tick. */
function clink(out, t0, pitch = 1, amp = 1, seed = 7) {
  partial(out, { f: 2380 * pitch, amp: 0.55 * amp, decay: 0.09, t0 });
  partial(out, { f: 3790 * pitch, amp: 0.35 * amp, decay: 0.06, t0 });
  partial(out, { f: 6120 * pitch, amp: 0.12 * amp, decay: 0.025, t0 });
  burst(out, { t0, dur: 0.012, amp: 0.25 * amp, lp: 9000, hp: 2500, seed });
}

/** Product landing in the pickup bin. */
function productDrop(x, td, seed = 41) {
  partial(x, { f: 64, amp: 1, decay: 0.08, t0: td, attack: 0.003, glide: 0.7 });
  partial(x, { f: 145, amp: 0.3, decay: 0.04, t0: td, glide: 0.4 });
  burst(x, { t0: td, dur: 0.06, amp: 0.55, lp: 1000, hp: 60, seed, decay: 0.014 });
  burst(x, {
    t0: td + 0.06,
    dur: 0.03,
    amp: 0.12,
    lp: 2500,
    hp: 300,
    seed: seed + 1,
    decay: 0.008,
  });
}

// ---------- UI / machine SFX (wav) ----------
const SFX = {
  coin() {
    const x = buf(0.32);
    clink(x, 0.002);
    clink(x, 0.055, 1.03, 0.35, 9); // the small bounce
    return normalize(fadeOut(x), -14);
  },
  'coins-stack'() {
    const x = buf(0.62);
    const hits = [
      [0.0, 1.0, 1.0],
      [0.1, 0.97, 0.8],
      [0.19, 1.05, 0.7],
      [0.3, 0.99, 0.85],
    ];
    hits.forEach(([t, p, a], i) => {
      clink(x, t + 0.002, p, a, 11 + i);
      burst(x, { t0: t + 0.002, dur: 0.02, amp: 0.15 * a, lp: 1500, hp: 150, seed: 31 + i });
    });
    return normalize(fadeOut(x), -14);
  },
  click() {
    const x = buf(0.05);
    partial(x, { f: 3100, amp: 0.4, decay: 0.006, t0: 0.001 });
    partial(x, { f: 1650, amp: 0.25, decay: 0.009, t0: 0.001 });
    burst(x, { t0: 0.0005, dur: 0.006, amp: 0.5, lp: 7000, hp: 1200, seed: 3 });
    return normalize(fadeOut(x, 0.005), -16);
  },
  thunk() {
    const x = buf(0.36);
    partial(x, { f: 72, amp: 1, decay: 0.07, t0: 0.004, attack: 0.003, glide: 0.6 });
    partial(x, { f: 160, amp: 0.35, decay: 0.035, t0: 0.004, glide: 0.4 });
    burst(x, { t0: 0.002, dur: 0.05, amp: 0.5, lp: 900, hp: 60, seed: 5, decay: 0.012 });
    partial(x, { f: 2600, amp: 0.12, decay: 0.006, t0: 0.045 });
    burst(x, { t0: 0.045, dur: 0.006, amp: 0.15, lp: 8000, hp: 2000, seed: 6 });
    return normalize(fadeOut(x), -14);
  },
  vend() {
    const x = buf(1.0);
    const motorEnd = 0.55;
    const m = buf(motorEnd);
    let ph = 0;
    for (let i = 0; i < m.length; i++) {
      const t = i / SR;
      const f = 92 + 6 * Math.sin(TAU * 3 * t);
      ph += f / SR;
      const saw = 2 * (ph % 1) - 1;
      const env = Math.min(1, t / 0.06) * Math.min(1, (motorEnd - t) / 0.08);
      m[i] = saw * env * 0.5;
    }
    biquad(m, 'lowpass', 700);
    biquad(m, 'highpass', 80);
    mix(x, m);
    for (let t = 0.07; t < motorEnd - 0.05; t += 0.085) {
      burst(x, { t0: t, dur: 0.008, amp: 0.18, lp: 5000, hp: 1200, seed: Math.round(t * 1000) });
    }
    productDrop(x, 0.68);
    return normalize(fadeOut(x, 0.03), -14);
  },
  success() {
    const x = buf(0.95);
    for (const [t0, f, a] of [
      [0.002, 784, 0.8],
      [0.13, 1175, 0.65],
    ]) {
      partial(x, { f, amp: a, decay: 0.32, t0, attack: 0.004 });
      partial(x, { f: f * 2.01, amp: a * 0.18, decay: 0.12, t0, attack: 0.004 });
      partial(x, { f: f * 2.76, amp: a * 0.06, decay: 0.06, t0, attack: 0.003 });
    }
    return normalize(fadeOut(x, 0.05), -15);
  },
  error() {
    const x = buf(0.3);
    for (const t0 of [0.002, 0.12]) {
      partial(x, { f: 196, amp: 0.8, decay: 0.035, t0, attack: 0.002 });
      partial(x, { f: 392, amp: 0.2, decay: 0.02, t0, attack: 0.002 });
      burst(x, { t0, dur: 0.01, amp: 0.25, lp: 2500, hp: 300, seed: 13 });
    }
    return normalize(fadeOut(x), -15);
  },
  /** Sale: a key-press tick, then one small soft bell (not a jingle). */
  register() {
    const x = buf(1.1);
    burst(x, { t0: 0.001, dur: 0.008, amp: 0.35, lp: 5000, hp: 900, seed: 61 });
    partial(x, { f: 820, amp: 0.18, decay: 0.012, t0: 0.001 });
    const t0 = 0.045;
    const f = 1568; // G6
    partial(x, { f, amp: 0.7, decay: 0.42, t0, attack: 0.002 });
    partial(x, { f: f * 1.0035, amp: 0.3, decay: 0.38, t0, attack: 0.002 }); // slow shimmer
    partial(x, { f: f * 2.0, amp: 0.14, decay: 0.2, t0 });
    partial(x, { f: f * 2.76, amp: 0.08, decay: 0.09, t0 });
    partial(x, { f: f * 5.4, amp: 0.03, decay: 0.03, t0 });
    burst(x, { t0, dur: 0.004, amp: 0.12, lp: 9000, hp: 3000, seed: 62 });
    return normalize(fadeOut(x, 0.08), -17);
  },
  /** Product dropping into the pickup bin, with a small plastic rattle. */
  drop() {
    const x = buf(0.45);
    productDrop(x, 0.004, 71);
    burst(x, { t0: 0.045, dur: 0.012, amp: 0.1, lp: 3500, hp: 1200, seed: 73, decay: 0.004 });
    burst(x, { t0: 0.082, dur: 0.01, amp: 0.06, lp: 3000, hp: 1200, seed: 74, decay: 0.003 });
    partial(x, { f: 1900, amp: 0.04, decay: 0.012, t0: 0.045 });
    return normalize(fadeOut(x, 0.03), -14);
  },
  /** Metal cash-box door: key/latch clicks, then a damped steel clank. */
  door() {
    const x = buf(0.7);
    for (const [t, a, s] of [
      [0.002, 0.35, 81],
      [0.055, 0.5, 82],
    ]) {
      burst(x, { t0: t, dur: 0.006, amp: a, lp: 8000, hp: 1800, seed: s });
      partial(x, { f: 3300, amp: a * 0.25, decay: 0.006, t0: t });
    }
    const tc = 0.22;
    for (const [f, a, d] of [
      [372, 0.5, 0.11],
      [1013, 0.32, 0.07],
      [1741, 0.2, 0.05],
      [2655, 0.12, 0.035],
      [3920, 0.06, 0.02],
    ])
      partial(x, { f, amp: a, decay: d, t0: tc, attack: 0.001 });
    burst(x, { t0: tc, dur: 0.04, amp: 0.45, lp: 3000, hp: 120, seed: 83, decay: 0.01 });
    partial(x, { f: 95, amp: 0.35, decay: 0.05, t0: tc, attack: 0.002 });
    burst(x, { t0: tc + 0.07, dur: 0.01, amp: 0.08, lp: 5000, hp: 1500, seed: 84 }); // settle
    return normalize(fadeOut(x, 0.05), -15);
  },
  /** Thermal receipt printer: stepper burr in short line bursts, paper feed. */
  paper() {
    const dur = 0.95;
    const x = buf(dur);
    const r = rng(91);
    const steps = new Float64Array(x.length);
    const lines = [];
    for (let t = 0.02; t < dur - 0.12;) {
      const on = range(r, 0.05, 0.09);
      lines.push([t, t + on]);
      t += on + range(r, 0.012, 0.03);
    }
    for (const [a, b] of lines) {
      for (let t = a; t < b; t += 1 / 230) steps[Math.round(t * SR)] += 0.7 + 0.3 * r();
    }
    const s = biquad(biquad(steps, 'bandpass', 2600, 1.4), 'lowpass', 7000);
    const feed = biquad(biquad(noise(x.length, 92), 'highpass', 3000), 'lowpass', 9000);
    const motor = new Float64Array(x.length);
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const on = lines.some(([a, b]) => t >= a && t < b) ? 1 : 0.15;
      ph += (TAU * 460) / SR;
      motor[i] = on * 0.05 * Math.sin(ph);
      const env = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08);
      x[i] = env * (s[i] * 1.6 + feed[i] * 0.05 * on + motor[i]);
    }
    return normalize(fadeOut(x, 0.03), -19);
  },
  /** Pen signature: friction noise following stroke speed, with lifts. */
  scribble() {
    const dur = 1.05;
    const x = buf(dur);
    const r = rng(101);
    const comps = Array.from({ length: 4 }, () => [range(r, 3, 9), r() * TAU, range(r, 0.4, 1)]);
    const fr = biquad(biquad(noise(x.length, 102), 'bandpass', 3600, 0.9), 'highpass', 1500);
    const body = biquad(noise(x.length, 103), 'bandpass', 1250, 4);
    const lifts = [
      [0.38, 0.45],
      [0.71, 0.76],
    ];
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      let v = 0;
      for (const [f, p, a] of comps) v += a * Math.sin(TAU * f * t + p);
      let speed = Math.abs(v) / 2;
      if (lifts.some(([a, b]) => t > a && t < b)) speed = 0;
      const env = Math.min(1, t / 0.03) * Math.min(1, (dur - 0.05 - t) / 0.06);
      x[i] = Math.max(0, env) * speed ** 1.4 * (fr[i] + body[i] * 0.25);
    }
    onePole(x, 7000);
    return normalize(fadeOut(x, 0.03), -19);
  },
  /** Soft UI sheet: band-pass noise swept up and back down. */
  whoosh() {
    const dur = 0.42;
    const x = noise(Math.round(dur * SR), 111);
    const n = x.length;
    biquadTV(
      x,
      'bandpass',
      (i) => {
        const u = i / n;
        return u < 0.45 ? 350 + 1100 * (u / 0.45) ** 1.5 : 1450 - 750 * ((u - 0.45) / 0.55);
      },
      0.8,
    );
    for (let i = 0; i < n; i++) {
      const u = i / n;
      x[i] *= u < 0.38 ? Math.sin((u / 0.38) * (Math.PI / 2)) ** 2 : Math.exp(-(u - 0.38) / 0.16);
    }
    return normalize(fadeOut(x, 0.02), -22);
  },
  /** Soft UI tick: a small rounded "tok". */
  pop() {
    const x = buf(0.08);
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 720 + 420 * Math.exp(-t / 0.006);
      ph += (TAU * f) / SR;
      x[i] = Math.min(1, t / 0.0008) * Math.exp(-t / 0.016) * Math.sin(ph);
    }
    burst(x, { t0: 0, dur: 0.003, amp: 0.12, lp: 6000, hp: 1500, seed: 121 });
    return normalize(fadeOut(x, 0.01), -20);
  },
  /** Chapter complete: calm three-note rise (C5 F5 A5), warm EP + soft vibes. */
  chime() {
    const x = buf(2.6);
    [
      [72, 0.0, 0.5],
      [77, 0.16, 0.55],
      [81, 0.32, 0.6],
    ].forEach(([m, t, v]) => {
      mix(x, ep(m, 1.5, v, { tremolo: 0.05 }), 1, Math.round(t * SR));
      mix(x, vibes(m + 12, 0.8, v * 0.6, { decay: 0.9, tremolo: 0.1 }), 0.25, Math.round(t * SR));
    });
    addReverb(x, 0.35, { size: 0.55, damp: 0.5 });
    biquad(x, 'lowpass', 9000, 0.6);
    return normalize(fadeOut(fadeIn(x, 0.002), 0.3), -15);
  },
  /** Event announced: two soft bell notes falling a fourth. */
  notify() {
    const x = buf(1.6);
    [
      [86, 0.0, 0.6],
      [81, 0.15, 0.55],
    ].forEach(([m, t, v]) =>
      mix(x, vibes(m, 0.6, v, { decay: 0.7, tremolo: 0.06 }), 1, Math.round(t * SR)),
    );
    addReverb(x, 0.3, { size: 0.5, damp: 0.5 });
    biquad(x, 'lowpass', 8500, 0.6);
    return normalize(fadeOut(fadeIn(x, 0.002), 0.25), -17);
  },
  hum() {
    // 2 s loop. Partials are multiples of 0.5 Hz so they also wrap exactly.
    const N = 2;
    const F = 0.25;
    const x = buf(N + F);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const lfo = 1 + 0.08 * Math.sin(TAU * 0.5 * t);
      x[i] =
        lfo *
        (0.5 * Math.sin(TAU * 60 * t) +
          0.28 * Math.sin(TAU * 120 * t + 0.6) +
          0.12 * Math.sin(TAU * 180 * t + 1.1) +
          0.06 * Math.sin(TAU * 240 * t + 2.0));
    }
    const air = biquad(biquad(noise(x.length, 77), 'lowpass', 500), 'highpass', 90);
    for (let i = 0; i < x.length; i++) x[i] += air[i] * 0.35;
    return normalize(loopify(x, F), -26);
  },
};

// ---------- ambience loops (m4a) ----------
const BED_LUFS = -20;

/** Circular colored noise: filters run two laps so the loop is seamless. */
const loopNoise = (N, seed, fn, kind = 'white') =>
  circular(
    kind === 'pink' ? pink(N, seed) : kind === 'brown' ? brown(N, seed) : noise(N, seed),
    fn,
  );

function cityBed({ seed, lp, rumbleLp, swell, hiss }) {
  const L = 16;
  const N = L * SR;
  const body = loopNoise(N, seed, (x) => {
    biquad(x, 'lowpass', lp, 0.5);
    biquad(x, 'highpass', 60);
  });
  const rumble = loopNoise(N, seed + 1, (x) => {
    biquad(x, 'lowpass', rumbleLp);
    biquad(x, 'lowpass', rumbleLp);
  });
  const air = loopNoise(N, seed + 2, (x) => {
    biquad(x, 'highpass', 2500);
    biquad(x, 'lowpass', 6000);
  });
  unit(body);
  unit(rumble);
  unit(air);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const s =
      1 +
      swell * Math.sin(TAU * (t / L) + 0.4) +
      swell * 0.6 * Math.sin(TAU * (t / (L / 2)) + 1.7) +
      swell * 0.3 * Math.sin(TAU * (t / (L / 5)) + 2.9);
    x[i] = s * (body[i] + 0.9 * rumble[i]) + hiss * air[i];
  }
  return x;
}

// Formants (F1, F2, F3) for a handful of vowels.
const VOWELS = [
  [730, 1090, 2440],
  [270, 2290, 3010],
  [300, 870, 2240],
  [530, 1840, 2480],
  [570, 840, 2410],
  [440, 1020, 2240],
  [660, 1720, 2410],
  [490, 1350, 1690],
];

/** One talker: syllables (glottal buzz through moving formants) in talk spurts. */
function talker(N, seed, { f0, fScale, lp }) {
  const r = rng(seed);
  const L = N / SR;
  const out = new Float64Array(N + 2 * SR);
  let t = r() * 2;
  while (t < L) {
    const spurt = range(r, 0.8, 3.6);
    const end = t + spurt;
    const start = t;
    while (t < end) {
      const d = range(r, 0.11, 0.28);
      const v1 = VOWELS[Math.floor(r() * VOWELS.length)];
      const v2 = VOWELS[Math.floor(r() * VOWELS.length)];
      const p0 = f0 * (1 + (r() - 0.5) * 0.18 - (0.1 * (t - start)) / spurt);
      const pGlide = (r() - 0.5) * 0.1;
      const amp = range(r, 0.55, 1);
      const n = Math.round((d + 0.04) * SR);
      const src = new Float64Array(n);
      const asp = noise(n, seed * 1000 + Math.round(t * 100));
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        ph += (p0 * (1 + pGlide * u)) / SR;
        src[i] = (2 * (ph % 1) - 1) * 0.9 + asp[i] * 0.12;
      }
      onePole(src, 2200);
      const syl = new Float64Array(n);
      [0, 1, 2].forEach((k) => {
        const band = Float64Array.from(src);
        const fAt = (i) => fScale * (v1[k] + (v2[k] - v1[k]) * Math.min(1, i / n) ** 1.5);
        biquadTV(band, 'bandpass', fAt, (i) => fAt(i) / [90, 110, 150][k], 64);
        mix(syl, band, [1, 0.55, 0.25][k]);
      });
      const dn = Math.round(d * SR);
      for (let i = 0; i < n; i++) {
        const u = i / dn;
        syl[i] *= amp * (u < 1 ? Math.sin(Math.PI * u) ** 0.7 : Math.exp(-(i - dn) / (0.012 * SR)));
      }
      const c = r();
      if (c < 0.3) {
        // fricative ("s"/"sh")
        const fn = biquad(noise(Math.round(0.05 * SR), seed + n), 'highpass', range(r, 3500, 5500));
        for (let i = 0; i < fn.length; i++) fn[i] *= 0.18 * Math.sin((Math.PI * i) / fn.length);
        mix(syl, fn);
      } else if (c < 0.55) {
        // plosive
        const pb = biquad(
          noise(Math.round(0.01 * SR), seed + n + 1),
          'bandpass',
          range(r, 1200, 2500),
          1,
        );
        for (let i = 0; i < pb.length; i++) pb[i] *= 0.3 * Math.exp(-i / (0.003 * SR));
        mix(syl, pb);
      }
      mix(out, syl, 1, Math.round(t * SR));
      t += d + r() * 0.05;
    }
    t += range(r, 0.3, 2.4);
  }
  const x = new Float64Array(N);
  for (let i = 0; i < out.length; i++) x[i % N] += out[i];
  return circular(x, (y) => biquad(y, 'lowpass', lp, 0.6));
}

/** Crowd walla: ~14 talkers at different distances + diffuse murmur, in a room. */
function crowd() {
  const L = 24;
  const N = L * SR;
  const r = rng(601);
  const x = new Float64Array(N);
  for (let k = 0; k < 14; k++) {
    const female = r() < 0.5;
    const near = k < 6;
    const v = talker(N, 610 + k, {
      f0: female ? range(r, 175, 235) : range(r, 95, 140),
      fScale: female ? 1.14 : 1,
      lp: near ? range(r, 2800, 4000) : range(r, 1500, 2400),
    });
    mix(x, v, (near ? range(r, 0.7, 1) : range(r, 0.2, 0.4)) / rms(v));
  }
  const murmur = unit(
    loopNoise(N, 690, (y) => (biquad(y, 'bandpass', 520, 0.7), biquad(y, 'lowpass', 1500)), 'pink'),
  );
  // Murmur follows the crowd's own syllabic envelope a little.
  const env = circular(x.map(Math.abs), (y) => onePole(y, 6));
  const em = rms(env);
  for (let i = 0; i < N; i++) x[i] += murmur[i] * 0.3 * (0.4 + (0.6 * env[i]) / em);
  addReverb(x, 0.3, { size: 0.65, damp: 0.5, predelayMs: 20 }, true);
  return circular(x, (y) => (biquad(y, 'lowpass', 3400, 0.6), biquad(y, 'highpass', 130)));
}

/** One bird call. kind: sparrow | whistle | trill | teeoo. `dist` 0 (near) .. 1 (far). */
function birdCall(r, kind, dist) {
  const notes = []; // [start, dur, f(u), amp(u)]
  if (kind === 'sparrow') {
    let t = 0;
    const n = 2 + Math.floor(r() * 5);
    const f1 = range(r, 4500, 6500);
    const f2 = range(r, 2800, 4000);
    for (let k = 0; k < n; k++) {
      const d = range(r, 0.04, 0.07);
      const j = range(r, 0.92, 1.08);
      notes.push([t, d, (u) => j * (f2 + (f1 - f2) * (1 - u) ** 2), (u) => Math.sin(Math.PI * u)]);
      t += d + range(r, 0.07, 0.13);
    }
  } else if (kind === 'whistle') {
    let t = 0;
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const d = range(r, 0.12, 0.26);
      const base = range(r, 2200, 3600);
      const g = (r() - 0.5) * 0.3;
      const vib = range(r, 25, 35);
      notes.push([
        t,
        d,
        (u, s) => base * (1 + g * u) * (1 + 0.015 * Math.sin(TAU * vib * s)),
        (u) => Math.sin(Math.PI * u) ** 0.6,
      ]);
      t += d + range(r, 0.05, 0.12);
    }
  } else if (kind === 'trill') {
    const d = range(r, 0.5, 1.1);
    const c = range(r, 3500, 5000);
    const rate = range(r, 18, 28);
    notes.push([
      0,
      d,
      (u) => c * (1 - 0.1 * u),
      (u, s) => Math.sin(Math.PI * u) * (0.5 - 0.5 * Math.cos(TAU * rate * s)) ** 2,
    ]);
  } else {
    const a = range(r, 3600, 4000);
    notes.push([0, 0.18, (u) => a * (1 - 0.05 * u), (u) => Math.sin(Math.PI * u) ** 0.7]);
    notes.push([0.24, 0.25, (u) => a * 0.78 * (1 - 0.1 * u), (u) => Math.sin(Math.PI * u) ** 0.7]);
  }
  const total = Math.max(...notes.map(([s, d]) => s + d)) + 0.02;
  const out = new Float64Array(Math.round(total * SR));
  for (const [s0, d, f, a] of notes) {
    const n = Math.round(d * SR);
    const o = Math.round(s0 * SR);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const s = i / SR;
      ph += (TAU * f(u, s)) / SR;
      out[o + i] += a(u, s) * (Math.sin(ph) + 0.08 * Math.sin(2 * ph));
    }
  }
  biquad(out, 'lowpass', 3500 + 6000 * (1 - dist), 0.7);
  return scale(out, 0.15 + 0.85 * (1 - dist) ** 1.5);
}

const BIRD_KINDS = ['sparrow', 'sparrow', 'whistle', 'whistle', 'trill', 'teeoo'];

/** Sparse varied birds over light air in leaves. */
function birds() {
  const L = 24;
  const N = L * SR;
  const r = rng(701);
  const air = unit(loopNoise(N, 702, (y) => biquad(y, 'bandpass', 3200, 0.35)));
  const leaves = unit(
    loopNoise(N, 703, (y) => (biquad(y, 'highpass', 1500), biquad(y, 'lowpass', 7000)), 'pink'),
  );
  const calls = new Float64Array(N);
  for (let k = 0; k < 14; k++) {
    const kind = BIRD_KINDS[Math.floor(r() * BIRD_KINDS.length)];
    addAt(calls, birdCall(r, kind, range(r, 0.15, 0.95)), r() * N);
  }
  addReverb(calls, 0.3, { size: 0.45, damp: 0.5 }, true);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const rustle = 0.6 + 0.4 * Math.sin((TAU * 3 * t) / L) * Math.sin((TAU * 5 * t) / L + 1);
    x[i] = calls[i] * 0.12 + air[i] * 0.004 + leaves[i] * 0.006 * rustle;
  }
  return x;
}

/** Night crickets: a few chirping individuals + a distant chorus + night air. */
function crickets() {
  const L = 16;
  const N = L * SR;
  const r = rng(801);
  const x = new Float64Array(N);
  for (let k = 0; k < 6; k++) {
    const f = range(r, 4200, 5000);
    const pulses = 3 + Math.floor(r() * 2);
    const pp = range(r, 0.032, 0.04);
    const plen = 0.018;
    const per = L / Math.round(L / range(r, 0.5, 0.9)); // divides the loop
    const off = r() * per;
    const amp = range(r, 0.25, 1);
    const pulse = new Float64Array(Math.round(plen * SR));
    for (let i = 0; i < pulse.length; i++) {
      const u = i / pulse.length;
      const ph = (TAU * f * i) / SR;
      pulse[i] = Math.sin(Math.PI * u) ** 2 * (Math.sin(ph) + 0.12 * Math.sin(2 * ph));
    }
    for (let t = off; t < L + off - 1e-6; t += per) {
      const a = amp * range(r, 0.8, 1.1);
      for (let p = 0; p < pulses; p++) addAt(x, pulse, (t + p * pp) * SR, a);
    }
  }
  const chorus = unit(loopNoise(N, 802, (y) => biquad(y, 'bandpass', 4600, 6)));
  const kA = Math.round(42 * L);
  const air = unit(loopNoise(N, 803, (y) => biquad(y, 'lowpass', 300), 'brown'));
  const hiss = unit(loopNoise(N, 804, (y) => biquad(y, 'lowpass', 900), 'pink'));
  for (let i = 0; i < N; i++) {
    const am = Math.abs(Math.sin((Math.PI * kA * i) / N));
    const swell = 0.7 + 0.3 * Math.sin((TAU * 2 * i) / N);
    x[i] = x[i] * 0.25 + chorus[i] * 0.02 * am * swell + air[i] * 0.02 + hiss[i] * 0.008;
  }
  addReverb(x, 0.25, { size: 0.5, damp: 0.6 }, true);
  return x;
}

/** Rain: broadband body, many drop ticks and bubbles, gutter drips, low roof rumble. */
function rain() {
  const L = 12;
  const N = L * SR;
  const r = rng(901);
  const body = unit(
    loopNoise(N, 902, (y) => (biquad(y, 'highpass', 400), biquad(y, 'lowpass', 7500)), 'pink'),
  );
  const sizzle = unit(loopNoise(N, 903, (y) => biquad(y, 'highpass', 5000)));
  const rumble = unit(loopNoise(N, 904, (y) => biquad(y, 'lowpass', 180), 'brown'));
  const drops = new Float64Array(N);
  const nz = noise(SR, 905);
  for (let k = 0; k < 450 * L; k++) {
    const a = Math.min(1, -Math.log(1 - r() * 0.999) * 0.3);
    if (r() < 0.8) {
      const n = Math.round(range(r, 0.002, 0.006) * SR);
      const o = Math.floor(r() * (nz.length - n));
      const tick = biquad(nz.slice(o, o + n), 'bandpass', range(r, 2000, 8000), 1.2);
      for (let i = 0; i < n; i++) tick[i] *= Math.exp(-i / (n / 3));
      addAt(drops, tick, r() * N, a);
    } else {
      const f0 = range(r, 1500, 4000);
      const tau = range(r, 0.008, 0.015);
      const n = Math.round(4 * tau * SR);
      const b = new Float64Array(n);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const s = i / SR;
        ph += (TAU * f0 * (1 + (0.8 * s) / tau)) / SR;
        b[i] = Math.exp(-s / tau) * Math.sin(ph);
      }
      addAt(drops, b, r() * N, a * 0.5);
    }
  }
  for (const k of [5, 7, 9]) {
    const f = range(r, 1100, 1700);
    const plink = new Float64Array(Math.round(0.1 * SR));
    let ph = 0;
    for (let i = 0; i < plink.length; i++) {
      const s = i / SR;
      ph += (TAU * f * (1 + 0.5 * Math.min(1, s / 0.02))) / SR;
      plink[i] = Math.exp(-s / 0.025) * Math.sin(ph);
    }
    const off = r() * (L / k);
    for (let j = 0; j < k; j++) addAt(drops, plink, (off + (j * L) / k) * SR, 0.25);
  }
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) x[i] = body[i] + sizzle[i] * 0.12 + rumble[i] * 0.35 + drops[i] * 0.6;
  return circular(x, (y) => biquad(y, 'lowpass', 9000, 0.6));
}

/** Wind: gusting band-passed noise, low buffeting, faint whistle in gusts. */
function wind() {
  const L = 20;
  const N = L * SR;
  const g = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const s =
      0.25 * Math.sin(TAU * u + 0.3) +
      0.15 * Math.sin(TAU * 3 * u + 1.9) +
      0.08 * Math.sin(TAU * 7 * u + 4);
    g[i] = Math.exp(1.6 * s);
  }
  const at = (i) => g[i % N];
  const body = loopNoise(
    N,
    1001,
    (y) => biquadTV(y, 'bandpass', (i) => 220 + 380 * at(i), 0.7),
    'pink',
  );
  const low = loopNoise(N, 1002, (y) => biquad(y, 'lowpass', 120), 'brown');
  const whistle = loopNoise(N, 1003, (y) => biquadTV(y, 'bandpass', (i) => 650 + 300 * at(i), 22));
  unit(body);
  unit(low);
  unit(whistle);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++)
    x[i] = g[i] * body[i] + 0.5 * g[i] * low[i] + 0.06 * g[i] ** 3 * whistle[i];
  return x;
}

const BEDS = {
  'city-day': () => cityBed({ seed: 101, lp: 1100, rumbleLp: 140, swell: 0.25, hiss: 0.08 }),
  'city-night': () => cityBed({ seed: 202, lp: 520, rumbleLp: 110, swell: 0.18, hiss: 0.02 }),
  'amb-crowd': crowd,
  'amb-birds': birds,
  'amb-crickets': crickets,
  'amb-rain': rain,
  'amb-wind': wind,
};

// ---------- spice one-shots (m4a) ----------
function birdOneShot(seed, kinds) {
  const r = rng(seed);
  const x = buf(2.6);
  let t = 0.02;
  for (const k of kinds) {
    const c = birdCall(r, k, 0.12);
    mix(x, c, 1, Math.round(t * SR));
    t += c.length / SR + 0.25;
  }
  addReverb(x, 0.35, { size: 0.5, damp: 0.5 });
  return fadeOut(x, 0.2);
}

function footsteps() {
  const steps = 6;
  const x = buf(3.4);
  const r = rng(1101);
  for (let k = 0; k < steps; k++) {
    const t0 = 0.15 + k * 0.52 + (r() - 0.5) * 0.03;
    const pass = Math.sin((Math.PI * (k + 0.5)) / steps); // approach and recede
    const a = (0.35 + 0.65 * pass) * range(r, 0.85, 1.05);
    burst(x, {
      t0,
      dur: 0.03,
      amp: a,
      lp: range(r, 2400, 3200),
      hp: 600,
      seed: 1110 + k,
      decay: 0.01,
    });
    partial(x, { f: range(r, 95, 125), amp: a * 0.5, decay: 0.025, t0, attack: 0.002 });
    burst(x, {
      t0: t0 + 0.06,
      dur: 0.02,
      amp: a * 0.4,
      lp: 4000,
      hp: 1200,
      seed: 1130 + k,
      decay: 0.006,
    });
  }
  addReverb(x, 0.3, { size: 0.55, damp: 0.5 });
  return fadeOut(x, 0.2);
}

const SPICE = {
  'bird-chirp': () => birdOneShot(1401, ['whistle']),
  'bird-chirp-2': () => birdOneShot(1402, ['sparrow', 'teeoo']),
  footsteps,
};

// ---------- main ----------
function main() {
  mkdirSync(OUT, { recursive: true });
  const only = new Set(process.argv.slice(2));
  const want = (n) => only.size === 0 || only.has(n);
  let total = 0;
  const out = (name, res, x, loop) => {
    total += res.bytes;
    console.log(`  ${describe(x, res, { loop })}`);
    // Remove a stale file in the other format (e.g. city-day.wav -> .m4a).
    const other = path.join(OUT, `${name}.${res.file.endsWith('.wav') ? 'm4a' : 'wav'}`);
    if (existsSync(other)) rmSync(other);
  };
  console.log('SFX (wav)');
  for (const [name, fn] of Object.entries(SFX)) {
    if (!want(name)) continue;
    const x = fn();
    out(name, writeAudio(path.join(OUT, name), x), x, name === 'hum');
  }
  console.log('Ambience loops (m4a)');
  for (const [name, fn] of Object.entries(BEDS)) {
    if (!want(name)) continue;
    const x = master(fn(), { targetLufs: BED_LUFS, ceilingDb: -4, loop: true });
    out(
      name,
      writeAudio(path.join(OUT, name), x, { format: 'm4a', kbps: 64, loop: true }),
      x,
      true,
    );
    if (name === 'amb-crowd')
      console.log(`    syllabic modulation ${modulation(x).toFixed(2)} (band noise ~0.05)`);
  }
  console.log('Spice one-shots (m4a)');
  for (const [name, fn] of Object.entries(SPICE)) {
    if (!want(name)) continue;
    const x = fn();
    normalize(x, -6);
    limit(x, -6);
    out(name, writeAudio(path.join(OUT, name), x, { format: 'm4a', kbps: 64 }), x, false);
  }
  console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);
}

/** Envelope fluctuation in 3-8 Hz (syllable rate) relative to the mean level. */
function modulation(x) {
  const env = onePole(x.map(Math.abs), 20);
  const hop = Math.round(SR / 100);
  const e = [];
  for (let i = 0; i < env.length; i += hop) e.push(env[i]);
  const m = e.reduce((a, b) => a + b, 0) / e.length;
  // band-pass the 100 Hz envelope at 3-8 Hz with a crude difference of moving averages
  const ma = (k) =>
    e.map((_, i) => {
      let s = 0;
      for (let j = -k; j <= k; j++) s += e[(i + j + e.length) % e.length];
      return s / (2 * k + 1);
    });
  const a = ma(3);
  const b = ma(12);
  let s = 0;
  for (let i = 0; i < e.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / e.length) / m;
}

main();
