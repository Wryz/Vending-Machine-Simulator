import { GLOBE } from '@/config/map';

import { isLand, latLngToXYZ, xyzToLatLng } from './geo';

/**
 * A flat-shaded low-poly globe drawn in 2D (pure, no rendering imports).
 *
 * The mesh is a subdivided icosahedron with land raised a little. Each frame,
 * `projectGlobe` rotates it, drops faces that face away, shades the rest by
 * the angle to the real sun in a few flat steps, and batches faces of the same
 * color into one SVG path, so a frame is a handful of paths, not thousands.
 *
 * The picker draws only land (`landOnly`): the ocean is one disc filled with
 * `oceanGradient` (the same flat light steps as hard-edged rings) plus a
 * sparse overlay of coarse lighter/darker facets (`projectOceanFacets`), so a
 * frame carries a fraction of the path data.
 */

type V3 = [number, number, number];

export type FaceKind = 'ocean' | 'oceanAlt' | 'land' | 'landAlt' | 'snow';

export interface GlobeMesh {
  /** Flat array: 9 numbers (3 vertices) per face. */
  verts: Float32Array;
  /** Unit face normals, 3 numbers per face. */
  normals: Float32Array;
  kinds: FaceKind[];
  /** Indices of land and snow faces (the only ones drawn with `landOnly`). */
  landFaces: Uint32Array;
}

export interface GlobeView {
  /** Degrees about +Y (north). */
  yaw: number;
  /** Degrees about +X, applied after yaw. */
  pitch: number;
}

export interface ProjectedGlobe {
  /** One SVG path per (kind, shade step), with its fill color. */
  paths: { d: string; fill: string }[];
  /** Faces drawn this frame. */
  faces: number;
}

export interface ProjectOptions {
  /** Skip ocean faces (the caller draws the ocean as a disc). */
  landOnly?: boolean;
}

/** Coarse ocean facets: a faint lighter or darker tint over the ocean disc. */
export interface OceanFacets {
  /** 9 numbers per facet, on the unit sphere. */
  verts: Float32Array;
  /** Unit normals, 3 per facet. */
  normals: Float32Array;
  /** +1 lighter, −1 darker. */
  tone: Int8Array;
}

export interface OceanGradient {
  /** Center (screen) and radius of the radial gradient: the point under the sun. */
  cx: number;
  cy: number;
  r: number;
  /** Hard-edged rings, brightest first (pairs of stops share an offset). */
  stops: { offset: number; color: string }[];
}

const unit = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Faces of a unit icosahedron with each edge split into `n` segments. */
function icosphere(n: number): V3[][] {
  const t = (1 + Math.sqrt(5)) / 2;
  const base: V3[] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const tris = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ]; // prettier-ignore
  const faces: V3[][] = [];
  for (const [ia, ib, ic] of tris) {
    const a = unit(base[ia]);
    const b = unit(base[ib]);
    const c = unit(base[ic]);
    // Barycentric grid on the triangle: point (i, j) = a + (b-a) i/n + (c-a) j/n.
    const p = (i: number, j: number): V3 =>
      unit([
        a[0] + ((b[0] - a[0]) * i + (c[0] - a[0]) * j) / n,
        a[1] + ((b[1] - a[1]) * i + (c[1] - a[1]) * j) / n,
        a[2] + ((b[2] - a[2]) * i + (c[2] - a[2]) * j) / n,
      ]);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n - i; j++) {
        faces.push([p(i, j), p(i + 1, j), p(i, j + 1)]);
        if (j < n - i - 1) faces.push([p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)]);
      }
  }
  return faces;
}

/** Outward unit normal of a triangle. */
function faceNormal(a: V3, b: V3, c: V3): V3 {
  const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const w: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nrm = unit([
    u[1] * w[2] - u[2] * w[1],
    u[2] * w[0] - u[0] * w[2],
    u[0] * w[1] - u[1] * w[0],
  ]);
  const cx = (a[0] + b[0] + c[0]) / 3;
  const cy = (a[1] + b[1] + c[1]) / 3;
  const cz = (a[2] + b[2] + c[2]) / 3;
  return nrm[0] * cx + nrm[1] * cy + nrm[2] * cz < 0 ? [-nrm[0], -nrm[1], -nrm[2]] : nrm;
}

