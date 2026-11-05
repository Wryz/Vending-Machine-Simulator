import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMERA } from '@/config/map';
import { CHAPTERS, CHAPTER_GOALS } from '@/config/progression';
import { useCityClock } from '@/hooks/useCityClock';
import { CityMap, type CityMapHandle, type MapCameraState } from '@/map/CityMap';
import { activeMachines, nearbyPlaces, visibleEvents, playerShare } from '@/sim';
import { sound } from '@/services/audio';
import { useGame } from '@/store/game';
import { transition } from '@/store/transition';
import { useTheme } from '@/ui/ThemeProvider';
import { clock, money } from '@/ui/format';
import { Mono, ProgressBar, T } from '@/ui/kit';
import { machineLabel } from '@/ui/machineStatus';
import { Glyph } from '@/ui/objects/small';
import { SPACE, TOUCH } from '@/ui/theme';

function chapterProgress(game: NonNullable<ReturnType<typeof useGame.getState>['game']>): {
  text: string;
  value: number;
} {
  const active = activeMachines(game).length;
  switch (game.chapter) {
    case 1:
      return {
        text: `Sales ${money(game.ledger.lifetimeSalesCents, { compact: true })} of ${money(CHAPTER_GOALS[1].salesCents)}`,
        value: game.ledger.lifetimeSalesCents / CHAPTER_GOALS[1].salesCents,
      };
    case 2:
      return {
        text: `${active}/${CHAPTER_GOALS[2].machines} machines${game.vanLevel >= 1 ? ' · van ✓' : ' · buy a van'}`,
        value: (Math.min(active, 5) / 5) * 0.8 + (game.vanLevel >= 1 ? 0.2 : 0),
      };
    case 3:
      return {
        text: `${active}/${CHAPTER_GOALS[3].machines} machines · ${game.drivers.length}/1 driver`,
        value: (Math.min(active, 15) / 15) * 0.85 + (game.drivers.length >= 1 ? 0.15 : 0),
      };
    case 4:
      return {
        text: `${active}/${CHAPTER_GOALS[4].machines} machines · ${game.drivers.length}/3 drivers`,
        value: (Math.min(active, 40) / 40) * 0.85 + (Math.min(3, game.drivers.length) / 3) * 0.15,
      };
    case 5:
      return {
        text: `Market share ${Math.round(playerShare(game) * 100)}% (need 50%)`,
        value: playerShare(game) / 0.5,
      };
    default:
      return { text: 'You run the city. Sell the company when you are ready.', value: 1 };
  }
}

