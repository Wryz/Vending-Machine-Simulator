/** Map tuning (SPEC §3.5, §7.3, §7.4). Data only. */
export const MAP_STYLE = {
  /**
   * SDF glyphs. Spike uses Protomaps' hosted Noto Sans. For launch we should
   * build Instrument Sans glyph PBFs (SPEC §3.7) and host them on R2.
   */
  glyphsUrl: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  building: {
    /** ~3 floors when OSM has no height (SPEC §3.5). */
    defaultHeightM: 10,
    minZoom: 14,
    opacity: 0.92,
  },
  label: {
    font: ['Noto Sans Regular'] as const,
    districtMinZoom: 12,
    districtMaxZoom: 16,
    roadMinZoom: 16.5,
  },
} as const;

export const MACHINE_SPRITES = {
  /** Heading buckets rendered per model (SPEC §7.3). */
  headings: 8,
  /** Camera pitch buckets rendered per model, in degrees. */
  pitches: [30, 60] as const,
  lighting: ['day', 'dusk', 'night'] as const,
  /** Icon size multiplier at zoom 15 / 18 (sprites are rendered at 2x). */
  iconSizeByZoom: [
    [14, 0.25],
    [16, 0.5],
    [18, 1],
  ] as const,
} as const;

export const CAMERA = {
  /** Zoom/pitch the map flies to before crossfading into the close-up. */
  closeupZoom: 20.5,
  closeupPitch: 60,
  flyDurationMs: 1200,
  crossfadeMs: 350,
} as const;
