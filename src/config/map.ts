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
   * pedestrians are true scale and must fit their sidewalks).
   * Typical roadway widths (curb to curb), meters.
   */
  roads: {
    trueScaleFromZoom: 17,
    widthM: { minor: 9, major: 15, majorCasing: 16.5 },
    /** Used when the style is built without a city latitude. */
    referenceLatitude: 40,
  },
  /**
   * Footways, park paths, cycleways and pedestrian streets (the `paths`
   * layer): drawn true scale from `minZoom`, subtly, in a cream mixed from the
   * street and land colors (`roadShare` of the street color).
   */
  paths: {
    minZoom: 15,
    widthM: { path: 2.6, pedestrian: 7 },
    roadShare: 0.6,
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

/**
 * Machines as map pins below the street-life zoom (MAP_LIFE.minZoom): the 3D
 * sprite only shows where pedestrians do; further out each machine is a flat
 * teardrop pin in its family color (images: `node scripts/sprites/build-pins.mjs`).
 */
export const MACHINE_PIN = {
  /** icon-size by zoom ([zoom, size] stops); size 1 ≈ 38 pt tall (tip to top). */
  sizeByZoom: [
    [12, 0.84],
    [15, 0.95],
    [17, 1.06],
  ],
  /**
   * Zoom span of the pin → sprite crossfade. It ends at MAP_LIFE.minZoom, so
   * the 3D machine is fully in when the first pedestrians fade in.
   */
  crossfadeZooms: 0.5,
  /** Rival pins are smaller and slightly see-through so yours read first. */
  rivalScale: 0.86,
  rivalOpacity: 0.85,
} as const;

/**
 * Zoomed-out globe (SPEC §3.5 "Views"). MapLibre Native has no globe
 * projection yet, so pinching out past `handoffZoom` crossfades into a
 * three.js globe; pinching in (or tapping a pin) flies back to the map.
 */
export const GLOBE = {
  /**
   * MapLibre Native has no globe projection yet, so pinching out past
   * `handoffZoom` crossfades into a flat-shaded SVG globe (src/ui/GlobeView);
   * pinching in, tapping your city's pin or "Back" flies back to the map.
   */
  enabled: true,
  /** The map can zoom out this far before the globe takes over. */
  mapMinZoom: 4,
  /** A pinch that ends below this zoom opens the globe. */
  handoffZoom: 7.5,
  /** Map zoom when coming back from the globe to a city. */
  returnZoom: 13,
  crossfadeMs: 450,
  /** Pinch-in past this scale (relative to the start) returns to the map. */
  enterScale: 1.35,
  /** Drag: degrees of spin per point dragged. */
  degPerPt: 0.35,
  /** Slow idle spin (degrees per second) after a few seconds untouched. */
  idleSpinDegPerS: 4,
  idleAfterMs: 3000,
  /** Edge splits (20·n² faces; 12 ≈ 2,900), land relief in radii. */
  flatDetail: 12,
  landHeight: 0.022,
  /** Flat light steps from night to full sun. */
  shadeSteps: 5,
  /** Redraw rate while spinning (frames per second). */
  fps: 30,
  colors: {
    ocean: '#5BB8EE',
    oceanDeep: '#4AA6E0',
    land: '#9ED67F',
    landAlt: '#8CCB6E',
    snow: '#F4F7FF',
    /** Above this |latitude| land turns to snow. */
    snowLatDeg: 62,
    /** What the unlit side shades toward: deep night blue. */
    night: '#1B2350',
    /** Sky behind the globe, and its soft halo. */
    sky: '#CFE9FF',
    halo: '#FFFFFF',
    pin: '#FF6B2C',
    pinOther: '#FFFFFF',
  },
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
  /** Tapping a machine: the map flies here (close enough to see customers walk up). */
  machineZoom: 18.5,
  machinePitch: 45,
  machineFlyMs: 700,
  /** The + / − keys: one zoom step each, eased. */
  zoomStep: 1,
  zoomStepMs: 250,
} as const;

/** The machine sheet over the map. */
export const MACHINE_SHEET = {
  /** Detents, as shares of the screen height (the first one opens). */
  snapPoints: [0.46, 0.9],
  /**
   * The map frames the machine as if this share of the screen were covered:
   * a little less than the sheet, so it sits mid-way between the HUD and the sheet.
   */
  framePadding: 0.22,
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

/** The neighbourhood name in the tab bar (nearest named area to the map's center). */
export const AREA_NAME = {
  /** Areas further than this from the center don't count, meters. */
  maxDistanceM: 2500,
  /** Same for the larger district / municipality, meters. */
  districtMaxDistanceM: 8000,
  /** Most remembered area points (oldest dropped). */
  cacheSize: 400,
  /** Wait after the camera settles before looking, ms. */
  debounceMs: 400,
} as const;
