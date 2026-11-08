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
  | 'surprise'
  /** The lab finished an upgrade. */
  | 'research';

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
  icon?: 'vip' | 'jackpot' | 'deal' | 'request' | 'delivery';
  /** One key on the card (e.g. accept a venue deal); pressing it also dismisses. */
  action?: { label: string; run: () => void };
  /** How long it stays up (ms), when not the kind's default. */
  showMs?: number;
}

interface CelebrationStore {
  queue: Moment[];
  /**
   * Big moments (chapter complete, trophies, finished research) wait here and
   * show together in one modal with a single Claim / OK key (MomentsModal).
   */
  modal: Moment[];
  push(m: Omit<Moment, 'id'>): void;
  dismiss(id: string): void;
  clearModal(): void;
}

/** Kinds that go to the shared modal instead of the top-of-screen card. */
const MODAL_KINDS: readonly MomentKind[] = ['chapter', 'trophy', 'research'];

let seq = 0;

export const useCelebrations = create<CelebrationStore>((set, get) => ({
  queue: [],
  modal: [],
  push(m) {
    if (MODAL_KINDS.includes(m.kind)) {
      const list = get().modal;
      if (list.some((x) => x.title === m.title && x.kind === m.kind)) return;
      set({ modal: [...list, { ...m, id: `m${++seq}` }] });
      return;
    }
    // Keep it calm: at most 4 waiting; drop duplicates of the same title.
    const q = get().queue;
    if (q.some((x) => x.title === m.title && x.kind === m.kind)) return;
    set({ queue: [...q, { ...m, id: `m${++seq}` }].slice(-4) });
  },
  dismiss(id) {
    set({ queue: get().queue.filter((x) => x.id !== id) });
  },
  clearModal() {
    set({ modal: [] });
  },
}));
