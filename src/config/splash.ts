/**
 * Launch splash (SPEC §3.1, §3.6): the native splash shows a still of the
 * brand art (sunburst, can, COINLINE, marquee bulbs); the animated splash takes
 * over on the same layout and brings it to life while the app loads.
 */
export const SPLASH = {
  /** Background behind the art; matches app.json `expo-splash-screen.backgroundColor`. */
  background: '#FF6B2C',
  /** Art box in points; matches app.json `imageWidth` and the 3:4 image. */
  widthPt: 360,
  heightPt: 480,
  /** Shortest time the animated splash stays up, so it never just flickers. */
  minShowMs: 1100,
  /** One full turn of the sunburst. */
  raysTurnMs: 30_000,
  /** The can's float, up and back. */
  canBobMs: 1800,
  canBobPt: 6,
  /** Bulbs light up in a chase, one step each. */
  bulbStepMs: 120,
  bulbs: 9,
  /** Exit: the can pops toward you while everything fades. */
  exitMs: 420,
  exitScale: 1.12,
} as const;
