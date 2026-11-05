import { CALIBRATION } from '@/config/economy';
import type { CellData } from '@/data/types';

import { baseTraffic } from './demand';
import { distanceM, type LatLng } from './geo';

/** Scale factor that brings a city's downtown p75 noon traffic to the target. */
export function calibrationScale(cells: readonly CellData[], center: LatLng): number {
  const downtown = cells
    .filter((c) => distanceM(c, center) <= CALIBRATION.districtRadiusKm * 1000)
    .map((c) => baseTraffic(c, 12.5, false).total)
    .sort((a, b) => a - b);
  if (downtown.length < 4) return 1;
  const p75 = downtown[Math.floor((downtown.length - 1) * 0.75)];
  if (p75 <= 0) return CALIBRATION.maxScale;
  return Math.min(
    CALIBRATION.maxScale,
    Math.max(CALIBRATION.minScale, CALIBRATION.targetP75NoonTraffic / p75),
  );
}

/**
 * Calibrated copy of a city's cells: `nearby` and `pop` scaled together
 * (traffic is linear in both), everything else untouched. Pure.
 */
export function calibrateCells(
  cells: readonly CellData[],
  center: LatLng,
): { cells: CellData[]; scale: number } {
  const scale = calibrationScale(cells, center);
  return {
    scale,
    cells: cells.map((c) => {
      const nearby: CellData['nearby'] = {};
      for (const [k, v] of Object.entries(c.nearby))
        nearby[k as keyof CellData['nearby']] = (v ?? 0) * scale;
      return { ...c, pop: c.pop * scale, nearby };
    }),
  };
}
