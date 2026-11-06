/** Street-life simulation types (pure; no React Native). */

/** Streets with sidewalks people walk (from the basemap's road layers). */
export type RoadKind = 'major' | 'minor';

export interface RoadInput {
  /** [lng, lat] vertices. */
  coords: readonly (readonly [number, number])[];
  kind: RoadKind;
}

export interface LngLatBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface LifeView {
  /** Visible bounds (axis-aligned; at high pitch this includes the far field). */
  bounds: LngLatBox;
  /** Camera center. */
  center: readonly [number, number];
  /**
   * Agents live within this distance of the center (keeps them near the
   * camera at high pitch, where `bounds` reaches toward the horizon).
   */
  radiusM: number;
}

export type LifeWeather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

export interface LifeConditions {
  /** Fractional local hour 0..24. */
  hour: number;
  restDay: boolean;
  /** Average `baseTraffic(cell).total` of the cells in view. */
  footTraffic: number;
  weather?: LifeWeather | null;
}

export interface Person {
  id: number;
  /** Index into LIFE_PEOPLE_MODELS. */
  model: number;
  road: number;
  s: number;
  dir: 1 | -1;
  /** Which sidewalk: +1 right of the road's coordinate order, -1 left. */
  side: 1 | -1;
  /** Distance of the walking line from the road centerline, meters. */
  offset: number;
  speed: number;
  /** Meters walked, drives the walk cycle. */
  phase: number;
  /** Seconds left standing still. */
  pause: number;
  x: number;
  y: number;
  hx: number;
  hy: number;
  bx: number;
  by: number;
  alpha: number;
  dying: boolean;
  lng: number;
  lat: number;
  heading: number;
  /** Walk-cycle frame 0..LIFE_WALK_FRAMES-1 (0 = standing / passing pose). */
  frame: number;
}

/** Someone walking up to a machine to buy (one per sale while you watch). */
export interface Customer extends Person {
  /** The sale this customer brings (released when they reach the machine). */
  saleId: string;
  stage: 'approach' | 'buy' | 'leave';
  /** Seconds in the current stage. */
  t: number;
  /** Machine, standing spot and exit, local meters. */
  mx: number;
  my: number;
  standX: number;
  standY: number;
  exitX: number;
  exitY: number;
}
