import * as Haptics from 'expo-haptics';

import { useProfile } from '@/store/profile';

/** Haptics vocabulary (SPEC §3.6): light tick per coin, medium thunk per product, success on milestones. */
function enabled(): boolean {
  return useProfile.getState().settings.haptics;
}

export const haptic = {
  tick() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  thunk() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  select() {
    if (enabled()) Haptics.selectionAsync().catch(() => undefined);
  },
  success() {
    if (enabled())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning() {
    if (enabled())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
  error() {
    if (enabled())
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  },
};
