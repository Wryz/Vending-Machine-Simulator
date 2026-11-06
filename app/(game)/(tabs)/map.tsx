import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMERA, GLOBE, MACHINE_SHEET } from '@/config/map';
import { CHAPTERS } from '@/config/progression';
import { useCityClock } from '@/hooks/useCityClock';
import { CityMap, type CityMapHandle, type MapCameraState, type SalePop } from '@/map/CityMap';
import { WeatherOverlay } from '@/map/WeatherOverlay';
import type { WeatherCondition } from '@/data/types';
import { activeMachines, baseTraffic, localTime, nearbyPlaces, visibleEvents } from '@/sim';
import { soundscape } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { cityKey, useProfile } from '@/store/profile';
import { useGame } from '@/store/game';
import { GlobeView, type GlobePin } from '@/three/globe/GlobeView';
import { transition } from '@/store/transition';
import { useTheme } from '@/ui/ThemeProvider';
import { clock, money } from '@/ui/format';
import { chapterProgress } from '@/ui/chapter';
import { CashPill, InfoPill, RoundButton } from '@/ui/hud';
import { Icon, type IconName } from '@/ui/icons';
import { Button, Mono, T } from '@/ui/kit';
import { MachineSheet } from '@/ui/sheets/MachineSheet';
import { SpotSheet, type SpotPoint } from '@/ui/sheets/SpotSheet';
import { LedBar, SKIN } from '@/ui/skin';
import { sfx } from '@/ui/sfx';
import { SPACE } from '@/ui/theme';

/** A sale shows in its own pill under the clock for this long. */
const SALE_PILL_MS = 6_000;

const WEATHER_ICON: Record<WeatherCondition, IconName> = {
  clear: 'sun',
  cloudy: 'cloud',
  rain: 'rain',
  snow: 'snow',
  storm: 'storm',
  fog: 'fog',
};

/** The glow of an LED digit. */
const LED_GLOW = (color: string) => ({
  textShadowColor: color,
  textShadowRadius: 8,
  textShadowOffset: { width: 0, height: 0 },
});

/** °F where people read °F, °C elsewhere. */
function temperature(tempC: number, countryCode: string): string {
  return ['US', 'LR', 'MM'].includes(countryCode)
    ? `${Math.round((tempC * 9) / 5 + 32)}°F`
    : `${Math.round(tempC)}°C`;
}

/**
 * A soft register "ding" and a light haptic tick when a sale lands on screen
 * (its customer reached the machine), rate-limited so a busy fleet stays calm:
 * at most one sound every 6 s and one tick every 10 s, only while the map is focused.
 */
function useSaleFeedback() {
  const focused = useIsFocused();
  const lastSound = useRef(0);
  const lastHaptic = useRef(0);
  return useCallback(() => {
    if (!focused) return;
    const now = Date.now();
    if (now - lastSound.current > 6_000) {
      lastSound.current = now;
      sfx('register');
    }
    if (now - lastHaptic.current > 10_000) {
      lastHaptic.current = now;
      haptic.tick();
    }
  }, [focused]);
}

