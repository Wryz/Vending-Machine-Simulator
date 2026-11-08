import { rotate } from './flatGlobe';
import { latLngToXYZ, yawToFace } from './geo';
import {
  clampPitch,
  dotAt,
  easeInOut,
  flyTarget,
  globeRadius,
  lightDir,
  placeLabel,
  rotateLatLng,
  viewCenter,
  viewEuler,
} from './pickerView';

describe('pickerView', () => {
  const views = [
    { yaw: 0, pitch: 0, zoom: 1 },
    { yaw: 122, pitch: 37, zoom: 1 },
    { yaw: -75, pitch: -60, zoom: 2 },
  ];

  it('rotates like the flat globe', () => {
    for (const v of views) {
      for (const [lat, lng] of [
        [0, 0],
        [48.8, 2.3],
        [-33.9, 151.2],
        [64, -150],
      ]) {
        const a = rotateLatLng(lat, lng, v.yaw, v.pitch);
        const b = rotate(latLngToXYZ(lat, lng), v);
        a.forEach((c, i) => expect(c).toBeCloseTo(b[i], 9));
      }
    }
  });

  it('puts the view center facing the camera', () => {
    for (const v of views) {
      const c = viewCenter(v);
      const [x, y, z] = rotateLatLng(c.lat, c.lng, v.yaw, v.pitch);
      expect(x).toBeCloseTo(0, 9);
      expect(y).toBeCloseTo(0, 9);
      expect(z).toBeCloseTo(1, 9);
    }
  });

  it("group Euler (order 'XYZ' = Rx·Ry) matches the math, so texture and pins line up", () => {
    // three.js applies an 'XYZ' Euler as Rx(x)·Ry(y)·Rz(z) to column vectors.
    for (const v of views) {
      const [ex, ey] = viewEuler(v);
      const [x, y, z] = latLngToXYZ(-20, 70);
      // Ry
      const x1 = x * Math.cos(ey) + z * Math.sin(ey);
      const z1 = -x * Math.sin(ey) + z * Math.cos(ey);
      // Rx
      const y2 = y * Math.cos(ex) - z1 * Math.sin(ex);
      const z2 = y * Math.sin(ex) + z1 * Math.cos(ex);
      const r = rotateLatLng(-20, 70, v.yaw, v.pitch);
      expect(x1).toBeCloseTo(r[0], 9);
      expect(y2).toBeCloseTo(r[1], 9);
      expect(z2).toBeCloseTo(r[2], 9);
    }
  });

  it('a SphereGeometry starting at phi -90° maps equirectangular u to longitude', () => {
    // three's SphereGeometry: x = -cos(phi)·sin(theta), z = sin(phi)·sin(theta),
    // phi = phiStart + u·2π. Equirectangular u = (lng + 180) / 360.
    for (const lng of [-180, -90, 0, 45, 135]) {
      const phi = -Math.PI / 2 + ((lng + 180) / 360) * 2 * Math.PI;
      const [ex, , ez] = latLngToXYZ(0, lng);
      expect(-Math.cos(phi)).toBeCloseTo(ex, 9);
      expect(Math.sin(phi)).toBeCloseTo(ez, 9);
    }
  });

  it('flies the short way round and clamps pitch', () => {
    const to = flyTarget({ yaw: yawToFace(170), pitch: 0, zoom: 1 }, { lat: 89, lng: -170 });
    expect(to.yaw).toBeCloseTo(yawToFace(170) - 20, 9);
    expect(to.pitch).toBe(clampPitch(89));
    expect(to.zoom).toBe(1);
    expect(flyTarget({ yaw: 0, pitch: 0, zoom: 1 }, { lat: 0, lng: 0, zoom: 3 }).zoom).toBe(3);
  });

  it('eases from 0 to 1', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
  });

  it('lights from the upper left, in front', () => {
    const [x, y, z] = lightDir(28, 32);
    expect(x).toBeLessThan(0);
    expect(y).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(0);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
  });

  it('finds the tapped dot on the visible side only', () => {
    const view = { yaw: 0, pitch: 0, zoom: 1 };
    const r = globeRadius(400, 800, 1, 0.36);
    expect(r).toBeCloseTo(144, 9);
    const dots = [
      { id: 'front', lat: 0, lng: 0 },
      { id: 'back', lat: 0, lng: 180 },
      { id: 'east', lat: 0, lng: 30 },
    ];
    expect(dotAt(dots, view, 200, 300, r, 203, 298, 20)?.id).toBe('front');
    expect(dotAt(dots, view, 200, 300, r, 200 + r * 0.5, 300, 20)?.id).toBe('east');
    expect(dotAt(dots, view, 200, 300, r, 50, 50, 20)).toBeNull();
  });

  it('places labels: Pacific shows when facing it, hides on the far side and when zoomed in', () => {
    const pacific = { lat: 22, lng: 172, ocean: true };
    const facing = { yaw: yawToFace(172), pitch: 22, zoom: 1 };
    const at = placeLabel(pacific, facing, 400, 800, 300);
    expect(at).not.toBeNull();
    expect(at!.x).toBeCloseTo(200, 6);
    expect(at!.y).toBeCloseTo(300, 6);
    expect(at!.alpha).toBe(1);
    expect(
      placeLabel(pacific, { yaw: yawToFace(-8), pitch: -22, zoom: 1 }, 400, 800, 300),
    ).toBeNull();
    expect(placeLabel(pacific, { ...facing, zoom: 3 }, 400, 800, 300)).toBeNull();
    const asia = placeLabel(
      { lat: 50, lng: 92, ocean: false },
      { yaw: yawToFace(80), pitch: 30, zoom: 1 },
      400,
      800,
      300,
    );
    expect(asia && asia.alpha).toBeGreaterThan(0.5);
  });
});
