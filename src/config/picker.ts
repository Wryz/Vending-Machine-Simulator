/**
 * The globe city picker (src/ui/picker/): which cities the bottom strip shows
 * and how the globe behaves. Data only.
 */
export const PICKER = {
  /** First: cities and outer districts this close to you (any size), nearest first, up to maxLocal… */
  localKm: 300,
  maxLocal: 10,
  /** …then the rest of your country's cities, nearest first… */
  homePopulation: 300_000,
  /** …then only the very big cities abroad, nearest first. */
  foreignPopulation: 5_000_000,
  /** At most this many cards in all (owner, 2026-11-08). */
  maxCards: 30,
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
