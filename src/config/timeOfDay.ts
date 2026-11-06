/**
 * Time-of-day presets (SPEC §3.4, §3.5). Data only; tune freely.
 *
 * The map and the 3D scenes both read from these, so a city at dusk looks
 * the same on the map as in the machine close-up.
 */

export type PresetName = 'night' | 'dawn' | 'day' | 'dusk';

export interface Palette {
  /** Land / background. Warm cream by day. */
  land: string;
  water: string;
  park: string;
  /** Minor streets (slightly cooler than land). */
  road: string;
  roadMajor: string;
  roadCasing: string;
  /** fill-extrusion color for buildings (soft pastel blocks). */
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
  // Bright, flat and sunny: cream land, candy-blue water, fresh parks, white streets.
  day: {
    land: '#F6EEDD',
    water: '#7CCBF2',
    park: '#A6DD86',
    road: '#FFFFFF',
    roadMajor: '#FFE59A',
    roadCasing: '#E8DCC4',
    building: '#FFF9F0',
    label: '#3E4270',
    labelHalo: '#FFFFFF',
    sky: '#9EDBFA',
    sunColor: '#FFF4DE',
    sunIntensity: 2.6,
    ambientIntensity: 1.15,
    mapLightIntensity: 0.3,
    machineEmissive: 0.1,
  },
  dawn: {
    land: '#FBE5D6',
    water: '#86BDF0',
    park: '#AEDA94',
    road: '#FFF6F0',
    roadMajor: '#FFD3AE',
    roadCasing: '#EBCFC0',
    building: '#FFEDE2',
    label: '#4A4675',
    labelHalo: '#FFF6F0',
    sky: '#FFCDB8',
    sunColor: '#FFC9A0',
    sunIntensity: 1.9,
    ambientIntensity: 1.05,
    mapLightIntensity: 0.4,
    machineEmissive: 0.5,
  },
  dusk: {
    land: '#F3D3CF',
    water: '#7AA4E6',
    park: '#97C98E',
    road: '#FBEAEC',
    roadMajor: '#FFC08F',
    roadCasing: '#DDBDBD',
    building: '#F9DCD6',
    label: '#43406E',
    labelHalo: '#FBEAEC',
    sky: '#F6A98D',
    sunColor: '#FF9F6B',
    sunIntensity: 1.7,
    ambientIntensity: 1.0,
    mapLightIntensity: 0.45,
    machineEmissive: 0.8,
  },
  // Cozy, not dark: indigo land, lavender blocks, glowing machines, readable labels.
  night: {
    land: '#353C78',
    water: '#26306A',
    park: '#365C62',
    road: '#4B5296',
    roadMajor: '#6A6BA8',
    roadCasing: '#2B3166',
    building: '#5A62A8',
    label: '#EEF0FF',
    labelHalo: '#2B3166',
    sky: '#252C66',
    sunColor: '#B9C6FF',
    sunIntensity: 0.9,
    ambientIntensity: 0.85,
    mapLightIntensity: 0.3,
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
