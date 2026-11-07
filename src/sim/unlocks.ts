import { FEATURE_UNLOCKS, type Feature } from '@/config/progression';

import { activeMachines } from './rules';
import type { GameState } from './state';

export type { Feature };

/** Is a feature open yet (SPEC §4.8: unlock by milestone, few options at first)? */
export function featureUnlocked(state: GameState, feature: Feature): boolean {
  const r = FEATURE_UNLOCKS[feature];
  if (state.chapter >= r.chapter) return true;
  if (r.sales !== undefined && state.ledger.lifetimeUnits >= r.sales) return true;
  if (r.collected && state.ledger.lifetimeNetCents > 0) return true;
  if (r.machines !== undefined && state.machines.length >= r.machines) return true;
  if (r.placed !== undefined && activeMachines(state).length >= r.placed) return true;
  return false;
}

/** Every open feature, in config order. */
export function unlockedFeatures(state: GameState): Feature[] {
  return (Object.keys(FEATURE_UNLOCKS) as Feature[]).filter((f) => featureUnlocked(state, f));
}

/**
 * The first-machine tutorial (SPEC §8 onboarding): place, stock, first sale,
 * collect, then the chapter goal. Derived from the game state, so it never
 * gets out of sync; null once the basics are done.
 */
export type TutorialStep = 'place' | 'stock' | 'delivery' | 'wait' | 'collect' | 'goal';

export function tutorialStep(state: GameState): TutorialStep | null {
  if (state.chapter > 1) return null;
  const active = activeMachines(state);
  if (!active.length) return 'place';
  const stocked = active.some((m) => m.slots.some((s) => s.qty > 0));
  if (state.ledger.lifetimeUnits === 0)
    return stocked ? 'wait' : state.deliveries.length ? 'delivery' : 'stock';
  if (state.ledger.lifetimeNetCents === 0) return 'collect';
  return 'goal';
}
