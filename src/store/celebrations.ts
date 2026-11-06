import { create } from 'zustand';

/**
 * A small queue of "moments" shown as receipts printing down from the top of
 * the screen: chapter complete, trophies, finished orders, local events.
 * Calm and brief (SPEC §3.2): one at a time, auto-dismissed.
 */
export type MomentKind =
  | 'chapter'
  | 'trophy'
  | 'order'
  | 'streak'
  | 'event'
  | 'info'
  /** The rival's owner talks (portrait card). */
  | 'rival'
  /** A surprise: VIP customer, jackpot hour, venue deal. */
  | 'surprise';

export interface Moment {
  id: string;
  kind: MomentKind;
  title: string;
  subtitle?: string;
  lines?: { label: string; value: string }[];
  amountCents?: number;
  /** Small heading over the title (defaults to the kind's label). */
  label?: string;
  /** Icon in the disc (surprises); rival cards show the owner's portrait. */
  icon?: 'vip' | 'jackpot' | 'deal';
  /** One key on the card (e.g. accept a venue deal); pressing it also dismisses. */
  action?: { label: string; run: () => void };
  /** How long it stays up (ms), when not the kind's default. */
  showMs?: number;
}

interface CelebrationStore {
  queue: Moment[];
  push(m: Omit<Moment, 'id'>): void;
  dismiss(id: string): void;
}

let seq = 0;

export const useCelebrations = create<CelebrationStore>((set, get) => ({
  queue: [],
  push(m) {
    // Keep it calm: at most 4 waiting; drop duplicates of the same title.
    const q = get().queue;
    if (q.some((x) => x.title === m.title && x.kind === m.kind)) return;
    set({ queue: [...q, { ...m, id: `m${++seq}` }].slice(-4) });
  },
  dismiss(id) {
    set({ queue: get().queue.filter((x) => x.id !== id) });
  },
}));
