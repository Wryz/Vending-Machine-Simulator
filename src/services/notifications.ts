import * as Notifications from 'expo-notifications';

import { alertText } from '@/i18n/sim';
import { projectAlerts, type GameState, type World } from '@/sim';
import { useProfile } from '@/store/profile';

/**
 * Local notifications only (SPEC §10): "Machine empty", "Cash box full",
 * "Local event starting nearby". At most 3 per day, none 22:00–08:00 (the
 * projection enforces both). Rescheduled whenever the app backgrounds.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return res.granted;
}

export async function rescheduleNotifications(
  game: GameState | null,
  world: World | null,
): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
  const { notifications } = useProfile.getState().settings;
  if (!notifications.enabled || !game || !world) return 0;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;
  const now = Date.now();
  const alerts = projectAlerts(game, world, now, 48 * 3_600_000).filter(
    (a) =>
      a.at > now + 60_000 &&
      ((a.kind === 'machine-empty' && notifications.empty) ||
        (a.kind === 'cash-full' && notifications.cashFull) ||
        (a.kind === 'event' && notifications.events)),
  );
  for (const a of alerts) {
    // The projection speaks English; translate at this edge.
    const { title, body } = alertText(a);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { machineId: a.machineId ?? null } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(a.at) },
    }).catch(() => undefined);
  }
  return alerts.length;
}
