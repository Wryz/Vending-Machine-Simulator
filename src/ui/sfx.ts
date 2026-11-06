import { sound } from '@/services/audio';

/**
 * Play a named sound effect. The effect names are owned by src/services/audio.ts;
 * this indirection keeps UI code calling names that may be added there
 * independently. Unknown names are ignored by the engine.
 */
export function sfx(name: string): void {
  try {
    // `sound.play` is typed to the engine's known names; an unknown one is a no-op at runtime.
    (sound.play as (n: string) => void)(name);
  } catch {
    // Sound is optional.
  }
}
