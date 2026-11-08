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
export * from './unlocks';
export * from './rankings';
export * from './requests';
export * from './deliveries';
export * from './roads';
export * from './hoods';
export {
  playerShare,
  rivalMatchup,
  rivalPriceCents,
  undercutRival,
  type RivalMatchup,
  type RivalNews,
  type RivalNewsKind,
  type RivalSting,
} from './rival';
export {
  visibleEvents,
  acceptDeal,
  activeDeal,
  surpriseBoost,
  type SurpriseKind,
  type SurpriseNews,
} from './events';
export { localTime, businessDaysToMs, businessHoursToMs } from './time';
export { distanceM } from './geo';
export { priceResponse, baseTraffic, hasResearch } from './demand';
