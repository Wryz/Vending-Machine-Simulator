import { SAVE } from '@/config/economy';

import type { GameState, LogKind } from './state';

/** Add an amount to today's P&L line. Negative amounts count as costs. */
export function addLedger(state: GameState, line: string, cents: number): void {
  if (!cents) return;
  const lines = state.ledger.day.lines;
  lines[line] = (lines[line] ?? 0) + cents;
  if (cents < 0) state.ledger.lifetimeCostsCents += -cents;
}

/** Roll the P&L day when the city's local date changes. */
export function rollLedgerDay(state: GameState, dateKey: string): void {
  // Only forward (the ledger is the company's; a branch in another time zone can be a day behind).
  if (state.ledger.day.dateKey && dateKey <= state.ledger.day.dateKey) return;
  if (state.ledger.day.dateKey) state.ledger.yesterday = state.ledger.day;
  state.ledger.day = { dateKey, lines: {} };
}

export function log(
  state: GameState,
  kind: LogKind,
  text: string,
  machineId?: string,
  amountCents?: number,
): void {
  state.log.push({ at: state.now, kind, text, machineId, amountCents });
  if (state.log.length > SAVE.logLimit) state.log.splice(0, state.log.length - SAVE.logLimit);
}
