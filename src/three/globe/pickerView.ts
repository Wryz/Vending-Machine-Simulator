/**
 * Pure view math for the picker's GPU globe (src/ui/picker/PickerGlobe.tsx).
 * Conventions: yaw turns the globe about +Y
 * (yaw = -lng faces that longitude), then pitch tilts it about +X; the
 * camera looks down -Z with +Y up. Screen: +x right, +y down. Orthographic,
 * so a globe of `radius` points centered at (cx, cy) maps 1 unit = 1 pt.
 *
 */
import { PICKER } from '@/config/picker';

export interface PickerView {
  yaw: number;
  pitch: number;
  zoom: number;
}

/** How far the globe tilts toward a pole (degrees). */
export const PITCH_MAX = 75;

export function clampPitch(pitch: number): number {
  return Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch));
}

export const wrapLng = (lng: number): number => ((((lng + 180) % 360) + 360) % 360) - 180;

/** The point under the middle of the globe (the crosshair). */
export function viewCenter(v: { yaw: number; pitch: number }): { lat: number; lng: number } {
  return { lat: v.pitch, lng: wrapLng(-v.yaw) };
}

/** Globe radius on screen (points). `scale` is the radius at zoom 1 as a share of the short side. */
export function globeRadius(width: number, height: number, zoom: number, scale: number): number {
  return Math.min(width, height) * scale * zoom;
}

/**
 * (lat, lng) on the unit sphere after the view's rotation: x right, y up,
 * z toward you (z > 0 is the visible side).
 */
export function rotateLatLng(lat: number, lng: number, yaw: number, pitch: number): number[] {
  const phi = (lat * Math.PI) / 180;
  const lam = (lng * Math.PI) / 180;
  const x = Math.cos(phi) * Math.sin(lam);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(lam);
  const a = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  const x1 = x * Math.cos(a) + z * Math.sin(a);
  const z1 = -x * Math.sin(a) + z * Math.cos(a);
  return [x1, y * Math.cos(p) - z1 * Math.sin(p), y * Math.sin(p) + z1 * Math.cos(p)];
}

/** Euler angles (radians, order 'XYZ') for a three.js group showing this view. */
export function viewEuler(v: { yaw: number; pitch: number }): [number, number, number] {
  return [(v.pitch * Math.PI) / 180, (v.yaw * Math.PI) / 180, 0];
}

/** Unit-direction toward the light in view space: up and to the left of the camera. */
export function lightDir(upDeg: number, leftDeg: number): [number, number, number] {
  const u = (upDeg * Math.PI) / 180;
  const l = (leftDeg * Math.PI) / 180;
  return [-Math.cos(u) * Math.sin(l), Math.sin(u), Math.cos(u) * Math.cos(l)];
}

/** Ease in-out cubic, 0..1. */
export function easeInOut(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

/** The fly-to target: yaw the short way round, pitch clamped, zoom kept unless given. */
export function flyTarget(
  from: PickerView,
  to: { lat: number; lng: number; zoom?: number },
): PickerView {
  let dYaw = -to.lng - from.yaw;
  dYaw = ((((dYaw + 180) % 360) + 360) % 360) - 180;
  return { yaw: from.yaw + dYaw, pitch: clampPitch(to.lat), zoom: to.zoom ?? from.zoom };
}

/**
 * The dot nearest a tap at (x, y), if one on the visible side is within
 * `hitPt` points. Later dots win ties (they're drawn on top).
 */
export function dotAt<D extends { lat: number; lng: number }>(
  dots: readonly D[],
  view: PickerView,
  cx: number,
  cy: number,
  radius: number,
  x: number,
  y: number,
  hitPt: number,
): D | null {
  let best: D | null = null;
  let bestD = hitPt * hitPt;
  for (const d of dots) {
    const [px, py, pz] = rotateLatLng(d.lat, d.lng, view.yaw, view.pitch);
    if (pz <= 0.05) continue;
    const dx = cx + px * radius - x;
    const dy = cy - py * radius - y;
    const dd = dx * dx + dy * dy;
    if (dd <= bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

/** Label placement settings (PICKER.labels plus the globe scale). */
export interface LabelRules {
  scale: number;
  labelHideZ: number;
  labelFullZ: number;
  labelFadeZoom: number;
  continentMaxZoom: number;
  oceanMaxZoom: number;
  maxScale: number;
}

/**
 * Where a continent/ocean name sits on screen, how visible it is (0..1: fades
 * in as it turns toward you, out past its kind's max zoom) and its size
 * factor; null when hidden.
 */
export function placeLabel(
  label: { lat: number; lng: number; ocean: boolean },
  view: PickerView,
  width: number,
  height: number,
  cy: number,
  rules: LabelRules = defaultLabelRules(),
): { x: number; y: number; alpha: number; scale: number } | null {
  const maxZoom = label.ocean ? rules.oceanMaxZoom : rules.continentMaxZoom;
  const fade = Math.max(0, Math.min(1, (maxZoom - view.zoom) / rules.labelFadeZoom));
  if (fade <= 0) return null;
  const [x, y, z] = rotateLatLng(label.lat, label.lng, view.yaw, view.pitch);
  if (z <= rules.labelHideZ) return null;
  const r = globeRadius(width, height, view.zoom, rules.scale);
  const facing = Math.min(
    1,
    (z - rules.labelHideZ) / Math.max(1e-6, rules.labelFullZ - rules.labelHideZ),
  );
  return {
    x: width / 2 + x * r,
    y: cy - y * r,
    alpha: facing * fade,
    scale: Math.min(rules.maxScale, Math.sqrt(view.zoom)),
  };
}

function defaultLabelRules(): LabelRules {
  const L = PICKER.labels;
  return {
    scale: PICKER.globe.scale,
    labelHideZ: L.labelHideZ,
    labelFullZ: L.labelFullZ,
    labelFadeZoom: L.labelFadeZoom,
    continentMaxZoom: L.continentMaxZoom,
    oceanMaxZoom: L.oceanMaxZoom,
    maxScale: L.maxScale,
  };
}
