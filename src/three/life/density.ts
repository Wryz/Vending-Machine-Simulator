import { LEFT_HAND_TRAFFIC, STREET_DENSITY } from '@/config/streetLife';

/**
 * Street density for the close-up from the sim's real foot traffic at the
 * machine's cell and the city's local hour (pure). Square-root response: a
 * median downtown spot at noon is lively, a quiet one at 3 AM nearly empty.
 */
export function streetDensity(
  trafficTotal: number,
  weatherFactor = 1,
  cfg = STREET_DENSITY,
): { crowd: number; traffic: number } {
  const t = Math.max(0, trafficTotal) * Math.max(0, weatherFactor);
  const crowd = Math.min(1, Math.sqrt(t / cfg.crowdFullTraffic));
  const traffic = Math.min(
    1,
    cfg.carsFloor +
      (1 - cfg.carsFloor) * Math.sqrt(Math.max(0, trafficTotal) / cfg.carsFullTraffic),
  );
  return { crowd, traffic };
}

export function isLeftHandTraffic(countryCode: string): boolean {
  return (LEFT_HAND_TRAFFIC as readonly string[]).includes(countryCode.toUpperCase());
}
