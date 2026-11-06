import { Redirect, Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { musicMoodFor } from '@/audio/soundscape';
import { getTimeOfDay } from '@/map/timeOfDay';
import { flush, track } from '@/services/analytics';
import { music, sound } from '@/services/audio';
import { rescheduleNotifications } from '@/services/notifications';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';

/** Live tick cadence. The sim itself runs 1-minute steps (SPEC §5.1). */
const TICK_MS = 5_000;
/** How often the music mood follows the city's real time of day. */
const MOOD_CHECK_MS = 60_000;

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
  const city = useGame((s) => s.city);

  useEffect(() => {
    if (status !== 'ready') return;
    const id = setInterval(() => useGame.getState().tick(), TICK_MS);
    const sub = AppState.addEventListener('change', (next) => {
      const { game, world, tick, save } = useGame.getState();
      if (next === 'active') {
        tick();
        sound.resume();
      } else if (next === 'background' || next === 'inactive') {
        save();
        rescheduleNotifications(game, world).catch(() => undefined);
        flush();
        sound.suspend();
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [status]);

  // Music follows the city's real time of day (day loop / night loop).
  useEffect(() => {
    if (status !== 'ready' || !city) return;
    const mood = () => musicMoodFor(getTimeOfDay(new Date(), city.lat, city.lng).weights);
    music.start(mood());
    music.setMood(mood());
    const id = setInterval(() => music.setMood(mood()), MOOD_CHECK_MS);
    return () => clearInterval(id);
  }, [status, city]);

  useEffect(() => {
    if (offlineReport) router.push('/report');
  }, [offlineReport]);

  // Chapter sound + haptics are played by CelebrationHost; only track here.
  useEffect(() => {
    if (chapter > 1) track('chapter', { chapter });
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
