import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTRACT, SERVICE } from '@/config/economy';
import { CLOSEUP_CAMERA, WRAPS, getMachineType } from '@/config/machines';
import { CAMERA } from '@/config/map';
import { getProduct } from '@/config/products';
import { RESEARCH } from '@/config/progression';
import { useCityClock } from '@/hooks/useCityClock';
import { closeupCamera, mapCameraToScene, type SceneCamera } from '@/map/cameraMatch';
import {
  applyAdReward,
  cashBoxCapacity,
  collectCash,
  baseTraffic,
  hasResearch,
  localTime,
  pickUpMachine,
  priceResponse,
  productsFor,
  renegotiate,
  repairMachine,
  restockCostCents,
  restockMachine,
  rotateMachine,
  setPar,
  setPrice,
  slotCapacity,
  suggestRestock,
  vanCapacity,
  type RestockLine,
} from '@/sim';
import { weatherTrafficFactor } from '@/sim/demand';
import { adsAvailable, showRewarded } from '@/services/ads';
import { sound, soundscape } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { track } from '@/services/analytics';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { transition } from '@/store/transition';
import { CLOSEUP_MOTION } from '@/config/streetLife';
import { isLeftHandTraffic, streetDensity } from '@/three/life/density';
import { coinGlintsMs, restockPlan, soldSlots } from '@/three/life/interactions';
import { seedFrom } from '@/three/life/random';
import { MachineScene, type SlotView, type SlotsEvent } from '@/three/MachineScene';
import { useTheme } from '@/ui/ThemeProvider';
import { money, moneyShort, pct } from '@/ui/format';
import { RoundButton, StatChip } from '@/ui/hud';
import { PRODUCT_IMAGES } from '@/ui/productImages';
import { Cabinet, Glass, Key, Led, Marquee, SKIN } from '@/ui/skin';
import { Icon, type IconName } from '@/ui/icons';
import { Button, Chip, Mono, Paper, Row, T, Toast } from '@/ui/kit';
import { hasTelemetry, machineStatus } from '@/ui/machineStatus';
import { CoinTray } from '@/ui/objects/CoinTray';
import { STATUS_LABEL } from '@/ui/objects/KeyTag';
import { SPACE, TOUCH } from '@/ui/theme';

type Plan = Record<number, RestockLine>;

