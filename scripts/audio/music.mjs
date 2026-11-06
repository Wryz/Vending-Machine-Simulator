#!/usr/bin/env node
/**
 * Procedural background music (SPEC §1.2 calm and premium, §3.6 no loud jingles).
 * Two original, seamless loops rendered offline and encoded to AAC:
 *
 *   music-day.m4a    84 BPM warm lo-fi: Rhodes-like FM chords, mellow bass,
 *                    soft swung brushes/kick, vibes melody, tape warble + vinyl.
 *   music-night.m4a  54 BPM, sparse: soft EP, pad, long reverb, delay on the
 *                    melody, brush sweeps only.
 *
 *   node scripts/audio/music.mjs        (needs ffmpeg on PATH or $FFMPEG)
 *
 * Seamless by construction: every note/hit is written modulo the loop length,
 * and reverb/filters run two laps (lib.circular) so their tails wrap into the
 * head. Mastered to about -18 LUFS with peaks <= -7 dBFS (it sits under SFX).
 * Progressions and melodies are original.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SR,
  TAU,
  addAt,
  biquad,
  circular,
  lufs,
  master,
  peak,
  pink,
  reverb as reverbWet,
  rng,
  saturate,
  toDb,
  describe,
  writeAudio,
} from './lib.mjs';
import { bass, ep, hat, kick, pad, snare, sweep, vibes } from './synth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets/audio');

const TARGET_LUFS = -18;
const CEILING_DB = -7;
/** Hard requirement after AAC decoding (codec overshoot is re-checked). */
const MAX_PEAK_DB = -6;

// ---------- helpers ----------
function song({ bpm, bars, swing = 0.5 }) {
  const beat = 60 / bpm;
  const L = bars * 4 * beat;
  const N = Math.round(L * SR);
  /** Seconds for (bar, beat offset), with 8th-note swing on the off-beats. */
  const at = (bar, off) => {
    const eighth = Math.round(off * 2 * 1000) / 1000;
    const swung = Number.isInteger(eighth) && eighth % 2 === 1 ? off + (swing - 0.5) : off;
    return (bar * 4 + swung) * beat;
  };
  const track = () => new Float64Array(N);
  const place = (tr, sig, sec, gain = 1) => addAt(tr, sig, sec * SR, gain);
  return { beat, L, N, at, track, place };
}

/** Variable-delay wow/flutter, periodic in the loop so the seam stays clean. */
function tapeWarble(x, { wowMs = 0.8, wowHz = 0.5, flutterMs = 0.06, flutterHz = 6 }) {
  const N = x.length;
  const L = N / SR;
  const kW = Math.max(1, Math.round(wowHz * L));
  const kF = Math.max(1, Math.round(flutterHz * L));
  const out = new Float64Array(N);
  const base = (wowMs + flutterMs + 0.5) / 1000;
  for (let i = 0; i < N; i++) {
    const d =
      base +
      (wowMs / 1000) * Math.sin((TAU * kW * i) / N) +
      (flutterMs / 1000) * Math.sin((TAU * kF * i) / N + 1.3);
    let p = i - d * SR;
    p = ((p % N) + N) % N;
    const k = Math.floor(p);
    const fr = p - k;
    out[i] = x[k] * (1 - fr) + x[(k + 1) % N] * fr;
  }
  return out;
}

/** Vinyl crackle + tape hiss bed (circular). */
function vinyl(N, seed, { crackle = 1, hiss = 1 }) {
  const r = rng(seed);
  const clicks = new Float64Array(N);
  const L = N / SR;
  const nClicks = Math.round(7 * L);
  for (let k = 0; k < nClicks; k++) {
    const i = Math.floor(r() * N);
    const a = (r() < 0.5 ? -1 : 1) * Math.min(1, -Math.log(1 - r() * 0.999) * 0.25);
    clicks[i] += a;
    clicks[(i + 1) % N] -= a * 0.5;
  }
  const c = circular(clicks, (x) => biquad(biquad(x, 'bandpass', 3200, 0.8), 'lowpass', 8000));
  const pops = new Float64Array(N);
  for (let k = 0; k < Math.round(0.2 * L); k++) pops[Math.floor(r() * N)] += 0.8 + r() * 0.6;
  const p = circular(pops, (x) => biquad(x, 'lowpass', 1400, 0.9));
  const h = circular(pink(N, seed + 7), (x) => biquad(biquad(x, 'lowpass', 5500), 'highpass', 300));
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) out[i] = crackle * (c[i] * 0.5 + p[i] * 0.3) + hiss * h[i] * 0.05;
  return out;
}

