/**
 * Map street life (cars and pedestrians at close zoom). Everything exported
 * here is pure TypeScript (no React Native) and unit-tested; the RN layer
 * that drives it is src/map/life/StreetLifeLayer.tsx.
 */
export * from './types';
export { RoadNetwork, roadsFromFeatures, roadKindOf } from './network';
export { StreetLife } from './sim';
export { carActivity, peopleActivity, trafficLevel, lifeTargets, hourCurve } from './density';
export * from './sprites';
export { lifeGeoJSON, type LifeRenderOptions } from './render';
export {
  lifeIconSizeStops,
  lifeBeamRadiusStops,
  lifeViewRadiusM,
  lifeSymbolLayer,
  lifeBeamLayer,
} from './layout';
