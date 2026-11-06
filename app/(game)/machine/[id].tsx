import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLOSEUP_CAMERA, getMachineType } from '@/config/machines';
import { CAMERA } from '@/config/map';
import { getProduct } from '@/config/products';
import { useCityClock } from '@/hooks/useCityClock';
import { useT } from '@/i18n';
import { closeupCamera, mapCameraToScene, type SceneCamera } from '@/map/cameraMatch';
import { baseTraffic, localTime, slotCapacity } from '@/sim';
import { weatherTrafficFactor } from '@/sim/demand';
import { sound, soundscape } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { useGame } from '@/store/game';
import { transition } from '@/store/transition';
import { CLOSEUP_MOTION } from '@/config/streetLife';
import { streetCrowd } from '@/three/life/density';
import { coinGlintsMs, restockPlan, soldSlots } from '@/three/life/interactions';
import { seedFrom } from '@/three/life/random';
import { MachineScene, type SlotView, type SlotsEvent } from '@/three/MachineScene';
import { useTheme } from '@/ui/ThemeProvider';
import { RoundButton } from '@/ui/hud';
import { Cabinet } from '@/ui/skin';
import { Button, Mono, T, Toast } from '@/ui/kit';
import { hasTelemetry } from '@/ui/machineStatus';
import { MachinePanel, type RestockPlan, type ToastTone } from '@/ui/machine/MachinePanel';
import { SPACE } from '@/ui/theme';

