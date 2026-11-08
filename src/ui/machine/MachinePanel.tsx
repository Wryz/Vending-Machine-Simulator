import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CONTRACT, SERVICE } from '@/config/economy';
import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';
import { RESEARCH } from '@/config/progression';
import { t as tg, useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError, venueName } from '@/i18n/sim';
import {
  addSlotRow,
  applyAdReward,
  canCarry,
  cashBoxCapacity,
  collectCash,
  dismissRequest,
  hasResearch,
  nextSlotRow,
  pickUpMachine,
  orderRestock,
  priceResponse,
  productsFor,
  repairMachine,
  quoteDelivery,
  setPar,
  setPrice,
  slotCapacity,
  suggestRestock,
  vanCapacity,
  wholesaleCents,
  type RestockLine,
} from '@/sim';
import { adsAvailable, showRewarded } from '@/services/ads';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { track } from '@/services/analytics';
import { currentCurrency } from '@/store/currency';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';

import { stepPriceCents } from '../currency';
import { money, moneyPrice, moneyShort, pct } from '../format';
import { StatChip } from '../hud';
import { Icon, type IconName } from '../icons';
import { Button, Mono, Paper, Row, T } from '../kit';
import { hasTelemetry, machineStatus } from '../machineStatus';
import { CoinTray } from '../objects/CoinTray';
import { MachineWindow } from './MachineWindow';
import { coilCode, ProductPicker } from './ProductPicker';
import { clockDuration, VanCard } from './VanCard';
import { RequestCard, type RequestStage } from './RequestCard';
import { FeaturedStats, SpecGrid, type Spec } from './SpecGrid';
import { statusLabel } from '../objects/KeyTag';
import { GuideLine, Pulse, useTutorialStep } from '../guide';
import { Led, Marquee, useSkin } from '../skin';
import { useTheme } from '../ThemeProvider';
import { SPACE, TOUCH } from '../theme';

export type RestockPlan = Record<number, RestockLine>;
export type ToastTone = 'info' | 'error' | 'success';

/**
 * One machine's controls (SPEC §8): status, cash box, collect, restock plan,
 * coils with prices, price and par steppers, spec and contract actions.
 * Shared by the map's machine sheet and the 3D close-up; the close-up passes
 * the hooks it needs to animate (restock blocks, cash door). Key it by machine id
 * so a different machine starts with a fresh plan.
 */