/** Cheap deterministic hash of a face index (0..n-1). */
const hash = (k: number, n: number) => ((k * 2654435761) >>> 0) % n;

/** Subdivided icosahedron (each edge split into `n` segments), land raised. */
export function buildGlobeMesh(n: number = GLOBE.flatDetail): GlobeMesh {
  const lift = (v: V3): V3 => {
    const { lat, lng } = xyzToLatLng(v[0], v[1], v[2]);
    const r = isLand(lat, lng) ? 1 + GLOBE.landHeight : 1;
    return [v[0] * r, v[1] * r, v[2] * r];
  };
  const faces = icosphere(n);
  const verts = new Float32Array(faces.length * 9);
  const normals = new Float32Array(faces.length * 3);
  const kinds: FaceKind[] = [];
  faces.forEach((f, k) => {
    let landVerts = 0;
    let lat = 0;
    const lifted = f.map((v) => {
      const ll = xyzToLatLng(v[0], v[1], v[2]);
      lat += ll.lat / 3;
      if (isLand(ll.lat, ll.lng)) landVerts++;
      return lift(v);
    });
    lifted.forEach((v, i) => verts.set(v, k * 9 + i * 3));
    // Face normal from the lifted triangle (cliffs at coasts shade like cliffs).
    normals.set(faceNormal(lifted[0], lifted[1], lifted[2]), k * 3);
    const alt = hash(k, 3) === 0;
    kinds.push(
      landVerts >= 2
        ? Math.abs(lat) > GLOBE.colors.snowLatDeg
          ? 'snow'
          : alt
            ? 'landAlt'
            : 'land'
        : alt
          ? 'oceanAlt'
          : 'ocean',
    );
  });
  const land: number[] = [];
  kinds.forEach((kind, k) => {
    if (!kind.startsWith('ocean')) land.push(k);
  });
  return { verts, normals, kinds, landFaces: Uint32Array.from(land) };
}

/**
 * The ocean texture: a coarse icosphere (`n` edge splits) of which a few
 * facets, away from land, get a faint lighter or darker tint. Built once.
 */
export function buildOceanFacets(n: number, share: number): OceanFacets {
  const v: number[] = [];
  const nr: number[] = [];
  const tone: number[] = [];
  const every = Math.max(1, Math.round(1 / Math.max(0.01, share)));
  icosphere(n).forEach((f, k) => {
    // Keep a sparse, scattered subset, half lighter and half darker.
    const h = hash(k, every * 2);
    if (h > 1) return;
    // Skip facets that are mostly land: the land is drawn over them anyway.
    const landVerts = f.filter((p) => {
      const ll = xyzToLatLng(p[0], p[1], p[2]);
      return isLand(ll.lat, ll.lng);
    }).length;
    if (landVerts >= 2) return;
    for (const p of f) v.push(p[0], p[1], p[2]);
    nr.push(...faceNormal(f[0], f[1], f[2]));
    tone.push(h === 0 ? 1 : -1);
  });
  return {
    verts: Float32Array.from(v),
    normals: Float32Array.from(nr),
    tone: Int8Array.from(tone),
  };
}

/** Rotate by yaw (about +Y) then pitch (about +X). */
export function rotate(v: V3, view: GlobeView): V3 {
  const y = (view.yaw * Math.PI) / 180;
  const p = (view.pitch * Math.PI) / 180;
  const x1 = v[0] * Math.cos(y) + v[2] * Math.sin(y);
  const z1 = -v[0] * Math.sin(y) + v[2] * Math.cos(y);
  const y2 = v[1] * Math.cos(p) - z1 * Math.sin(p);
  const z2 = v[1] * Math.sin(p) + z1 * Math.cos(p);
  return [x1, y2, z2];
}

/** Screen position of (lat, lng) on a globe of `radius` centered at (cx, cy); null when behind. */
export function projectPoint(
  lat: number,
  lng: number,
  view: GlobeView,
  cx: number,
  cy: number,
  radius: number,
  lift: number = GLOBE.landHeight,
): { x: number; y: number } | null {
  const [x, y, z] = rotate(latLngToXYZ(lat, lng), view);
  if (z <= 0.05) return null;
  const r = radius * (1 + lift);
  return { x: cx + x * r, y: cy - y * r };
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) =>
    Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

