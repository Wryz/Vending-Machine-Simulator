import { GLOBE } from '@/config/map';

import { buildGlobeMesh, projectGlobe, projectPoint, rotate } from './flatGlobe';
import { latLngToXYZ, yawToFace } from './geo';

describe('flat globe', () => {
  const mesh = buildGlobeMesh(6);

  it('builds 20·n² faces with outward normals', () => {
    expect(mesh.kinds).toHaveLength(20 * 36);
    for (let k = 0; k < mesh.kinds.length; k++) {
      const n = [mesh.normals[k * 3], mesh.normals[k * 3 + 1], mesh.normals[k * 3 + 2]];
      const c = [0, 1, 2].map(
        (a) => (mesh.verts[k * 9 + a] + mesh.verts[k * 9 + 3 + a] + mesh.verts[k * 9 + 6 + a]) / 3,
      );
      expect(n[0] * c[0] + n[1] * c[1] + n[2] * c[2]).toBeGreaterThan(0);
    }
    expect(mesh.kinds.some((k) => k.startsWith('land'))).toBe(true);
    expect(mesh.kinds.some((k) => k.startsWith('ocean'))).toBe(true);
  });

  it('turns a city to face the viewer', () => {
    const view = { yaw: yawToFace(-74), pitch: 40.7 };
    const [x, y, z] = rotate(latLngToXYZ(40.7, -74), view);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(1, 6);
    expect(projectPoint(40.7, -74, view, 100, 100, 50, 0)).toEqual({ x: 100, y: 100 });
    // The far side is hidden.
    expect(projectPoint(-40.7, 106, view, 100, 100, 50)).toBeNull();
  });

  it('draws only the front half, batched into a few paths', () => {
    const out = projectGlobe(mesh, { yaw: 0, pitch: 0 }, [0, 0, 1], 0, 0, 100, 4);
    expect(out.faces).toBeGreaterThan(mesh.kinds.length * 0.4);
    expect(out.faces).toBeLessThan(mesh.kinds.length * 0.6);
    expect(out.paths.length).toBeLessThanOrEqual(5 * 4);
    for (const p of out.paths) expect(p.fill).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('tints the night side toward the night color', () => {
    const rgb = (hex: string) => {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    };
    const night = rgb(GLOBE.colors.night);
    const dist = (hex: string) => {
      const c = rgb(hex);
      return Math.hypot(c[0] - night[0], c[1] - night[1], c[2] - night[2]);
    };
    const avg = (o: ReturnType<typeof projectGlobe>) =>
      o.paths.reduce((a, p) => a + dist(p.fill), 0) / o.paths.length;
    const day = projectGlobe(mesh, { yaw: 0, pitch: 0 }, [0, 0, 1], 0, 0, 100, 4);
    const dark = projectGlobe(mesh, { yaw: 0, pitch: 0 }, [0, 0, -1], 0, 0, 100, 4);
    expect(avg(dark)).toBeLessThan(avg(day));
  });
});
