import { useEffect, useState } from 'react';

import { TIME_OF_DAY_REFRESH_MS } from '@/config/timeOfDay';
import { getTimeOfDay, type TimeOfDay } from '@/map/timeOfDay';

/** The city's real time of day, refreshed every minute (SPEC §3.4). */
export function useCityClock(lat: number, lng: number): { now: number; tod: TimeOfDay } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TIME_OF_DAY_REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const tod = getTimeOfDay(new Date(now), lat, lng);
  return { now, tod };
}
