import { Redirect, Stack, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { musicMoodFor } from '@/audio/soundscape';
import { getTimeOfDay } from '@/map/timeOfDay';
import { flush, track } from '@/services/analytics';
import { music, sound } from '@/services/audio';
import { aheadBy, dropClockAnchor, syncClock } from '@/services/clock';
import { rescheduleNotifications } from '@/services/notifications';
import { useCelebrations } from '@/store/celebrations';
import { duration } from '@/ui/format';
import { t } from '@/i18n';
import { applyStarterPack } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { CatchUpOverlay } from '@/ui/CatchUpOverlay';
import { MomentsModal } from '@/ui/MomentsModal';
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
/**
 * The save ran ahead of real time (the phone's clock was set forward): the city
 * waits for real time to catch up. Say so once per session, so it doesn't look stuck.
 */
let clockNoticeShown = false;
function noteClockAhead(): void {
  const game = useGame.getState().game;
  if (!game || clockNoticeShown) return;
  const ahead = aheadBy(game.now);
  if (ahead <= 0) return;
  clockNoticeShown = true;
  useCelebrations.getState().push({
    kind: 'info',
    title: t('map.clockAhead.title'),
    subtitle: t('map.clockAhead.body', { time: duration(ahead) }),
  });
}

export default function GameLayout() {
  const theme = useTheme();
  const status = useGame((s) => s.status);
  const offlineReport = useGame((s) => s.offlineReport);
  const chapter = useGame((s) => s.game?.chapter ?? 1);
  const city = useGame((s) => s.city);
  const catchingUp = useGame((s) => s.catchingUp);
  const starterOwed = useProfile((s) => !!s.entitlements.starterPackOwed);

  useEffect(() => {
    if (status !== 'ready') return;
    const id = setInterval(() => {
      if (!useGame.getState().catchingUp) useGame.getState().tick();
    }, TICK_MS);
    track('session_start');
    noteClockAhead();
    const sub = AppState.addEventListener('change', (next) => {
      const { game, world, save } = useGame.getState();
      if (next === 'active') {
        // Re-check the clock first (the anchor was dropped in the background), then catch up.
        void syncClock().finally(() => {
          useGame.getState().resume();
          noteClockAhead();
        });
        sound.resume();
        // Daily players and retention (no properties beyond the install id).
        track('session_start');
        void useGame.getState().syncBranches();
      } else if (next === 'background' || next === 'inactive') {
        save();
        dropClockAnchor();
        // iOS sends both on every backgrounding: schedule once.
        if (next === 'background') rescheduleNotifications(game, world).catch(() => undefined);
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

  // One receipt at a time: a newer report while it is open updates it in place.
  const reportOpen = useRef(false);
  useEffect(() => {
    if (!offlineReport) {
      reportOpen.current = false;
      return;
    }
    if (reportOpen.current) return;
    reportOpen.current = true;
    router.push('/report');
  }, [offlineReport]);

  // A paid Starter Pack that could not be applied yet (bought during a
  // catch-up, or restored on another install) arrives once the game is free.
  useEffect(() => {
    if (status !== 'ready' || catchingUp || !starterOwed) return;
    const r = useGame.getState().act((d) => applyStarterPack(d));
    if (r.ok)
      useProfile.getState().update((p) => {
        p.entitlements.starterPackClaimed = true;
        p.entitlements.starterPackOwed = false;
      });
  }, [status, catchingUp, starterOwed]);

  // Chapter sound + haptics are played by CelebrationHost; only track here.
  useEffect(() => {
    if (chapter > 1) track('chapter', { chapter });
  }, [chapter]);

  if (status !== 'ready') return <Redirect href="/" />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="machine/[id]"
          // A regular screen with a fade, not a transparent modal: as a transparent modal
          // over the live map, the 3D close-up deadlocked the JS thread in the Simulator.
          options={{ animation: 'fade' }}
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
          // A standard iOS card (pageSheet). As a detent formSheet its content either
          // rendered blank (flex: 1) or sank to the bottom of the sheet.
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="collections" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="cities" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="rankings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="research" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="prestige" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="trophies" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <CatchUpOverlay />
      <MomentsModal />
    </>
  );
}
