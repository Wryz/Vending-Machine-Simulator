import { STREET_DENSITY } from '@/config/streetLife';

/**
 * Crowd density (0..1) for the close-up from the sim's real foot traffic at
 * the machine's cell and the city's local hour (pure). Square-root response:
 * a median downtown spot at noon is lively, a quiet one at 3 AM nearly empty.
 */
export function streetCrowd(trafficTotal: number, weatherFactor = 1, cfg = STREET_DENSITY): number {
  const t = Math.max(0, trafficTotal) * Math.max(0, weatherFactor);
  return Math.min(1, Math.sqrt(t / cfg.crowdFullTraffic));
}
