/**
 * UI and machine one-shots (SPEC §3.6): a toy-like vending world, not a stock
 * "app" kit. Each sound is a small physical model built from damped modes
 * (wood, tines, coins, cans), shaped noise contacts and a few mechanisms
 * (a coin chute, a vending coil, a thermal printer), so nothing here is a
 * plain sine blip, a white-noise whoosh or a glossy two-note chime.
 *
 * Levels are set by loudness, not peak (`momentaryMax`, LUFS over 400 ms):
 * taps sit quietest, machine feedback in the middle, rewards a little above.
 * The engine applies one shared trim on top (src/config/audio.ts).
 *
 * Keys are the asset names the app loads (src/services/audio.ts).
 */
import {
  SR,
  TAU,
  addReverb,
  biquad,
  biquadTV,
  buf,
  dB,
  fadeIn,
  fadeOut,
  limit,
  loopify,
  midiHz,
  momentaryMax,
  noise,
  onePole,
  peak,
  range,
  rng,
  scale,
} from './lib.mjs';

// ---------- building blocks ----------

/**
 * One damped mode: amp·e^(-t/decay)·sin(2π f t). `glide` starts the pitch
 * that much higher and settles over `glideT` (a stiff contact, a rubbery
 * drop when negative). `vib` wobbles the pitch by that ratio at `vibHz`,
 * fading with `vibDecay` (a spring).
 */
function mode(
  out,
  {
    f,
    amp,
    decay,
    t0 = 0,
    attack = 0.0005,
    glide = 0,
    glideT = 0.02,
    vib = 0,
    vibHz = 0,
    vibDecay = 0.1,
  },
) {
  const s0 = Math.round(t0 * SR);
  let ph = 0;
  for (let i = s0; i < out.length; i++) {
    const t = (i - s0) / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / decay);
    if (env < 1e-5 && t > attack) break;
    const w =
      1 + glide * Math.exp(-t / glideT) + vib * Math.exp(-t / vibDecay) * Math.sin(TAU * vibHz * t);
    ph += (TAU * f * w) / SR;
    out[i] += amp * env * Math.sin(ph);
  }
}

/** Band-limited noise contact: a mallet, a fingertip, a coin edge, a paper fibre. */
function contact(out, { t0 = 0, dur, amp, lp = 6000, hp = 200, seed = 1, decay }) {
  const n = Math.round(dur * SR);
  const x = biquad(biquad(noise(n, seed), 'lowpass', lp), 'highpass', hp);
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < n && s0 + i < out.length; i++)
    out[s0 + i] += amp * x[i] * Math.exp(-i / SR / (decay ?? dur / 4));
}

/** Strike a set of modes [ratio, amp, decay] on base frequency f. */
function strike(out, t0, f, modes, amp = 1, extra = {}) {
  for (const [r, a, d] of modes) mode(out, { f: f * r, amp: a * amp, decay: d, t0, ...extra });
}

/** Level a one-shot by loudness, keeping peaks under `ceilingDb`. */
function level(x, lufs, ceilingDb = -3) {
  scale(x, dB(lufs - momentaryMax(x)));
  if (peak(x) > dB(ceilingDb)) limit(x, ceilingDb, { windowMs: 2, releaseMs: 40 });
  return x;
}

/**
 * Loudness tiers (momentary max, LUFS) at the file level. With the engine's
 * shared trim (0.4, -8 dB) they land at about -44 / -39 / -34 / -30 in game.
 */
const TIER = { tap: -36, soft: -31, machine: -26, reward: -22 };

