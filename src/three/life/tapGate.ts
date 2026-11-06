import { CLOSEUP_MOTION } from '@/config/streetLife';

/**
 * Separates real 3D slot taps from orbit drags (pure).
 *
 * R3F's native canvas fires `click` from its PanResponder's `onPanResponderEnd`
 * whenever the finger moved < 20 pt. When the orbit pan (react-native-gesture-handler)
 * activates at 12 pt it cancels the JS touch, and React Native dispatches
 * `responderEnd` for a cancel too, so without this gate every orbit drag that
 * starts on a slot would also select it.
 *
 * While the pan is tracking a touch, clicks are held. When the pan finishes they
 * fire only if it never activated. Clicks outside a pan touch fire at once,
 * except right after an orbit (event order between the two systems is not
 * guaranteed).
 */
export interface TapGate {
  touching: boolean;
  activated: boolean;
  pending: (() => void) | null;
  /** When the last activated pan finished (ms), or -Infinity. */
  orbitEndedAt: number;
}

export function createTapGate(): TapGate {
  return { touching: false, activated: false, pending: null, orbitEndedAt: -Infinity };
}

/** The pan saw a finger land (RNGH `onBegin`). */
export function gateBegin(g: TapGate): void {
  g.touching = true;
  g.activated = false;
  g.pending = null;
}

/** The pan became an orbit drag (RNGH `onStart`). */
export function gateActivate(g: TapGate): void {
  g.activated = true;
  g.pending = null;
}

/** A 3D click arrived: fire it now, hold it, or drop it. */
export function gateClick(g: TapGate, fire: () => void, nowMs: number, cfg = CLOSEUP_MOTION): void {
  if (g.touching) {
    if (!g.activated) g.pending = fire;
    return;
  }
  if (nowMs - g.orbitEndedAt < cfg.orbitTapGuardMs) return;
  fire();
}

/** The pan finished, whether it activated or failed (RNGH `onFinalize`). */
export function gateFinalize(g: TapGate, nowMs: number): void {
  const fire = g.activated ? null : g.pending;
  if (g.activated) g.orbitEndedAt = nowMs;
  g.touching = false;
  g.activated = false;
  g.pending = null;
  fire?.();
}