function report(name, x, res) {
  console.log(`  ${describe(x, res)}`);
}

// ---------- day ----------
function musicDay() {
  const S = song({ bpm: 84, bars: 32, swing: 0.58 });
  const r = rng(8401);
  const hum = (ms = 8) => (r() * 2 - 1) * (ms / 1000);
  const keys = S.track();
  const lo = S.track();
  const lead = S.track();
  const drums = S.track();

  const CH = {
    Bbmaj9: { root: 34, v: [57, 60, 62, 65] },
    Am7: { root: 33, v: [55, 60, 64, 67] },
    Dm9: { root: 38, v: [53, 57, 60, 64] },
    Gm9: { root: 43, v: [53, 57, 58, 62] },
    C13: { root: 36, v: [52, 57, 58, 62] },
    Bbmaj7: { root: 34, v: [57, 60, 62, 65] },
    C9sus: { root: 36, v: [58, 62, 65, 67] },
    Gm7: { root: 43, v: [53, 58, 62, 65] },
    C7b9: { root: 36, v: [52, 58, 61, 67] },
  };
  const A = [['Bbmaj9'], ['Am7'], ['Dm9'], ['Gm9', 'C13']];
  const B = [['Gm9'], ['Am7'], ['Bbmaj7'], ['C9sus'], ['Am7'], ['Dm9'], ['Gm7'], ['C7b9']];
  const prog = [...A, ...A, ...A, ...A, ...B, ...A, ...A];

  const strum = (tr, chord, sec, dur, vel) => {
    chord.v.forEach((m, k) => {
      const v = vel * (k === chord.v.length - 1 ? 1.08 : 0.92) * (0.92 + r() * 0.16);
      S.place(tr, ep(m, dur * S.beat, v, { tremolo: 0.06 }), sec + k * 0.013 + hum(5), 0.3);
    });
  };

  const COMP = [
    [[0, 1.6, 0.72], [2.5, 1.3, 0.5]],
    [[0, 3.6, 0.7]],
    [[0, 0.9, 0.7], [1.5, 1.0, 0.48], [3, 0.9, 0.52]],
    [[-0.5, 2.2, 0.68], [2.5, 1.2, 0.46]],
  ];

  prog.forEach((bar, n) => {
    const next = prog[(n + 1) % prog.length][0];
    const section = n < 4 ? 'intro' : n < 8 ? 'build' : n < 24 ? 'full' : n < 30 ? 'out' : 'tail';
    // Keys
    if (bar.length === 2) {
      strum(keys, CH[bar[0]], S.at(n, 0) + hum(), 1.8, 0.68);
      strum(keys, CH[bar[1]], S.at(n, 2) + hum(), 1.8, 0.62);
    } else {
      const pat = section === 'intro' || section === 'tail' ? COMP[1] : COMP[Math.floor(r() * COMP.length)];
      for (const [off, dur, vel] of pat) strum(keys, CH[bar[0]], S.at(n, off) + hum(), dur, vel);
    }
    // Bass
    const root = CH[bar[0]].root;
    const nextRoot = CH[next].root;
    const approach = r() < 0.5 ? nextRoot - 1 : nextRoot + 2;
    let bl;
    if (section === 'intro' || section === 'tail') bl = [[0, root, 3.6, 0.7]];
    else if (bar.length === 2)
      bl = [
        [0, root, 1.6, 0.85],
        [2, CH[bar[1]].root, 1.3, 0.8],
        [3.5, approach, 0.4, 0.5],
      ];
    else if (r() < 0.5)
      bl = [
        [0, root, 1.4, 0.85],
        [1.5, root + 7, 0.4, 0.5],
        [2.5, root, 0.9, 0.68],
        [3.5, approach, 0.4, 0.5],
      ];
    else
      bl = [
        [0, root, 2.3, 0.85],
        [2.5, root + 12, 0.4, 0.5],
        [3, root + 7, 0.9, 0.62],
      ];
    for (const [off, m, dur, vel] of bl) S.place(lo, bass(m, dur * S.beat, vel), S.at(n, off) + hum(6), 0.55);

    // Drums
    const g = { intro: 0.6, build: 0.8, full: 1, out: 0.8, tail: 0.6 }[section];
    const hv = [0.55, 0.3, 0.45, 0.3, 0.55, 0.3, 0.45, 0.35];
    for (let e = 0; e < 8; e++) {
      if (e % 2 === 1 && r() < 0.15) continue;
      const open = section === 'full' && n % 4 === 3 && e === 7;
      S.place(drums, hat(hv[e] * g * (0.85 + r() * 0.3), 300 + n * 8 + e, open), S.at(n, e / 2) + hum(4), 0.5);
    }
    if (section === 'build' || section === 'full' || section === 'out') {
      S.place(drums, kick(0.8 * g, 11), S.at(n, 0) + hum(3), 0.9);
      S.place(drums, kick(0.6 * g, 12), S.at(n, 2.5) + hum(3), 0.9);
      if (section === 'full' && r() < 0.25) S.place(drums, kick(0.45, 13), S.at(n, 3.5) + hum(3), 0.9);
      const brushy = section === 'full' ? 0.45 : 0.8;
      for (const off of [1, 3])
        S.place(drums, snare(0.6 * g, 50 + n * 2 + off, { brush: brushy }), S.at(n, off) + hum(5), 0.75);
      if (section === 'full' && r() < 0.3)
        S.place(drums, snare(0.18, 90 + n, { brush: 0.2 }), S.at(n, 3.5) + hum(5), 0.75);
    }
  });

  // Lead melody [bar, beat offset, midi, beats, vel]
  const MEL = [
    // A2
    [8, 0.5, 69, 0.5, 0.6], [8, 1, 72, 1, 0.7], [8, 2.5, 74, 1.5, 0.72],
    [9, 0, 76, 1.5, 0.75], [9, 1.5, 74, 0.5, 0.55], [9, 2, 72, 2, 0.65],
    [10, 0.5, 69, 0.5, 0.55], [10, 1, 72, 0.5, 0.6], [10, 1.5, 74, 0.5, 0.6], [10, 2, 77, 1.5, 0.72], [10, 3.5, 76, 0.5, 0.55],
    [11, 0, 74, 1.5, 0.68], [11, 1.5, 70, 0.5, 0.5], [11, 2, 69, 1, 0.6], [11, 3, 67, 1, 0.55],
    [12, 0.5, 69, 0.5, 0.6], [12, 1, 72, 1, 0.7], [12, 2.5, 77, 1.5, 0.74],
    [13, 0, 76, 1, 0.7], [13, 1, 79, 1, 0.74], [13, 2, 76, 0.5, 0.55], [13, 2.5, 72, 1.5, 0.62],
    [14, 0, 74, 2, 0.7], [14, 2.5, 76, 0.5, 0.5], [14, 3, 77, 0.5, 0.55], [14, 3.5, 76, 0.5, 0.5],
    [15, 0, 74, 1, 0.62], [15, 1, 72, 1, 0.6], [15, 2, 69, 2, 0.66],
    // B
    [16, 1, 74, 1, 0.62], [16, 2, 77, 1, 0.68], [16, 3, 81, 2, 0.74],
    [17, 1, 79, 1, 0.62], [17, 2, 76, 2, 0.66],
    [18, 0.5, 77, 0.5, 0.55], [18, 1, 74, 1, 0.62], [18, 2, 72, 1, 0.6], [18, 3, 69, 1, 0.58],
    [19, 0, 70, 3, 0.64],
    [20, 1, 72, 1, 0.6], [20, 2, 76, 1, 0.64], [20, 3, 79, 1, 0.68],
    [21, 0, 77, 1.5, 0.7], [21, 1.5, 76, 0.5, 0.52], [21, 2, 74, 2, 0.64],
    [22, 0, 70, 1, 0.58], [22, 1, 74, 1, 0.6], [22, 2, 77, 1, 0.64], [22, 3, 76, 1, 0.58],
    [23, 0, 73, 1, 0.6], [23, 1, 72, 2, 0.62],
    // A3 echoes
    [25, 2, 76, 2, 0.45], [27, 2, 74, 1, 0.4], [27, 3, 72, 1, 0.4],
    [29, 2, 76, 1.5, 0.42], [29, 3.5, 74, 0.5, 0.35], [30, 0, 72, 3, 0.4],
  ];
  for (const [n, off, m, dur, vel] of MEL)
    S.place(lead, vibes(m, dur * S.beat, vel * (0.94 + r() * 0.12)), S.at(n, off) + hum(7), 0.5);

  // Buses
  const drumBus = circular(drums, (x) => {
    biquad(x, 'lowpass', 7000, 0.6);
    biquad(x, 'highpass', 40);
  });
  saturate(drumBus, 1.6);
  const leadBus = circular(lead, (x) => biquad(x, 'lowpass', 6000, 0.6));
  const m = new Float64Array(S.N);
  for (let i = 0; i < S.N; i++) m[i] = keys[i] + lo[i] + leadBus[i] * 0.9 + drumBus[i] * 0.55;
  // Reverb send (keys + lead), circular.
  const send = new Float64Array(S.N);
  for (let i = 0; i < S.N; i++) send[i] = keys[i] * 0.5 + leadBus[i] * 0.8 + drumBus[i] * 0.15;
  const rv = circular(send, (x) => {
    const w = reverbWet(x, { size: 0.55, damp: 0.45, predelayMs: 18 });
    x.set(w);
  });
  for (let i = 0; i < S.N; i++) m[i] += rv[i] * 0.55;

  return finish(tapeWarble(m, { wowMs: 0.8, wowHz: 0.45 }), vinyl(S.N, 777, { crackle: 1, hiss: 1 }), 0.012);
}

