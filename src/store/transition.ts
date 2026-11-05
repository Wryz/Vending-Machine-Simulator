import type { MapCameraState } from '@/map/CityMap';

/**
 * Map <-> close-up hand-off (SPEC §7.3): the map camera framing at the moment
 * we crossfade, so the 3D scene can start from the identical frame, and the
 * camera to return to afterwards.
 */
export interface Transition {
  machineId: string;
  /** Map camera when the crossfade starts (after the fly-in). */
  framed: MapCameraState;
  /** Where the player was before tapping the machine. */
  returnTo: MapCameraState;
  viewportHeight: number;
}

let current: Transition | null = null;
let returnRequest: MapCameraState | null = null;

export const transition = {
  set(t: Transition) {
    current = t;
  },
  get(): Transition | null {
    return current;
  },
  /** Close-up asks the map to fly back on return. */
  requestReturn() {
    returnRequest = current?.returnTo ?? null;
    current = null;
  },
  takeReturn(): MapCameraState | null {
    const r = returnRequest;
    returnRequest = null;
    return r;
  },
};
