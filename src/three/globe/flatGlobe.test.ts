import { GLOBE } from '@/config/map';

import {
  buildGlobeMesh,
  buildOceanFacets,
  oceanGradient,
  projectGlobe,
  projectLabel,
  projectOceanFacets,
  projectPoint,
  rotate,
  shadeColor,
} from './flatGlobe';
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

  it('lists the land faces once, at build time', () => {
    const land = mesh.kinds.flatMap((k, i) => (k.startsWith('ocean') ? [] : [i]));
    expect(Array.from(mesh.landFaces)).toEqual(land);
    expect(land.length).toBeGreaterThan(0);
  });

  it('with landOnly, projects only land faces, in much less path data', () => {
    const view = { yaw: 0, pitch: 20 };
    const all = projectGlobe(mesh, view, [0, 0, 1], 200, 200, 150, 4);
    const land = projectGlobe(mesh, view, [0, 0, 1], 200, 200, 150, 4, { landOnly: true });
    expect(land.faces).toBeGreaterThan(0);
    expect(land.faces).toBeLessThan(all.faces * 0.5);
    const landFills = new Set(
      (['land', 'landAlt', 'snow'] as const).flatMap((k) =>
        [0, 1, 2, 3].map((s) => shadeColor(k, s, 4)),
      ),
    );
    for (const p of land.paths) expect(landFills.has(p.fill)).toBe(true);
    const chars = (o: typeof all) => o.paths.reduce((a, p) => a + p.d.length, 0);
    expect(chars(land)).toBeLessThan(chars(all) * 0.5);
  });

  it('writes each triangle as a compact closed subpath', () => {
    const out = projectGlobe(mesh, { yaw: 30, pitch: -10 }, [0, 0, 1], 100, 100, 80, 4);
    for (const p of out.paths) {
      for (const sub of p.d.split('z').filter(Boolean)) {
        expect(sub).toMatch(/^M-?\d+[ -]?-?\d+l(-?\d+[ -]?){3}-?\d+$/);
      }
    }
  });

  it('shades the ocean disc in hard-edged rings, brightest under the sun', () => {
    const view = { yaw: 0, pitch: 0 };
    const sun = latLngToXYZ(30, -30);
    const g = oceanGradient(view, sun, 100, 100, 50, 4);
    // The sun is upper-left of the center.
    expect(g.cx).toBeLessThan(100);
    expect(g.cy).toBeLessThan(100);
    expect(g.r).toBeGreaterThan(50);
    expect(g.stops[0].offset).toBe(0);
    expect(g.stops[g.stops.length - 1].offset).toBe(1);
    for (let i = 1; i < g.stops.length; i++)
      expect(g.stops[i].offset).toBeGreaterThanOrEqual(g.stops[i - 1].offset);
    expect(g.stops[0].color).toBe(shadeColor('ocean', 3, 4));
    // The far side of the disc reaches the night color step.
    expect(g.stops[g.stops.length - 1].color).toBe(shadeColor('ocean', 0, 4));
  });

  it('draws only front-facing ocean facets, split into two tints', () => {
    const facets = buildOceanFacets(5, 0.3);
    expect(facets.tone.length).toBeGreaterThan(0);
    expect(facets.tone.length).toBeLessThan(20 * 25 * 0.4);
    const out = projectOceanFacets(facets, { yaw: 0, pitch: 0 }, 0, 0, 100);
    expect(out.faces).toBeGreaterThan(0);
    expect(out.faces).toBeLessThan(facets.tone.length);
    expect((out.light.match(/M/g)?.length ?? 0) + (out.dark.match(/M/g)?.length ?? 0)).toBe(
      out.faces,
    );
  });

  it('places labels on the near side and fades them toward the limb', () => {
    const view = { yaw: 0, pitch: 0 };
    expect(projectLabel(0, 0, view, 100, 100, 50, 0.3, 0.7)).toEqual({ x: 100, y: 100, alpha: 1 });
    expect(projectLabel(0, 180, view, 100, 100, 50, 0.3, 0.7)).toBeNull();
    const edge = projectLabel(0, 60, view, 100, 100, 50, 0.3, 0.7);
    expect(edge?.alpha).toBeGreaterThan(0);
    expect(edge?.alpha).toBeLessThan(1);
  });
});
