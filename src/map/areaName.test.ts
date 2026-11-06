import { AreaBook, areaPoints, areaProbeLayer } from './areaName';

const pt = (
  name: string,
  lng: number,
  lat: number,
  en?: string,
  cls = 'neighbourhood',
): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: en ? { name, 'name:en': en, class: cls } : { name, class: cls },
});

describe('area name', () => {
  it('reads names, preferring English', () => {
    const pts = areaPoints([pt('新宿', 139.7, 35.69, 'Shinjuku'), pt('Soho', -0.13, 51.51)]);
    expect(pts.map((p) => p.name)).toEqual(['Shinjuku', 'Soho']);
  });

  it('picks the nearest remembered area within range', () => {
    const book = new AreaBook();
    book.add(areaPoints([pt('Soho', -0.1337, 51.5137), pt('Covent Garden', -0.1225, 51.5117)]));
    expect(book.nearest(-0.124, 51.512).area).toBe('Covent Garden');
    expect(book.nearest(-0.135, 51.514).area).toBe('Soho');
    // Far away: nothing.
    expect(book.nearest(2.35, 48.85)).toEqual({ area: null, district: null });
  });

  it('adds the district / municipality, skipping the game city itself', () => {
    const book = new AreaBook();
    book.add(
      areaPoints([
        pt('Seven Dials', -0.1265, 51.5139),
        pt('Camden', -0.1426, 51.539, undefined, 'borough'),
        pt('London', -0.1276, 51.5073, undefined, 'city'),
        pt('新宿区', 139.7036, 35.6938, 'Shinjuku', 'city'),
      ]),
    );
    expect(book.nearest(-0.127, 51.514, 'London')).toEqual({
      area: 'Seven Dials',
      district: 'Camden',
    });
    expect(book.nearest(139.7, 35.69, 'Tokyo')).toEqual({ area: null, district: 'Shinjuku' });
  });

  it('builds a probe layer for both schemas', () => {
    expect(areaProbeLayer('openmaptiles')['source-layer']).toBe('place');
    expect(areaProbeLayer('protomaps')['source-layer']).toBe('places');
  });
});
