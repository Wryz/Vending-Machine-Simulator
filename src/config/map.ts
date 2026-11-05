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
