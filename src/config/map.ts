/** Map tuning (SPEC §3.5, §7.3, §7.4). Data only. */
export const MAP_STYLE = {
  /**
   * SDF glyphs (Noto Sans). OpenFreeMap hosts them for free alongside its
   * tiles. Instrument Sans glyphs (SPEC §3.7) would need to be generated and
   * self-hosted.
   */
  glyphsUrl: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  building: {
    /** ~3 floors when OSM has no height (SPEC §3.5). */
    defaultHeightM: 10,
    minZoom: 14,
    opacity: 0.92,
  },
  /**
   * Road widths reach true scale from `trueScaleFromZoom` (the street-life
   * cars and pedestrians are true scale and must fit their lanes/sidewalks).
   * Typical roadway widths (curb to curb), meters.
   */
  roads: {
    trueScaleFromZoom: 17,
    widthM: { minor: 9, major: 15, majorCasing: 16.5 },
    /** Used when the style is built without a city latitude. */
    referenceLatitude: 40,
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

/**
 * Machines on the map. Sprites are true-to-scale up close, but never smaller
 * than `minIconSize` (0.62 ≈ 32 pt tall), so a machine always reads as the
 * star of the map. A soft pad in the family color sits under each one.
 */
export const MACHINE_SPRITE = {
  minIconSize: 0.62,
  /** Pad radius (pt) by zoom: [zoom, radius] stops. */
  padRadius: [
    [12, 7],
    [15, 15],
    [18, 24],
    [21, 70],
  ],
  padOpacity: 0.55,
  padBlur: 0.55,
  rivalPad: '#8C8FA8',
} as const;

export const CAMERA = {
  /** Zoom/pitch the map flies to before crossfading into the close-up. */
  closeupZoom: 20.5,
  closeupPitch: 60,
  flyDurationMs: 1200,
  crossfadeMs: 350,
  /** Home map framing: tilted 3D view, or straight down (the 2D toggle). */
  homeZoom: 16,
  homePitch: 50,
  homeBearing: -15,
  topDownPitch: 0,
  /** Duration of the 3D ↔ top-down camera tilt and of the locate fly. */
  tiltMs: 650,
} as const;

/**
 * Basemap tile hosting (free options, see docs/hosting.md).
 * - Default: OpenFreeMap public instance — free, no key, no request limits,
 *   commercial use allowed, OpenMapTiles schema. No SLA.
 * - Self-host fallback: Protomaps PMTiles on Cloudflare R2 (free tier: 10 GB,
 *   no egress fees) served by workers/data-api, via EXPO_PUBLIC_TILES_URL.
 */
export const TILES = {
  openFreeMapTileJson: 'https://tiles.openfreemap.org/planet',
  openFreeMapAttribution: '© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors',
  protomapsAttribution: '© Protomaps © OpenStreetMap contributors',
} as const;