// Mode sets: [frequency ratio, amplitude, decay seconds].
/** A small maple block: the 2nd/3rd modes of a free bar, quickly damped. */
const WOOD = [
  [1, 1, 0.03],
  [2.76, 0.32, 0.011],
  [5.4, 0.1, 0.005],
];
/** Hollow temple block: lower, rounder, a touch longer. */
const TEMPLE = [
  [1, 1, 0.075],
  [1.71, 0.35, 0.03],
  [2.93, 0.12, 0.012],
];
/** A thin coin: three inharmonic plate modes. */
const COIN = [
  [1, 0.55, 0.08],
  [1.59, 0.35, 0.055],
  [2.57, 0.14, 0.025],
];
/** Cantilever tine (kalimba, music box): 1 : 6.27 : 17.55. */
const tine = (decay, bright = 1) => [
  [1, 1, decay],
  [6.27, 0.22 * bright, decay * 0.05],
  [17.55, 0.05 * bright, decay * 0.012],
];
/** A small dome bell (servant's / register bell), each mode a slow-beating pair. */
const DOME = [
  [1, 0.6, 0.55],
  [1.0013, 0.4, 0.5],
  [2.32, 0.3, 0.22],
  [3.86, 0.16, 0.1],
  [5.53, 0.07, 0.05],
];
/** Aluminum can body: thin-shell ring modes, quickly damped by the contents. */
const CAN = [
  [1, 0.45, 0.045],
  [2.38, 0.28, 0.03],
  [3.94, 0.16, 0.018],
  [5.57, 0.08, 0.01],
];
/** Hard plastic (tray flap, latch). */
const PLASTIC = [
  [1, 1, 0.012],
  [2.37, 0.45, 0.007],
  [4.1, 0.15, 0.004],
];

const COIN_F = 2650;

/** A coin edge clink at t0. */
function clink(x, t0, { pitch = 1, amp = 1, seed = 7 } = {}) {
  strike(x, t0, COIN_F * pitch, COIN, amp);
  contact(x, { t0, dur: 0.008, amp: 0.22 * amp, lp: 9000, hp: 2500, seed });
}

/**
 * A coin rolling down a short metal chute: rim micro-impacts at a rising
 * rate, each ringing the coin a little, over the chute's hollow resonance.
 */
function chuteRoll(x, t0, dur, { amp = 1, pitch = 1, seed = 21 } = {}) {
  const r = rng(seed);
  const s0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  const train = new Float64Array(n);
  for (let t = 0; t < dur;) {
    const u = t / dur;
    const a = (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.3))) * range(r, 0.5, 1);
    strike(x, t0 + t, COIN_F * pitch * range(r, 0.995, 1.005), COIN, 0.07 * a * amp, {
      attack: 0.0003,
    });
    train[Math.round(t * SR)] += a;
    t += 1 / (55 + 70 * u) + range(r, -0.002, 0.002);
  }
  // The chute's body: the impact train through a low hollow band.
  const body = biquad(biquad(train, 'bandpass', 780 * pitch, 3), 'lowpass', 2200);
  onePole(body, 3000);
  for (let i = 0; i < n && s0 + i < x.length; i++) {
    const u = i / n;
    x[s0 + i] += 0.9 * amp * body[i] * Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
  }
}

/**
 * A coin settling flat (Euler's disk): the wobble speeds up while it quiets,
 * then stops dead.
 */
function settle(x, t0, dur, { amp = 1, pitch = 1, seed = 31 } = {}) {
  const r = rng(seed);
  let t = 0;
  let gap = 0.05;
  while (t < dur) {
    const u = t / dur;
    strike(x, t0 + t, COIN_F * pitch * range(r, 0.99, 1.01), COIN, 0.35 * amp * (1 - u) ** 1.6, {
      attack: 0.0003,
    });
    contact(x, {
      t0: t0 + t,
      dur: 0.003,
      amp: 0.06 * amp * (1 - u),
      lp: 7000,
      hp: 2000,
      seed: seed + Math.round(u * 97),
    });
    t += gap;
    gap = Math.max(0.006, gap * 0.8);
  }
}

/** A kalimba note: thumb on a steel tine over a hollow wooden box. */
function kalimba(x, t0, midi, vel = 1, seed = 51) {
  const f = midiHz(midi);
  const d = 0.75 * Math.sqrt(523 / f) + 0.25;
  strike(x, t0, f, tine(d, 0.9), vel, { glide: 0.006, glideT: 0.015, attack: 0.002 });
  // The box answers an octave and a fifth below, briefly.
  mode(x, { f: f / 3, amp: 0.12 * vel, decay: 0.06, t0, attack: 0.003 });
  contact(x, { t0, dur: 0.01, amp: 0.1 * vel, lp: 2200, hp: 300, seed, decay: 0.003 });
}

/** A music-box tine plucked by a cylinder pin (paired, slightly detuned tines). */
function musicBox(x, t0, midi, vel = 1, seed = 61) {
  const f = midiHz(midi);
  const d = 1.1 * Math.sqrt(1047 / f);
  strike(x, t0, f, tine(d, 1.2), 0.7 * vel, { attack: 0.0008 });
  strike(x, t0, f * 1.0021, tine(d * 0.9, 0.6), 0.35 * vel, { attack: 0.0008 });
  contact(x, { t0, dur: 0.004, amp: 0.12 * vel, lp: 9000, hp: 3500, seed, decay: 0.001 });
}