type Rot = (x: number, y: number, z: number) => V3;

/** The rotation of `rotate`, with its sines and cosines computed once. */
function rotator(view: GlobeView): Rot {
  const yaw = (view.yaw * Math.PI) / 180;
  const pitch = (view.pitch * Math.PI) / 180;
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return (x, y, z) => {
    const x1 = x * cyw + z * syw;
    const z1 = -x * syw + z * cyw;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
}

/** `a b`, or `a-b` when b is negative (SVG needs no separator before a minus). */
const pair = (a: number, b: number) => (b < 0 ? `${a}${b}` : `${a} ${b}`);

/**
 * One projected triangle as compact SVG: an absolute move, then two relative
 * lines. Whole pixels: shared vertices round the same way, so faces meet
 * without seams (the deltas are between rounded points, so nothing drifts).
 */
function triPath(verts: Float32Array, o: number, rot: Rot, cx: number, cy: number, r: number) {
  const [x0, y0] = rot(verts[o], verts[o + 1], verts[o + 2]);
  const [x1, y1] = rot(verts[o + 3], verts[o + 4], verts[o + 5]);
  const [x2, y2] = rot(verts[o + 6], verts[o + 7], verts[o + 8]);
  const ax = Math.round(cx + x0 * r);
  const ay = Math.round(cy - y0 * r);
  const bx = Math.round(cx + x1 * r);
  const by = Math.round(cy - y1 * r);
  const qx = Math.round(cx + x2 * r);
  const qy = Math.round(cy - y2 * r);
  const d1 = pair(bx - ax, by - ay);
  const d2 = pair(qx - bx, qy - by);
  return `M${pair(ax, ay)}l${d1}${qx - bx < 0 ? '' : ' '}${d2}z`;
}

/** Light step (0 = night … steps−1 = full sun) for a light amount 0..1. */
const stepOf = (light: number, steps: number) =>
  Math.min(steps - 1, Math.floor(Math.max(0, light) * steps));

/** The flat color of `kind` at light `step`: step 0 is the deep-blue night side. */
export function shadeColor(kind: FaceKind, step: number, steps: number = GLOBE.shadeSteps): string {
  const c = GLOBE.colors;
  const baseColor: Record<FaceKind, string> = {
    ocean: c.ocean,
    oceanAlt: c.oceanDeep,
    land: c.land,
    landAlt: c.landAlt,
    snow: c.snow,
  };
  const lit = steps === 1 ? 1 : step / (steps - 1);
  return mix(c.night, baseColor[kind], 0.18 + 0.82 * lit);
}

/**
 * Project the visible faces. `sun` is the unit vector to the sun in the
 * globe's own (unrotated) frame, so day and night stay on the right side.
 * With `landOnly`, only land and snow faces are projected.
 */
export function projectGlobe(
  mesh: GlobeMesh,
  view: GlobeView,
  sun: V3,
  cx: number,
  cy: number,
  radius: number,
  steps: number = GLOBE.shadeSteps,
  opts: ProjectOptions = {},
): ProjectedGlobe {
  const buckets = new Map<string, string[]>();
  let faces = 0;
  const rot = rotator(view);
  const n = opts.landOnly ? mesh.landFaces.length : mesh.kinds.length;
  for (let f = 0; f < n; f++) {
    const k = opts.landOnly ? mesh.landFaces[f] : f;
    const nx = mesh.normals[k * 3];
    const ny = mesh.normals[k * 3 + 1];
    const nz = mesh.normals[k * 3 + 2];
    // Back-face test on the rotated normal (camera looks down −Z from +Z).
    if (rot(nx, ny, nz)[2] <= 0) continue;
    faces++;
    const step = stepOf(nx * sun[0] + ny * sun[1] + nz * sun[2], steps);
    const key = `${mesh.kinds[k]}|${step}`;
    let parts = buckets.get(key);
    if (!parts) buckets.set(key, (parts = []));
    parts.push(triPath(mesh.verts, k * 9, rot, cx, cy, radius));
  }
  const paths: ProjectedGlobe['paths'] = [];
  for (const [key, parts] of buckets) {
    const [kind, s] = key.split('|');
    paths.push({ d: parts.join(''), fill: shadeColor(kind as FaceKind, Number(s), steps) });
  }
  return { paths, faces };
}

/**
 * The ocean disc's fill: a radial gradient centered on the point under the
 * sun, in hard-edged rings with the same flat light steps as the faces, so
 * the lit side and the deep-blue night side read like the triangle ocean did.
 * The rings follow the real light along the line from the sun point through
 * the globe's center (where it falls off fastest).
 */
export function oceanGradient(
  view: GlobeView,
  sun: V3,
  cx: number,
  cy: number,
  radius: number,
  steps: number = GLOBE.shadeSteps,
): OceanGradient {
  const s = rotator(view)(sun[0], sun[1], sun[2]);
  // The sun point on screen (unit disc); behind the globe it sits on the limb.
  let px = s[0];
  let py = s[1];
  const len = Math.hypot(px, py);
  if (s[2] < 0 && len > 0) {
    px /= len;
    py /= len;
  }
  const plen = Math.hypot(px, py);
  // Walk away from the center (toward the far limb).
  const dx = plen > 1e-6 ? -px / plen : 0;
  const dy = plen > 1e-6 ? -py / plen : -1;
  const reach = 1 + plen + 0.02;
  const lightAt = (t: number): number => {
    const x = px + dx * t * reach;
    const y = py + dy * t * reach;
    const r2 = x * x + y * y;
    if (r2 >= 1) return -1;
    return x * s[0] + y * s[1] + Math.sqrt(1 - r2) * s[2];
  };
  const stops: OceanGradient['stops'] = [];
  const SAMPLES = 96;
  let prev = stepOf(lightAt(0), steps);
  stops.push({ offset: 0, color: shadeColor('ocean', prev, steps) });
  for (let i = 1; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const l = lightAt(t);
    // Past the limb: keep the last ring (it's outside the disc anyway).
    if (l < -0.5) break;
    const step = stepOf(l, steps);
    if (step !== prev) {
      const at = Number(((i - 0.5) / SAMPLES).toFixed(4));
      stops.push({ offset: at, color: shadeColor('ocean', prev, steps) });
      stops.push({ offset: at, color: shadeColor('ocean', step, steps) });
      prev = step;
    }
  }
  stops.push({ offset: 1, color: shadeColor('ocean', prev, steps) });
  return { cx: cx + px * radius, cy: cy - py * radius, r: reach * radius, stops };
}

/**
 * The ocean texture for this frame: front-facing facets as two paths, one
 * for the lighter tint and one for the darker tint (drawn translucent).
 */
export function projectOceanFacets(
  facets: OceanFacets,
  view: GlobeView,
  cx: number,
  cy: number,
  radius: number,
): { light: string; dark: string; faces: number } {
  const rot = rotator(view);
  let light = '';
  let dark = '';
  let faces = 0;
  for (let k = 0; k < facets.tone.length; k++) {
    // A margin keeps sliver facets at the limb out (they'd read as noise).
    if (rot(facets.normals[k * 3], facets.normals[k * 3 + 1], facets.normals[k * 3 + 2])[2] <= 0.15)
      continue;
    faces++;
    const d = triPath(facets.verts, k * 9, rot, cx, cy, radius);
    if (facets.tone[k] > 0) light += d;
    else dark += d;
  }
  return { light, dark, faces };
}

/**
 * Where a label anchored at (lat, lng) lands on screen, and how much of it
 * to show: 0 near and past the limb, 1 when facing the viewer.
 */
export function projectLabel(
  lat: number,
  lng: number,
  view: GlobeView,
  cx: number,
  cy: number,
  radius: number,
  hideZ: number,
  fullZ: number,
): { x: number; y: number; alpha: number } | null {
  const [x, y, z] = rotate(latLngToXYZ(lat, lng), view);
  if (z <= hideZ) return null;
  const alpha = Math.min(1, (z - hideZ) / Math.max(1e-6, fullZ - hideZ));
  return { x: cx + x * radius, y: cy - y * radius, alpha };
}
