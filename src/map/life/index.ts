/**
 * Map street life (pedestrians and customers at close zoom). Everything
 * exported here is pure TypeScript (no React Native) and unit-tested; the RN
 * layer that drives it is src/map/life/StreetLifeLayer.tsx.
 */
export * from './types';
export {
  RoadNetwork,
  LIFE_QUERY_LAYERS,
  lifeInputsFromFeatures,
  roadsFromFeatures,
  asphaltFromFeatures,
  waterFromFeatures,
  roadKindOf,
  asphaltKindOf,
} from './network';
export { Surface, WaterIndex } from './surface';
export { StreetLife } from './sim';
export { cityActivity, peopleActivity, busyLevel, peopleTarget, hourCurve } from './density';
export * from './sprites';
export { lifeGeoJSON, type LifeRenderOptions } from './render';
export { lifeIconSizeStops, lifeViewRadiusM, lifeSymbolLayer } from './layout';