/** Map (home), SPEC §8: the full city, a few floating controls and sheets. */
export default function MapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ placeMachineId?: string; focus?: string }>();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const ticker = useGame((s) => s.ticker);
  const { tod } = useCityClock(world.city.lat, world.city.lng);
  const mapRef = useRef<CityMapHandle>(null);
  const spotRef = useRef<BottomSheetModal>(null);
  const machineSheetRef = useRef<BottomSheetModal>(null);
  /** The machine whose sheet is open. */
  const [machineId, setMachineId] = useState<string | null>(null);
  const [heat, setHeat] = useState(false);
  const [topDown, setTopDown] = useState(false);
  const [spot, setSpot] = useState<SpotPoint | null>(null);
  const [busy, setBusy] = useState(false);
  /** Share of the screen the machine sheet covers (frames the machine above it). */
  const [sheetShare, setSheetShare] = useState<number>(MACHINE_SHEET.snapPoints[0]);
  const [globe, setGlobe] = useState(false);
  const city = useGame((s) => s.city);
  const visited = useProfile((s) => s.cities);

  const initial = useMemo<MapCameraState>(() => {
    const first = activeMachines(game)[0];
    const c = first ?? world.city;
    return {
      center: [c.lng, c.lat],
      zoom: first ? CAMERA.homeZoom : CAMERA.homeZoom - 1,
      pitch: CAMERA.homePitch,
      bearing: CAMERA.homeBearing,
    };
    // Initial camera only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Living soundscape: city bed, traffic, crowd, birds/crickets, rain/wind,
  // richer as you zoom in; driven by zoom, real time of day, weather and how
  // busy the streets in view are (street-life stats when available).
  const cameraNow = useRef<MapCameraState>(initial);
  const lifeTraffic = useRef<number | null>(null);
  const feedSoundscape = useCallback(() => {
    const cam = cameraNow.current;
    const [lng, lat] = cam.center;
    let traffic = lifeTraffic.current;
    if (traffic === null) {
      const cell = world.cells.get(world.cellOf(lat, lng));
      const lt = localTime(Date.now(), world.city.timeZone, world.city.countryCode);
      traffic = cell ? Math.min(1, baseTraffic(cell, lt.hour, lt.restDay).total / 600) : 0.1;
    }
    const w = world.weatherAt(Date.now());
    soundscape.update({
      zoom: cam.zoom,
      tod: tod.weights,
      weather: w ? { condition: w.condition, tempC: w.tempC } : null,
      traffic,
      scene: 'map',
    });
  }, [world, tod.weights]);
  useEffect(() => {
    feedSoundscape();
  }, [feedSoundscape]);
  useFocusEffect(
    useCallback(() => {
      feedSoundscape();
    }, [feedSoundscape]),
  );

  // Fly back to where the player was after leaving a close-up.
  // Sheets are modals above the navigator: tuck them away while another tab or
  // the close-up is in front, and bring the machine's sheet back on return.
  const reopenSheet = useRef<string | null>(null);
  const openMachine = useRef<string | null>(null);
  useEffect(() => {
    openMachine.current = machineId;
  }, [machineId]);
  useFocusEffect(
    useCallback(() => {
      transition.takeReturn();
      setBusy(false);
      if (reopenSheet.current) {
        const id = reopenSheet.current;
        reopenSheet.current = null;
        setMachineId(id);
        machineSheetRef.current?.present();
      }
      return () => {
        if (openMachine.current) reopenSheet.current = openMachine.current;
        machineSheetRef.current?.dismiss();
        spotRef.current?.dismiss();
      };
    }, []),
  );

  const events = visibleEvents(game, game.now);
  const selectedPlaces = useMemo(
    () => (spot ? nearbyPlaces(world, game, spot, 400).slice(0, 10) : []),
    [spot, world, game],
  );

  const onMapPress = (lat: number, lng: number) => {
    if (machineId) {
      // A tap on the map closes the machine's sheet first.
      machineSheetRef.current?.dismiss();
      return;
    }
    setSpot({ lat, lng });
    spotRef.current?.present();
  };

  /** Frame a machine above its sheet, front on, close enough to see customers. */
  const frameMachine = useCallback(
    (id: string, sheetShare: number) => {
      const m = useGame.getState().game?.machines.find((x) => x.id === id);
      if (!m) return;
      const cam = mapRef.current?.getCamera();
      mapRef.current?.flyTo(
        {
          center: [m.lng, m.lat],
          zoom: Math.max(CAMERA.machineZoom, cam?.zoom ?? 0),
          pitch: topDown ? CAMERA.topDownPitch : CAMERA.machinePitch,
          // Look at the machine's front: camera bearing = heading + 180.
          bearing: topDown ? (cam?.bearing ?? 0) : (m.heading + 180) % 360,
        },
        CAMERA.machineFlyMs,
        height * sheetShare,
      );
    },
    [height, topDown],
  );
  // How much of the screen the open sheet leaves room for (see MACHINE_SHEET.framePadding).
  const framePadding = MACHINE_SHEET.framePadding;

  // Tapping a machine opens its sheet at once while the map flies to it.
  const onMachinePress = (id: string) => {
    if (busy) return;
    if (!game.machines.some((x) => x.id === id)) return;
    spotRef.current?.dismiss();
    setMachineId(id);
    machineSheetRef.current?.present();
    frameMachine(id, framePadding);
  };

  // From the key ring: open that machine here (then forget the request).
  useFocusEffect(
    useCallback(() => {
      if (!params.focus) return;
      onMachinePress(params.focus);
      router.setParams({ focus: undefined });
      // Once per request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.focus]),
  );

  const open3d = (id: string) => {
    const m = game.machines.find((x) => x.id === id);
    if (!m) return;
    setBusy(true);
    const cam = mapRef.current?.getCamera() ?? initial;
    const framed: MapCameraState = {
      center: [m.lng, m.lat],
      zoom: CAMERA.closeupZoom,
      pitch: CAMERA.closeupPitch,
      bearing: (m.heading + 180) % 360,
    };
    transition.set({ machineId: id, framed, returnTo: cam, viewportHeight: height });
    router.push({ pathname: '/machine/[id]', params: { id } });
  };

  // The globe: every city you play, with this one highlighted.
  const globePins = useMemo<GlobePin[]>(() => {
    const here = city ? cityKey(city) : '';
    return [
      {
        id: here || 'current',
        lat: world.city.lat,
        lng: world.city.lng,
        current: true,
        label: `${world.city.name} · ${activeMachines(game).length} machine${activeMachines(game).length === 1 ? '' : 's'}`,
      },
      ...Object.entries(visited)
        .filter(([key]) => key !== here)
        .map(([key, c]) => ({ id: key, lat: c.lat, lng: c.lng, current: false })),
    ];
  }, [city, visited, world.city, game]);

  const leaveGlobe = useCallback(() => {
    setGlobe(false);
    const first = activeMachines(game)[0];
    const c = first ?? world.city;
    mapRef.current?.flyTo(
      {
        center: [c.lng, c.lat],
        zoom: GLOBE.returnZoom,
        pitch: topDown ? CAMERA.topDownPitch : CAMERA.homePitch,
        bearing: topDown ? 0 : CAMERA.homeBearing,
      },
      CAMERA.flyDurationMs,
    );
  }, [game, world.city, topDown]);

  const onGlobePin = useCallback(
    (id: string) => {
      if (globePins.find((p) => p.id === id)?.current) leaveGlobe();
      else router.push('/cities');
    },
    [globePins, leaveGlobe],
  );

  const toggleTopDown = () => {
    const cam = mapRef.current?.getCamera() ?? initial;
    const next = !topDown;
    setTopDown(next);
    mapRef.current?.flyTo(
      {
        center: cam.center,
        zoom: cam.zoom,
        pitch: next ? CAMERA.topDownPitch : CAMERA.homePitch,
        bearing: next ? 0 : CAMERA.homeBearing,
      },
      CAMERA.tiltMs,
      machineId ? height * Math.min(sheetShare, framePadding) : 0,
    );
  };

  const locate = () => {
    const first = activeMachines(game)[0];
    const c = first ?? world.city;
    mapRef.current?.flyTo(
      {
        center: [c.lng, c.lat],
        zoom: CAMERA.homeZoom,
        pitch: topDown ? CAMERA.topDownPitch : CAMERA.homePitch,
        bearing: topDown ? 0 : CAMERA.homeBearing,
      },
      CAMERA.flyDurationMs,
    );
  };

  // Recent sales: a customer walks up to each (zoomed in), then a "+$2.00" chip pops.
  const salePops = useMemo<SalePop[]>(
    () =>
      ticker.slice(-12).map((t) => ({
        id: `${t.at}-${t.machineId}`,
        machineId: t.machineId,
        cents: t.cents,
        units: t.units,
      })),
    [ticker],
  );
  const saleFeedback = useSaleFeedback();

  // The latest sale on screen shows briefly in its own pill under the clock.
  const [last, setLast] = useState<SalePop | null>(null);
  const onSalesShown = useCallback(
    (pops: SalePop[]) => {
      setLast(pops[pops.length - 1]);
      saleFeedback();
    },
    [saleFeedback],
  );
  useEffect(() => {
    if (!last) return;
    const t = setTimeout(() => setLast(null), SALE_PILL_MS);
    return () => clearTimeout(t);
  }, [last]);
  const showSale = !!last;
  const weather = world.weatherAt(game.now);
  // Day / night at a glance, from the city's real sun.
  const dayIcon: IconName =
    tod.dominant === 'day' ? 'sun' : tod.dominant === 'night' ? 'moon' : 'twilight';
  const dayIconColor =
    tod.dominant === 'day' ? SKIN.ledAmber : tod.dominant === 'night' ? '#C3C8FF' : '#FF9561';

  const active = activeMachines(game);
  const stored = game.machines.filter((m) => m.status === 'stored');
  const hint = (() => {
    if (params.placeMachineId) return 'Tap a spot to place this machine';
    if (!active.length && stored.length) return 'Tap a busy spot to place your machine';
    if (
      active.length === 1 &&
      active[0].stats.unitsTotal === 0 &&
      active[0].slots.every((s) => s.qty === 0)
    )
      return 'Tap your machine to stock it';
    if (active.length && game.ledger.lifetimeUnits === 0) return 'Waiting for a first customer…';
    return null;
  })();
  const progress = chapterProgress(game);
  const chapter = CHAPTERS.find((c) => c.n === game.chapter) ?? CHAPTERS[CHAPTERS.length - 1];

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
        selected={spot ? { ...spot, places: selectedPlaces } : null}
        initial={initial}
        minZoom={GLOBE.mapMinZoom}
        onMapPress={onMapPress}
        onMachinePress={onMachinePress}
        onCameraChanged={(c, byUser) => {
          cameraNow.current = c;
          // Pinched far out: hand off to the globe (only for the player's own gestures).
          if (GLOBE.enabled && byUser && c.zoom < GLOBE.handoffZoom && !globe) {
            spotRef.current?.dismiss();
            setGlobe(true);
          }
          feedSoundscape();
        }}
        onLifeStats={(st) => {
          // Street life in view (zoom >= 16) makes the soundscape busier or quieter.
          const next = st.cars + st.people > 0 ? st.traffic : null;
          if (next === lifeTraffic.current) return;
          lifeTraffic.current = next;
          feedSoundscape();
        }}
        salePops={salePops}
        onSalesShown={onSalesShown}
        lifePaused={busy}
      />
      <WeatherOverlay
        condition={weather?.condition}
        intensity={weather ? Math.max(0.35, weather.precipitation) : 0}
        night={tod.weights.night > 0.5}
      />

      {/* Top left: cash, then one status pill (latest sale, or clock and weather). */}
      <View
        pointerEvents="box-none"
        style={[styles.topLeft, { top: insets.top + SPACE.s, left: SPACE.l }]}
      >
        <CashPill cents={game.cashCents} onPress={() => router.navigate('/company')} />
        <InfoPill>
          <Icon name={dayIcon} size={18} color={dayIconColor} />
          <Mono size={15} weight="bold" color={SKIN.ledGreen} style={LED_GLOW(SKIN.ledGreen)}>
            {clock(game.now, world.city.timeZone)}
          </Mono>
          {weather ? (
            <>
              {weather.condition !== 'clear' ? (
                <Icon name={WEATHER_ICON[weather.condition]} size={18} color={SKIN.ledAmber} />
              ) : null}
              <Mono size={15} weight="bold" color={SKIN.ledAmber} style={LED_GLOW(SKIN.ledAmber)}>
                {temperature(weather.tempC, world.city.countryCode)}
              </Mono>
            </>
          ) : null}
        </InfoPill>
        {/* The chapter goal: number, meter, and how far along (tap for the company). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chapter ${chapter.n}, ${chapter.title}. ${progress.text}`}
          onPress={() => router.navigate('/company')}
        >
          <InfoPill style={styles.goal}>
            <View style={styles.chapter}>
              <T size={12} weight="bold" color={SKIN.marqueeInk}>
                {chapter.n}
              </T>
            </View>
            <View style={{ width: 84 }}>
              <LedBar value={progress.value} segments={10} color={SKIN.ledAmber} />
            </View>
          </InfoPill>
        </Pressable>
        {showSale && last ? (
          <Animated.View
            key={last.id}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <InfoPill>
              <Mono size={15} weight="bold" color={SKIN.ledGreen} style={LED_GLOW(SKIN.ledGreen)}>
                {money(last.cents, { sign: true })}
              </Mono>
              <T size={13} color="#C9CCE6" numberOfLines={1} style={{ maxWidth: 160 }}>
                {game.machines.find((m) => m.id === last.machineId)?.venue.name ?? ''}
              </T>
            </InfoPill>
          </Animated.View>
        ) : null}
      </View>

      {/* Top right: settings and map controls. */}
      <View
        pointerEvents="box-none"
        style={[styles.topRight, { top: insets.top + SPACE.s, right: SPACE.l }]}
      >
        <RoundButton icon="gear" label="Settings" onPress={() => router.push('/settings')} />
        <RoundButton
          icon={topDown ? 'tilt' : 'topdown'}
          label={topDown ? '3D view' : 'Top-down view'}
          onPress={toggleTopDown}
        />
        <RoundButton
          icon="flame"
          label="Busy streets"
          active={heat}
          onPress={() => setHeat((h) => !h)}
        />
        <RoundButton icon="locate" label="My machines" onPress={locate} />
      </View>

      {/* Zoom keys, bottom right above the tab bar. */}
      <View pointerEvents="box-none" style={[styles.zoom, { right: SPACE.l, bottom: SPACE.l }]}>
        <RoundButton
          icon="plus"
          label="Zoom in"
          onPress={() => mapRef.current?.zoomBy(CAMERA.zoomStep, CAMERA.zoomStepMs)}
        />
        <RoundButton
          icon="minus"
          label="Zoom out"
          onPress={() => mapRef.current?.zoomBy(-CAMERA.zoomStep, CAMERA.zoomStepMs)}
        />
      </View>

      {hint && !machineId ? (
        <Animated.View
          key={hint}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
          style={[styles.hint, { bottom: SPACE.l + 6 }]}
        >
          <InfoPill style={{ height: 40, backgroundColor: theme.ink }}>
            <T size={14} weight="medium" color={theme.bg}>
              {hint}
            </T>
          </InfoPill>
        </Animated.View>
      ) : null}

      {/* ODbL attribution stays visible (SPEC §6.4). */}
      <View pointerEvents="none" style={[styles.attribution, { bottom: 4 }]}>
        <T size={9} color={tod.palette.label} style={{ opacity: 0.8 }}>
          © OpenFreeMap © OpenMapTiles © OpenStreetMap
        </T>
      </View>

      <MachineSheet
        ref={machineSheetRef}
        machineId={machineId}
        bottomInset={insets.bottom}
        onDismiss={() => setMachineId(null)}
        onOpen3d={open3d}
        onSnap={(i) => {
          const share = MACHINE_SHEET.snapPoints[i];
          if (share !== undefined) setSheetShare(share);
        }}
      />
      <SpotSheet
        ref={spotRef}
        game={game}
        world={world}
        point={spot}
        machineId={params.placeMachineId}
        bottomInset={insets.bottom}
        onDismiss={() => setSpot(null)}
      />

      {globe ? (
        <Animated.View
          entering={FadeIn.duration(GLOBE.crossfadeMs)}
          exiting={FadeOut.duration(GLOBE.crossfadeMs)}
          style={StyleSheet.absoluteFill}
        >
          <GlobeView pins={globePins} focus={world.city} onPin={onGlobePin} onEnter={leaveGlobe} />
          <View
            pointerEvents="box-none"
            style={[styles.topLeft, { top: insets.top + SPACE.s, left: SPACE.l }]}
          >
            <CashPill cents={game.cashCents} />
          </View>
          <View style={[styles.globeBack, { bottom: insets.bottom + SPACE.xl }]}>
            <Button label={`Back to ${world.city.name}`} onPress={leaveGlobe} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topLeft: { position: 'absolute', gap: SPACE.s, alignItems: 'flex-start' },
  topRight: { position: 'absolute', gap: SPACE.s, alignItems: 'flex-end' },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  zoom: { position: 'absolute', gap: SPACE.s },
  goal: { gap: SPACE.s, paddingLeft: 5 },
  chapter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.marquee,
  },
  attribution: { position: 'absolute', left: SPACE.m },
  globeBack: { position: 'absolute', left: SPACE.xl, right: SPACE.xl },
});
