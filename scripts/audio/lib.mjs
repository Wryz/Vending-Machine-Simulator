/**
 * Shared offline DSP for the procedural audio scripts (generate.mjs, music.mjs).
 * Float64 mono buffers at 44.1 kHz. Everything is deterministic (seeded).
 *
 * Loops are built "circularly": events are written modulo the loop length and
 * stateful filters/reverbs run two laps so their state wraps (see `circular`),
 * which makes the last sample flow into the first with no crossfade needed.
 */
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const SR = 44100;
export const TAU = Math.PI * 2;

// ---------- basics ----------
/** mulberry32 */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const buf = (sec) => new Float64Array(Math.round(sec * SR));
export const dB = (db) => 10 ** (db / 20);
export const toDb = (g) => 20 * Math.log10(Math.max(1e-12, g));
export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (r, lo, hi) => lo + (hi - lo) * r();

export function noise(n, seed) {
  const r = rng(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
}

/** Pink-ish noise (Paul Kellet's economy filter), roughly unit RMS-ish. */
export function pink(n, seed) {
  const w = noise(n, seed);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = w[i];
    b0 = 0.99765 * b0 + x * 0.099046;
    b1 = 0.963 * b1 + x * 0.2965164;
    b2 = 0.57 * b2 + x * 1.0526913;
    w[i] = (b0 + b1 + b2 + x * 0.1848) * 0.25;
  }
  return w;
}

/** Brown noise (leaky integrator). */
export function brown(n, seed) {
  const w = noise(n, seed);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = 0.995 * y + w[i] * 0.06;
    w[i] = y;
  }
  return w;
}

// ---------- filters ----------
function coeffs(type, freq, q, gainDb = 0) {
  const w = (TAU * Math.min(freq, SR * 0.49)) / SR;
  const cos = Math.cos(w);
  const sin = Math.sin(w);
  const alpha = sin / (2 * q);
  const A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass':
      [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'highpass':
      [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'bandpass': // constant 0 dB peak gain
      [b0, b1, b2] = [alpha, 0, -alpha];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'peak':
      [b0, b1, b2] = [1 + alpha * A, -2 * cos, 1 - alpha * A];
      [a0, a1, a2] = [1 + alpha / A, -2 * cos, 1 - alpha / A];
      break;
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cos + s);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - s);
      a0 = A + 1 - (A - 1) * cos + s;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - s;
      break;
    }
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cos + s);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - s);
      a0 = A + 1 + (A - 1) * cos + s;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - s;
      break;
    }
    default:
      throw new Error(`biquad type ${type}`);
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

