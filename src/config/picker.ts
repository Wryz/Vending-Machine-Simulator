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
   * Globe mesh detail (edge splits; 20·n² faces). 24 ≈ 11.5k faces, but only
   * land and snow (~3.3k) are drawn; the ocean is a single shaded disc.
   */
  meshDetail: 24,
  /** Ocean texture: a coarse icosphere (edge splits) and the share of its facets tinted. */
  oceanFacetDetail: 7,
  oceanFacetShare: 0.3,
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
