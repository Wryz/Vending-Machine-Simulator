/**
 * Instruments for the procedural music and musical UI cues. Each function
 * returns a dry Float64Array for one note/hit starting at sample 0.
 */
import { SR, TAU, biquad, midiHz, noise, onePole } from './lib.mjs';

/**
 * Electric piano (Rhodes-like 2-op FM): ratio 1:1 "bark" whose index decays,
 * plus a short high "tine" partial on the attack and a slightly detuned twin
 * voice for warmth. `vel` 0..1 sets both level and brightness.
 */
export function ep(midi, durSec, vel = 0.7, { release = 0.18, bright = 1, tremolo = 0 } = {}) {
  const f = midiHz(midi);
  const decay = 1.9 * Math.sqrt(261.6 / f) + 0.4; // low notes ring longer
  const len = Math.round((durSec + release * 5) * SR);
  const out = new Float64Array(len);
  const idx0 = (0.6 + 1.5 * vel) * bright * Math.min(1, Math.sqrt(440 / f));
  const amp = 0.25 + 0.75 * vel;
  let pc = 0,
    pm = 0,
    pc2 = 0,
    pt = 0;
  const offAt = durSec * SR;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env = Math.min(1, t / 0.003) * Math.exp(-t / decay);
    if (i > offAt) env *= Math.exp(-(i - offAt) / SR / release);
    if (env < 2e-5 && t > 0.01) break;
    const index = idx0 * (Math.exp(-t / 0.28) * 0.85 + 0.15);
    pm += (TAU * f) / SR;
    pc += (TAU * f) / SR;
    pc2 += (TAU * f * 1.0011) / SR;
    pt += (TAU * f * 7.02) / SR;
    const mod = Math.sin(pm);
    const body = Math.sin(pc + index * mod) + 0.45 * Math.sin(pc2 + index * 0.8 * mod);
    const tine = 0.12 * vel * Math.exp(-t / 0.025) * Math.sin(pt);
    const trem = 1 + tremolo * Math.sin(TAU * 4.3 * t);
    out[i] = amp * env * trem * (body * 0.7 + tine);
  }
  return out;
}

/** Soft vibraphone/bell-ish lead: sine with a short 4x partial and a gentle tremolo. */
export function vibes(midi, durSec, vel = 0.7, { tremolo = 0.18, decay = 1.6 } = {}) {
  const f = midiHz(midi);
  const len = Math.round((Math.min(durSec, decay * 1.8) + 1.2) * SR);
  const out = new Float64Array(len);
  const offAt = durSec * SR;
  let p1 = 0,
    p2 = 0,
    p3 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    if (i > offAt) env *= Math.exp(-(i - offAt) / SR / 0.25);
    if (env < 2e-5 && t > 0.01) break;
    p1 += (TAU * f) / SR;
    p2 += (TAU * f * 4.0) / SR;
    p3 += (TAU * f * 2.0) / SR;
    const trem = 1 - tremolo * (0.5 + 0.5 * Math.sin(TAU * 5.2 * t));
    out[i] =
      vel *
      trem *
      (env * (Math.sin(p1) + 0.12 * Math.sin(p3)) + 0.22 * Math.exp(-t / 0.09) * Math.sin(p2));
  }
  return out;
}

/** Warm bass: sine + 2nd/3rd harmonics (audible on phone speakers), soft attack. */
export function bass(midi, durSec, vel = 0.7) {
  const f = midiHz(midi);
  const rel = 0.09;
  const len = Math.round((durSec + rel * 6) * SR);
  const out = new Float64Array(len);
  const offAt = durSec * SR;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env = Math.min(1, t / 0.012) * (0.55 + 0.45 * Math.exp(-t / 0.35)) * Math.exp(-t / 4);
    if (i > offAt) env *= Math.exp(-(i - offAt) / SR / rel);
    if (env < 2e-5 && t > 0.02) break;
    ph += (TAU * f) / SR;
    out[i] =
      vel * env * (Math.sin(ph) + 0.38 * Math.sin(2 * ph + 0.3) + 0.16 * Math.sin(3 * ph + 0.9));
  }
  return onePole(out, 900);
}

