/** Public API of the pure simulation module (SPEC §5). */
export * from './state';
export * from './create';
export * from './actions';
export * from './advance';
export * from './spot';
export * from './projections';
export * from './prestige';
export * from './migrate';
export * from './rules';
export * from './calibrate';
export * from './goals';
export { playerShare } from './rival';
export { visibleEvents } from './events';
export { localTime, businessDaysToMs, businessHoursToMs } from './time';
export { distanceM } from './geo';
export { priceResponse, baseTraffic, hasResearch } from './demand';