/** A steel tongue drum note: soft mallet, tuned octave, slow shimmer. */
function tongueDrum(x, t0, midi, vel = 1, seed = 71) {
  const f = midiHz(midi);
  strike(
    x,
    t0,
    f,
    [
      [1, 1, 0.9],
      [1.003, 0.5, 0.85],
      [2.0, 0.22, 0.35],
      [2.98, 0.06, 0.12],
    ],
    vel,
    { attack: 0.004 },
  );
  contact(x, { t0, dur: 0.012, amp: 0.05 * vel, lp: 1500, hp: 150, seed, decay: 0.004 });
}

/** An aluminum can landing in the plastic pickup tray. */
function canInTray(x, t0, { amp = 1, seed = 81 } = {}) {
  // Tray floor: a low plastic thud that drops in pitch as it gives.
  mode(x, { f: 96, amp: 0.9 * amp, decay: 0.07, t0, attack: 0.002, glide: 0.5, glideT: 0.015 });
  mode(x, { f: 210, amp: 0.3 * amp, decay: 0.03, t0, attack: 0.002, glide: 0.3 });
  contact(x, { t0, dur: 0.04, amp: 0.4 * amp, lp: 1400, hp: 70, seed, decay: 0.009 });
  // The can rings briefly, bounces once and rocks to rest.
  strike(x, t0, 560, CAN, 0.55 * amp);
  strike(x, t0 + 0.075, 585, CAN, 0.22 * amp);
  mode(x, { f: 120, amp: 0.25 * amp, decay: 0.03, t0: t0 + 0.075, attack: 0.002 });
  for (const [dt, a] of [
    [0.13, 0.08],
    [0.165, 0.05],
  ])
    contact(x, {
      t0: t0 + dt,
      dur: 0.006,
      amp: a * amp,
      lp: 3500,
      hp: 600,
      seed: seed + Math.round(dt * 1000),
      decay: 0.002,
    });
  // The flap swings shut behind it.
  strike(x, t0 + 0.24, 780, PLASTIC, 0.22 * amp);
  strike(x, t0 + 0.3, 800, PLASTIC, 0.08 * amp);
}

