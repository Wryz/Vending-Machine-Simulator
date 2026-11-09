/* eslint-disable import/export -- player actions are re-exported below wrapped in `recorded()`
   (the action log); the explicit exports intentionally shadow the plain ones from `export *`. */
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
export * from './company';
export {
  playerShare,
  rivalMatchup,
  rivalPriceCents,
  type RivalMatchup,
  type RivalNews,
  type RivalNewsKind,
  type RivalSting,
} from './rival';
export {
  visibleEvents,
  activeDeal,
  surpriseBoost,
  type SurpriseKind,
  type SurpriseNews,
} from './events';
export { localTime, businessDaysToMs, businessHoursToMs } from './time';
export { distanceM } from './geo';
export { priceResponse, baseTraffic, hasResearch } from './demand';

// Player actions, logged for a future server replay (src/sim/actionLog.ts). These
// shadow the plain versions from the `export *` lines above.
import { recorded } from './actionLog';
import * as ActionsRaw from './actions';
import * as DeliveriesRaw from './deliveries';
import * as EventsRaw from './events';
import * as RivalRaw from './rival';
import * as GoalsRaw from './goals';
import * as RequestsRaw from './requests';
export const placeMachine = recorded('placeMachine', ActionsRaw.placeMachine);
export const pickUpMachine = recorded('pickUpMachine', ActionsRaw.pickUpMachine);
export const sellMachine = recorded('sellMachine', ActionsRaw.sellMachine);
export const restockMachine = recorded('restockMachine', ActionsRaw.restockMachine);
export const setPrice = recorded('setPrice', ActionsRaw.setPrice);
export const setPar = recorded('setPar', ActionsRaw.setPar);
export const collectCash = recorded('collectCash', ActionsRaw.collectCash);
export const collectAll = recorded('collectAll', ActionsRaw.collectAll);
export const repairMachine = recorded('repairMachine', ActionsRaw.repairMachine);
export const renegotiate = recorded('renegotiate', ActionsRaw.renegotiate);
export const rotateMachine = recorded('rotateMachine', ActionsRaw.rotateMachine);
export const buyResearch = recorded('buyResearch', ActionsRaw.buyResearch);
export const buyVan = recorded('buyVan', ActionsRaw.buyVan);
export const buyWarehouse = recorded('buyWarehouse', ActionsRaw.buyWarehouse);
export const buyLiquorPermit = recorded('buyLiquorPermit', ActionsRaw.buyLiquorPermit);
export const hireDriver = recorded('hireDriver', ActionsRaw.hireDriver);
export const extendDriver = recorded('extendDriver', ActionsRaw.extendDriver);
export const buyDriverVan = recorded('buyDriverVan', ActionsRaw.buyDriverVan);
export const addSlotRow = recorded('addSlotRow', ActionsRaw.addSlotRow);
export const fireDriver = recorded('fireDriver', ActionsRaw.fireDriver);
export const assignRoute = recorded('assignRoute', ActionsRaw.assignRoute);
export const autoAssignRoutes = recorded('autoAssignRoutes', ActionsRaw.autoAssignRoutes);
export const buyPull = recorded('buyPull', ActionsRaw.buyPull);
export const applyAdReward = recorded('applyAdReward', ActionsRaw.applyAdReward);
export const hidePlace = recorded('hidePlace', ActionsRaw.hidePlace);
export const buyPrestigePerk = recorded('buyPrestigePerk', ActionsRaw.buyPrestigePerk);
export const applyStarterPack = recorded('applyStarterPack', ActionsRaw.applyStarterPack);
export const orderRestock = recorded('orderRestock', DeliveriesRaw.orderRestock);
export const orderLowRun = recorded('orderLowRun', DeliveriesRaw.orderLowRun);
export const acceptDeal = recorded('acceptDeal', EventsRaw.acceptDeal);
export const undercutRival = recorded('undercutRival', RivalRaw.undercutRival);
export const claimGoal = recorded('claimGoal', GoalsRaw.claimGoal);
export const claimRewards = recorded('claimRewards', GoalsRaw.claimRewards);
export const dismissRequest = recorded('dismissRequest', RequestsRaw.dismissRequest);
export { recordAction, type LoggedAction } from './actionLog';