/** Machine close-up (SPEC §8): 3D front, slot grid, van crate, price tags, coin tray, repair, spec tag. */
export default function MachineCloseup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const removeAds = useProfile((s) => s.entitlements.removeAds);
  const ownedWraps = useProfile((s) => s.entitlements.wraps).filter((w) => w in WRAPS);
  const machine = game.machines.find((m) => m.id === id);
  const { now, tod } = useCityClock(world.city.lat, world.city.lng);
  const [selected, setSelected] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan>({});
  const [coins, setCoins] = useState<{ gross: number; commission: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' | 'success' } | null>(
    null,
  );
  const [fps, setFps] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [restockEvent, setRestockEvent] = useState<SlotsEvent | null>(null);
  const [saleEvent, setSaleEvent] = useState<SlotsEvent | null>(null);
  const [collectEvent, setCollectEvent] = useState<number | null>(null);
  const [collecting, setCollecting] = useState(false);
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
  const street = useMemo(() => {
    if (!machine) return { crowd: 0.3, traffic: 0.3 };
    const local = localTime(now, world.city.timeZone, world.city.countryCode);
    const cell = world.cells.get(machine.cellId);
    if (!cell) return streetDensity(0);
    const t = baseTraffic(cell, local.hour, local.restDay);
    return streetDensity(t.total, weatherTrafficFactor(t, world.weatherAt(now)));
  }, [machine?.cellId, now, world]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close-up soundscape: compressor hum up front, the street around it at the
  // level of this spot's real foot traffic. The map re-feeds 'map' on focus.
  useEffect(() => {
    const w = world.weatherAt(now);
    soundscape.update({
      zoom: 20,
      tod: tod.weights,
      weather: w ? { condition: w.condition, tempC: w.tempC } : null,
      traffic: Math.max(street.crowd, street.traffic),
      scene: 'closeup',
    });
  }, [street.crowd, street.traffic, tod.weights, now, world]);

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
        <T>This machine is gone.</T>
        <Button label="Back to map" onPress={() => router.back()} />
      </View>
    );
  }

  const cap = slotCapacity(game, type);
  const van = vanCapacity(game);
  const live = hasTelemetry(game, machine);
  const status = machineStatus(game, machine);
  const planned = Object.values(plan);
  const plannedUnits = planned.reduce((a, l) => a + l.qty, 0);
  const plannedCost = planned.length ? restockCostCents(game, planned) : 0;
  const allowed = productsFor(game, type);
  const canPrice = !!game.chapterDoneAt[1] || game.chapter >= 2;

  const slotViews: SlotView[] = machine.slots.map((s, i) => {
    const p = plan[i];
    const productId = p ? p.productId : s.productId;
    const qty = p ? (s.productId === p.productId ? s.qty : 0) + p.qty : s.qty;
    return { color: productId ? getProduct(productId).color : null, fill: qty / cap };
  });

  const show = (text: string, tone: 'info' | 'error' | 'success' = 'info') => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2600);
  };

  const doCollect = () => {
    if (collecting) return;
    const res = useGame.getState().act((d) => collectCash(d, machine.id));
    if (!res.ok) return show(res.error, 'error');
    // The cash door opens and coins glint in 3D first, then the coin tray slides in.
    setCollecting(true);
    setCollectEvent(++eventSeq.current);
    sound.play('door');
    coinGlintsMs().forEach((ms, i) =>
      later(ms, () => {
        haptic.tick();
        if (i % 3 === 0) sound.play('coin');
      }),
    );
    later(CLOSEUP_MOTION.coinTrayDelayMs, () => {
      setCollecting(false);
      setCoins({ gross: res.grossCents, commission: res.commissionCents });
      sound.play('coins');
      if (res.pulledItem) show('Free collectible pull found in the cash box.', 'success');
    });
    track('collect', { count: Math.round(res.grossCents / 100) });
  };

  const fillAll = () => {
    const lines = suggestRestock(game, machine.id);
    const next: Plan = {};
    for (const l of lines) next[l.slot] = l;
    setPlan(next);
    haptic.thunk();
  };

  const loadSlot = (slot: number, productId: string) => {
    const s = machine.slots[slot];
    const existing = s.productId === productId ? s.qty : 0;
    const otherUnits = plannedUnits - (plan[slot]?.qty ?? 0);
    const qty = Math.max(0, Math.min(cap - existing, van - otherUnits));
    if (qty <= 0)
      return show(
        van - otherUnits <= 0 ? `Your van holds ${van} items per trip.` : 'That slot is full.',
      );
    setPlan({ ...plan, [slot]: { slot, productId, qty } });
    haptic.thunk();
    sound.play('thunk');
  };

  const commitRestock = () => {
    const res = useGame
      .getState()
      .act((d, w) => restockMachine(d, w, machine.id, planned, { manual: true }));
    if (!res.ok) {
      haptic.error();
      return show(res.error, 'error');
    }
    setPlan({});
    // Blocks slide in slot by slot; a thunk per landing (at most 8), success at the end.
    const slotsIn = planned.map((l) => l.slot).sort((a, b) => a - b);
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
    show(`Restocked ${res.units} items`, 'success');
    track('restock', { count: res.units });
  };

  const changePrice = (slot: number, delta: number) => {
    const s = machine.slots[slot];
    const res = useGame.getState().act((d) => setPrice(d, machine.id, slot, s.priceCents + delta));
    if (!res.ok) show(res.error, 'error');
    else haptic.tick();
  };

  const adRestock = async () => {
    const ok = await showRewarded('instant-restock');
    if (ok) {
      useGame
        .getState()
        .act((d, w) => applyAdReward(d, w, 'instant-restock', { machineId: machine.id }));
      show('Restocked.', 'success');
    }
  };

  const sel = selected !== null ? machine.slots[selected] : null;
  const selProduct = sel?.productId ? getProduct(sel.productId) : null;
  const contractLeft = machine.contract.endsAt - game.now;
  const ownedResearch = RESEARCH.filter((r) => hasResearch(game, r.id, type.family)).map(
    (r) => r.name,
  );

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: tod.palette.sky }, fade]}>
      <View style={{ height: height * 0.46 }}>
        <MachineScene
          typeId={machine.typeId}
          accent={
            machine.wrap && WRAPS[machine.wrap]
              ? WRAPS[machine.wrap].color
              : theme.family[type.family]
          }
          slots={slotViews}
          sun={tod.sun}
          palette={tod.palette}
          heading={machine.heading}
          from={path.from}
          to={path.to}
          durationMs={CLOSEUP_CAMERA.dollyMs}
          broken={!!machine.broken}
          selectedSlot={selected}
          crowd={street.crowd}
          traffic={street.traffic}
          leftHandTraffic={isLeftHandTraffic(world.city.countryCode)}
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
          <RoundButton icon="back" label="Back to map" onPress={leave} />
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
          {/* Who and how it's doing: one line of text, the rest as icons. */}
          <View style={{ gap: SPACE.s }}>
            <Marquee title={machine.venue.name} subtitle={type.name} />
            <Row style={{ justifyContent: 'center' }}>
              <Led
                size={14}
                color={
                  status === 'ok'
                    ? SKIN.ledGreen
                    : status === 'broken'
                      ? SKIN.ledRed
                      : SKIN.ledAmber
                }
                accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}
              >
                {`● ${STATUS_LABEL[status].toUpperCase()}`}
              </Led>
            </Row>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: SPACE.s }}
            >
              <StatChip
                icon="coin"
                label="Cash box"
                value={`${moneyShort(machine.cashBoxCents)} / ${moneyShort(cashBoxCapacity(game, type))}`}
                color={
                  machine.cashBoxCents >= cashBoxCapacity(game, type) * 0.95
                    ? theme.signal
                    : undefined
                }
              />
              <StatChip
                icon="percent"
                label="Venue commission"
                value={pct(machine.contract.commission)}
              />
              <StatChip
                icon="clock"
                label="Contract"
                value={contractLeft > 0 ? shortDuration(contractLeft) : 'renewing'}
              />
              <StatChip icon="smile" label={`Venue mood ${Math.round(machine.mood * 100)}%`}>
                <View style={[styles.mood, { backgroundColor: theme.line }]}>
                  <View
                    style={{
                      width: `${Math.round(machine.mood * 100)}%`,
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor:
                        machine.mood < CONTRACT.terminateBelow + 0.15
                          ? theme.alert
                          : machine.mood < 0.55
                            ? theme.amber
                            : theme.signal,
                    }}
                  />
                </View>
              </StatChip>
              {!live ? (
                <StatChip icon="eyeOff" label="No telemetry: stock shown from your last visit" />
              ) : null}
            </ScrollView>
          </View>

          {machine.broken ? (
            <Paper style={{ gap: SPACE.s }}>
              <Row>
                <Icon name="wrench" size={22} color={theme.alert} />
                <T weight="bold" color={theme.alert} style={{ flex: 1 }}>
                  {machine.broken.kind === 'fridge' ? 'Fridge broken' : 'Coil jammed'}
                </T>
                {machine.broken.techFixAt ? (
                  <StatChip
                    icon="clock"
                    label="Technician arrives in"
                    value={shortDuration(Math.max(0, machine.broken.techFixAt - game.now))}
                  />
                ) : null}
              </Row>
              <Button
                label={`Fix · ${moneyShort(SERVICE.manualRepairCostCents)}`}
                icon={<Icon name="wrench" size={20} color={theme.onBrand} />}
                onPress={() => {
                  const r = useGame.getState().act((d) => repairMachine(d, machine.id));
                  if (!r.ok) show(r.error, 'error');
                  else {
                    haptic.success();
                    sound.play('click');
                    show('Repaired', 'success');
                  }
                }}
              />
            </Paper>
          ) : null}

          {coins ? <CoinTray grossCents={coins.gross} commissionCents={coins.commission} /> : null}

          {/* The two jobs: take the cash, refill the coils. */}
          <Row gap={SPACE.s}>
            <Button
              label={
                coins
                  ? 'Collected'
                  : collecting
                    ? '…'
                    : `Collect ${moneyShort(machine.cashBoxCents)}`
              }
              icon={<Icon name="coin" size={20} color={coins ? theme.ink : theme.onBrand} />}
              kind={coins ? 'secondary' : 'primary'}
              disabled={!!coins || collecting}
              onPress={doCollect}
              style={{ flex: 1 }}
            />
            <Button
              label="Fill"
              icon={<Icon name="box" size={20} color={theme.ink} />}
              kind="secondary"
              onPress={fillAll}
              accessibilityHint={`Plan a full restock from the van, up to ${van} items`}
            />
            {!removeAds && adsAvailable() ? (
              <Button
                label="Instant restock (ad)"
                hideLabel
                icon={<Icon name="play" size={20} color={theme.ink} />}
                kind="secondary"
                onPress={adRestock}
                accessibilityHint="Watch an ad for an instant restock"
              />
            ) : null}
          </Row>
          {plannedUnits ? (
            <Row gap={SPACE.s}>
              <Button
                label={`Restock ${plannedUnits} · ${moneyShort(plannedCost)}`}
                icon={<Icon name="box" size={20} color={theme.onBrand} />}
                onPress={commitRestock}
                style={{ flex: 1 }}
                accessibilityHint={`Hand restocks sell ${Math.round(SERVICE.freshStockBonus * 100)}% more for a business day`}
              />
              <Button
                label="Clear"
                hideLabel
                icon={<Icon name="close" size={20} color={theme.ink} />}
                kind="secondary"
                onPress={() => setPlan({})}
                accessibilityHint="Clear the restock plan"
              />
            </Row>
          ) : null}

          {/* Coils behind the glass: product color, fill level, price. */}
          <Glass padding={SPACE.s}>
            <View style={styles.grid}>
              {machine.slots.map((s, i) => {
                const p = plan[i];
                const pid = p?.productId ?? s.productId;
                const qty = p ? (s.productId === p.productId ? s.qty : 0) + p.qty : s.qty;
                const shownQty = live || p ? qty : (machine.seen.qty[i] ?? s.qty);
                const color = pid ? getProduct(pid).color : theme.line;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`Slot ${i + 1}, ${pid ? getProduct(pid).name : 'empty'}, ${shownQty} of ${cap}`}
                    accessibilityState={{ selected: selected === i }}
                    onPress={() => setSelected(i)}
                    style={[styles.slotCell, { width: `${100 / Math.min(5, type.grid.cols)}%` }]}
                  >
                    <View
                      style={[
                        styles.slot,
                        {
                          backgroundColor: theme.surface,
                          borderColor: selected === i ? theme.brand : 'transparent',
                        },
                      ]}
                    >
                      {/* The product itself on its coil, faded when the coil is empty. */}
                      <View style={styles.coil}>
                        {pid && PRODUCT_IMAGES[pid] ? (
                          <Image
                            source={PRODUCT_IMAGES[pid]}
                            style={{ width: '100%', height: '100%', opacity: shownQty ? 1 : 0.25 }}
                            resizeMode="contain"
                          />
                        ) : null}
                      </View>
                      <View style={[styles.fill, { backgroundColor: theme.line }]}>
                        <View
                          style={{
                            width: `${Math.round((shownQty / cap) * 100)}%`,
                            height: '100%',
                            backgroundColor: p ? SKIN.ledAmber : color,
                            borderRadius: 3,
                          }}
                        />
                      </View>
                      <Mono size={12} weight="bold" center>
                        {pid
                          ? moneyShortPrice(s.priceCents || getProduct(pid).suggestedCents)
                          : '—'}
                      </Mono>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Glass>

          {selected !== null && sel ? (
            <Paper tone="surface" style={{ gap: SPACE.m }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T weight="bold">{selProduct ? selProduct.name : 'Empty coil'}</T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={10}
                  onPress={() => setSelected(null)}
                >
                  <Icon name="close" size={20} color={theme.muted} />
                </Pressable>
              </Row>
              <Row style={{ flexWrap: 'wrap' }}>
                {allowed.map((pr) => {
                  const on = (plan[selected]?.productId ?? sel.productId) === pr.id;
                  return (
                    <Key
                      key={pr.id}
                      tone={on ? 'brand' : 'white'}
                      height={84}
                      onPress={() => loadSlot(selected, pr.id)}
                      accessibilityLabel={`Load ${pr.name}`}
                      faceStyle={{
                        width: 76,
                        paddingHorizontal: 4,
                        flexDirection: 'column',
                        gap: 0,
                      }}
                    >
                      <Image
                        source={PRODUCT_IMAGES[pr.id]}
                        style={{ width: 52, height: 52 }}
                        resizeMode="contain"
                      />
                      <T
                        size={10}
                        weight="bold"
                        numberOfLines={1}
                        color={on ? '#FFFFFF' : SKIN.keyInk}
                      >
                        {pr.name.split(' ')[0]}
                      </T>
                    </Key>
                  );
                })}
              </Row>
              {selProduct ? (
                <>
                  <Row style={{ justifyContent: 'center' }} gap={SPACE.l}>
                    <Stepper
                      icon="minus"
                      label="Lower price"
                      disabled={!canPrice}
                      onPress={() => changePrice(selected, -5)}
                    />
                    <Mono size={26} weight="bold" style={{ minWidth: 90, textAlign: 'center' }}>
                      {money(sel.priceCents)}
                    </Mono>
                    <Stepper
                      icon="plus"
                      label="Raise price"
                      disabled={!canPrice}
                      onPress={() => changePrice(selected, 5)}
                    />
                  </Row>
                  <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                    <StatChip
                      icon="tag"
                      label="Suggested price"
                      value={money(selProduct.suggestedCents)}
                    />
                    <StatChip
                      icon="box"
                      label="Wholesale cost"
                      value={money(selProduct.wholesaleCents)}
                    />
                    <StatChip
                      icon="people"
                      label="Demand at this price"
                      value={pct(priceResponse(sel.priceCents / selProduct.suggestedCents))}
                    />
                    {!canPrice ? (
                      <StatChip icon="lock" label="Prices unlock after chapter 1" value="Ch. 2" />
                    ) : null}
                  </Row>
                  {hasResearch(game, 'auto-reorder', type.family) ? (
                    <Row style={{ justifyContent: 'center' }} gap={SPACE.l}>
                      <Stepper
                        icon="minus"
                        label="Lower driver par level"
                        onPress={() =>
                          useGame
                            .getState()
                            .act((d) => setPar(d, machine.id, selected, sel.par - 1))
                        }
                      />
                      <StatChip icon="box" label="Driver refills to" value={String(sel.par)} />
                      <Stepper
                        icon="plus"
                        label="Raise driver par level"
                        onPress={() =>
                          useGame
                            .getState()
                            .act((d) => setPar(d, machine.id, selected, sel.par + 1))
                        }
                      />
                    </Row>
                  ) : null}
                </>
              ) : null}
            </Paper>
          ) : null}

          {/* Spec: icons and numbers. */}
          <Row style={{ flexWrap: 'wrap' }}>
            <StatChip icon="grid" label="Slots" value={`${type.slots}×${cap}`} />
            <StatChip
              icon="bolt"
              label="Power per day"
              value={moneyShortPrice(type.powerCentsPerDay)}
            />
            <StatChip
              icon="wrench"
              label="Breakdowns per day"
              value={`${(type.breakdownPerDay * 100).toFixed(1)}%`}
            />
            <StatChip
              icon="lock"
              label="Theft risk"
              value={type.theftRisk >= 1.4 ? 'High' : type.theftRisk >= 1 ? 'Med' : 'Low'}
            />
            <StatChip icon="bag" label="Items sold" value={String(machine.stats.unitsTotal)} />
            <StatChip
              icon="coin"
              label="Revenue"
              value={moneyShort(machine.stats.revenueTotalCents)}
            />
            {ownedResearch.map((r) => (
              <StatChip key={r} icon="star" label="Upgrade" value={r} color={theme.brand} />
            ))}
          </Row>

          <Row style={{ flexWrap: 'wrap' }}>
            {ownedWraps.map((w) => (
              <Chip
                key={w}
                label={WRAPS[w].name}
                color={WRAPS[w].color}
                active={machine.wrap === w}
                onPress={() =>
                  useGame.getState().act((d) => {
                    const m = d.machines.find((x) => x.id === machine.id);
                    if (m) m.wrap = m.wrap === w ? null : w;
                    return { ok: true };
                  })
                }
              />
            ))}
            <IconChip
              icon="rotate"
              label="Rotate"
              onPress={() =>
                useGame.getState().act((d) => rotateMachine(d, machine.id, machine.heading + 90))
              }
            />
            {!machine.contract.renegotiated ? (
              <IconChip
                icon="handshake"
                label="Renegotiate"
                onPress={() => {
                  const r = useGame.getState().act((d) => renegotiate(d, machine.id));
                  show(
                    r.ok ? `Commission now ${pct(r.commission, 1)}` : r.error,
                    r.ok ? 'success' : 'error',
                  );
                }}
              />
            ) : null}
            <IconChip
              icon="box"
              label="Pick up"
              onPress={() =>
                Alert.alert(
                  'Pick up this machine?',
                  'It goes back to storage; the contract ends.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Pick up',
                      style: 'destructive',
                      onPress: () => {
                        useGame.getState().act((d) => pickUpMachine(d, machine.id));
                        finishLeave();
                      },
                    },
                  ],
                )
              }
            />
          </Row>
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

/** Round − / + button for steppers. */
function Stepper({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'plus' | 'minus';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepper,
        {
          backgroundColor: theme.brandSoft,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
      ]}
    >
      <Icon name={icon} size={22} color={theme.brand} />
    </Pressable>
  );
}

