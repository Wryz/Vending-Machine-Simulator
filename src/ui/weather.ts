import type { WeatherCondition } from '@/data/types';
import type { TimeOfDay } from '@/map/timeOfDay';

import type { IconName } from './icons';
import { SKIN } from './skin';

export const WEATHER_ICON: Record<WeatherCondition, IconName> = {
  clear: 'sun',
  cloudy: 'cloud',
  rain: 'rain',
  snow: 'snow',
  storm: 'storm',
  fog: 'fog',
};

/** °F where people read °F, °C elsewhere. */
export function temperature(tempC: number, countryCode: string): string {
  return ['US', 'LR', 'MM'].includes(countryCode)
    ? `${Math.round((tempC * 9) / 5 + 32)}°F`
    : `${Math.round(tempC)}°C`;
}

/** Day / night at a glance, from the city's real sun. */
export function dayIcon(tod: TimeOfDay): { name: IconName; color: string } {
  if (tod.dominant === 'day') return { name: 'sun', color: SKIN.ledAmber };
  if (tod.dominant === 'night') return { name: 'moon', color: '#C3C8FF' };
  return { name: 'twilight', color: '#FF9561' };
}

/** The glow of an LED digit. */
export const LED_GLOW = (color: string) => ({
  textShadowColor: color,
  textShadowRadius: 8,
  textShadowOffset: { width: 0, height: 0 },
});
