import { CARS, PEDESTRIANS, STREET_LAYOUT } from '@/config/streetLife';

/**
 * Street layout in the machine's local frame (+z = the way the machine faces,
 * y = 0 is the sidewalk top). Pure numbers so tests, the R3F scene and the
 * headless previews agree.
 */
export interface StreetLayout {
  /** Machine front face. */
  frontZ: number;
  /** Facade front face. */
  wallZ: number;
  /** Shop-window glass (the reflection's mirror plane). */
  glassZ: number;
  curbZ: number;
  /** Road surface height (below the sidewalk by the curb). */
  roadY: number;
  /** Car lane centers: [near, far]. */
  carLaneZ: [number, number];
  roadFarZ: number;
  /** Pedestrian lane centers by walking direction (+x east, -x west). */
  walkEastZ: number;
  walkWestZ: number;
  /** Where a customer stands at the machine. */
  standX: number;
  standZ: number;
}

export function streetLayout(machineDepthM: number): StreetLayout {
  const L = STREET_LAYOUT;
  const frontZ = machineDepthM / 2;
  const wallZ = -machineDepthM / 2 - L.wallGapM;
  const curbZ = frontZ + L.frontToCurbM;
  return {
    frontZ,
    wallZ,
    glassZ: wallZ - L.shopWindow.recessM,
    curbZ,
    roadY: -L.curbHeightM,
    carLaneZ: [curbZ + L.laneWidthM / 2, curbZ + L.laneWidthM * 1.5],
    roadFarZ: curbZ + L.laneWidthM * 2,
    walkEastZ: frontZ + PEDESTRIANS.laneFromFrontM.east,
    walkWestZ: frontZ + PEDESTRIANS.laneFromFrontM.west,
    standX: PEDESTRIANS.customer.standX,
    standZ: frontZ + PEDESTRIANS.customer.standOffM,
  };
}

/** Near-lane travel direction along x: right-hand traffic keeps the sidewalk on the right. */
export function nearLaneDir(leftHandTraffic: boolean): 1 | -1 {
  return leftHandTraffic ? 1 : -1;
}

export const CAR_SPAN_M = CARS.halfSpanM;
