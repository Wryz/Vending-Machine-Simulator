import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAMERA, GLOBE, MACHINE_SHEET, MAP_TAP, SHEET_OPEN_SHARE } from '@/config/map';
import type { Feature } from '@/config/progression';
import { useCityClock } from '@/hooks/useCityClock';
import { useT } from '@/i18n';
import { CityMap, type CityMapHandle, type MapCameraState, type SalePop } from '@/map/CityMap';
import { WeatherOverlay } from '@/map/WeatherOverlay';
import {
  activeMachines,
  baseTraffic,
  featureUnlocked,
  localTime,
  nearbyPlaces,
  suggestSpot,
  tutorialStep,
  visibleEvents,
} from '@/sim';
import type { SoundscapeEnv } from '@/audio/soundscape';
import { soundscape } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { cityKey, useProfile } from '@/store/profile';
import { useGame } from '@/store/game';
import { useHud } from '@/store/hud';
import { takeDeal } from '@/store/rivalMoments';
import { GlobeView, type GlobePin } from '@/three/globe/GlobeView';
import { transition } from '@/store/transition';
import { useTheme } from '@/ui/ThemeProvider';
import { CashPill, InfoPill, RoundButton } from '@/ui/hud';
import { Button, T } from '@/ui/kit';
import { Coach } from '@/ui/Coach';
import { Pulse } from '@/ui/guide';
import type { GameSheetHandle } from '@/ui/sheets/GameSheet';
import { MachineSheet } from '@/ui/sheets/MachineSheet';
import { RivalSheet } from '@/ui/sheets/RivalSheet';
import { MoneyPanel, type IncomingSale } from '@/ui/MoneyPanel';
import { SpotSheet, type SpotPoint } from '@/ui/sheets/SpotSheet';
import { sfx } from '@/ui/sfx';
import { SPACE } from '@/ui/theme';

