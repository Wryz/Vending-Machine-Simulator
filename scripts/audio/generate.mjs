#!/usr/bin/env node
/**
 * Procedural UI + ambience sounds (SPEC §3.6: soft mechanical clicks, coin
 * clinks, compressor hum, distant city by time of day; no loud jingles).
 *
 *   node scripts/audio/generate.mjs   -> assets/audio/*.wav (mono, 44.1 kHz, 16-bit)
 *
 * Deterministic (seeded noise). UI sounds peak at about -14 dBFS; beds are
 * much quieter. Loops (hum, city-*) are seamless: rendered long and
 * crossfaded tail-into-head.
 */
import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets/audio');
const SR = 44100;
const TAU = Math.PI * 2;

// ---------- primitives ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const buf = (sec) => new Float64Array(Math.round(sec * SR));
const dB = (db) => 10 ** (db / 20);

function noise(n, seed) {
  const r = rng(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
}

/** RBJ biquad, in place. type: lowpass | highpass | bandpass */
function biquad(x, type, freq, q = 0.707) {
  const w = (TAU * freq) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === 'highpass') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha];
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

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

function normalize(x, peakDb) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const g = dB(peakDb) / (peak || 1);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

function fadeOut(x, sec = 0.01) {
  const n = Math.round(sec * SR);
  for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n;
  return x;
}

/** Make `x` (length N + F) a seamless loop of length N via an equal-power crossfade. */
function loopify(x, fadeSec) {
  const F = Math.round(fadeSec * SR);
  const N = x.length - F;
  const out = x.slice(0, N);
  for (let i = 0; i < F; i++) {
    const t = i / F;
    out[i] = x[i] * Math.sin((t * Math.PI) / 2) + x[N + i] * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

function wav(x) {
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) {
    const v = Math.max(-1, Math.min(1, x[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// ---------- sounds ----------
/** One coin clink: two inharmonic damped partials + a tiny contact tick. */
function clink(out, t0, pitch = 1, amp = 1, seed = 7) {
  partial(out, { f: 2380 * pitch, amp: 0.55 * amp, decay: 0.09, t0 });
  partial(out, { f: 3790 * pitch, amp: 0.35 * amp, decay: 0.06, t0 });
  partial(out, { f: 6120 * pitch, amp: 0.12 * amp, decay: 0.025, t0 });
  burst(out, { t0, dur: 0.012, amp: 0.25 * amp, lp: 9000, hp: 2500, seed });
}

const SOUNDS = {
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
      burst(x, { t0: t + 0.002, dur: 0.02, amp: 0.15 * a, lp: 1500, hp: 150, seed: 31 + i }); // stack contact
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
    // Small latch click as the flap settles.
    partial(x, { f: 2600, amp: 0.12, decay: 0.006, t0: 0.045 });
    burst(x, { t0: 0.045, dur: 0.006, amp: 0.15, lp: 8000, hp: 2000, seed: 6 });
    return normalize(fadeOut(x), -14);
  },
  vend() {
    const x = buf(1.0);
    // Spiral motor: soft filtered buzz with a slow ramp, ~0.55 s.
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
    for (let i = 0; i < m.length; i++) x[i] += m[i];
    // Spiral detent ticks.
    for (let t = 0.07; t < motorEnd - 0.05; t += 0.085) {
      burst(x, { t0: t, dur: 0.008, amp: 0.18, lp: 5000, hp: 1200, seed: Math.round(t * 1000) });
    }
    // Drop: product falls and lands in the bin.
    const td = 0.68;
    partial(x, { f: 64, amp: 1, decay: 0.08, t0: td, attack: 0.003, glide: 0.7 });
    partial(x, { f: 145, amp: 0.3, decay: 0.04, t0: td, glide: 0.4 });
    burst(x, { t0: td, dur: 0.06, amp: 0.55, lp: 1000, hp: 60, seed: 41, decay: 0.014 });
    burst(x, { t0: td + 0.06, dur: 0.03, amp: 0.12, lp: 2500, hp: 300, seed: 42, decay: 0.008 });
    return normalize(fadeOut(x, 0.03), -14);
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
  'city-day'() {
    return cityBed({ seed: 101, lp: 1100, rumbleLp: 140, peakDb: -28, swell: 0.25, hiss: 0.08 });
  },
  'city-night'() {
    return cityBed({ seed: 202, lp: 520, rumbleLp: 110, peakDb: -34, swell: 0.18, hiss: 0.02 });
  },
  success() {
    const x = buf(0.95);
    // Gentle two-note chime (perfect fifth up), soft bell-like partials.
    for (const [t0, f, a] of [
      [0.002, 784, 0.8], // G5
      [0.13, 1175, 0.65], // D6
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
};

/** 8 s seamless city bed: pinkish filtered noise, low traffic rumble, slow swells. */
function cityBed({ seed, lp, rumbleLp, peakDb, swell, hiss }) {
  const N = 8;
  const F = 1;
  const n = Math.round((N + F) * SR);
  const body = biquad(biquad(noise(n, seed), 'lowpass', lp, 0.5), 'highpass', 60);
  const rumble = biquad(biquad(noise(n, seed + 1), 'lowpass', rumbleLp), 'lowpass', rumbleLp);
  const air = biquad(biquad(noise(n, seed + 2), 'highpass', 2500), 'lowpass', 6000);
  const x = new Float64Array(n);
  // Swell periods divide the 8 s loop (8 s, 4 s, 2.67 s) so they wrap too.
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const s =
      1 +
      swell * Math.sin(TAU * (t / 8) + 0.4) +
      swell * 0.6 * Math.sin(TAU * (t / 4) + 1.7) +
      swell * 0.3 * Math.sin(TAU * (t / (8 / 3)) + 2.9);
    x[i] = s * (body[i] + 2.2 * rumble[i]) + hiss * air[i];
  }
  return normalize(loopify(x, F), peakDb);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let total = 0;
  for (const [name, fn] of Object.entries(SOUNDS)) {
    const data = wav(fn());
    total += data.length;
    await writeFile(path.join(OUT, `${name}.wav`), data);
    console.log(`  ${name}.wav  ${(data.length / 1024).toFixed(0)} KB`);
  }
  console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