// ---------- night ----------
function musicNight() {
  const S = song({ bpm: 54, bars: 16, swing: 0.5 });
  const r = rng(5402);
  const hum = (ms = 10) => (r() * 2 - 1) * (ms / 1000);
  const keys = S.track();
  const pads = S.track();
  const lo = S.track();
  const lead = S.track();
  const drums = S.track();

  const CH = [
    { root: 38, v: [53, 57, 60, 64] }, // Dm9
    { root: 34, v: [53, 62, 64, 69] }, // Bbmaj7(#11)
    { root: 33, v: [55, 57, 60, 64] }, // Fmaj9/A
    { root: 43, v: [53, 57, 58, 62] }, // Gm9
    { root: 38, v: [53, 60, 64, 69] }, // Dm9 (open)
    { root: 39, v: [55, 57, 58, 62] }, // Ebmaj7(#11)
    { root: 36, v: [52, 55, 59, 62] }, // Cmaj9
    { root: 33, v: [55, 61, 65, 69] }, // A7(b13)
  ];
  CH.forEach((c, k) => {
    const n = k * 2;
    // EP: slow roll on the downbeat, a soft partial re-strike in the second bar.
    c.v.forEach((m, j) =>
      S.place(keys, ep(m, 3.6 * S.beat, 0.42 * (0.9 + r() * 0.2), { bright: 0.7, tremolo: 0.08 }), S.at(n, 0) + j * 0.055 + hum(), 0.3),
    );
    const top = c.v.slice(2);
    const reOff = r() < 0.5 ? 4.5 : 5;
    top.forEach((m, j) =>
      S.place(keys, ep(m, 2.5 * S.beat, 0.3 * (0.9 + r() * 0.2), { bright: 0.6, tremolo: 0.08 }), S.at(n, reOff) + j * 0.07 + hum(), 0.3),
    );
    // Pad: the whole chord, slow swell.
    for (const m of c.v) S.place(pads, pad(m, 8 * S.beat, 0.22, { attack: 1.8, release: 2.6, cutoff: 1300 }), S.at(n, 0), 0.25);
    // Bass: long root, sometimes a soft fifth later.
    S.place(lo, bass(c.root, 7.4 * S.beat, 0.62), S.at(n, 0) + hum(6), 0.55);
    if (r() < 0.5) S.place(lo, bass(c.root + 7, 1.6 * S.beat, 0.35), S.at(n, 6) + hum(6), 0.55);
  });
  // Brush sweeps only, middle of the loop.
  for (let n = 4; n < 14; n++) {
    S.place(drums, sweep(0.22 * (0.8 + r() * 0.4), 600 + n, 0.9), S.at(n, 1) - 0.3, 1);
    if (n % 2 === 1) S.place(drums, sweep(0.15, 700 + n, 0.6), S.at(n, 3) - 0.2, 1);
  }

  const MEL = [
    [0, 1, 69, 2], [0, 3, 72, 2.5], [1, 2, 76, 4],
    [2, 1.5, 77, 1.5], [2, 3, 76, 2], [3, 2, 74, 3],
    [4, 1, 72, 2], [4, 3, 79, 3], [5, 3, 76, 1],
    [6, 0, 74, 4], [7, 1, 70, 1.5], [7, 2.5, 69, 3],
    [8, 2, 81, 2], [9, 0, 77, 1.5], [9, 1.5, 76, 2.5],
    [10, 1, 79, 2], [10, 3, 74, 2], [11, 2, 69, 3],
    [12, 1, 71, 2], [12, 3, 74, 2], [13, 2, 76, 3],
    [14, 1, 77, 2], [14, 3, 73, 1], [15, 0, 76, 4],
  ];
  for (const [n, off, m, dur] of MEL)
    S.place(lead, vibes(m, dur * S.beat, 0.5 * (0.85 + r() * 0.3), { tremolo: 0.1, decay: 2.2 }), S.at(n, off) + hum(12), 0.3);

  // Dotted-eighth echo on the melody (circular feedback delay).
  const echo = circular(lead, (x) => {
    const D = Math.round(0.75 * S.beat * SR);
    const y = new Float64Array(x.length);
    let s = 0;
    for (let i = 0; i < x.length; i++) {
      const fb = i >= D ? y[i - D] : 0;
      s = 0.6 * s + 0.4 * fb; // darken repeats
      y[i] = x[i] + s * 0.42;
    }
    for (let i = 0; i < x.length; i++) x[i] = y[i] - x[i];
  });

  const m = new Float64Array(S.N);
  for (let i = 0; i < S.N; i++) m[i] = keys[i] + pads[i] + lo[i] * 0.9 + lead[i] * 0.85 + echo[i] * 0.8 + drums[i] * 0.8;
  const send = new Float64Array(S.N);
  for (let i = 0; i < S.N; i++) send[i] = keys[i] * 0.7 + pads[i] * 0.6 + lead[i] + echo[i] * 0.6 + drums[i] * 0.5;
  const rv = circular(send, (x) => x.set(reverbWet(x, { size: 0.86, damp: 0.35, predelayMs: 30 })));
  for (let i = 0; i < S.N; i++) m[i] += rv[i] * 0.95;

  return finish(tapeWarble(m, { wowMs: 0.6, wowHz: 0.35, flutterMs: 0.04 }), vinyl(S.N, 778, { crackle: 0.6, hiss: 0.8 }), 0.009);
}