/** A sale shows in its own pill under the money panel for this long. */
const SALE_PILL_MS = 6_000;

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
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    placeMachineId?: string;
    focus?: string;
    /** Open this rival machine's card (dev QA). */
    rival?: string;
  }>();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const ticker = useGame((s) => s.ticker);
  const { tod } = useCityClock(world.city.lat, world.city.lng);
  const mapRef = useRef<CityMapHandle>(null);
  const spotRef = useRef<GameSheetHandle>(null);
  const machineSheetRef = useRef<GameSheetHandle>(null);
  const rivalSheetRef = useRef<GameSheetHandle>(null);
  /** The rival machine whose card is open. */
  const [rivalId, setRivalId] = useState<string | null>(null);
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

  // Living soundscape: waves by water, crowd, birds/crickets by parks,
  // rain/wind, richer as you zoom in; driven by zoom, what is near the view
  // center (map env probe), real time of day, weather and how busy the
  // streets in view are (street-life stats when available).
  const cameraNow = useRef<MapCameraState>(initial);
  const lifeBusy = useRef<number | null>(null);
  const envNear = useRef<SoundscapeEnv | undefined>(undefined);
  const feedSoundscape = useCallback(() => {
    const cam = cameraNow.current;
    const [lng, lat] = cam.center;
    let level = lifeBusy.current;
    if (level === null) {
      const cell = world.cells.get(world.cellOf(lat, lng));
      const lt = localTime(Date.now(), world.city.timeZone, world.city.countryCode);
      level = cell ? Math.min(1, baseTraffic(cell, lt.hour, lt.restDay).total / 600) : 0.1;
    }
    const w = world.weatherAt(Date.now());
    soundscape.update({
      zoom: cam.zoom,
      tod: tod.weights,
      weather: w ? { condition: w.condition, tempC: w.tempC } : null,
      busy: level,
      scene: 'map',
      env: envNear.current,
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
  /** A map press waiting to see if a machine press from the same tap follows. */
  const pendingMapPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        machineSheetRef.current?.open();
      }
      return () => {
        if (pendingMapPressRef.current) clearTimeout(pendingMapPressRef.current);
        pendingMapPressRef.current = null;
        if (openMachine.current) reopenSheet.current = openMachine.current;
        machineSheetRef.current?.close();
        rivalSheetRef.current?.close();
        spotRef.current?.close();
      };
    }, []),
  );

  const events = visibleEvents(game, game.now);
  const selectedPlaces = useMemo(
    () => (spot ? nearbyPlaces(world, game, spot, 400).slice(0, 10) : []),
    [spot, world, game],
  );

  // One tap can reach both a machine (source press) and the map underneath, in
  // either order. A map press right after a machine press is that same tap:
  // ignore it. A map press first waits a moment for a machine press to follow
  // (which cancels it), or it would close the sheet the machine press opens.
  const lastMachinePress = useRef(0);
  const cancelMapPress = () => {
    if (pendingMapPressRef.current) clearTimeout(pendingMapPressRef.current);
    pendingMapPressRef.current = null;
  };
  useEffect(
    () => () => {
      if (pendingMapPressRef.current) clearTimeout(pendingMapPressRef.current);
    },
    [],
  );
  const onMapPress = (lat: number, lng: number) => {
    if (Date.now() - lastMachinePress.current < MAP_TAP.machineGuardMs) return;
    cancelMapPress();
    pendingMapPressRef.current = setTimeout(() => {
      pendingMapPressRef.current = null;
      if (openMachine.current) {
        // A tap on the map closes the machine's sheet first.
        machineSheetRef.current?.close();
        return;
      }
      setSpot({ lat, lng });
      spotRef.current?.open();
    }, MAP_TAP.settleMs);
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
    if (!game.machines.some((x) => x.id === id)) return;
    lastMachinePress.current = Date.now();
    cancelMapPress();
    // An explicit pick (a tap, the key ring, a new placement) wins over the
    // sheet that was open when the map was left.
    reopenSheet.current = null;
    spotRef.current?.close();
    rivalSheetRef.current?.close();
    setSpot(null);
    setMachineId(id);
    machineSheetRef.current?.open();
    frameMachine(id, framePadding);
  };

  // A rival machine: Rex's card (prices, a taunt, the counter-moves).
  const onRivalPress = (id: string) => {
    lastMachinePress.current = Date.now();
    cancelMapPress();
    reopenSheet.current = null;
    spotRef.current?.close();
    machineSheetRef.current?.close();
    setRivalId(id);
    rivalSheetRef.current?.open();
  };

  // Dev QA: open a rival machine's card (then forget the request).
  useFocusEffect(
    useCallback(() => {
      if (!params.rival) return;
      onRivalPress(params.rival);
      router.setParams({ rival: undefined });
      // Once per request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.rival]),
  );

  // From the key ring: open that machine here (then forget the request).
  useFocusEffect(
    useCallback(() => {
      if (!params.focus) return;
      const id = params.focus;
      onMachinePress(id);
      router.setParams({ focus: undefined });
      // On a cold start the map may still be loading its style: frame again once it's up.
      // (Not cleared on cleanup: clearing the param re-runs this effect.)
      setTimeout(() => frameMachine(id, framePadding), 1200);
      // Once per request.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.focus]),
  );

  // The globe: every city you play, with this one highlighted.
  const globePins = useMemo<GlobePin[]>(() => {
    const here = city ? cityKey(city) : '';
    return [
      {
        id: here || 'current',
        lat: world.city.lat,
        lng: world.city.lng,
        current: true,
        label: t('map.globePin', { city: world.city.name, n: activeMachines(game).length }),
      },
      ...Object.entries(visited)
        .filter(([key]) => key !== here)
        .map(([key, c]) => ({ id: key, lat: c.lat, lng: c.lng, current: false })),
    ];
  }, [city, visited, world.city, game, t]);

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
      ticker.slice(-12).map((sale) => ({
        id: `${sale.at}-${sale.machineId}${sale.kind ? `-${sale.kind}` : ''}`,
        machineId: sale.machineId,
        cents: sale.cents,
        units: sale.units,
        tone: sale.kind,
      })),
    [ticker],
  );
  const saleFeedback = useSaleFeedback();

  // Sales on screen print under the money panel for a few seconds, naming their source.
  const [incoming, setIncoming] = useState<IncomingSale[]>([]);
  const onSalesShown = useCallback(
    (pops: SalePop[]) => {
      const machines = useGame.getState().game?.machines ?? [];
      // A customer who went to the rival: a soft "pop", no money for you.
      if (pops.some((p) => p.tone === 'rival')) sfx('pop');
      pops = pops.filter((p) => p.tone !== 'rival');
      if (!pops.length) return;
      const fresh = pops.map((p) => ({
        id: p.id,
        cents: p.cents,
        source: machines.find((m) => m.id === p.machineId)?.venue.name ?? '',
      }));
      setIncoming((cur) => [...cur, ...fresh].slice(-3));
      saleFeedback();
    },
    [saleFeedback],
  );
  useEffect(() => {
    if (!incoming.length) return;
    const timer = setTimeout(() => setIncoming((cur) => cur.slice(1)), SALE_PILL_MS);
    return () => clearTimeout(timer);
  }, [incoming]);
  const weather = world.weatherAt(game.now);
  // One plain hint while placing; otherwise the first-machine tutorial.
  const hint = params.placeMachineId ? t('map.placeHint') : null;
  const tutorialHidden = useProfile((s) => s.tutorialHidden);
  const coachStep = tutorialHidden ? null : tutorialStep(game);
  // The coach card's helper key: it does the step's looking for the player.
  const coachAction = () => {
    const mine = activeMachines(game)[0];
    if (coachStep === 'place') {
      // Show where people walk, then pick a good spot near the view and open its card.
      setHeat(true);
      const cam = mapRef.current?.getCamera() ?? cameraNow.current;
      const pick = suggestSpot(game, world, { lat: cam.center[1], lng: cam.center[0] }, game.now);
      if (!pick) return;
      mapRef.current?.flyTo(
        {
          center: [pick.lng, pick.lat],
          zoom: Math.max(CAMERA.homeZoom + 1, cam.zoom),
          pitch: topDown ? CAMERA.topDownPitch : CAMERA.homePitch,
          bearing: topDown ? 0 : CAMERA.homeBearing,
        },
        CAMERA.flyDurationMs,
        height * SHEET_OPEN_SHARE.spot * 0.5,
      );
      cancelMapPress();
      setSpot({ lat: pick.lat, lng: pick.lng });
      spotRef.current?.open();
    } else if ((coachStep === 'stock' || coachStep === 'collect') && mine) {
      onMachinePress(mine.id);
    } else if (coachStep === 'wait' && mine) {
      // Close enough to see people walk up and buy.
      frameMachine(mine.id, 0);
    }
  };
  const unlocked = (f: Feature) => featureUnlocked(game, f);
  const company = unlocked('company');
  const tabBarHeight = useHud((s) => s.tabBarHeight);
  const setArea = useHud((s) => s.setArea);
  // A new city starts without a neighbourhood name.
  useEffect(() => () => setArea(null), [setArea]);

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
        onRivalPress={onRivalPress}
        onDealPress={(id) => takeDeal(id)}
        onAreaName={setArea}
        onCameraChanged={(c, byUser) => {
          cameraNow.current = c;
          // Pinched far out: hand off to the globe (only for the player's own gestures).
          if (GLOBE.enabled && byUser && c.zoom < GLOBE.handoffZoom && !globe) {
            spotRef.current?.close();
            setGlobe(true);
          }
          feedSoundscape();
        }}
        onEnvProbe={(env) => {
          const prev = envNear.current;
          if (prev && prev.waterDistM === env.waterDistM && prev.parkDistM === env.parkDistM)
            return;
          envNear.current = env;
          feedSoundscape();
        }}
        onLifeStats={(st) => {
          // Street life in view (zoom >= 16) makes the soundscape busier or quieter.
          const next = st.people > 0 ? st.busy : null;
          if (next === lifeBusy.current) return;
          lifeBusy.current = next;
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

      {/* Top left: cash, chapter meter, money coming in, and the latest sales. */}
      <View
        pointerEvents="box-none"
        style={[styles.topLeft, { top: insets.top + SPACE.s, left: SPACE.l }]}
      >
        <MoneyPanel
          game={game}
          sales={incoming}
          onPress={company ? () => router.navigate('/company') : undefined}
        />
      </View>

      {/* Top right: settings and map controls. */}
      <View
        pointerEvents="box-none"
        style={[styles.topRight, { top: insets.top + SPACE.s, right: SPACE.l }]}
      >
        <RoundButton
          icon="gear"
          label={t('map.a11y.settings')}
          onPress={() => router.push('/settings')}
        />
        {unlocked('topDown') ? (
          <RoundButton
            icon={topDown ? 'tilt' : 'topdown'}
            label={topDown ? t('map.a11y.view3d') : t('map.a11y.topDown')}
            onPress={toggleTopDown}
          />
        ) : null}
        <Pulse on={coachStep === 'place' && !heat && !spot} radius={24}>
          <RoundButton
            icon="flame"
            label={t('map.a11y.busyStreets')}
            active={heat}
            onPress={() => setHeat((h) => !h)}
          />
        </Pulse>
      </View>

      {/* "My machines" key, bottom right above the tab bar (pinch to zoom). */}
      {unlocked('locate') ? (
        <View
          pointerEvents="box-none"
          style={[styles.zoom, { right: SPACE.l, bottom: tabBarHeight + SPACE.m }]}
        >
          <RoundButton icon="locate" label={t('map.a11y.myMachines')} onPress={locate} />
        </View>
      ) : null}

      {hint && !machineId ? (
        <Animated.View
          key={hint}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
          style={[styles.hint, { bottom: tabBarHeight + SPACE.m + 6 }]}
        >
          <InfoPill style={{ height: 40, backgroundColor: theme.ink }}>
            <T size={14} weight="medium" color={theme.bg}>
              {hint}
            </T>
          </InfoPill>
        </Animated.View>
      ) : null}
      {coachStep && !hint && !machineId && !spot ? (
        <Coach
          step={coachStep}
          bottom={tabBarHeight + SPACE.m}
          onAction={coachAction}
          onClose={() =>
            useProfile.getState().update((p) => {
              p.tutorialHidden = true;
            })
          }
        />
      ) : null}

      {/* ODbL attribution stays visible (SPEC §6.4). */}
      <View pointerEvents="none" style={[styles.attribution, { bottom: tabBarHeight + 2 }]}>
        <T size={9} color={tod.palette.label} style={{ opacity: 0.8 }}>
          © OpenFreeMap © OpenMapTiles © OpenStreetMap
        </T>
      </View>

      <MachineSheet
        ref={machineSheetRef}
        machineId={machineId}
        bottomInset={insets.bottom}
        onDismiss={() => setMachineId(null)}
        onSnap={(i) => {
          const share = MACHINE_SHEET.snapPoints[i];
          if (share !== undefined) setSheetShare(share);
        }}
      />
      <RivalSheet
        ref={rivalSheetRef}
        rivalId={rivalId}
        bottomInset={insets.bottom}
        onDismiss={() => setRivalId(null)}
        onBetterSpot={() => setHeat(true)}
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
            <Button label={t('map.backTo', { city: world.city.name })} onPress={leaveGlobe} />
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
  attribution: { position: 'absolute', left: SPACE.m },
  globeBack: { position: 'absolute', left: SPACE.xl, right: SPACE.xl },
});