export function MachinePanel({
  machineId,
  selected: selectedProp,
  onSelect,
  onPlanChange,
  onRestock,
  onCollect,
  collectDelayMs = 450,
  onToast,
  onGone,
}: {
  machineId: string;
  /** Controlled selected slot (the close-up selects from 3D taps too). */
  selected?: number | null;
  onSelect?: (slot: number | null) => void;
  /** The planned restock changed (the close-up previews it on the coils). */
  onPlanChange?: (plan: RestockPlan) => void;
  /** A van filled these slots while open (animate them). */
  onRestock?: (slots: number[]) => void;
  /** Cash was taken (animate the door); the coin tray shows after `collectDelayMs`. */
  onCollect?: () => void;
  collectDelayMs?: number;
  onToast: (text: string, tone: ToastTone) => void;
  /** The machine was picked up. */
  onGone?: () => void;
}) {
  const theme = useTheme();
  const skin = useSkin();
  const t = useT();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world);
  const removeAds = useProfile((s) => s.entitlements.removeAds);
  const machine = game.machines.find((m) => m.id === machineId);
  const [ownSelected, setOwnSelected] = useState<number | null>(null);
  const selected = selectedProp !== undefined ? selectedProp : ownSelected;
  const setSelected = (i: number | null) => {
    setOwnSelected(i);
    onSelect?.(i);
  };
  const [plan, setPlanState] = useState<RestockPlan>({});
  const setPlan = (p: RestockPlan) => {
    setPlanState(p);
    onPlanChange?.(p);
  };
  const [coins, setCoins] = useState<{ gross: number; commission: number } | null>(null);
  const [collecting, setCollecting] = useState(false);
  // One ad at a time (a double tap must not open two).
  const adBusy = useRef(false);
  /** Specs and the less common actions stay folded away until asked for. */
  const [more, setMore] = useState(false);
  const step = useTutorialStep();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  // The van arrived while this was open: let the close-up animate the coils filling.
  const enRoute = game.deliveries.find((d) => d.machineId === machineId) ?? null;
  const lastRoute = useRef(enRoute);
  useEffect(() => {
    const before = lastRoute.current;
    lastRoute.current = enRoute;
    if (before && !enRoute) onRestock?.(before.lines.map((l) => l.slot).sort((a, b) => a - b));
  }, [enRoute, onRestock]);

  if (!machine) return null;
  const type = getMachineType(machine.typeId);
  const show = (text: string, tone: ToastTone = 'info') => onToast(text, tone);
  const finishLeave = () => onGone?.();

  const cap = slotCapacity(game, type);
  const van = vanCapacity(game);
  const live = hasTelemetry(game, machine);
  const status = machineStatus(game, machine);
  const planned = Object.values(plan);
  const plannedUnits = planned.reduce((a, l) => a + l.qty, 0);
  // The van on its way here, and what an order would cost (stock plus fuel).
  const onTheWay = enRoute;
  const incoming: RestockPlan = {};
  for (const l of onTheWay?.lines ?? []) incoming[l.slot] = l;
  const quote = planned.length && world ? quoteDelivery(game, world, machine, planned) : null;
  const plannedCost = quote ? quote.wholesaleCents + quote.fuelCents : 0;
  const allowed = productsFor(game, type);
  const canPrice = !!game.chapterDoneAt[1] || game.chapter >= 2;
  // Tutorial: what to press next on this machine (and pulse that key).
  const guide: { text: string; key: 'fill' | 'restock' | 'collect' | null } | null =
    step === 'delivery' && onTheWay
      ? { text: t('coach.guide.onTheWay'), key: null }
      : step === 'stock'
        ? plannedUnits
          ? { text: t('coach.guide.restock'), key: 'restock' }
          : { text: t('coach.guide.fill'), key: 'fill' }
        : step === 'wait' && machine.slots.some((x) => x.qty > 0)
          ? { text: t('coach.guide.wait'), key: null }
          : step === 'collect' && machine.cashBoxCents > 0 && !coins
            ? { text: t('coach.guide.collect'), key: 'collect' }
            : null;

  // A customer's request at this machine (a bubble on the map).
  const request = game.requests.open.find((r) => r.machineId === machine.id) ?? null;
  const requestFits = !!request && canCarry(game, machine, request.productId);
  const requestLoaded =
    !!request && Object.values(plan).some((l) => l.productId === request.productId);
  const requestOnVan =
    !!request && !!onTheWay?.lines.some((l) => l.productId === request.productId && l.qty > 0);
  const requestStage: RequestStage = requestOnVan
    ? { kind: 'coming', eta: clockDuration(onTheWay!.arriveAt - game.now) }
    : onTheWay
      ? { kind: 'vanBusy' }
      : requestLoaded
        ? {
            kind: 'planned',
            orderLabel: t('requests.card.order', { cost: moneyShort(plannedCost) }),
          }
        : { kind: 'load' };
  const dismiss = () => {
    if (!request) return;
    const r = useGame.getState().act((d) => dismissRequest(d, request.id));
    if (!r.ok) show(simError(r.error), 'error');
    else haptic.select();
  };
  /** Put the requested product in a coil: one that has it, else an empty one, else the emptiest. */
  const loadRequest = () => {
    if (!request) return;
    const pid = request.productId;
    const slots = machine.slots.map((s, i) => ({ s, i })).filter(({ i }) => !plan[i]);
    const pickSlot =
      slots.find(({ s }) => s.productId === pid) ??
      slots.find(({ s }) => !s.productId || s.qty === 0) ??
      slots.sort((a, b) => a.s.qty - b.s.qty)[0];
    if (pickSlot) loadSlot(pickSlot.i, pid);
  };

  const doCollect = () => {
    if (collecting) return;
    const res = useGame.getState().act((d) => collectCash(d, machine.id));
    if (!res.ok) return show(simError(res.error), 'error');
    setCollecting(true);
    if (onCollect) onCollect();
    else {
      sound.play('door');
      haptic.tick();
    }
    later(collectDelayMs, () => {
      setCollecting(false);
      setCoins({ gross: res.grossCents, commission: res.commissionCents });
      sound.play('coins');
      haptic.success();
      if (res.pulledItem) show(t('machinePanel.toast.pull'), 'success');
    });
    track('collect', { count: Math.round(res.grossCents / 100) });
  };

  const fillAll = () => {
    const lines = suggestRestock(game, machine.id);
    const next: RestockPlan = {};
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
        van - otherUnits <= 0
          ? t('machinePanel.toast.vanFull', { n: van })
          : t('machinePanel.toast.slotFull'),
      );
    setPlan({ ...plan, [slot]: { slot, productId, qty } });
    haptic.thunk();
    sound.play('thunk');
  };

  const commitRestock = () => {
    const res = useGame.getState().act((d, w) => orderRestock(d, w, machine.id, planned));
    if (!res.ok) {
      haptic.error();
      return show(simError(res.error), 'error');
    }
    // Paid now; the van fills the coils when it arrives (a moment plays then).
    setPlan({});
    haptic.success();
    sound.play('thunk');
    show(
      t('machinePanel.toast.ordered', {
        time: clockDuration(res.delivery.arriveAt - res.delivery.orderedAt),
      }),
      'success',
    );
    track('restock', { count: res.delivery.units });
  };

  /** One local price step (¥10, ₩100, 5¢...), stored back as the sim's US cents. */
  const changePrice = (slot: number, dir: 1 | -1) => {
    const s = machine.slots[slot];
    const next = stepPriceCents(s.priceCents, dir, currentCurrency());
    const res = useGame.getState().act((d) => setPrice(d, machine.id, slot, next));
    if (!res.ok) show(simError(res.error), 'error');
    else haptic.tick();
  };

  const adRestock = async () => {
    if (adBusy.current) return;
    adBusy.current = true;
    try {
      const ok = await showRewarded('instant-restock');
      if (!ok) return;
      const r = useGame
        .getState()
        .act((d, w) => applyAdReward(d, w, 'instant-restock', { machineId: machine.id }));
      if (r.ok) show(t('machinePanel.toast.adRestocked'), 'success');
      else show(simError(r.error), 'error');
    } finally {
      adBusy.current = false;
    }
  };

  // Machine upgrade: one more row of slots (permanent).
  const row = nextSlotRow(machine);
  const buyRow = () => {
    const r = useGame.getState().act((d) => addSlotRow(d, machine.id));
    if (!r.ok) {
      haptic.error();
      return show(simError(r.error), 'error');
    }
    haptic.success();
    sound.play('thunk');
    show(t('machinePanel.rows.added', { n: r.slots }), 'success');
    track('slot_row', { count: r.slots });
  };

  const sel = selected !== null ? machine.slots[selected] : null;
  const selProduct = sel?.productId ? getProduct(sel.productId) : null;
  const contractLeft = machine.contract.endsAt - game.now;
  const ownedResearch = RESEARCH.filter((r) => hasResearch(game, r.id, type.family)).map((r) =>
    content.researchName(r.id, r.name),
  );

  const theftLevel =
    type.theftRisk >= 1.4
      ? t('machinePanel.stats.theftHigh')
      : type.theftRisk >= 1
        ? t('machinePanel.stats.theftMed')
        : t('machinePanel.stats.theftLow');
  // The city's clock (the phone's until the city data is in).
  const timeZone = world?.city.timeZone;
  const cashCap = cashBoxCapacity(game, type);
  const moodPct = Math.round(machine.mood * 100);
  const specs: Spec[] = [
    {
      icon: 'coin',
      label: t('machinePanel.stats.cashBox'),
      value: `${moneyShort(machine.cashBoxCents)} / ${moneyShort(cashCap)}`,
      color: machine.cashBoxCents >= cashCap * 0.95 ? theme.signal : undefined,
    },
    {
      icon: 'percent',
      label: t('machinePanel.stats.commission'),
      value: pct(machine.contract.commission),
    },
    {
      icon: 'clock',
      label: t('machinePanel.stats.contract'),
      value: contractLeft > 0 ? shortDuration(contractLeft) : t('machinePanel.stats.renewing'),
    },
    {
      icon: 'smile',
      label: t('machinePanel.stats.moodLabel'),
      value: `${moodPct}%`,
      color:
        machine.mood < CONTRACT.terminateBelow + 0.15
          ? theme.alert
          : machine.mood < 0.55
            ? theme.amber
            : undefined,
    },
    {
      icon: 'grid',
      label: t('machinePanel.stats.coils'),
      value: `${machine.slots.length} / ${type.slots}`,
    },
    {
      icon: 'box',
      label: t('machinePanel.stats.slots'),
      value: count(machine.slots.length * cap, t.lang),
    },
    { icon: 'bolt', label: t('machinePanel.stats.power'), value: money(type.powerCentsPerDay) },
    {
      icon: 'wrench',
      label: t('machinePanel.stats.breakdowns'),
      value: pct(type.breakdownPerDay, 1),
    },
    { icon: 'eyeOff', label: t('machinePanel.stats.theft'), value: theftLevel },
    ...ownedResearch.map((r): Spec => ({
      icon: 'star',
      label: t('machinePanel.stats.upgrade'),
      value: r,
      color: theme.brand,
    })),
  ];

  // The headline numbers, featured above the spec sheet.
  const featured: Spec[] = [
    {
      icon: 'coin',
      label: t('machinePanel.stats.revenue'),
      value: moneyShort(machine.stats.revenueTotalCents),
    },
    {
      icon: 'bag',
      label: t('machinePanel.stats.sold'),
      value: count(machine.stats.unitsTotal, t.lang),
    },
  ];

  return (
    <View style={{ gap: SPACE.l }}>
      {/* Who and how it's doing: one line of text, the rest as icons. */}
      <View style={{ gap: SPACE.s }}>
        <Marquee
          title={venueName(machine.venue.name)}
          subtitle={content.machineType(type.id, type.name)}
        />
        <Row style={{ justifyContent: 'center' }}>
          <Led
            size={14}
            color={
              status === 'ok' ? skin.ledGreen : status === 'broken' ? skin.ledRed : skin.ledAmber
            }
            accessibilityLabel={t('machinePanel.a11y.status', { status: statusLabel(status) })}
          >
            {t('machinePanel.statusLed', { status: statusLabel(status).toUpperCase() })}
          </Led>
        </Row>
        {!live ? (
          <Row style={{ justifyContent: 'center' }}>
            <Icon name="eyeOff" size={14} color={theme.muted} />
            <T size={12} muted>
              {t('machinePanel.stats.noTelemetry')}
            </T>
          </Row>
        ) : null}
      </View>

      {machine.broken ? (
        <Paper style={{ gap: SPACE.s }}>
          <Row>
            <Icon name="wrench" size={22} color={theme.alert} />
            <T weight="bold" color={theme.alert} style={{ flex: 1 }}>
              {machine.broken.kind === 'fridge'
                ? t('machinePanel.broken.fridge')
                : t('machinePanel.broken.coil')}
            </T>
            {machine.broken.techFixAt ? (
              <StatChip
                icon="clock"
                label={t('machinePanel.stats.techIn')}
                value={shortDuration(Math.max(0, machine.broken.techFixAt - game.now))}
              />
            ) : null}
          </Row>
          <Button
            label={t('machinePanel.broken.fix', {
              cost: moneyShort(SERVICE.manualRepairCostCents),
            })}
            icon={<Icon name="wrench" size={20} color={theme.onBrand} />}
            onPress={() => {
              const r = useGame.getState().act((d) => repairMachine(d, machine.id));
              if (!r.ok) show(simError(r.error), 'error');
              else {
                haptic.success();
                sound.play('click');
                show(t('machinePanel.toast.repaired'), 'success');
              }
            }}
          />
        </Paper>
      ) : null}

      {coins ? <CoinTray grossCents={coins.gross} commissionCents={coins.commission} /> : null}

      {guide ? <GuideLine text={guide.text} /> : null}
      {request && !guide ? (
        <RequestCard
          request={request}
          waitLabel={shortDuration(Math.max(0, request.until - game.now))}
          chapter={game.chapter}
          fits={requestFits}
          stage={requestStage}
          priceCents={
            machine.slots.find((s) => s.productId === request.productId)?.priceCents ||
            getProduct(request.productId).suggestedCents
          }
          onLoad={loadRequest}
          onOrder={commitRestock}
          onDismiss={dismiss}
        />
      ) : null}

      {onTheWay ? (
        <VanCard
          delivery={onTheWay}
          driverName={
            onTheWay.driverId
              ? game.drivers.find((d) => d.id === onTheWay.driverId)?.name
              : undefined
          }
        />
      ) : null}

      {/* The two jobs: take the cash, refill the coils. */}
      <Row gap={SPACE.s}>
        <Pulse on={guide?.key === 'collect'} style={{ flex: 1 }}>
          <Button
            label={
              coins
                ? t('machinePanel.actions.collected')
                : collecting
                  ? '…'
                  : t('machinePanel.actions.collect', { amount: moneyShort(machine.cashBoxCents) })
            }
            icon={<Icon name="coin" size={20} color={coins ? theme.ink : theme.onBrand} />}
            kind={coins ? 'secondary' : 'primary'}
            disabled={!!coins || collecting}
            onPress={doCollect}
          />
        </Pulse>
        <Pulse on={guide?.key === 'fill'}>
          <Button
            label={t('machinePanel.actions.fill')}
            icon={<Icon name="box" size={20} color={theme.ink} />}
            kind="secondary"
            disabled={!!onTheWay}
            onPress={fillAll}
            accessibilityHint={t('machinePanel.actions.fillHint', { n: van })}
          />
        </Pulse>
        {!removeAds && adsAvailable() ? (
          <Button
            label={t('machinePanel.actions.adRestock')}
            hideLabel
            icon={<Icon name="play" size={20} color={theme.ink} />}
            kind="secondary"
            onPress={adRestock}
            accessibilityHint={t('machinePanel.actions.adRestockHint')}
          />
        ) : null}
      </Row>
      {plannedUnits && !onTheWay ? (
        <Row gap={SPACE.s}>
          <Pulse on={guide?.key === 'restock'} style={{ flex: 1 }}>
            <Button
              label={t('machinePanel.actions.restock', {
                n: plannedUnits,
                cost: moneyShort(plannedCost),
              })}
              icon={<Icon name="box" size={20} color={theme.onBrand} />}
              onPress={commitRestock}
              accessibilityHint={t('machinePanel.actions.restockHint', {
                pct: Math.round(SERVICE.freshStockBonus * 100),
              })}
            />
          </Pulse>
          <Button
            label={t('machinePanel.actions.clear')}
            hideLabel
            icon={<Icon name="close" size={20} color={theme.ink} />}
            kind="secondary"
            onPress={() => setPlan({})}
            accessibilityHint={t('machinePanel.actions.clearHint')}
          />
        </Row>
      ) : null}

      {/* The machine with its door open: products in their coils, front to back. */}
      <MachineWindow
        cols={type.grid.cols}
        cap={cap}
        selected={selected}
        onSelect={setSelected}
        addRow={
          row
            ? {
                label: t('machinePanel.rows.add', {
                  n: row.slots,
                  cost: moneyShort(row.costCents),
                }),
                hint: t('machinePanel.rows.addHint', {
                  n: machine.slots.length + row.slots,
                  max: type.slots,
                }),
                disabled: game.cashCents < row.costCents,
                onPress: buyRow,
              }
            : undefined
        }
        slots={machine.slots.map((s, i) => {
          // Planned now, or on the van (shown as ghosts until it arrives).
          const p = plan[i] ?? incoming[i];
          const pid = p?.productId ?? s.productId;
          const known = live || p ? s.qty : (machine.seen.qty[i] ?? s.qty);
          // A plan with another product replaces what is in the coil.
          const qty = p && s.productId !== p.productId ? 0 : known;
          const planned = p?.qty ?? 0;
          return {
            productId: pid,
            qty,
            planned,
            price: pid ? moneyPrice(s.priceCents || getProduct(pid).suggestedCents) : '',
            accessibilityLabel: t('machinePanel.a11y.slot', {
              slot: i + 1,
              product: pid ? getProduct(pid).name : t('machinePanel.a11y.slotEmpty'),
              qty: qty + planned,
              cap,
            }),
          };
        })}
      />

      {selected !== null && sel ? (
        <Paper tone="surface" style={{ gap: SPACE.m }}>
          <ProductPicker
            coil={coilCode(selected, type.grid.cols)}
            current={selProduct}
            chosen={plan[selected] ? getProduct(plan[selected]!.productId) : null}
            products={allowed}
            onPick={(id) => loadSlot(selected, id)}
            onClose={() => setSelected(null)}
          />
          {selProduct ? (
            <>
              <Row style={{ justifyContent: 'center' }} gap={SPACE.l}>
                <Stepper
                  icon="minus"
                  label={t('machinePanel.a11y.lowerPrice')}
                  disabled={!canPrice}
                  onPress={() => changePrice(selected, -1)}
                />
                <Mono size={26} weight="bold" style={{ minWidth: 90, textAlign: 'center' }}>
                  {moneyPrice(sel.priceCents)}
                </Mono>
                <Stepper
                  icon="plus"
                  label={t('machinePanel.a11y.raisePrice')}
                  disabled={!canPrice}
                  onPress={() => changePrice(selected, 1)}
                />
              </Row>
              <SpecGrid
                specs={[
                  {
                    icon: 'tag',
                    label: t('machinePanel.stats.suggested'),
                    value: moneyPrice(selProduct.suggestedCents),
                  },
                  {
                    icon: 'box',
                    label: t('machinePanel.stats.wholesale'),
                    value: money(wholesaleCents(game, selProduct)),
                  },
                  {
                    icon: 'people',
                    label: t('machinePanel.stats.demand'),
                    value: pct(priceResponse(sel.priceCents / selProduct.suggestedCents)),
                  },
                  ...(canPrice
                    ? []
                    : [
                        {
                          icon: 'tag' as const,
                          label: t('machinePanel.stats.pricesLocked'),
                          value: '',
                          lockedUntil: PRICES_OPEN_CHAPTER,
                        },
                      ]),
                ]}
              />
              {hasResearch(game, 'auto-reorder', type.family) ? (
                <Row style={{ justifyContent: 'center' }} gap={SPACE.l}>
                  <Stepper
                    icon="minus"
                    label={t('machinePanel.a11y.lowerPar')}
                    onPress={() =>
                      useGame.getState().act((d) => setPar(d, machine.id, selected, sel.par - 1))
                    }
                  />
                  <StatChip
                    icon="box"
                    label={t('machinePanel.stats.driverPar')}
                    value={String(sel.par)}
                  />
                  <Stepper
                    icon="plus"
                    label={t('machinePanel.a11y.raisePar')}
                    onPress={() =>
                      useGame.getState().act((d) => setPar(d, machine.id, selected, sel.par + 1))
                    }
                  />
                </Row>
              ) : null}
            </>
          ) : null}
        </Paper>
      ) : null}

      <Button
        kind="quiet"
        label={more ? t('machinePanel.actions.less') : t('machinePanel.actions.more')}
        icon={
          <View style={{ transform: [{ rotate: more ? '-90deg' : '90deg' }] }}>
            <Icon name="chevron" size={16} color={theme.muted} />
          </View>
        }
        onPress={() => setMore((m) => !m)}
        accessibilityHint={t('machinePanel.actions.moreHint')}
      />
      {more ? (
        <>
          {/* Spec sheet: the headline numbers, then each number with what it is. */}
          <FeaturedStats stats={featured} />
          <SpecGrid specs={specs} />

          <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <IconChip
              icon="box"
              label={t('machinePanel.actions.pickUp')}
              onPress={() =>
                Alert.alert(t('machinePanel.pickUp.title'), t('machinePanel.pickUp.body'), [
                  { text: t('machinePanel.pickUp.cancel'), style: 'cancel' },
                  {
                    text: t('machinePanel.pickUp.confirm'),
                    style: 'destructive',
                    onPress: () => {
                      const r = useGame.getState().act((d) => pickUpMachine(d, machine.id));
                      if (r.ok) finishLeave();
                      else show(simError(r.error), 'error');
                    },
                  },
                ])
              }
            />
          </Row>
          <T size={13} weight="bold" center color={skin.onCabinet}>
            {`${t('machinePanel.stats.placed')}: ${placedAt(machine.placedAt, timeZone, t.lang)}`}
          </T>
        </>
      ) : null}
    </View>
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

/** Price changes open once chapter 1 is done (see `canPrice`). */
const PRICES_OPEN_CHAPTER = 2;

/** A whole number in the UI language ("1,128", "1.128"). */
function count(n: number, lang: string): string {
  try {
    return new Intl.NumberFormat(lang).format(n);
  } catch {
    return String(n);
  }
}

/** When a machine was placed, in the city's local time and the UI language ("6 Nov, 14:05"). */
function placedAt(at: number, timeZone: string | undefined, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, {
      timeZone,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 16).replace('T', ' ');
  }
}

/** "12 h", "3 d", "45 m". */
function shortDuration(ms: number): string {
  const min = ms / 60_000;
  if (min < 60) return tg('machinePanel.duration.min', { n: Math.max(1, Math.round(min)) });
  const h = min / 60;
  if (h < 48) return tg('machinePanel.duration.hour', { n: Math.round(h) });
  return tg('machinePanel.duration.day', { n: Math.round(h / 24) });
}

/** "12 h", "3 d", "45 m" (exported for the close-up). */
export { shortDuration };

const styles = StyleSheet.create({
  mood: { width: 44, height: 8, borderRadius: 4, overflow: 'hidden' },
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
});
