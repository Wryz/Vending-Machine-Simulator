/**
 * The 9 fallback cities (SPEC §6.3). Data only.
 * `timeZone` is an IANA zone used to show the city's real local clock.
 */
export type CityId =
  | 'new-york'
  | 'los-angeles'
  | 'chicago'
  | 'london'
  | 'paris'
  | 'tokyo'
  | 'seoul'
  | 'singapore'
  | 'sydney';

export interface City {
  id: CityId;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  timeZone: string;
  notes: string;
}

export const FALLBACK_CITIES: readonly City[] = [
  {
    id: 'new-york',
    name: 'New York',
    countryCode: 'US',
    lat: 40.7128,
    lng: -74.006,
    timeZone: 'America/New_York',
    notes: 'Dense, 24-hour; subway stations',
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    countryCode: 'US',
    lat: 34.0522,
    lng: -118.2437,
    timeZone: 'America/Los_Angeles',
    notes: 'Car-heavy; beaches; studios',
  },
  {
    id: 'chicago',
    name: 'Chicago',
    countryCode: 'US',
    lat: 41.8781,
    lng: -87.6298,
    timeZone: 'America/Chicago',
    notes: 'Strong seasons; "L" stations',
  },
  {
    id: 'london',
    name: 'London',
    countryCode: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    timeZone: 'Europe/London',
    notes: 'Tube; rain-driven umbrellas',
  },
  {
    id: 'paris',
    name: 'Paris',
    countryCode: 'FR',
    lat: 48.8566,
    lng: 2.3522,
    timeZone: 'Europe/Paris',
    notes: 'Cafés; metro',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    countryCode: 'JP',
    lat: 35.6762,
    lng: 139.6503,
    timeZone: 'Asia/Tokyo',
    notes: 'Vending capital; beer machines allowed',
  },
  {
    id: 'seoul',
    name: 'Seoul',
    countryCode: 'KR',
    lat: 37.5665,
    lng: 126.978,
    timeZone: 'Asia/Seoul',
    notes: 'Night life; soju',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    countryCode: 'SG',
    lat: 1.3521,
    lng: 103.8198,
    timeZone: 'Asia/Singapore',
    notes: 'Hot all year; strict rules (alcohol limits)',
  },
  {
    id: 'sydney',
    name: 'Sydney',
    countryCode: 'AU',
    lat: -33.8688,
    lng: 151.2093,
    timeZone: 'Australia/Sydney',
    notes: 'Beaches; seasons reversed',
  },
] as const;

export function getCity(id: CityId): City {
  const city = FALLBACK_CITIES.find((c) => c.id === id);
  if (!city) throw new Error(`Unknown city: ${id}`);
  return city;
}
