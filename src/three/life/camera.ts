import { CLOSEUP_MOTION } from '@/config/streetLife';

import { smoothstep } from './interactions';

/**
 * Close-up camera motion on top of the map → close-up dolly (pure): a very
 * slow idle sway and breathing once the dolly settles, and a drag orbit
 * clamped to ±35°. Both fade out with distance so the reverse dolly still
 * lands exactly on the map frame.
 */

export interface IdleOffset {
  yawDeg: number;
  dy: number;
}

export function idleCamera(out: IdleOffset, sinceSettleS: number, cfg = CLOSEUP_MOTION): IdleOffset {
  if (sinceSettleS <= 0) {
    out.yawDeg = 0;
    out.dy = 0;
    return out;
  }
  const ramp = smoothstep(sinceSettleS / cfg.idleRampS);
  out.yawDeg = ramp * cfg.idleYawDeg * Math.sin((sinceSettleS / cfg.idleYawPeriodS) * Math.PI * 2);
  out.dy = ramp * cfg.breatheM * Math.sin((sinceSettleS / cfg.breathePeriodS) * Math.PI * 2);
  return out;
}

export function clampOrbit(deg: number, cfg = CLOSEUP_MOTION): number {
  return Math.max(-cfg.orbitMaxDeg, Math.min(cfg.orbitMaxDeg, deg));
}

/** Orbit yaw for a drag that started at `startDeg` and has moved `dxPt` points. */
export function dragOrbit(startDeg: number, dxPt: number, cfg = CLOSEUP_MOTION): number {
  // Dragging right swings the camera left around the machine (scene follows the finger).
  return clampOrbit(startDeg - dxPt * cfg.orbitDegPerPt, cfg);
}

/** Frame-rate independent exponential follow. */
export function follow(current: number, target: number, dtS: number, rate: number): number {
  return target + (current - target) * Math.exp(-rate * Math.max(0, dtS));
}

/** 1 at close-up distance, 0 at map distance. */
export function orbitWeight(cameraDistanceM: number, cfg = CLOSEUP_MOTION): number {
  const [a, b] = cfg.orbitFadeM;
  return 1 - smoothstep((cameraDistanceM - a) / (b - a));
}

/** Rotate (x, z) about the y axis by `deg`, writing into `out`. */
export function rotateY(out: [number, number], x: number, z: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  out[0] = x * c + z * s;
  out[1] = -x * s + z * c;
  return out;
}
