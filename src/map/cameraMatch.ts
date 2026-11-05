/**
 * Map camera <-> 3D camera framing (SPEC §7.3 transition).
 *
 * MapLibre (GL JS and Native) uses a vertical field of view of
 * 2·atan(1/3) ≈ 36.87° and 512-pt "world tiles". Given the map's zoom, pitch
 * and bearing we can place a three.js PerspectiveCamera so that the 3D scene
 * lines up with the map frame at the moment we crossfade.
 *
 * 3D world axes: +x = east, +y = up, -z = north (so +z = south). 1 unit = 1 m.
 * The map center sits at the origin.
 */

export const MAPLIBRE_FOV_DEG = (2 * Math.atan(1 / 3) * 180) / Math.PI;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const TILE_SIZE_PT = 512;
const DEG = Math.PI / 180;

/** Meters per screen point at a zoom/latitude (Web Mercator). */
export function metersPerPoint(zoom: number, latDeg: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos(latDeg * DEG)) / (TILE_SIZE_PT * 2 ** zoom);
}

export interface MapCamera {
  zoom: number;
  /** Degrees from vertical (0 = top-down). */
  pitch: number;
  /** Compass bearing the camera looks toward. */
  bearing: number;
  latitude: number;
  /** Height of the map view in points. */
  viewportHeight: number;
}

export interface SceneCamera {
  position: [number, number, number];
  target: [number, number, number];
  fovDeg: number;
}

/** Unit vector on the ground plane for a compass bearing. */
export function bearingToVector(bearingDeg: number): [number, number] {
  const b = bearingDeg * DEG;
  return [Math.sin(b), -Math.cos(b)];
}

export function mapCameraToScene(cam: MapCamera): SceneCamera {
  const halfFov = (MAPLIBRE_FOV_DEG / 2) * DEG;
  const distancePt = cam.viewportHeight / 2 / Math.tan(halfFov);
  const distanceM = distancePt * metersPerPoint(cam.zoom, cam.latitude);
  const p = cam.pitch * DEG;
  const [dx, dz] = bearingToVector(cam.bearing);
  const horizontal = distanceM * Math.sin(p);
  return {
    position: [-dx * horizontal, distanceM * Math.cos(p), -dz * horizontal],
    target: [0, 0, 0],
    fovDeg: MAPLIBRE_FOV_DEG,
  };
}

/**
 * Close-up framing: stand in front of the machine (which faces `headingDeg`),
 * slightly above eye level, looking at its upper-middle.
 */
export function closeupCamera(
  headingDeg: number,
  machineHeightM: number,
  opts: { distanceM: number; eyeHeightM: number; fovDeg: number },
): SceneCamera {
  const [fx, fz] = bearingToVector(headingDeg);
  return {
    position: [fx * opts.distanceM, opts.eyeHeightM, fz * opts.distanceM],
    target: [0, machineHeightM * 0.55, 0],
    fovDeg: opts.fovDeg,
  };
}

/** Rotation about +y that turns a model facing +z (south) to face `headingDeg`. */
export function headingToRotationY(headingDeg: number): number {
  return (180 - headingDeg) * DEG;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Smooth (ease-in-out cubic) blend between two scene cameras. */
export function blendSceneCameras(a: SceneCamera, b: SceneCamera, t: number): SceneCamera {
  const c = Math.min(1, Math.max(0, t));
  const e = c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
  return {
    position: lerp3(a.position, b.position, e),
    target: lerp3(a.target, b.target, e),
    fovDeg: lerp(a.fovDeg, b.fovDeg, e),
  };
}