/** Wavetable pad: band-limited, softened saw cycles, 3 detuned voices, slow attack. */
export function pad(midi, durSec, vel = 0.5, { attack = 1.4, release = 2.2, cutoff = 1600 } = {}) {
  const f = midiHz(midi);
  const T = 2048;
  const table = new Float64Array(T);
  const H = Math.max(1, Math.floor(cutoff / f));
  for (let h = 1; h <= H; h++) {
    const a = (1 / h) * Math.exp(-(h * f) / cutoff);
    for (let k = 0; k < T; k++) table[k] += a * Math.sin((TAU * h * k) / T);
  }
  let pk = 0;
  for (const v of table) pk = Math.max(pk, Math.abs(v));
  for (let k = 0; k < T; k++) table[k] /= pk;
  const len = Math.round((durSec + release * 3) * SR);
  const out = new Float64Array(len);
  const det = [0.996, 1, 1.0043];
  const ph = [0.1, 0.5, 0.8];
  const offAt = durSec * SR;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env = Math.min(1, t / attack) ** 2;
    if (i > offAt) env *= Math.exp(-(i - offAt) / SR / release);
    let s = 0;
    for (let v = 0; v < 3; v++) {
      ph[v] += (f * det[v]) / SR;
      const p = (ph[v] % 1) * T;
      const k = Math.floor(p);
      const fr = p - k;
      s += table[k] * (1 - fr) + table[(k + 1) % T] * fr;
    }
    out[i] = (vel * env * s) / 3;
  }
  return out;
}

// ---------- drums (soft, lo-fi) ----------
export function kick(vel = 0.8, seed = 1) {
  const len = Math.round(0.5 * SR);
  const out = new Float64Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 48 + 70 * Math.exp(-t / 0.035);
    ph += (TAU * f) / SR;
    out[i] = Math.exp(-t / 0.16) * (Math.sin(ph) + 0.25 * Math.sin(2 * ph));
  }
  const click = biquad(noise(Math.round(0.004 * SR), seed), 'lowpass', 2500);
  for (let i = 0; i < click.length; i++) out[i] += click[i] * 0.25 * (1 - i / click.length);
  for (let i = 0; i < len; i++) out[i] *= vel;
  return out;
}

/** Soft snare: brushed noise + a little body. */
export function snare(vel = 0.7, seed = 2, { brush = 0.5 } = {}) {
  const len = Math.round(0.45 * SR);
  const n = biquad(biquad(noise(len, seed), 'bandpass', 2200, 0.6), 'lowpass', 6500);
  const out = new Float64Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const tapEnv = Math.min(1, t / 0.002) * Math.exp(-t / 0.07);
    const swishEnv = Math.min(1, t / 0.025) * Math.exp(-t / 0.16);
    ph += (TAU * 185) / SR;
    out[i] =
      vel *
      (n[i] * ((1 - brush) * tapEnv * 2.2 + brush * swishEnv * 1.2) +
        0.35 * Math.sin(ph) * Math.exp(-t / 0.04));
  }
  return out;
}

export function hat(vel = 0.5, seed = 3, open = false) {
  const len = Math.round((open ? 0.35 : 0.09) * SR);
  const n = biquad(biquad(noise(len, seed), 'highpass', 6500), 'peak', 9500, 1.2, 4);
  const d = open ? 0.11 : 0.022;
  for (let i = 0; i < len; i++) n[i] *= vel * Math.min(1, i / 40) * Math.exp(-i / SR / d);
  return n;
}

/** Long brush sweep (night). */
export function sweep(vel = 0.3, seed = 4, sec = 0.7) {
  const len = Math.round(sec * SR);
  const n = biquad(biquad(noise(len, seed), 'bandpass', 3500, 0.5), 'lowpass', 7000);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    n[i] *= vel * Math.sin(Math.PI * t) ** 2;
  }
  return n;
}