/** A chip with an icon and a one-word label. */
function IconChip({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconChip,
        { backgroundColor: theme.surface, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <Icon name={icon} size={18} color={theme.ink} />
      <T size={13} weight="bold">
        {label}
      </T>
    </Pressable>
  );
}

/** Prices on coils: "$1.50" (cents matter here, unlike the HUD). */
function moneyShortPrice(cents: number): string {
  return money(cents);
}

/** "12 h", "3 d", "45 m". */
function shortDuration(ms: number): string {
  const min = ms / 60_000;
  if (min < 60) return `${Math.max(1, Math.round(min))} m`;
  const h = min / 60;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
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
  round: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fps: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: SPACE.m,
    borderRadius: 16,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  mood: { width: 44, height: 8, borderRadius: 4, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  slotCell: { padding: 4 },
  slot: { padding: 6, borderRadius: 14, gap: 4, borderWidth: 2 },
  coil: { height: 46, alignItems: 'center', justifyContent: 'center' },
  fill: { height: 6, borderRadius: 3, overflow: 'hidden' },
  stepper: {
    width: TOUCH + 4,
    height: TOUCH + 4,
    borderRadius: (TOUCH + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: SPACE.m,
    borderRadius: 19,
  },
  step: {
    width: TOUCH,
    height: TOUCH,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
