import { PRESTIGE } from '@/config/economy';
import { getMachineType } from '@/config/machines';

import { newGame } from './create';
import type { GameState } from './state';

/** Company valuation for "Sell the company" (SPEC §4.8). */
export function companyValuationCents(state: GameState): number {
  const fleet = state.machines.reduce((a, m) => a + getMachineType(m.typeId).purchaseCents, 0);
  const net = Math.max(0, state.ledger.lifetimeSalesCents - state.ledger.lifetimeCostsCents);
  return Math.round(
    net * PRESTIGE.netMultiple + fleet * PRESTIGE.machineValueShare + Math.max(0, state.cashCents),
  );
}

export function reputationFor(state: GameState): number {
  return Math.floor(Math.sqrt(companyValuationCents(state) / 100 / PRESTIGE.reputationDivisor));
}

export function canSellCompany(state: GameState): boolean {
  return state.chapter >= 8 || !!state.chapterDoneAt[7];
}

/**
 * Sell the company: bank Reputation and restart in `cityId` with a head start.
 * Perks already bought carry over.
 */
export function sellCompany(
  state: GameState,
  cityId: string,
  now: number,
  seed: number,
): { state: GameState; reputationGained: number } | { error: string } {
  if (!canSellCompany(state)) return { error: 'Finish chapter 5 before selling the company.' };
  const gained = reputationFor(state);
  const next = newGame({
    cityId,
    now,
    seed,
    prestige: {
      reputation: state.prestige.reputation + gained,
      perks: { ...state.prestige.perks },
      sales: state.prestige.sales + 1,
    },
  });
  return { state: next, reputationGained: gained };
}