// ---------- the sounds ----------
export const SFX = {
  /** UI tap: a small wooden toy block, "tock". */
  pop() {
    const x = buf(0.1);
    strike(x, 0.001, 940, WOOD, 1, { glide: 0.03, glideT: 0.004 });
    mode(x, { f: 430, amp: 0.25, decay: 0.012, t0: 0.001 }); // the hollow under it
    contact(x, { t0: 0, dur: 0.004, amp: 0.18, lp: 4500, hp: 900, seed: 3, decay: 0.0012 });
    return level(fadeOut(x, 0.01), TIER.tap);
  },

  /** Keypad: a rubber key "thup" and a soft, old LED-panel beep. */
  click() {
    const x = buf(0.09);
    mode(x, { f: 260, amp: 0.5, decay: 0.006, t0: 0.001, attack: 0.001 });
    contact(x, { t0: 0.001, dur: 0.006, amp: 0.25, lp: 1600, hp: 200, seed: 5, decay: 0.002 });
    // Rounded square-ish beep (odd harmonics, low-passed): an old panel buzzer, kept gentle.
    const t0 = 0.012;
    const len = 0.045;
    const s0 = Math.round(t0 * SR);
    const b = new Float64Array(Math.round((len + 0.02) * SR));
    let ph = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.003) * (t < len ? 1 : Math.exp(-(t - len) / 0.006));
      ph += (TAU * 1760 * (1 + 0.02 * Math.exp(-t / 0.004))) / SR;
      b[i] = env * (Math.sin(ph) + 0.22 * Math.sin(3 * ph) + 0.07 * Math.sin(5 * ph));
    }
    biquad(b, 'lowpass', 3800, 0.6);
    for (let i = 0; i < b.length && s0 + i < x.length; i++) x[s0 + i] += 0.35 * b[i];
    return level(fadeOut(x, 0.008), TIER.tap);
  },

  /** One coin: drops into the chute, rolls down, clinks into the tray and wobbles flat. */
  coin() {
    const x = buf(0.62);
    clink(x, 0.002, { amp: 0.45, pitch: 1.02, seed: 9 });
    chuteRoll(x, 0.02, 0.19, { seed: 21 });
    clink(x, 0.215, { amp: 1, seed: 11 });
    settle(x, 0.26, 0.3, { amp: 0.8, seed: 31 });
    return level(fadeOut(x, 0.02), TIER.reward);
  },

  /** A handful of coins down the chute onto a small pile (the app's `coins`). */
  'coins-stack'() {
    const x = buf(0.95);
    const coins = [
      [0.0, 1.0, 1.0],
      [0.07, 1.04, 0.8],
      [0.15, 0.97, 0.9],
      [0.24, 1.02, 0.75],
    ];
    coins.forEach(([t, p, a], k) => {
      chuteRoll(x, t, 0.14, { amp: a, pitch: p, seed: 41 + k });
      clink(x, t + 0.145, { amp: a, pitch: p, seed: 45 + k });
      // landing on the pile: a second, duller coin answers
      strike(x, t + 0.15, COIN_F * 0.93, COIN, 0.3 * a);
    });
    settle(x, 0.43, 0.38, { amp: 0.7, pitch: 1.02, seed: 49 });
    return level(fadeOut(x, 0.03), TIER.reward);
  },

  /** Restock / placement: a toy latch, "ka-chunk", with two ratchet detents. */
  thunk() {
    const x = buf(0.32);
    strike(x, 0.001, 640, PLASTIC, 0.45);
    mode(x, { f: 118, amp: 1, decay: 0.065, t0: 0.008, attack: 0.002, glide: 0.45, glideT: 0.012 });
    mode(x, { f: 310, amp: 0.3, decay: 0.03, t0: 0.008, attack: 0.002, glide: 0.3 });
    contact(x, { t0: 0.008, dur: 0.03, amp: 0.35, lp: 1100, hp: 70, seed: 13, decay: 0.007 });
    for (const [t, a] of [
      [0.075, 0.2],
      [0.1, 0.13],
    ]) {
      strike(x, t, 2350, PLASTIC, a);
      contact(x, {
        t0: t,
        dur: 0.003,
        amp: a * 0.5,
        lp: 8000,
        hp: 2500,
        seed: 14 + t * 100,
        decay: 0.001,
      });
    }
    return level(fadeOut(x, 0.02), TIER.machine);
  },

  /** A purchase: the spiral coil turns (motor + a wire tick per turn), then the can drops. */
  vend() {
    const x = buf(1.25);
    const motorEnd = 0.6;
    const m = new Float64Array(Math.round(motorEnd * SR));
    let ph = 0;
    for (let i = 0; i < m.length; i++) {
      const t = i / SR;
      const f = 104 + 8 * Math.min(1, t / 0.1) - 10 * Math.max(0, (t - 0.45) / 0.15); // spin up, ease off
      ph += f / SR;
      const gear =
        Math.sin(TAU * ph) + 0.5 * Math.sin(TAU * 2 * ph) + 0.25 * Math.sin(TAU * 3 * ph);
      const env = Math.min(1, t / 0.05) * Math.min(1, (motorEnd - t) / 0.08);
      m[i] = 0.25 * gear * env;
    }
    biquad(m, 'lowpass', 900, 0.6);
    biquad(m, 'highpass', 90);
    for (let i = 0; i < m.length; i++) x[i] += m[i];
    // The coil's wire rides over the product's edge once per turn: a small squeak-tick.
    for (const [t, a] of [
      [0.12, 0.6],
      [0.3, 0.75],
      [0.48, 1],
    ]) {
      mode(x, {
        f: 1350,
        amp: 0.1 * a,
        decay: 0.025,
        t0: t,
        attack: 0.004,
        glide: -0.12,
        glideT: 0.02,
      });
      contact(x, {
        t0: t,
        dur: 0.006,
        amp: 0.12 * a,
        lp: 5000,
        hp: 1500,
        seed: 17 + t * 100,
        decay: 0.002,
      });
    }
    // The product tips off the coil's end...
    contact(x, { t0: 0.6, dur: 0.08, amp: 0.12, lp: 1800, hp: 400, seed: 19, decay: 0.03 });
    // ...and lands in the tray.
    canInTray(x, 0.7, { amp: 1, seed: 85 });
    return level(fadeOut(x, 0.04), TIER.reward);
  },

  /** A can thunking into the pickup tray (bounce, rock, the flap swings shut). */
  drop() {
    const x = buf(0.5);
    canInTray(x, 0.002, { amp: 1, seed: 91 });
    return level(fadeOut(x, 0.03), TIER.machine);
  },

  /** Cash-box door: key turn, latch release and a soft cartoon spring "boing". */
  door() {
    const x = buf(0.75);
    for (const [t, f, a, s] of [
      [0.002, 2600, 0.25, 101],
      [0.05, 1900, 0.4, 102],
    ]) {
      strike(x, t, f, PLASTIC, a);
      contact(x, { t0: t, dur: 0.004, amp: a * 0.6, lp: 8000, hp: 1800, seed: s, decay: 0.0012 });
    }
    const tb = 0.075;
    const spring = { vib: 0.22, vibHz: 11, vibDecay: 0.16, attack: 0.004 };
    mode(x, { f: 165, amp: 0.8, decay: 0.28, t0: tb, ...spring });
    mode(x, { f: 330, amp: 0.3, decay: 0.16, t0: tb, ...spring });
    mode(x, { f: 497, amp: 0.1, decay: 0.08, t0: tb, ...spring });
    // The light steel door swings to its stop.
    strike(
      x,
      0.11,
      372,
      [
        [1, 0.25, 0.07],
        [2.72, 0.12, 0.04],
        [4.68, 0.05, 0.02],
      ],
      1,
    );
    biquad(x, 'lowpass', 4200, 0.6);
    return level(fadeOut(x, 0.05), TIER.machine);
  },

  /** A sale on the map: a lever "ka", then one tiny analog register bell. */
  register() {
    const x = buf(1.2);
    mode(x, { f: 190, amp: 0.4, decay: 0.025, t0: 0.001, attack: 0.002, glide: 0.3 });
    for (const [t, a] of [
      [0.002, 0.18],
      [0.02, 0.12],
      [0.034, 0.08],
    ])
      contact(x, {
        t0: t,
        dur: 0.004,
        amp: a,
        lp: 6000,
        hp: 1500,
        seed: 111 + t * 1000,
        decay: 0.0012,
      });
    const tb = 0.06;
    strike(x, tb, 2093, DOME, 0.55, { attack: 0.0006 });
    contact(x, { t0: tb, dur: 0.003, amp: 0.08, lp: 10000, hp: 4000, seed: 115, decay: 0.0008 });
    biquad(x, 'lowpass', 9000, 0.6);
    return level(fadeOut(x, 0.1), TIER.machine);
  },

  /** Success: three kalimba notes up a major triad (G5 B5 D6). */
  success() {
    const x = buf(1.6);
    [
      [79, 0.0, 0.8],
      [83, 0.11, 0.75],
      [86, 0.22, 0.9],
    ].forEach(([m, t, v], i) => kalimba(x, 0.002 + t, m, v, 51 + i));
    addReverb(x, 0.18, { size: 0.4, damp: 0.6 });
    return level(fadeOut(x, 0.2), TIER.reward);
  },

  /** Chapter complete: a short music-box phrase, the cylinder clicking in first. */
  chime() {
    const x = buf(3.0);
    contact(x, { t0: 0.0, dur: 0.004, amp: 0.05, lp: 6000, hp: 1500, seed: 121, decay: 0.001 });
    contact(x, { t0: 0.045, dur: 0.004, amp: 0.04, lp: 6000, hp: 1500, seed: 122, decay: 0.001 });
    [
      [84, 0.09, 0.8],
      [88, 0.23, 0.7],
      [91, 0.37, 0.75],
      [96, 0.51, 0.85],
      [95, 0.72, 0.6],
      [91, 0.93, 0.7],
      [96, 1.2, 0.9],
    ].forEach(([m, t, v], i) => musicBox(x, t, m, v, 61 + i));
    // Little wooden case.
    biquad(x, 'peak', 520, 1.2, 3);
    biquad(x, 'lowpass', 7500, 0.6);
    addReverb(x, 0.28, { size: 0.45, damp: 0.55 });
    return level(fadeOut(fadeIn(x, 0.001), 0.4), TIER.reward);
  },

  /** Something happened in town: two steel-tongue-drum notes falling a fourth. */
  notify() {
    const x = buf(1.9);
    tongueDrum(x, 0.002, 81, 0.9, 71);
    tongueDrum(x, 0.16, 76, 0.8, 72);
    addReverb(x, 0.22, { size: 0.5, damp: 0.55 });
    return level(fadeOut(x, 0.3), TIER.machine);
  },

  /** Not allowed: two hollow temple-block "bonks", falling and a little rubbery. */
  error() {
    const x = buf(0.38);
    strike(x, 0.002, 330, TEMPLE, 1, { glide: 0.06, glideT: 0.01 });
    strike(x, 0.13, 262, TEMPLE, 0.85, { glide: -0.04, glideT: 0.05 });
    contact(x, { t0: 0.002, dur: 0.006, amp: 0.15, lp: 2500, hp: 300, seed: 131, decay: 0.002 });
    contact(x, { t0: 0.13, dur: 0.006, amp: 0.12, lp: 2500, hp: 300, seed: 132, decay: 0.002 });
    return level(fadeOut(x, 0.03), TIER.machine);
  },

  /** Screen change: a card riffle, "frrrp", with a soft air under it. */
  whoosh() {
    const x = buf(0.4);
    const r = rng(141);
    let t = 0.01;
    let gap = 0.032;
    let k = 0;
    while (t < 0.26) {
      const a = 0.5 + 0.5 * Math.sin((Math.PI * t) / 0.27);
      contact(x, {
        t0: t,
        dur: 0.005,
        amp: 0.3 * a,
        lp: 4200,
        hp: 1100,
        seed: 142 + k,
        decay: 0.0012,
      });
      mode(x, { f: range(r, 1500, 2100), amp: 0.05 * a, decay: 0.004, t0: t });
      t += gap;
      gap = Math.max(0.011, gap * 0.86);
      k++;
    }
    // The card settling: a soft low flap.
    contact(x, { t0: 0.27, dur: 0.05, amp: 0.25, lp: 900, hp: 120, seed: 160, decay: 0.012 });
    const air = noise(x.length, 161);
    biquadTV(air, 'bandpass', (i) => 500 + 900 * Math.sin((Math.PI * i) / air.length), 0.9);
    for (let i = 0; i < x.length; i++)
      x[i] += 0.04 * air[i] * Math.sin((Math.PI * i) / x.length) ** 2;
    return level(fadeOut(x, 0.03), TIER.soft);
  },

  /** A report: a thermal receipt printer chirps out a few lines, then the paper is torn off. */
  paper() {
    const dur = 0.95;
    const x = buf(dur);
    const r = rng(171);
    let t = 0.01;
    const lines = [];
    while (t < 0.6) {
      const on = range(r, 0.05, 0.085);
      lines.push([t, on]);
      t += on + range(r, 0.018, 0.035);
    }
    // Each line: the head's stepper sings a short rising chirp, chopped by its steps.
    for (const [a, on] of lines) {
      const s0 = Math.round(a * SR);
      const n = Math.round(on * SR);
      let ph = 0;
      let st = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        ph += (TAU * (1750 + 380 * u)) / SR;
        st += 310 / SR;
        const step = 0.55 + 0.45 * Math.cos(TAU * st) ** 8;
        const env = Math.min(1, i / (0.004 * SR)) * Math.min(1, (n - i) / (0.006 * SR));
        x[s0 + i] += 0.2 * env * step * (Math.sin(ph) + 0.25 * Math.sin(2 * ph));
      }
    }
    // Feed: a few lines of plain paper roll out.
    contact(x, { t0: 0.62, dur: 0.12, amp: 0.12, lp: 4000, hp: 1500, seed: 172, decay: 0.08 });
    // Tear: a quick crackle of paper fibres.
    for (let k = 0; k < 26; k++) {
      const tt = 0.78 + range(r, 0, 0.07);
      contact(x, {
        t0: tt,
        dur: 0.004,
        amp: range(r, 0.25, 0.6),
        lp: 6500,
        hp: 1500,
        seed: 180 + k,
        decay: 0.0012,
      });
    }
    biquad(x, 'lowpass', 7000, 0.6);
    return level(fadeOut(x, 0.03), TIER.soft);
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
    return level(fadeOut(x, 0.03), TIER.soft);
  },

  /** Compressor hum (2 s loop; partials on 0.5 Hz multiples so they wrap exactly). */
  hum() {
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
    const y = loopify(x, F);
    return scale(y, dB(-26) / peak(y));
  },
};
