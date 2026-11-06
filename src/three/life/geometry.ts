import * as THREE from 'three';

/**
 * Small three.js helpers for the street set: merge flat-shaded parts into one
 * geometry (one draw call), instanced meshes for moving people, and an
 * instance-aware triangle counter for the §7.4 budget.
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
