/**
 * Time-of-day presets (SPEC §3.4, §3.5). Data only; tune freely.
 *
 * The map and the 3D scenes both read from these, so a city at dusk looks
 * the same on the map as in the machine close-up.
 */

export type PresetName = 'night' | 'dawn' | 'day' | 'dusk';

export interface Palette {
  /** Land / background. Warm gray by day. */
  land: string;
  water: string;
  park: string;
  /** Minor streets (slightly cooler than land). */
  road: string;
  roadMajor: string;
  roadCasing: string;
  /** fill-extrusion color for buildings (soft concrete, "architect's model"). */
  building: string;
  label: string;
  labelHalo: string;
  /** 3D: sky / clear color behind the close-up. */
  sky: string;
  /** 3D + map light color (sun, or moon/sky glow at night). */
  sunColor: string;
  /** 3D: directional light intensity. */
  sunIntensity: number;
  /** 3D: hemisphere/ambient intensity. */
  ambientIntensity: number;
  /** Map fill-extrusion light intensity (0..1). */
  mapLightIntensity: number;
  /** 0..1, how strongly machine fronts glow (screens, product lighting). */
  machineEmissive: number;
}

export const PRESETS: Record<PresetName, Palette> = {
  day: {
    land: '#E4E1DA',
    water: '#A9B6BD',
    park: '#C9D1BC',
    road: '#D3D3D0',
    roadMajor: '#CACBCB',
    roadCasing: '#BDBDB9',
    building: '#EEEBE4',
    label: '#5C6066',
    labelHalo: '#F3F1EC',
    sky: '#DCE3E6',
    sunColor: '#FFF6E8',
    sunIntensity: 2.4,
    ambientIntensity: 0.9,
    mapLightIntensity: 0.35,
    machineEmissive: 0.05,
  },
  dawn: {
    land: '#D9D1CB',
    water: '#9AA6B4',
    park: '#BBC2B0',
    road: '#C9C2C0',
    roadMajor: '#C2BBB9',
    roadCasing: '#B3ABA8',
    building: '#EADCD2',
    label: '#5C5A62',
    labelHalo: '#EDE4DE',
    sky: '#E8D3C8',
    sunColor: '#FFC9A0',
    sunIntensity: 1.5,
    ambientIntensity: 0.8,
    mapLightIntensity: 0.45,
    machineEmissive: 0.45,
  },
  dusk: {
    land: '#BDB5B6',
    water: '#7F8A9E',
    park: '#A3A898',
    road: '#ADA7AB',
    roadMajor: '#A6A0A5',
    roadCasing: '#958F95',
    building: '#D8C7C0',
    label: '#4A4852',
    labelHalo: '#DCD3D2',
    sky: '#C9A9A6',
    sunColor: '#FF9F6B',
    sunIntensity: 1.4,
    ambientIntensity: 0.8,
    mapLightIntensity: 0.5,
    machineEmissive: 0.75,
  },
  night: {
    land: '#23272D',
    water: '#1A2029',
    park: '#252C2A',
    road: '#30343A',
    roadMajor: '#3A3D41',
    roadCasing: '#1D2025',
    building: '#3B4048',
    label: '#A7ACB3',
    labelHalo: '#1B1F23',
    sky: '#141A22',
    sunColor: '#9FB2D6',
    sunIntensity: 0.6,
    ambientIntensity: 0.45,
    mapLightIntensity: 0.25,
    machineEmissive: 1.0,
  },
};

/**
 * Sun-altitude keypoints (degrees) for blending presets.
 * - altitude <= nightBelow: pure night
 * - nightBelow..twilightPeak: night -> twilight (dawn if rising, dusk if setting)
 * - twilightPeak..dayAbove: twilight -> day
 * - altitude >= dayAbove: pure day
 */
export const SUN_ALTITUDE_KEYPOINTS = {
  nightBelow: -10,
  twilightPeak: 0,
  dayAbove: 12,
} as const;

/** How often the map style and 3D lighting refresh (SPEC §3.4: every minute). */
export const TIME_OF_DAY_REFRESH_MS = 60_000;
