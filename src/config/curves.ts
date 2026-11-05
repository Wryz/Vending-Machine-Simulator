import type { PlaceCategory } from '../data/types';

/**
 * Hourly demand curves by place category (SPEC §4.6), real local hour 0..23.
 * Values 0..1. Weekends and public holidays use the `weekend` curve.
 * Data only.
 */
export type Curve = readonly number[];
export interface DayCurves {
  weekday: Curve;
  weekend: Curve;
}

// Helper: build a 24-length curve from [hour, value] keypoints (linear, wrapping).
function curve(points: readonly [number, number][]): Curve {
  const out: number[] = [];
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  for (let h = 0; h < 24; h++) {
    let prev = pts[pts.length - 1];
    let next = pts[0];
    for (const p of pts) {
      if (p[0] <= h) prev = p;
    }
    for (const p of pts) {
      if (p[0] > h) {
        next = p;
        break;
      }
    }
    if (next === pts[0] && next[0] <= h) next = pts[0];
    const span = (next[0] - prev[0] + 24) % 24 || 24;
    const t = ((h - prev[0] + 24) % 24) / span;
    out.push(prev[1] + (next[1] - prev[1]) * t);
  }
  return out;
}

const FLAT = (v: number) => curve([[0, v]]);

export type CurveKey = PlaceCategory | 'residential';

