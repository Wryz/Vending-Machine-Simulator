import { getMachineType } from '@/config/machines';
import { content } from '@/i18n/content';
import { cashBoxCapacity, hasResearch, slotCapacity, type GameState, type Machine } from '@/sim';

import type { MachineStatus } from './objects/KeyTag';

/** Telemetry (research) lets you see live status; otherwise you see what you saw on your last visit (SPEC §4.2). */
export function hasTelemetry(game: GameState, m: Machine): boolean {
  return hasResearch(game, 'telemetry', getMachineType(m.typeId).family);
}

export function machineStatus(game: GameState, m: Machine): MachineStatus {
  if (m.status === 'stored') return 'stored';
  const live = hasTelemetry(game, m);
  const type = getMachineType(m.typeId);
  if (m.broken && (live || m.seen.at >= m.broken.since)) return 'broken';
  const qty = live ? m.slots.map((s) => s.qty) : m.seen.qty;
  const cash = live ? m.cashBoxCents : m.seen.cashBoxCents;
  const cap = slotCapacity(game, type) * m.slots.length;
  const units = qty.reduce((a, b) => a + b, 0);
  if (cash >= cashBoxCapacity(game, type) * 0.95) return 'cash-full';
  if (units === 0) return 'empty';
  if (units < cap * 0.25) return 'low';
  if (!live && game.now - m.seen.at > 30 * 60_000) return 'unknown';
  return 'ok';
}

export function machineLabel(m: Machine): string {
  return content.machineType(m.typeId, getMachineType(m.typeId).name);
}
