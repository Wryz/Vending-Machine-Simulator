import { Redirect, Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flush, track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import { rescheduleNotifications } from '@/services/notifications';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';

/** Live tick cadence. The sim itself runs 1-minute steps (SPEC §5.1). */
const TICK_MS = 5_000;

/**
 * Game shell: ticks the simulation in real time, autosaves (every 30 s and on
 * background), reschedules local notifications when backgrounded, and shows
 * the "While you were away" receipt on return.
 */
export default function GameLayout() {
  const theme = useTheme();
  const status = useGame((s) => s.status);
  const offlineReport = useGame((s) => s.offlineReport);
  const chapter = useGame((s) => s.game?.chapter ?? 1);

  useEffect(() => {
    if (status !== 'ready') return;
    const id = setInterval(() => useGame.getState().tick(), TICK_MS);
    const sub = AppState.addEventListener('change', (next) => {
      const { game, world, tick, save } = useGame.getState();
      if (next === 'active') {
        tick();
      } else if (next === 'background' || next === 'inactive') {
        save();
        rescheduleNotifications(game, world).catch(() => undefined);
        flush();
        sound.ambience(null);
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [status]);

  useEffect(() => {
    if (offlineReport) router.push('/report');
  }, [offlineReport]);

  useEffect(() => {
    if (chapter > 1) {
      haptic.success();
      sound.play('success');
      track('chapter', { chapter });
    }
  }, [chapter]);

  if (status !== 'ready') return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="map" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="machine/[id]"
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="spot"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.55, 0.95],
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
        }}
      />
      <Stack.Screen
        name="place"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95],
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
        }}
      />
      <Stack.Screen
        name="report"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.7, 0.95],
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
        }}
      />
      <Stack.Screen name="keys" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="routes" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="company" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="collections" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="cities" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="shop" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
