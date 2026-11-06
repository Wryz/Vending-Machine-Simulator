import { AreaBook, areaPoints, areaProbeLayer } from './areaName';

const pt = (name: string, lng: number, lat: number, en?: string): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: en ? { name, 'name:en': en } : { name },
});

describe('area name', () => {
  it('reads names, preferring English', () => {
    const pts = areaPoints([pt('新宿', 139.7, 35.69, 'Shinjuku'), pt('Soho', -0.13, 51.51)]);
    expect(pts.map((p) => p.name)).toEqual(['Shinjuku', 'Soho']);
  });

  it('picks the nearest remembered area within range', () => {
    const book = new AreaBook();
    book.add(areaPoints([pt('Soho', -0.1337, 51.5137), pt('Covent Garden', -0.1225, 51.5117)]));
    expect(book.nearest(-0.124, 51.512)).toBe('Covent Garden');
    expect(book.nearest(-0.135, 51.514)).toBe('Soho');
    // Far away: nothing.
    expect(book.nearest(2.35, 48.85)).toBeNull();
  });

  it('builds a probe layer for both schemas', () => {
    expect(areaProbeLayer('openmaptiles')['source-layer']).toBe('place');
    expect(areaProbeLayer('protomaps')['source-layer']).toBe('places');
  });
});
