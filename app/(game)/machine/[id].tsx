import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  hasResearch,
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
import { adsAvailable, showRewarded } from '@/services/ads';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { track } from '@/services/analytics';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { transition } from '@/store/transition';
import { MachineScene, type SlotView } from '@/three/MachineScene';
import { useTheme } from '@/ui/ThemeProvider';
import { duration, money, pct } from '@/ui/format';
import { Button, Chip, Divider, Mono, Paper, ProgressBar, Row, Section, T, Toast } from '@/ui/kit';
import { hasTelemetry, machineStatus } from '@/ui/machineStatus';
import { CoinTray } from '@/ui/objects/CoinTray';
import { STATUS_LABEL, statusColor } from '@/ui/objects/KeyTag';
import { SpecTag } from '@/ui/objects/small';
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
  const { tod } = useCityClock(world.city.lat, world.city.lng);
  const [selected, setSelected] = useState<number | null>(null);
  const [plan, setPlan] = useState<Plan>({});
  const [coins, setCoins] = useState<{ gross: number; commission: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'info' | 'error' | 'success' } | null>(
    null,
  );
  const [fps, setFps] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const opacity = useSharedValue(0);

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
    const res = useGame.getState().act((d) => collectCash(d, machine.id));
    if (!res.ok) return show(res.error, 'error');
    setCoins({ gross: res.grossCents, commission: res.commissionCents });
    sound.play('coins');
    if (res.pulledItem) show('Free collectible pull found in the cash box.', 'success');
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
    haptic.success();
    sound.play('vend');
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
          onSlotPress={(i) => {
            setSelected(i);
            haptic.select();
          }}
          onFps={setFps}
        />
        <View style={[styles.topRow, { top: insets.top + SPACE.xs }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to map"
            onPress={leave}
            style={[styles.round, { backgroundColor: theme.hud }]}
          >
            <T size={22}>{'‹'}</T>
          </Pressable>
          {__DEV__ && fps !== null ? (
            <View style={[styles.fps, { backgroundColor: theme.hud }]}>
              <Mono size={11}>{`${fps.toFixed(0)} fps`}</Mono>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: SPACE.l,
          paddingBottom: insets.bottom + SPACE.xxl,
          gap: SPACE.l,
        }}
      >
        <View style={{ gap: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={19} weight="bold" accessibilityRole="header" style={{ flex: 1 }}>
              {type.name}
            </T>
            <Row gap={4}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: statusColor(status, theme),
                }}
              />
              <T size={13} muted>
                {STATUS_LABEL[status]}
              </T>
            </Row>
          </Row>
          <T size={13} muted>
            {machine.venue.name} · {pct(machine.contract.commission, 1)} commission ·{' '}
            {contractLeft > 0 ? `${duration(contractLeft)} left` : 'renewing'}
          </T>
          <Row style={{ marginTop: 6 }}>
            <T size={12} muted style={{ width: 92 }}>
              Venue mood
            </T>
            <View style={{ flex: 1 }}>
              <ProgressBar
                value={machine.mood}
                color={
                  machine.mood < CONTRACT.terminateBelow + 0.15
                    ? theme.alert
                    : machine.mood < 0.55
                      ? theme.amber
                      : theme.signal
                }
              />
            </View>
          </Row>
          {!live ? (
            <T size={12} muted>
              No telemetry: you see stock when you visit.
            </T>
          ) : null}
        </View>

        {machine.broken ? (
          <Paper style={{ borderColor: theme.alert, borderWidth: 1 }}>
            <T weight="bold" color={theme.alert}>
              {machine.broken.kind === 'fridge' ? 'Refrigeration failure' : 'Coil jammed'}
            </T>
            <T size={13} muted>
              {machine.broken.techFixAt
                ? `Technician arrives in ${duration(Math.max(0, machine.broken.techFixAt - game.now))}.`
                : 'It sells nothing until it is fixed.'}
            </T>
            <Button
              label={`Fix it by hand · ${money(SERVICE.manualRepairCostCents)}`}
              onPress={() => {
                const r = useGame.getState().act((d) => repairMachine(d, machine.id));
                if (!r.ok) show(r.error, 'error');
                else {
                  haptic.success();
                  sound.play('click');
                  show('Repaired', 'success');
                }
              }}
              style={{ marginTop: SPACE.s }}
            />
          </Paper>
        ) : null}

        <Section
          title="Cash box"
          right={
            <Mono
              size={13}
            >{`${money(machine.cashBoxCents)} / ${money(cashBoxCapacity(game, type), { compact: true })}`}</Mono>
          }
        >
          {coins ? <CoinTray grossCents={coins.gross} commissionCents={coins.commission} /> : null}
          <Button
            label={coins ? 'Collected' : 'Open the cash box'}
            kind={coins ? 'secondary' : 'primary'}
            disabled={!!coins}
            onPress={doCollect}
          />
        </Section>

        <Section
          title={`Van crate · ${plannedUnits}/${van} items`}
          right={plannedUnits ? <Mono size={13}>{money(plannedCost)}</Mono> : null}
        >
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="Fill all" onPress={fillAll} />
            {plannedUnits ? <Chip label="Clear" onPress={() => setPlan({})} /> : null}
            {!removeAds && adsAvailable() ? (
              <Chip label="Instant restock (ad)" onPress={adRestock} />
            ) : null}
          </Row>
          {plannedUnits ? (
            <Button
              label={`Restock ${plannedUnits} items · ${money(plannedCost)}`}
              onPress={commitRestock}
            />
          ) : null}
          <T size={12} muted>
            Restocking by hand adds a fresh-stock bonus (+
            {Math.round(SERVICE.freshStockBonus * 100)}% sales for a business day).
          </T>
        </Section>

        <Section title="Slots">
          <View style={styles.grid}>
            {machine.slots.map((s, i) => {
              const p = plan[i];
              const pid = p?.productId ?? s.productId;
              const qty = p ? (s.productId === p.productId ? s.qty : 0) + p.qty : s.qty;
              const shownQty = live || p ? qty : (machine.seen.qty[i] ?? s.qty);
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`Slot ${i + 1}, ${pid ? getProduct(pid).name : 'empty'}, ${shownQty} of ${cap}`}
                  accessibilityState={{ selected: selected === i }}
                  onPress={() => setSelected(i)}
                  style={[
                    styles.slot,
                    {
                      borderColor: selected === i ? theme.amber : theme.line,
                      backgroundColor: theme.surface,
                      width: `${100 / Math.min(5, type.grid.cols)}%`,
                    },
                  ]}
                >
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: pid ? getProduct(pid).color : theme.line,
                      opacity: qty ? 1 : 0.35,
                    }}
                  />
                  <Mono size={11}>{`${shownQty}/${cap}`}</Mono>
                  <Mono size={11} muted>
                    {pid ? money(s.priceCents || getProduct(pid).suggestedCents) : '—'}
                  </Mono>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {selected !== null && sel ? (
          <Paper tone="surface" style={{ gap: SPACE.s }}>
            <T weight="bold">{`Slot ${selected + 1} · ${selProduct ? selProduct.name : 'Empty'}`}</T>
            <T size={12} muted>
              Load from the van:
            </T>
            <Row style={{ flexWrap: 'wrap' }}>
              {allowed.map((pr) => (
                <Chip
                  key={pr.id}
                  label={pr.name}
                  color={pr.color}
                  active={(plan[selected]?.productId ?? sel.productId) === pr.id}
                  onPress={() => loadSlot(selected, pr.id)}
                />
              ))}
            </Row>
            {selProduct ? (
              <>
                <Divider dashed />
                <Row style={{ justifyContent: 'space-between' }}>
                  <T size={13}>Price tag</T>
                  <Row>
                    <Pressable
                      accessibilityLabel="Lower price"
                      accessibilityRole="button"
                      disabled={!canPrice}
                      onPress={() => changePrice(selected, -5)}
                      style={[
                        styles.step,
                        { borderColor: theme.line, opacity: canPrice ? 1 : 0.4 },
                      ]}
                    >
                      <T>{'−'}</T>
                    </Pressable>
                    <Mono size={16} weight="bold" style={{ minWidth: 64, textAlign: 'center' }}>
                      {money(sel.priceCents)}
                    </Mono>
                    <Pressable
                      accessibilityLabel="Raise price"
                      accessibilityRole="button"
                      disabled={!canPrice}
                      onPress={() => changePrice(selected, 5)}
                      style={[
                        styles.step,
                        { borderColor: theme.line, opacity: canPrice ? 1 : 0.4 },
                      ]}
                    >
                      <T>+</T>
                    </Pressable>
                  </Row>
                </Row>
                <T size={12} muted>
                  {`Suggested ${money(selProduct.suggestedCents)} · wholesale ${money(selProduct.wholesaleCents)} · demand at this price ${Math.round(priceResponse(sel.priceCents / selProduct.suggestedCents) * 100)}%`}
                  {canPrice ? '' : ' · Price setting unlocks after chapter 1.'}
                </T>
                {hasResearch(game, 'auto-reorder', type.family) ? (
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T size={13}>{`Driver par level: ${sel.par}`}</T>
                    <Row>
                      <Chip
                        label="−"
                        onPress={() =>
                          useGame
                            .getState()
                            .act((d) => setPar(d, machine.id, selected, sel.par - 1))
                        }
                      />
                      <Chip
                        label="+"
                        onPress={() =>
                          useGame
                            .getState()
                            .act((d) => setPar(d, machine.id, selected, sel.par + 1))
                        }
                      />
                    </Row>
                  </Row>
                ) : null}
              </>
            ) : null}
          </Paper>
        ) : null}

        <SpecTag
          title="Spec"
          rows={[
            ['Slots', `${type.slots} × ${cap}`],
            ['Power', `${money(type.powerCentsPerDay)}/day`],
            ['Breakdowns', `${(type.breakdownPerDay * 100).toFixed(1)}%/day`],
            ['Theft risk', type.theftRisk >= 1.4 ? 'High' : type.theftRisk >= 1 ? 'Medium' : 'Low'],
            ['Sold', `${machine.stats.unitsTotal} items`],
            ['Revenue', money(machine.stats.revenueTotalCents)],
          ]}
        >
          <T size={12} color="#5C6066">
            {ownedResearch.length
              ? `Upgrades: ${ownedResearch.join(', ')}`
              : 'No upgrades yet. Research them for the whole family in Company.'}
          </T>
        </SpecTag>

        <Section title="Machine">
          <Row style={{ flexWrap: 'wrap' }}>
            {ownedWraps.map((w) => (
              <Chip
                key={w}
                label={`Wrap: ${WRAPS[w].name}`}
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
            <Chip
              label="Rotate 90°"
              onPress={() =>
                useGame.getState().act((d) => rotateMachine(d, machine.id, machine.heading + 90))
              }
            />
            {!machine.contract.renegotiated ? (
              <Chip
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
            <Chip
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
        </Section>
      </ScrollView>
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
  round: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fps: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  slot: {
    padding: 6,
    borderWidth: 1,
    borderRadius: 6,
    gap: 2,
    minHeight: TOUCH + 8,
    marginBottom: 6,
    borderLeftWidth: 3,
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
