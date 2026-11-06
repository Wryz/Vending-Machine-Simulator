import * as THREE from 'three';

/**
 * Small three.js helpers for the street set: merge flat-shaded parts into one
 * geometry (one draw call), generated alpha textures (no canvas on device),
 * and an instance-aware triangle counter for the §7.4 budget.
 */

export interface Part {
  geo: THREE.BufferGeometry;
  /** Vertex color (linear RGB via THREE.Color) when merging with colors. */
  color?: THREE.ColorRepresentation;
  /** Applied before merging. */
  matrix?: THREE.Matrix4;
}

const tmpColor = new THREE.Color();

/** Merge parts into one non-indexed, flat-normal geometry (optionally vertex-colored). */
export function mergeParts(parts: Part[], withColors = false): THREE.BufferGeometry {
  const flat = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (p.matrix) g.applyMatrix4(p.matrix);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    return g;
  });
  const total = flat.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const col = withColors ? new Float32Array(total * 3) : null;
  let o = 0;
  flat.forEach((g, i) => {
    const a = g.attributes.position.array as Float32Array;
    pos.set(a, o * 3);
    if (col) {
      tmpColor.set(parts[i].color ?? '#ffffff');
      for (let v = 0; v < g.attributes.position.count; v++) {
        col[(o + v) * 3] = tmpColor.r;
        col[(o + v) * 3 + 1] = tmpColor.g;
        col[(o + v) * 3 + 2] = tmpColor.b;
      }
    }
    o += g.attributes.position.count;
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}

/** Box with its own transform, for `mergeParts`. */
export function boxPart(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color?: THREE.ColorRepresentation,
): Part {
  return {
    geo: new THREE.BoxGeometry(w, h, d),
    matrix: new THREE.Matrix4().makeTranslation(x, y, z),
    color,
  };
}

/** Extrude a side profile (x forward, y up) to width `w` centered on z. */
export function profilePart(
  pts: readonly (readonly [number, number])[],
  w: number,
  color?: THREE.ColorRepresentation,
  zOffset = 0,
): Part {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false, steps: 1 });
  return { geo, matrix: new THREE.Matrix4().makeTranslation(0, 0, -w / 2 + zOffset), color };
}

/**
 * Generated alpha masks (green channel used by `alphaMap`):
 * - 'round': soft disc (light pools, contact shadows)
 * - 'beam': a headlight throw that widens and fades along +u
 */
export function maskTexture(kind: 'round' | 'beam', size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = ((y + 0.5) / size) * 2 - 1;
      let a: number;
      if (kind === 'round') {
        const r = Math.hypot(u * 2 - 1, v);
        a = Math.max(0, 1 - r * r) ** 2;
      } else {
        const width = 0.3 + 0.7 * u;
        const lateral = Math.max(0, 1 - Math.abs(v) / width);
        a = lateral * lateral * (1 - u) ** 1.4 * Math.min(1, u / 0.06);
      }
      const b = Math.round(255 * Math.min(1, a));
      const i = (y * size + x) * 4;
      data[i] = b;
      data[i + 1] = b;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Triangles actually submitted: visible meshes only, instanced meshes × their count. */
export function countSceneTriangles(root: THREE.Object3D): number {
  let tris = 0;
  const walk = (o: THREE.Object3D) => {
    if (!o.visible) return;
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      const n = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
      const per = n / 3;
      tris += o instanceof THREE.InstancedMesh ? per * o.count : per;
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  return Math.round(tris);
}

/** InstancedMesh whose instances move every frame (bounding sphere would go stale). */
export function dynamicInstances(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  capacity: number,
  name: string,
): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, capacity);
  m.name = name;
  m.frustumCulled = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.count = 0;
  return m;
}

/** A second InstancedMesh drawing the same instances (for the shop-window reflection). */
export function mirrorInstances(src: THREE.InstancedMesh): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(src.geometry, src.material, src.instanceMatrix.count);
  m.name = `${src.name}-mirror`;
  m.instanceMatrix = src.instanceMatrix;
  m.instanceColor = src.instanceColor;
  m.frustumCulled = false;
  m.castShadow = false;
  m.receiveShadow = false;
  m.count = 0;
  return m;
}
