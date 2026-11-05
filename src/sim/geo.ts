const R = 6_371_000;
const DEG = Math.PI / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in meters. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point `meters` away from `from` along compass `bearingDeg`. */
export function offsetPoint(from: LatLng, bearingDeg: number, meters: number): LatLng {
  const b = bearingDeg * DEG;
  const dLat = (meters * Math.cos(b)) / R;
  const dLng = (meters * Math.sin(b)) / (R * Math.cos(from.lat * DEG));
  return { lat: from.lat + dLat / DEG, lng: from.lng + dLng / DEG };
}

/** Length of a closed tour start -> stops -> start, in meters (visiting order as given). */
export function tourLengthM(start: LatLng, stops: readonly LatLng[]): number {
  let total = 0;
  let prev = start;
  for (const s of stops) {
    total += distanceM(prev, s);
    prev = s;
  }
  return total + distanceM(prev, start);
}

/** Greedy nearest-neighbour ordering of stops (good enough for <= ~20 stops). */
export function orderStops<T extends LatLng>(start: LatLng, stops: readonly T[]): T[] {
  const left = [...stops];
  const out: T[] = [];
  let cur = start;
  while (left.length) {
    let bi = 0;
    let bd = Infinity;
    for (let i = 0; i < left.length; i++) {
      const d = distanceM(cur, left[i]);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    const [n] = left.splice(bi, 1);
    out.push(n);
    cur = n;
  }
  return out;
}