export const HOURLY_CURVES: Record<CurveKey, DayCurves> = {
  // Offices peak 7–10 and 12–14 on weekdays.
  office: {
    weekday: curve([
      [0, 0.02],
      [6, 0.1],
      [8, 1],
      [10, 0.6],
      [12, 0.95],
      [14, 0.6],
      [17, 0.55],
      [19, 0.2],
      [22, 0.05],
    ]),
    weekend: curve([
      [0, 0.02],
      [9, 0.1],
      [13, 0.15],
      [18, 0.08],
      [22, 0.02],
    ]),
  },
  // Schools: arrivals, lunch, and the 15–16 dismissal peak on weekdays.
  school: {
    weekday: curve([
      [0, 0],
      [6, 0.05],
      [8, 0.5],
      [10, 0.25],
      [12, 0.6],
      [13, 0.3],
      [15, 1],
      [16, 0.9],
      [18, 0.15],
      [20, 0],
    ]),
    weekend: curve([
      [0, 0],
      [10, 0.08],
      [14, 0.08],
      [18, 0],
    ]),
  },
  university: {
    weekday: curve([
      [0, 0.1],
      [7, 0.2],
      [10, 0.8],
      [13, 1],
      [16, 0.85],
      [20, 0.6],
      [23, 0.3],
    ]),
    weekend: curve([
      [0, 0.1],
      [10, 0.3],
      [14, 0.4],
      [20, 0.35],
      [23, 0.2],
    ]),
  },
  gym: {
    weekday: curve([
      [0, 0.02],
      [5, 0.2],
      [7, 0.9],
      [9, 0.4],
      [12, 0.5],
      [14, 0.3],
      [18, 1],
      [20, 0.7],
      [22, 0.2],
    ]),
    weekend: curve([
      [0, 0.02],
      [8, 0.5],
      [11, 0.9],
      [15, 0.6],
      [19, 0.5],
      [22, 0.1],
    ]),
  },
  // Hospitals: flat-ish all day and night.
  hospital: {
    weekday: curve([
      [0, 0.6],
      [8, 0.9],
      [14, 1],
      [20, 0.8],
    ]),
    weekend: curve([
      [0, 0.6],
      [10, 0.85],
      [16, 0.9],
      [22, 0.7],
    ]),
  },
  clinic: {
    weekday: curve([
      [0, 0],
      [7, 0.2],
      [9, 1],
      [12, 0.8],
      [17, 0.7],
      [19, 0.1],
      [21, 0],
    ]),
    weekend: curve([
      [0, 0],
      [9, 0.3],
      [13, 0.2],
      [16, 0],
    ]),
  },
  // Stations: morning and evening rush.
  station: {
    weekday: curve([
      [0, 0.1],
      [5, 0.2],
      [8, 1],
      [10, 0.45],
      [13, 0.5],
      [17, 0.6],
      [18, 1],
      [20, 0.5],
      [23, 0.25],
    ]),
    weekend: curve([
      [0, 0.15],
      [8, 0.3],
      [12, 0.6],
      [16, 0.65],
      [20, 0.5],
      [23, 0.3],
    ]),
  },
  stadium: {
    weekday: curve([
      [0, 0.02],
      [12, 0.1],
      [18, 0.15],
      [23, 0.05],
    ]),
    weekend: curve([
      [0, 0.02],
      [12, 0.25],
      [18, 0.3],
      [23, 0.05],
    ]),
  },
  park: {
    weekday: curve([
      [0, 0.02],
      [7, 0.3],
      [10, 0.4],
      [13, 0.7],
      [17, 0.8],
      [20, 0.3],
      [22, 0.05],
    ]),
    weekend: curve([
      [0, 0.02],
      [8, 0.4],
      [12, 1],
      [16, 1],
      [19, 0.5],
      [22, 0.05],
    ]),
  },
  beach: {
    weekday: curve([
      [0, 0],
      [8, 0.2],
      [12, 0.6],
      [16, 0.6],
      [19, 0.2],
      [21, 0],
    ]),
    weekend: curve([
      [0, 0],
      [8, 0.4],
      [12, 1],
      [16, 1],
      [19, 0.4],
      [21, 0],
    ]),
  },
  // Nightlife: 21–02.
  nightlife: {
    weekday: curve([
      [0, 0.7],
      [2, 0.4],
      [4, 0.05],
      [12, 0.05],
      [18, 0.2],
      [21, 0.7],
      [23, 0.85],
    ]),
    weekend: curve([
      [0, 1],
      [2, 0.8],
      [4, 0.2],
      [12, 0.05],
      [18, 0.3],
      [21, 0.9],
      [23, 1],
    ]),
  },
  cafe: {
    weekday: curve([
      [0, 0.02],
      [6, 0.3],
      [8, 1],
      [11, 0.6],
      [14, 0.7],
      [17, 0.4],
      [20, 0.1],
    ]),
    weekend: curve([
      [0, 0.02],
      [8, 0.4],
      [11, 1],
      [15, 0.7],
      [19, 0.2],
    ]),
  },
  restaurant: {
    weekday: curve([
      [0, 0.05],
      [10, 0.1],
      [12, 0.9],
      [14, 0.4],
      [16, 0.2],
      [19, 1],
      [22, 0.3],
    ]),
    weekend: curve([
      [0, 0.1],
      [11, 0.4],
      [13, 0.9],
      [16, 0.4],
      [19, 1],
      [23, 0.4],
    ]),
  },
  shopping: {
    weekday: curve([
      [0, 0],
      [9, 0.2],
      [12, 0.6],
      [17, 0.8],
      [20, 0.4],
      [22, 0],
    ]),
    weekend: curve([
      [0, 0],
      [9, 0.3],
      [13, 1],
      [17, 1],
      [20, 0.5],
      [22, 0],
    ]),
  },
  hotel: {
    weekday: curve([
      [0, 0.3],
      [7, 0.8],
      [10, 0.4],
      [15, 0.4],
      [19, 0.8],
      [23, 0.6],
    ]),
    weekend: curve([
      [0, 0.4],
      [8, 0.7],
      [12, 0.6],
      [18, 0.8],
      [23, 0.7],
    ]),
  },
  airport: {
    weekday: curve([
      [0, 0.25],
      [5, 0.6],
      [8, 1],
      [14, 0.8],
      [19, 0.9],
      [23, 0.4],
    ]),
    weekend: curve([
      [0, 0.25],
      [6, 0.7],
      [11, 1],
      [17, 0.9],
      [23, 0.4],
    ]),
  },
  convention: {
    weekday: curve([
      [0, 0],
      [8, 0.4],
      [10, 1],
      [13, 0.9],
      [17, 0.6],
      [19, 0.1],
      [21, 0],
    ]),
    weekend: curve([
      [0, 0],
      [9, 0.3],
      [12, 0.5],
      [17, 0.3],
      [20, 0],
    ]),
  },
  religious: {
    weekday: curve([
      [0, 0],
      [8, 0.1],
      [18, 0.15],
      [21, 0],
    ]),
    weekend: curve([
      [0, 0],
      [8, 0.5],
      [11, 1],
      [14, 0.3],
      [20, 0],
    ]),
  },
  competitor: { weekday: FLAT(0), weekend: FLAT(0) },
  residential: {
    weekday: curve([
      [0, 0.08],
      [6, 0.3],
      [8, 0.9],
      [10, 0.35],
      [13, 0.4],
      [17, 0.7],
      [19, 1],
      [22, 0.5],
    ]),
    weekend: curve([
      [0, 0.15],
      [8, 0.3],
      [11, 0.8],
      [15, 0.8],
      [19, 0.9],
      [23, 0.4],
    ]),
  },
};

/** Product-tag fit by hour (applies on top of place mix): caffeine mornings, meals at mealtimes, adult evenings. */
export const TAG_HOUR_BOOST: Partial<Record<string, Curve>> = {
  caffeine: curve([
    [0, 0.5],
    [6, 1.3],
    [9, 1.5],
    [12, 1],
    [15, 1.2],
    [18, 0.8],
    [22, 0.5],
  ]),
  meal: curve([
    [0, 0.6],
    [7, 0.9],
    [12, 1.5],
    [14, 0.9],
    [18, 1.4],
    [21, 1],
    [23, 0.8],
  ]),
  adult: curve([
    [0, 1.3],
    [3, 0.6],
    [10, 0.2],
    [16, 0.7],
    [19, 1.3],
    [22, 1.5],
  ]),
  hot: curve([
    [0, 1.1],
    [6, 1.2],
    [10, 1],
    [14, 0.85],
    [18, 1.05],
    [22, 1.1],
  ]),
  sweet: curve([
    [0, 0.8],
    [10, 1],
    [15, 1.25],
    [18, 1],
    [22, 1],
  ]),
};
