/**
 * The globe city picker (src/ui/picker/): which cities the bottom strip shows
 * and how the globe behaves. Data only.
 */
export const PICKER = {
  /** First: the cities and outer districts nearest to you (any size)… */
  nearest: 5,
  /** At most this many cards in all (owner, 2026-11-08). */
  maxCards: 30,
  /**
   * …then famous cities around the world (one or two per big country), nearest
   * first. Matched by English name and country in the city list; a city not
   * built yet is skipped. Edit freely (owner, 2026-11-08).
   */
  featured: [
    { name: 'San Francisco', cc: 'US' },
    { name: 'New York', cc: 'US' },
    { name: 'Los Angeles', cc: 'US' },
    { name: 'Toronto', cc: 'CA' },
    { name: 'Mexico City', cc: 'MX' },
    { name: 'São Paulo', cc: 'BR' },
    { name: 'Buenos Aires', cc: 'AR' },
    { name: 'London', cc: 'GB' },
    { name: 'Paris', cc: 'FR' },
    { name: 'Berlin', cc: 'DE' },
    { name: 'Madrid', cc: 'ES' },
    { name: 'Rome', cc: 'IT' },
    { name: 'Amsterdam', cc: 'NL' },
    { name: 'Istanbul', cc: 'TR' },
    { name: 'Dubai', cc: 'AE' },
    { name: 'Cairo', cc: 'EG' },
    { name: 'Lagos', cc: 'NG' },
    { name: 'Johannesburg', cc: 'ZA' },
    { name: 'Mumbai', cc: 'IN' },
    { name: 'Bangkok', cc: 'TH' },
    { name: 'Singapore', cc: 'SG' },
    { name: 'Hong Kong', cc: 'HK' },
    { name: 'Shanghai', cc: 'CN' },
    { name: 'Seoul', cc: 'KR' },
    { name: 'Tokyo', cc: 'JP' },
    { name: 'Sydney', cc: 'AU' },
  ],
  /** The crosshair starts a city when its downtown or district is this close. */
  snapKm: 25,
  /** Globe zoom range in the picker (1 = whole Earth), and the zoom a city card flies to. */
  minZoom: 0.85,
  maxZoom: 5,
  cardZoom: 2.6,
  /** Fly-to animation when a card is tapped. */
  flyMs: 700,
  /** Pins drawn on the globe (nearest first): the strip's cities, capped. */
  maxPins: 120,
  /**
   * The GPU globe (three.js, src/ui/picker/PickerGlobe.tsx): a textured
   * sphere (assets/globe/earth.jpg, made by pipeline/gen-globe-texture.ts)
   * seen straight on, rotated by the player; the camera never moves.
   */
  globe: {
    /** Globe radius at zoom 1, as a share of the screen's short side. */
    scale: 0.36,
    /** Sphere segments around and pole to pole (smooth at max zoom). */
    widthSegments: 128,
    heightSegments: 64,
    /** Day light from the upper left of whatever faces you (degrees above / left of the view axis). */
    lightUpDeg: 28,
    lightLeftDeg: 32,
    /** Texture brightness: ambient + diffuse·cos(light angle). */
    ambient: 0.8,
    diffuse: 0.32,
    /** Atmosphere tint toward the halo color at the limb (0..1) and its falloff power. */
    rim: 0.45,
    rimPower: 3,
    /** Soft halo around the globe: outer radius (globe radii), where it starts fading, peak opacity. */
    haloScale: 1.3,
    haloInner: 0.72,
    haloOpacity: 0.85,
    /** Pins sit this far above the surface (radii), and fade out near the limb (facing 0..1). */
    pinLift: 0.003,
    pinHideFacing: 0.03,
    pinFullFacing: 0.12,
    /** A tap this close (points) to a pin picks it. */
    pinHitPt: 22,
    /** Pin sizes (points): radius and white/orange ring width; other cities are a touch see-through. */
    pins: {
      selected: { r: 9, stroke: 3, alpha: 1 },
      you: { r: 7, stroke: 1.5, alpha: 1 },
      other: { r: 3.5, stroke: 1.5, alpha: 0.9 },
    },
  },
  /**
   * Continent and ocean names on the globe (anchors in degrees). A label
   * fades in between `labelHideZ` and `labelFullZ` (how squarely it faces you:
   * 0 at the limb, 1 dead center), and each kind hides when zoomed in past its
   * max zoom (fading over the last `labelFadeZoom`).
   */
  labels: {
    continents: [
      { id: 'africa', lat: 6, lng: 20 },
      { id: 'antarctica', lat: -80, lng: 30 },
      { id: 'asia', lat: 50, lng: 92 },
      { id: 'europe', lat: 53, lng: 18 },
      { id: 'northAmerica', lat: 45, lng: -102 },
      { id: 'oceania', lat: -25, lng: 134 },
      { id: 'southAmerica', lat: -14, lng: -60 },
    ],
    oceans: [
      { id: 'pacific', lat: -12, lng: -135 },
      { id: 'pacific', lat: 22, lng: 172 },
      { id: 'atlantic', lat: 12, lng: -38 },
      { id: 'indian', lat: -22, lng: 78 },
      { id: 'arctic', lat: 84, lng: 60 },
      { id: 'southern', lat: -62, lng: 100 },
    ],
    labelHideZ: 0.35,
    labelFullZ: 0.7,
    continentMaxZoom: 2.6,
    oceanMaxZoom: 2,
    labelFadeZoom: 0.4,
    /** Font size (pt) at zoom 1; grows gently with zoom up to `maxScale`. */
    continentSize: 11,
    oceanSize: 10,
    maxScale: 1.4,
    letterSpacing: 2,
  },
  /** Zooming to a city: map fit animation, and how far (map zoom levels) a pinch out returns to the globe. */
  mapFitMs: 900,
  mapZoomOutBy: 2,
  /** A short pause on a city before the camera dives in to its area. */
  diveDelayMs: 350,
} as const;