/** Machine close-up (SPEC §8): 3D front, slot grid, van crate, price tags, coin tray, repair, spec tag. */
export default function MachineCloseup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const tr = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const machine = game.machines.find((m) => m.id === id);
  const { now, tod } = useCityClock(world.city.lat, world.city.lng);
  const [selected, setSelected] = useState<number | null>(null);
  const [plan, setPlan] = useState<RestockPlan>({});
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [restockEvent, setRestockEvent] = useState<SlotsEvent | null>(null);
  const [saleEvent, setSaleEvent] = useState<SlotsEvent | null>(null);
  const [collectEvent, setCollectEvent] = useState<number | null>(null);
  const opacity = useSharedValue(0);
  // Sound/haptic timers for the scene's animations; cleared when leaving.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const eventSeq = useRef(0);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const type = machine ? getMachineType(machine.typeId) : null;

  // Camera: start from the exact map frame (if we came from the map), then dolly in.
  const cams = useMemo(() => {
    if (!machine || !type) return null;
    const to = closeupCamera(machine.heading, type.dims.heightM, CLOSEUP_CAMERA);
    const t = transition.get();
    const from: SceneCamera =
      t && t.machineId === machine.id
        ? mapCameraToScene({
            zoom: t.framed.zoom,
            pitch: t.framed.pitch,
            bearing: t.framed.bearing,
            latitude: machine.lat,
            viewportHeight: t.viewportHeight,
          })
        : mapCameraToScene({
            zoom: CAMERA.closeupZoom,
            pitch: CAMERA.closeupPitch,
            bearing: (machine.heading + 180) % 360,
            latitude: machine.lat,
            viewportHeight: height,
          });
    return { from, to };
    // Camera path is fixed when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine?.id]);
  const [path, setPath] = useState(cams);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: CAMERA.crossfadeMs });
    sound.hum(true);
    if (machine && hasTelemetry(game, machine) === false) {
      useGame.getState().act((d) => {
        const m = d.machines.find((x) => x.id === id);
        if (m) m.seen = { at: d.now, qty: m.slots.map((s) => s.qty), cashBoxCents: m.cashBoxCents };
        return { ok: true };
      });
    }
    return () => sound.hum(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Street life from the sim: real foot traffic at this cell and local hour (SPEC §5.2).
  const crowd = useMemo(() => {
    if (!machine) return 0.3;
    const local = localTime(now, world.city.timeZone, world.city.countryCode);
    const cell = world.cells.get(machine.cellId);
    if (!cell) return streetCrowd(0);
    const t = baseTraffic(cell, local.hour, local.restDay);
    return streetCrowd(t.total, weatherTrafficFactor(t, world.weatherAt(now)));
  }, [machine?.cellId, now, world]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close-up soundscape: compressor hum up front, the street around it at the
  // level of this spot's real foot traffic. The map re-feeds 'map' on focus.
  useEffect(() => {
    const w = world.weatherAt(now);
    soundscape.update({
      zoom: 20,
      tod: tod.weights,
      weather: w ? { condition: w.condition, tempC: w.tempC } : null,
      busy: crowd,
      scene: 'closeup',
    });
  }, [crowd, tod.weights, now, world]);

  // A sale while you watch: a product drops into the bin. The snapshot follows
  // every stock change (restocks too); only a rise in units sold plays a drop.
  const unitsTotal = machine?.stats.unitsTotal ?? 0;
  const qtyKey = machine?.slots.map((s) => s.qty).join(',') ?? '';
  const seenStock = useRef<{ units: number; qty: number[] } | null>(null);
  useEffect(() => {
    if (!machine) return;
    const qty = machine.slots.map((s) => s.qty);
    const prev = seenStock.current;
    seenStock.current = { units: unitsTotal, qty };
    if (!prev || unitsTotal <= prev.units) return;
    const sold = soldSlots(prev.qty, qty);
    if (!sold.length) return;
    setSaleEvent({ id: ++eventSeq.current, slots: sold });
    sold.forEach((_, i) =>
      later(i * 280 + CLOSEUP_MOTION.drop.tipMs, () => {
        sound.play('drop');
        haptic.tick();
      }),
    );
    // Stock and units sold are the inputs; `machine` itself changes identity every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitsTotal, qtyKey]);

  const leave = () => {
    if (leaving || !cams) return;
    setLeaving(true);
    setPath({ from: cams.to, to: cams.from });
    setTimeout(() => {
      opacity.value = withTiming(0, { duration: CAMERA.crossfadeMs }, (done) => {
        if (done) runOnJS(finishLeave)();
      });
    }, CLOSEUP_CAMERA.dollyMs * 0.8);
  };
  const finishLeave = () => {
    transition.requestReturn();
    router.back();
  };

  if (!machine || !type || !path) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          padding: SPACE.xl,
          paddingTop: insets.top + SPACE.xl,
        }}
      >
        <T>{tr('machineScreen.gone')}</T>
        <Button label={tr('machineScreen.backToMap')} onPress={() => router.back()} />
      </View>
    );
  }

  const cap = slotCapacity(game, type);
  const slotViews: SlotView[] = machine.slots.map((s, i) => {
    const p = plan[i];
    const productId = p ? p.productId : s.productId;
    const qty = p ? (s.productId === p.productId ? s.qty : 0) + p.qty : s.qty;
    return { color: productId ? getProduct(productId).color : null, fill: qty / cap };
  });

  const show = (text: string, tone: ToastTone = 'info') => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2600);
  };

  // 3D for the panel's actions: the cash door and coin glints, restock blocks sliding in.
  const onCollect = () => {
    setCollectEvent(++eventSeq.current);
    sound.play('door');
    coinGlintsMs().forEach((ms, i) =>
      later(ms, () => {
        haptic.tick();
        if (i % 3 === 0) sound.play('coin');
      }),
    );
  };
  const onRestock = (slotsIn: number[]) => {
    const plan3d = restockPlan(slotsIn.length);
    setRestockEvent({ id: ++eventSeq.current, slots: slotsIn });
    plan3d.ticksMs.forEach((ms) =>
      later(ms, () => {
        haptic.thunk();
        sound.play('thunk');
      }),
    );
    later(plan3d.doneMs + 120, () => {
      haptic.success();
      sound.play('success');
    });
  };

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: tod.palette.sky }, fade]}>
      <View style={{ height: height * 0.46 }}>
        <MachineScene
          typeId={machine.typeId}
          accent={theme.family[type.family]}
          slots={slotViews}
          sun={tod.sun}
          palette={tod.palette}
          heading={machine.heading}
          from={path.from}
          to={path.to}
          durationMs={CLOSEUP_CAMERA.dollyMs}
          broken={!!machine.broken}
          selectedSlot={selected}
          crowd={crowd}
          seed={seedFrom(machine.id)}
          restockEvent={restockEvent}
          saleEvent={saleEvent}
          collectEvent={collectEvent}
          onSlotPress={(i) => {
            setSelected(i);
            haptic.select();
          }}
          onFps={setFps}
        />
        <View style={[styles.topRow, { top: insets.top + SPACE.xs }]}>
          <RoundButton icon="back" label={tr('machineScreen.backToMap')} onPress={leave} />
          {__DEV__ && fps !== null ? (
            <View style={[styles.fps, { backgroundColor: theme.hud }]}>
              <Mono size={11}>{`${fps.toFixed(0)} fps`}</Mono>
            </View>
          ) : null}
        </View>
      </View>

      <Cabinet style={{ flex: 1 }} screws={false}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: SPACE.l,
            paddingBottom: insets.bottom + SPACE.xxl,
            gap: SPACE.l,
          }}
        >
          <MachinePanel
            machineId={machine.id}
            selected={selected}
            onSelect={setSelected}
            onPlanChange={setPlan}
            onRestock={onRestock}
            onCollect={onCollect}
            collectDelayMs={CLOSEUP_MOTION.coinTrayDelayMs}
            onToast={show}
            onGone={finishLeave}
          />
        </ScrollView>
      </Cabinet>
      {toast ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: SPACE.l,
            right: SPACE.l,
            bottom: insets.bottom + SPACE.l,
          }}
        >
          <Toast text={toast.text} tone={toast.tone} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    position: 'absolute',
    left: SPACE.m,
    right: SPACE.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fps: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
