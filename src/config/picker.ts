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
  /** Globe mesh detail (edge splits; 20·n² faces). 24 ≈ 11.5k faces, still smooth to drag. */
  meshDetail: 24,
  /** Zooming to a city: map fit animation, and how far (map zoom levels) a pinch out returns to the globe. */
  mapFitMs: 900,
  mapZoomOutBy: 2,
  /** A short pause on a city before the camera dives in to its area. */
  diveDelayMs: 350,
} as const;
