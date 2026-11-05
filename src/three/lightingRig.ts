import type { Palette } from '@/config/timeOfDay';
import type { SunState } from '@/map/sun';

/**
 * 3D lighting from the real sun (SPEC §3.4). Pure: returns numbers, the R3F
 * scene applies them. Axes: +x east, +y up, -z north.
 */
export interface SceneLighting {
  /** Unit vector pointing from the scene toward the light. */
  sunDirection: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambientIntensity: number;
  skyColor: string;
  groundColor: string;
  /** 0..1 machine front glow. */
  machineGlow: number;
  /** Small warm fill in front of the machine when its lights are on. */
  glowLightIntensity: number;
}

const DEG = Math.PI / 180;
/** Moon-ish key light when the sun is down: high and from the south-east. */
const NIGHT_KEY = { bearingDeg: 150, altitudeDeg: 55 };

export function sunVector(bearingDeg: number, altitudeDeg: number): [number, number, number] {
  const b = bearingDeg * DEG;
  const a = altitudeDeg * DEG;
  return [Math.sin(b) * Math.cos(a), Math.sin(a), -Math.cos(b) * Math.cos(a)];
}

export function sceneLighting(sun: SunState, palette: Palette): SceneLighting {
  const up = sun.altitudeDeg > 2;
  // Keep the shadow-casting light at least ~8° up so shadows stay readable.
  const dir = up
    ? sunVector(sun.bearingDeg, Math.max(8, sun.altitudeDeg))
    : sunVector(NIGHT_KEY.bearingDeg, NIGHT_KEY.altitudeDeg);
  return {
    sunDirection: dir,
    sunColor: palette.sunColor,
    sunIntensity: palette.sunIntensity,
    ambientIntensity: palette.ambientIntensity,
    skyColor: palette.sky,
    groundColor: palette.road,
    machineGlow: palette.machineEmissive,
    glowLightIntensity: palette.machineEmissive * 2.2,
  };
}
