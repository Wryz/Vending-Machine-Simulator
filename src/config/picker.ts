/**
 * The globe city picker (src/ui/picker/): which cities the bottom strip shows
 * and how the globe behaves. Data only.
 */
export const PICKER = {
  /** Every city and outer district this close to you is listed, nearest first… */
  localKm: 300,
  /** …then only cities of at least this many people, still by distance. */
  majorPopulation: 1_000_000,
  /** At most this many cards (the strip stays light; the globe still shows the rest). */
  maxCards: 160,
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
} as const;