/** Master: tone shaping (circular), texture, loudness and peak ceiling. */
function finish(mixBuf, texture, textureGain) {
  const x = circular(mixBuf, (b) => {
    biquad(b, 'highpass', 35, 0.7);
    biquad(b, 'lowpass', 10500, 0.6);
    biquad(b, 'highshelf', 6000, 0.7, -2);
    biquad(b, 'lowshelf', 180, 0.7, 1.5);
  });
  // Normalise music to a rough level first so the texture ratio is stable.
  const g = 0.25 / (peak(x) || 1);
  for (let i = 0; i < x.length; i++) x[i] = x[i] * g;
  saturate(x, 1.2);
  for (let i = 0; i < x.length; i++) x[i] += texture[i] * textureGain;
  return master(x, { targetLufs: TARGET_LUFS, ceilingDb: CEILING_DB, loop: true });
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  let total = 0;
  for (const [name, fn] of [
    ['music-day', musicDay],
    ['music-night', musicNight],
  ]) {
    if (only && only !== name) continue;
    const t0 = Date.now();
    const x = fn();
    let res = writeAudio(path.join(OUT, name), x, { format: 'm4a', kbps: 80, loop: true });
    // AAC can overshoot sample peaks by a dB or two: pull the ceiling down until it fits.
    for (let ceiling = CEILING_DB; toDb(peak(res.decoded)) > MAX_PEAK_DB && ceiling > -12; ) {
      ceiling -= toDb(peak(res.decoded)) - MAX_PEAK_DB + 0.2;
      master(x, { targetLufs: TARGET_LUFS, ceilingDb: ceiling, loop: true });
      res = writeAudio(path.join(OUT, name), x, { format: 'm4a', kbps: 80, loop: true });
    }
    total += res.bytes;
    report(name, x, res);
    console.log(`    rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);
}

main();
