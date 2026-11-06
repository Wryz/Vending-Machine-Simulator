import { GLOBE } from '@/config/map';

import { isLand, latLngToXYZ, xyzToLatLng } from './geo';

/**
 * A flat-shaded low-poly globe drawn in 2D (pure, no rendering imports).
 *
 * The mesh is a subdivided icosahedron with land raised a little. Each frame,
 * `projectGlobe` rotates it, drops faces that face away, shades the rest by
 * the angle to the real sun in a few flat steps, and batches faces of the same
 * color into one SVG path, so a frame is a handful of paths, not thousands.
 */

type V3 = [number, number, number];

export type FaceKind = 'ocean' | 'oceanAlt' | 'land' | 'landAlt' | 'snow';

export interface GlobeMesh {
  /** Flat array: 9 numbers (3 vertices) per face. */
  verts: Float32Array;
  /** Unit face normals, 3 numbers per face. */
  normals: Float32Array;
  kinds: FaceKind[];
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

/** Subdivided icosahedron (each edge split into `n` segments), land raised. */
export function buildGlobeMesh(n: number = GLOBE.flatDetail): GlobeMesh {
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
  const unit = (v: V3): V3 => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const lift = (v: V3): V3 => {
    const { lat, lng } = xyzToLatLng(v[0], v[1], v[2]);
    const r = isLand(lat, lng) ? 1 + GLOBE.landHeight : 1;
    return [v[0] * r, v[1] * r, v[2] * r];
  };
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
    const [a, b, c] = lifted;
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nrm = unit([
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0],
    ]);
    // Make it point outward.
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    const cz = (a[2] + b[2] + c[2]) / 3;
    if (nrm[0] * cx + nrm[1] * cy + nrm[2] * cz < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
    normals.set(nrm, k * 3);
    const alt = ((k * 2654435761) >>> 0) % 3 === 0;
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
  return { verts, normals, kinds };
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

/**
 * Project the visible faces. `sun` is the unit vector to the sun in the
 * globe's own (unrotated) frame, so day and night stay on the right side.
 */
export function projectGlobe(
  mesh: GlobeMesh,
  view: GlobeView,
  sun: V3,
  cx: number,
  cy: number,
  radius: number,
  steps: number = GLOBE.shadeSteps,
): ProjectedGlobe {
  const c = GLOBE.colors;
  const baseColor: Record<FaceKind, string> = {
    ocean: c.ocean,
    oceanAlt: c.oceanDeep,
    land: c.land,
    landAlt: c.landAlt,
    snow: c.snow,
  };
  const buckets = new Map<string, string[]>();
  let faces = 0;
  const n = mesh.kinds.length;
  const yaw = (view.yaw * Math.PI) / 180;
  const pitch = (view.pitch * Math.PI) / 180;
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const rot = (x: number, y: number, z: number): V3 => {
    const x1 = x * cyw + z * syw;
    const z1 = -x * syw + z * cyw;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
  for (let k = 0; k < n; k++) {
    const nx = mesh.normals[k * 3];
    const ny = mesh.normals[k * 3 + 1];
    const nz = mesh.normals[k * 3 + 2];
    // Back-face test on the rotated normal (camera looks down −Z from +Z).
    if (rot(nx, ny, nz)[2] <= 0) continue;
    faces++;
    const light = Math.max(0, nx * sun[0] + ny * sun[1] + nz * sun[2]);
    const step = Math.min(steps - 1, Math.floor(light * steps));
    const key = `${mesh.kinds[k]}|${step}`;
    let parts = buckets.get(key);
    if (!parts) buckets.set(key, (parts = []));
    let d = '';
    for (let i = 0; i < 3; i++) {
      const o = k * 9 + i * 3;
      const [x, y] = rot(mesh.verts[o], mesh.verts[o + 1], mesh.verts[o + 2]);
      // Whole pixels: shared vertices round the same way, so faces meet without seams.
      d += `${i === 0 ? 'M' : 'L'}${Math.round(cx + x * radius)} ${Math.round(cy - y * radius)}`;
    }
    parts.push(`${d}Z`);
  }
  const paths: ProjectedGlobe['paths'] = [];
  for (const [key, parts] of buckets) {
    const [kind, s] = key.split('|');
    // Step 0 is the night side: deep blue, so you can see where the sun isn't shining.
    const lit = steps === 1 ? 1 : Number(s) / (steps - 1);
    const fill = mix(c.night, baseColor[kind as FaceKind], 0.18 + 0.82 * lit);
    paths.push({ d: parts.join(''), fill });
  }
  return { paths, faces };
}