function HudButton({
  label,
  onPress,
  glyph,
  active,
}: {
  label: string;
  onPress: () => void;
  glyph: Parameters<typeof Glyph>[0]['category'];
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hudButton,
        {
          backgroundColor: active ? theme.ink : theme.hud,
          borderColor: theme.line,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Glyph category={glyph} size={20} color={active ? theme.bg : theme.ink} />
      <T size={11} weight="medium" color={active ? theme.bg : theme.ink}>
        {label}
      </T>
    </Pressable>
  );
}

/** Map (home) — SPEC §8. */
export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ placeMachineId?: string }>();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const ticker = useGame((s) => s.ticker);
  const { tod } = useCityClock(world.city.lat, world.city.lng);
  const mapRef = useRef<CityMapHandle>(null);
  const [heat, setHeat] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const initial = useMemo<MapCameraState>(() => {
    const first = activeMachines(game)[0];
    const c = first ?? world.city;
    return { center: [c.lng, c.lat], zoom: first ? 16 : 15, pitch: 50, bearing: -15 };
    // Initial camera only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // City ambience follows the real time of day.
  useEffect(() => {
    sound.ambience(tod.weights.night > 0.5 ? 'cityNight' : 'cityDay');
  }, [tod.weights.night]);

  // Fly back to where the player was after leaving a close-up.
  useFocusEffect(
    useCallback(() => {
      const back = transition.takeReturn();
      if (back) mapRef.current?.flyTo(back, CAMERA.flyDurationMs);
      setBusy(false);
    }, []),
  );

  const events = visibleEvents(game, game.now);
  const selectedPlaces = useMemo(
    () => (selected ? nearbyPlaces(world, game, selected, 400).slice(0, 10) : []),
    [selected, world, game],
  );

  const onMapPress = (lat: number, lng: number) => {
    setSelected({ lat, lng });
    router.push({
      pathname: '/spot',
      params: { lat: String(lat), lng: String(lng), machineId: params.placeMachineId ?? '' },
    });
  };

  const onMachinePress = (id: string) => {
    if (busy) return;
    const m = game.machines.find((x) => x.id === id);
    if (!m) return;
    setBusy(true);
    const returnTo = mapRef.current?.getCamera() ?? initial;
    // Look at the machine's front: camera bearing = heading + 180.
    const framed: MapCameraState = {
      center: [m.lng, m.lat],
      zoom: CAMERA.closeupZoom,
      pitch: CAMERA.closeupPitch,
      bearing: (m.heading + 180) % 360,
    };
    mapRef.current?.flyTo(framed, CAMERA.flyDurationMs);
    transition.set({ machineId: id, framed, returnTo, viewportHeight: height });
    setTimeout(
      () => router.push({ pathname: '/machine/[id]', params: { id } }),
      CAMERA.flyDurationMs,
    );
  };

  const progress = chapterProgress(game);
  const chapter = CHAPTERS.find((c) => c.n === game.chapter) ?? CHAPTERS[CHAPTERS.length - 1];
  const last = ticker[ticker.length - 1];
  const lastMachine = last ? game.machines.find((m) => m.id === last.machineId) : undefined;
  const active = activeMachines(game);
  const stored = game.machines.filter((m) => m.status === 'stored');

  const hint = (() => {
    if (params.placeMachineId) return 'Tap a spot to place this machine.';
    if (!active.length && stored.length)
      return 'Tap a busy spot on the map to scout it for your used machine.';
    if (
      active.length === 1 &&
      active[0].stats.unitsTotal === 0 &&
      active[0].slots.every((s) => s.qty === 0)
    )
      return 'Tap your machine to stock it.';
    if (active.length && game.ledger.lifetimeUnits === 0) return 'Waiting for your first customer…';
    return null;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: tod.palette.land }}>
      <CityMap
        ref={mapRef}
        game={game}
        world={world}
        tod={tod}
        theme={theme}
        heat={heat}
        events={events}
        selected={selected ? { ...selected, places: selectedPlaces } : null}
        initial={initial}
        onMapPress={onMapPress}
        onMachinePress={onMachinePress}
      />

      {/* Top: cash, city clock, live receipt ticker. */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + SPACE.xs }]}>
        <View style={[styles.topBar, { backgroundColor: theme.hud, borderColor: theme.line }]}>
          <View style={{ flex: 1 }}>
            <Mono size={18} weight="bold" accessibilityLabel={`Cash ${money(game.cashCents)}`}>
              {money(game.cashCents)}
            </Mono>
            <T size={12} muted numberOfLines={1}>
              {world.city.name} · {clock(game.now, world.city.timeZone)} · {tod.dominant}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={10}
            onPress={() => router.push('/settings')}
            style={styles.iconBtn}
          >
            <T size={20}>{'⚙'}</T>
          </Pressable>
        </View>
        {last ? (
          <Animated.View
            key={`${last.at}-${last.machineId}`}
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(250)}
            style={[styles.ticker, { backgroundColor: theme.paper }]}
          >
            <Mono size={12} color={theme.paperInk} numberOfLines={1}>
              {`${last.units} sold · ${lastMachine?.venue.name ?? machineLabel(lastMachine ?? active[0])}`}
            </Mono>
            <Mono size={12} weight="bold" color="#2E7D5B">
              {money(last.cents, { sign: true })}
            </Mono>
          </Animated.View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chapter ${chapter.n}, ${chapter.title}. ${progress.text}`}
          onPress={() => router.push('/company')}
          style={[styles.goal, { backgroundColor: theme.hud, borderColor: theme.line }]}
        >
          <T size={12} weight="bold">
            {`Ch. ${chapter.n} · ${chapter.title}`}
          </T>
          <T size={12} muted numberOfLines={1}>
            {progress.text}
          </T>
          <ProgressBar value={progress.value} />
        </Pressable>
      </View>

      {hint ? (
        <View
          pointerEvents="none"
          style={[styles.hint, { bottom: insets.bottom + 100, backgroundColor: theme.ink }]}
        >
          <T size={14} color={theme.bg} center>
            {hint}
          </T>
        </View>
      ) : null}

      {/* ODbL attribution, always visible (SPEC §6.4). */}
      <View pointerEvents="none" style={[styles.attribution, { bottom: insets.bottom + 74 }]}>
        <T size={10} color={tod.palette.label}>
          © OpenStreetMap contributors
        </T>
      </View>

      {/* Bottom: key ring, route clipboard, heat overlay, company. */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACE.s }]}>
        <HudButton label="Keys" glyph="office" onPress={() => router.push('/keys')} />
        <HudButton label="Routes" glyph="station" onPress={() => router.push('/routes')} />
        <HudButton label="Heat" glyph="event" active={heat} onPress={() => setHeat((h) => !h)} />
        <HudButton label="Company" glyph="convention" onPress={() => router.push('/company')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: SPACE.m, right: SPACE.m, top: 0, gap: SPACE.s },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACE.m,
    paddingVertical: SPACE.s,
  },
  iconBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  ticker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACE.s,
    borderRadius: 4,
    paddingHorizontal: SPACE.m,
    paddingVertical: 6,
  },
  goal: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACE.m,
    paddingVertical: SPACE.s,
    gap: 4,
  },
  attribution: { position: 'absolute', left: SPACE.m },
  hint: {
    position: 'absolute',
    left: SPACE.xl,
    right: SPACE.xl,
    borderRadius: 12,
    padding: SPACE.m,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: SPACE.m,
  },
  hudButton: {
    minWidth: 72,
    minHeight: TOUCH + 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: SPACE.s,
  },
});
