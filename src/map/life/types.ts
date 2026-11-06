/** Street-life simulation types (pure; no React Native). */

/** Road classes the sim distinguishes (from the basemap's road layers). */
export type RoadKind = 'highway' | 'major' | 'minor' | 'service';

export interface RoadInput {
  /** [lng, lat] vertices. */
  coords: readonly (readonly [number, number])[];
  kind: RoadKind;
  /** 1: one-way along `coords`, -1: one-way against, 0/undefined: two-way. */
  oneway?: -1 | 0 | 1;
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

export interface Car {
  id: number;
  /** Index into LIFE_CAR_MODELS. */
  model: number;
  road: number;
  /** Distance along the road centerline, meters. */
  s: number;
  dir: 1 | -1;
  /** Lateral offset to the right of the direction of travel, meters. */
  lane: number;
  cruise: number;
  speed: number;
  /** Local meters (east, north). */
  x: number;
  y: number;
  /** Displayed heading unit vector (east, north). */
  hx: number;
  hy: number;
  /** Positional smoothing offset after switching roads, decays to 0. */
  bx: number;
  by: number;
  alpha: number;
  dying: boolean;
  lng: number;
  lat: number;
  /** Compass heading in degrees (0 = north, clockwise). */
  heading: number;
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
