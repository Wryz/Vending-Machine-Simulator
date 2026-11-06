import { isLand, latLngToXYZ, subsolarPoint, xyzToLatLng, yawToFace } from './geo';

describe('globe land mask', () => {
  it('knows the continents from the oceans', () => {
    expect(isLand(48.86, 2.35)).toBe(true); // Paris
    expect(isLand(-1.29, 36.82)).toBe(true); // Nairobi
    expect(isLand(39.74, -104.99)).toBe(true); // Denver
    expect(isLand(-23.7, 133.88)).toBe(true); // Alice Springs
    expect(isLand(-80, 0)).toBe(true); // Antarctica
    expect(isLand(0, -140)).toBe(false); // Pacific
    expect(isLand(30, -40)).toBe(false); // Atlantic
    expect(isLand(-30, 80)).toBe(false); // Indian Ocean
    expect(isLand(89, 0)).toBe(false); // Arctic Ocean
  });

  it('wraps longitudes', () => {
    expect(isLand(48.86, 2.35 + 360)).toBe(isLand(48.86, 2.35));
    expect(isLand(0, 180)).toBe(isLand(0, -180));
  });
});

describe('globe coordinates', () => {
  it('round-trips lat/lng through the unit sphere', () => {
    for (const [lat, lng] of [
      [40.71, -74.01],
      [-33.87, 151.21],
      [0, 0],
      [60, 179],
    ]) {
      const [x, y, z] = latLngToXYZ(lat, lng);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
      const back = xyzToLatLng(x, y, z);
      expect(back.lat).toBeCloseTo(lat, 9);
      expect(back.lng).toBeCloseTo(lng, 9);
    }
  });

  it('puts lng 0 on +Z, north on +Y and east on +X', () => {
    expect(latLngToXYZ(0, 0)).toEqual([0, 0, 1]);
    expect(latLngToXYZ(90, 0)[1]).toBeCloseTo(1);
    expect(latLngToXYZ(0, 90)[0]).toBeCloseTo(1);
  });

  it('turns a longitude to face the camera', () => {
    const lng = -74;
    const [x, , z] = latLngToXYZ(0, lng);
    const yaw = (yawToFace(lng) * Math.PI) / 180;
    // Rotate about +Y by yaw: x' = x cos + z sin, z' = -x sin + z cos.
    expect(x * Math.cos(yaw) + z * Math.sin(yaw)).toBeCloseTo(0);
    expect(-x * Math.sin(yaw) + z * Math.cos(yaw)).toBeCloseTo(1);
  });
});

describe('subsolar point', () => {
  it('follows the seasons and the clock', () => {
    const juneNoonUtc = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12)));
    expect(juneNoonUtc.lat).toBeGreaterThan(23);
    expect(Math.abs(juneNoonUtc.lng)).toBeLessThan(1);
    const decEvening = subsolarPoint(new Date(Date.UTC(2026, 11, 21, 18)));
    expect(decEvening.lat).toBeLessThan(-23);
    expect(decEvening.lng).toBeCloseTo(-90, 0);
    expect(subsolarPoint(new Date(Date.UTC(2026, 2, 20, 0))).lng).toBeCloseTo(180, 0);
  });
});