/** RBJ biquad, in place. */
export function biquad(x, type, freq, q = 0.707, gainDb = 0) {
  const [b0, b1, b2, a1, a2] = coeffs(type, freq, q, gainDb);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/**
 * Time-varying biquad: `freqAt(i)` is sampled every `block` samples.
 * Used for formants, swept whooshes and distance filtering.
 */
export function biquadTV(x, type, freqAt, q = 0.707, block = 32) {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  let c = coeffs(type, freqAt(0), typeof q === 'function' ? q(0) : q);
  for (let i = 0; i < x.length; i++) {
    if (i % block === 0) c = coeffs(type, freqAt(i), typeof q === 'function' ? q(i) : q);
    const y = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** One-pole low-pass, in place. */
export function onePole(x, freq) {
  const a = Math.exp((-TAU * freq) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = (1 - a) * x[i] + a * y;
    x[i] = y;
  }
  return x;
}

// ---------- loops ----------
/** Run a stateful in-place processor over two laps so its state wraps; returns length N. */
export function circular(x, fn) {
  const N = x.length;
  const two = new Float64Array(N * 2);
  two.set(x, 0);
  two.set(x, N);
  fn(two);
  return two.slice(N);
}

/** Fold a buffer rendered past the loop end back onto the head (length N). */
export function wrapAdd(x, N) {
  const out = new Float64Array(N);
  for (let i = 0; i < x.length; i++) out[i % N] += x[i];
  return out;
}

/** Add `src` into `out` starting at sample `s0`, wrapping modulo out.length. */
export function addAt(out, src, s0, gain = 1) {
  const N = out.length;
  const start = ((Math.round(s0) % N) + N) % N;
  for (let i = 0; i < src.length; i++) out[(start + i) % N] += src[i] * gain;
}

/** Make `x` (length N + F) a seamless loop of length N via an equal-power crossfade. */
export function loopify(x, fadeSec) {
  const F = Math.round(fadeSec * SR);
  const N = x.length - F;
  const out = x.slice(0, N);
  for (let i = 0; i < F; i++) {
    const t = i / F;
    out[i] = x[i] * Math.sin((t * Math.PI) / 2) + x[N + i] * Math.cos((t * Math.PI) / 2);
  }
  return out;
}

// ---------- envelopes / dynamics ----------
export function peak(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

export function scale(x, g) {
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}

export function normalize(x, peakDb) {
  return scale(x, dB(peakDb) / (peak(x) || 1));
}

export function fadeOut(x, sec = 0.01) {
  const n = Math.min(x.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n;
  return x;
}

export function fadeIn(x, sec = 0.005) {
  const n = Math.min(x.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) x[i] *= i / n;
  return x;
}

export function mix(into, src, gain = 1, offset = 0) {
  for (let i = 0; i < src.length && i + offset < into.length; i++)
    into[i + offset] += src[i] * gain;
  return into;
}

/** Soft saturation, roughly unity gain for small signals. */
export function saturate(x, drive = 1.5) {
  const k = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / k;
  return x;
}

/**
 * Look-ahead peak limiter (circular for loops). Holds the minimum required
 * gain over a short window, then smooths it, so peaks never pass `ceilingDb`.
 */
export function limit(x, ceilingDb, { loop = false, windowMs = 6, releaseMs = 120 } = {}) {
  const N = x.length;
  const c = dB(ceilingDb);
  const W = Math.round((windowMs / 1000) * SR);
  const need = new Float64Array(N);
  for (let i = 0; i < N; i++) need[i] = Math.min(1, c / Math.max(1e-12, Math.abs(x[i])));
  // Sliding min over [i - W, i + W] (brute force on the few samples that need it).
  const g = new Float64Array(N).fill(1);
  for (let i = 0; i < N; i++) {
    if (need[i] >= 1) continue;
    for (let k = -W; k <= W; k++) {
      let j = i + k;
      if (loop) j = (j + N) % N;
      else if (j < 0 || j >= N) continue;
      if (need[i] < g[j]) g[j] = need[i];
    }
  }
  // Smooth release (attack is covered by the hold window).
  const a = Math.exp(-1 / ((releaseMs / 1000) * SR));
  const laps = loop ? 2 : 1;
  let s = 1;
  for (let lap = 0; lap < laps; lap++) {
    for (let i = 0; i < N; i++) {
      s = g[i] < s ? g[i] : g[i] + (s - g[i]) * a;
      if (lap === laps - 1) x[i] *= Math.min(s, g[i]);
    }
  }
  return x;
}

// ---------- reverb ----------
/**
 * Freeverb-style mono reverb (8 combs + 4 allpasses). Returns the WET signal.
 * size 0..1 (feedback 0.7..0.98), damp 0..1.
 */
export function reverb(x, { size = 0.6, damp = 0.4, predelayMs = 12, seedSpread = 0 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((l) => l + seedSpread);
  const aps = [556, 441, 341, 225].map((l) => l + seedSpread);
  const fb = 0.7 + 0.28 * size;
  const d = damp * 0.4;
  const pre = Math.round((predelayMs / 1000) * SR);
  const n = x.length;
  const out = new Float64Array(n);
  const inp = new Float64Array(n);
  for (let i = pre; i < n; i++) inp[i] = x[i - pre] * 0.015;
  for (const L of combs) {
    const line = new Float64Array(L);
    let idx = 0;
    let store = 0;
    for (let i = 0; i < n; i++) {
      const y = line[idx];
      store = y * (1 - d) + store * d;
      line[idx] = inp[i] + store * fb;
      idx = idx + 1 === L ? 0 : idx + 1;
      out[i] += y;
    }
  }
  for (const L of aps) {
    const line = new Float64Array(L);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const b = line[idx];
      const y = -out[i] + b;
      line[idx] = out[i] + b * 0.5;
      idx = idx + 1 === L ? 0 : idx + 1;
      out[i] = y;
    }
  }
  return out;
}

/** Mix a reverb (wet) into x in place. `loop` makes the tail wrap circularly. */
export function addReverb(x, wet, opts = {}, loop = false) {
  const w = loop ? circular(x, (two) => two.set(reverb(two, opts))) : reverb(x, opts);
  for (let i = 0; i < x.length; i++) x[i] += w[i] * wet;
  return x;
}

// ---------- loudness (ITU-R BS.1770 / EBU R128, mono) ----------
export function lufs(x) {
  const k = biquad(
    biquad(Float64Array.from(x), 'highshelf', 1500, 1 / Math.SQRT2, 4),
    'highpass',
    38,
    0.5,
  );
  const B = Math.round(0.4 * SR);
  const H = Math.round(0.1 * SR);
  const blocks = [];
  for (let s = 0; s + B <= k.length; s += H) {
    let e = 0;
    for (let i = s; i < s + B; i++) e += k[i] * k[i];
    blocks.push(e / B);
  }
  if (!blocks.length) return -70;
  const L = (ms) => -0.691 + 10 * Math.log10(Math.max(1e-12, ms));
  const abs = blocks.filter((ms) => L(ms) > -70);
  if (!abs.length) return -70;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((ms) => L(ms) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
}

/**
 * Loudest 400 ms window (EBU "momentary" loudness, LUFS), zero-padded so even a
 * 50 ms tick gets a value. One-shots are leveled by this, not by peak: a short
 * tick and a long chime at the same peak sound very different.
 */
export function momentaryMax(x) {
  const B = Math.round(0.4 * SR);
  const padded = new Float64Array(x.length + 2 * B);
  padded.set(x, B);
  const k = biquad(biquad(padded, 'highshelf', 1500, 1 / Math.SQRT2, 4), 'highpass', 38, 0.5);
  const H = Math.round(0.01 * SR);
  let best = 0;
  for (let s = 0; s + B <= k.length; s += H) {
    let e = 0;
    for (let i = s; i < s + B; i++) e += k[i] * k[i];
    best = Math.max(best, e / B);
  }
  return -0.691 + 10 * Math.log10(Math.max(1e-12, best));
}

/** Bring a buffer to `targetLufs` (iterating with the limiter), peaks <= ceilingDb. */
export function master(x, { targetLufs, ceilingDb, loop = false }) {
  for (let it = 0; it < 4; it++) {
    scale(x, dB(targetLufs - lufs(x)));
    if (peak(x) > dB(ceilingDb)) limit(x, ceilingDb, { loop });
    if (Math.abs(lufs(x) - targetLufs) < 0.15) break;
  }
  return x;
}

/** Loop-seam check: |x[N-1] - x[0]| relative to the typical sample-to-sample step. */
export function seam(x) {
  let s = 0;
  for (let i = 1; i < x.length; i++) s += (x[i] - x[i - 1]) ** 2;
  const rmsStep = Math.sqrt(s / (x.length - 1));
  return {
    jump: Math.abs(x[x.length - 1] - x[0]),
    rmsStep,
    ratio: Math.abs(x[x.length - 1] - x[0]) / (rmsStep || 1),
  };
}

// ---------- output ----------
export function wav(x) {
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

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
let tmp = null;
function tmpDir() {
  if (!tmp) {
    tmp = mkdtempSync(path.join(tmpdir(), 'coinline-audio-'));
    process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
  }
  return tmp;
}

/** Decode any file to mono float samples at SR (for verification). */
export function decode(file) {
  const r = spawnSync(
    FFMPEG,
    ['-v', 'error', '-i', file, '-f', 'f64le', '-ac', '1', '-ar', String(SR), '-'],
    {
      maxBuffer: 1 << 30,
    },
  );
  if (r.status !== 0) throw new Error(`ffmpeg decode failed: ${r.stderr}`);
  const b = r.stdout;
  return new Float64Array(b.buffer, b.byteOffset, b.length / 8).slice();
}

/**
 * Write `x` as `<out>.wav` or encode to AAC `<out>.m4a` (mono). Returns
 * { file, bytes, seconds, decoded } where `decoded` is the round-tripped audio
 * cut to the container's duration.
 *
 * Loops (`loop: true`) are encoded with a wrapped pre-roll and post-roll (the
 * loop's own tail before the start, its head after the end) and an MP4 edit
 * list that skips the pre-roll and ends exactly at N samples. The AAC encoder
 * then never sees an artificial silence-to-signal jump at the seam, so the
 * decoded loop point is as clean as the middle of the file (players that honor
 * edit lists, i.e. AVFoundation and ExoPlayer, play exactly N samples).
 */
export function writeAudio(outNoExt, x, { format = 'wav', kbps = 64, loop = false } = {}) {
  if (format === 'wav') {
    const w = wav(x);
    const file = `${outNoExt}.wav`;
    writeFileSync(file, w);
    return { file, bytes: w.length, seconds: x.length / SR };
  }
  const N = x.length;
  const K = loop ? Math.min(4096, N) : 0;
  let src = x;
  if (loop) {
    src = new Float64Array(N + 2 * K);
    for (let i = 0; i < K; i++) src[i] = x[N - K + i];
    src.set(x, K);
    for (let i = 0; i < K; i++) src[K + N + i] = x[i % N];
  }
  const tmpWav = path.join(tmpDir(), `${path.basename(outNoExt)}.wav`);
  writeFileSync(tmpWav, wav(src));
  const file = `${outNoExt}.m4a`;
  const args = ['-v', 'error', '-y'];
  if (loop) args.push('-itsoffset', String(-K / SR));
  args.push(
    '-i',
    tmpWav,
    '-c:a',
    'aac',
    '-b:a',
    `${kbps}k`,
    '-ac',
    '1',
    '-movie_timescale',
    String(SR),
  );
  if (loop) args.push('-t', String((N + K) / SR));
  args.push('-movflags', '+faststart', file);
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg encode failed: ${r.stderr}`);
  const decoded = decode(file).subarray(0, N);
  return { file, bytes: statSync(file).size, seconds: N / SR, decoded };
}

/** One-line summary: size, loudness, peaks (pre/post AAC), loop seam and codec error at the seam. */
export function describe(x, res, { loop = true } = {}) {
  const d = res.decoded;
  let line =
    `${path.basename(res.file).padEnd(20)} ${(res.bytes / 1024).toFixed(0).padStart(5)} KB ${res.seconds.toFixed(1).padStart(5)} s ` +
    `${lufs(x).toFixed(1).padStart(6)} LUFS  peak ${toDb(peak(x)).toFixed(1)}`;
  if (d) line += ` (aac ${toDb(peak(d)).toFixed(1)})`;
  line += ' dBFS';
  if (loop) {
    line += `  seam ${seam(x).ratio.toFixed(2)}x`;
    if (d) {
      const err = (a, b) => {
        let e = 0;
        for (let i = a; i < b; i++) e = Math.max(e, Math.abs(d[i] - x[i]));
        return toDb(e).toFixed(0);
      };
      const n = x.length;
      const mid = Math.floor(n / 2);
      line += ` (aac ${seam(d).ratio.toFixed(2)}x; err edge ${err(0, 2048)}/${err(n - 2048, n)} mid ${err(mid, mid + 2048)} dB)`;
    }
  }
  return line;
}
