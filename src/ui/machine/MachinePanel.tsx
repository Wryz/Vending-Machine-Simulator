import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CONTRACT, SERVICE } from '@/config/economy';
import { WRAPS, getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';
import { RESEARCH } from '@/config/progression';
import { t as tg, useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError, venueName } from '@/i18n/sim';
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

import { money, moneyShort, pct } from '../format';
import { StatChip } from '../hud';
import { Icon, type IconName } from '../icons';
import { Button, Chip, Mono, Paper, Row, T } from '../kit';
import { hasTelemetry, machineStatus } from '../machineStatus';
import { CoinTray } from '../objects/CoinTray';
import { statusLabel } from '../objects/KeyTag';
import { PRODUCT_IMAGES } from '../productImages';
import { Glass, Key, Led, Marquee, SKIN } from '../skin';
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
  /** A restock was committed for these slots (animate; otherwise a success sound plays). */
  onRestock?: (slots: number[]) => void;
  /** Cash was taken (animate the door); the coin tray shows after `collectDelayMs`. */
  onCollect?: () => void;
  collectDelayMs?: number;
  onToast: (text: string, tone: ToastTone) => void;
  /** The machine was picked up. */
  onGone?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const game = useGame((s) => s.game)!;
  const removeAds = useProfile((s) => s.entitlements.removeAds);
  const ownedWraps = useProfile((s) => s.entitlements.wraps).filter((w) => w in WRAPS);
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
  /** Specs and the less common actions stay folded away until asked for. */
  const [more, setMore] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

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
  const plannedCost = planned.length ? restockCostCents(game, planned) : 0;
  const allowed = productsFor(game, type);
  const canPrice = !!game.chapterDoneAt[1] || game.chapter >= 2;

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
    const res = useGame
      .getState()
      .act((d, w) => restockMachine(d, w, machine.id, planned, { manual: true }));
    if (!res.ok) {
      haptic.error();
      return show(simError(res.error), 'error');
    }
    setPlan({});
    const slotsIn = planned.map((l) => l.slot).sort((a, b) => a - b);
    if (onRestock) onRestock(slotsIn);
    else {
      haptic.success();
      sound.play('success');
    }
    show(t('machinePanel.toast.restocked', { n: res.units }), 'success');
    track('restock', { count: res.units });
  };

  const changePrice = (slot: number, delta: number) => {
    const s = machine.slots[slot];
    const res = useGame.getState().act((d) => setPrice(d, machine.id, slot, s.priceCents + delta));
    if (!res.ok) show(simError(res.error), 'error');
    else haptic.tick();
  };

  const adRestock = async () => {
    const ok = await showRewarded('instant-restock');
    if (ok) {
      useGame
        .getState()
        .act((d, w) => applyAdReward(d, w, 'instant-restock', { machineId: machine.id }));
      show(t('machinePanel.toast.adRestocked'), 'success');
    }
  };

  const sel = selected !== null ? machine.slots[selected] : null;
  const selProduct = sel?.productId ? getProduct(sel.productId) : null;
  const contractLeft = machine.contract.endsAt - game.now;
  const ownedResearch = RESEARCH.filter((r) => hasResearch(game, r.id, type.family)).map((r) =>
    content.researchName(r.id, r.name),
  );

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
              status === 'ok' ? SKIN.ledGreen : status === 'broken' ? SKIN.ledRed : SKIN.ledAmber
            }
            accessibilityLabel={t('machinePanel.a11y.status', { status: statusLabel(status) })}
          >
            {t('machinePanel.statusLed', { status: statusLabel(status).toUpperCase() })}
          </Led>
        </Row>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACE.s }}
        >
          <StatChip
            icon="coin"
            label={t('machinePanel.stats.cashBox')}
            value={`${moneyShort(machine.cashBoxCents)} / ${moneyShort(cashBoxCapacity(game, type))}`}
            color={
              machine.cashBoxCents >= cashBoxCapacity(game, type) * 0.95 ? theme.signal : undefined
            }
          />
          <StatChip
            icon="percent"
            label={t('machinePanel.stats.commission')}
            value={pct(machine.contract.commission)}
          />
          <StatChip
            icon="clock"
            label={t('machinePanel.stats.contract')}
            value={
              contractLeft > 0 ? shortDuration(contractLeft) : t('machinePanel.stats.renewing')
            }
          />
          <StatChip
            icon="smile"
            label={t('machinePanel.stats.mood', { pct: Math.round(machine.mood * 100) })}
          >
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
          {!live ? <StatChip icon="eyeOff" label={t('machinePanel.stats.noTelemetry')} /> : null}
        </ScrollView>
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

      {/* The two jobs: take the cash, refill the coils. */}
      <Row gap={SPACE.s}>
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
          style={{ flex: 1 }}
        />
        <Button
          label={t('machinePanel.actions.fill')}
          icon={<Icon name="box" size={20} color={theme.ink} />}
          kind="secondary"
          onPress={fillAll}
          accessibilityHint={t('machinePanel.actions.fillHint', { n: van })}
        />
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
      {plannedUnits ? (
        <Row gap={SPACE.s}>
          <Button
            label={t('machinePanel.actions.restock', {
              n: plannedUnits,
              cost: moneyShort(plannedCost),
            })}
            icon={<Icon name="box" size={20} color={theme.onBrand} />}
            onPress={commitRestock}
            style={{ flex: 1 }}
            accessibilityHint={t('machinePanel.actions.restockHint', {
              pct: Math.round(SERVICE.freshStockBonus * 100),
            })}
          />
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
                accessibilityLabel={t('machinePanel.a11y.slot', {
                  slot: i + 1,
                  product: pid ? getProduct(pid).name : t('machinePanel.a11y.slotEmpty'),
                  qty: shownQty,
                  cap,
                })}
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
                    {pid ? moneyShortPrice(s.priceCents || getProduct(pid).suggestedCents) : '—'}
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
            <T weight="bold">{selProduct ? selProduct.name : t('machinePanel.emptyCoil')}</T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('machinePanel.a11y.close')}
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
                  accessibilityLabel={t('machinePanel.a11y.load', { product: pr.name })}
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
                  <T size={10} weight="bold" numberOfLines={1} color={on ? '#FFFFFF' : SKIN.keyInk}>
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
                  label={t('machinePanel.a11y.lowerPrice')}
                  disabled={!canPrice}
                  onPress={() => changePrice(selected, -5)}
                />
                <Mono size={26} weight="bold" style={{ minWidth: 90, textAlign: 'center' }}>
                  {money(sel.priceCents)}
                </Mono>
                <Stepper
                  icon="plus"
                  label={t('machinePanel.a11y.raisePrice')}
                  disabled={!canPrice}
                  onPress={() => changePrice(selected, 5)}
                />
              </Row>
              <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                <StatChip
                  icon="tag"
                  label={t('machinePanel.stats.suggested')}
                  value={money(selProduct.suggestedCents)}
                />
                <StatChip
                  icon="box"
                  label={t('machinePanel.stats.wholesale')}
                  value={money(selProduct.wholesaleCents)}
                />
                <StatChip
                  icon="people"
                  label={t('machinePanel.stats.demand')}
                  value={pct(priceResponse(sel.priceCents / selProduct.suggestedCents))}
                />
                {!canPrice ? (
                  <StatChip
                    icon="lock"
                    label={t('machinePanel.stats.pricesLocked')}
                    value={t('machinePanel.stats.pricesLockedValue')}
                  />
                ) : null}
              </Row>
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
          {/* Spec: icons and numbers. */}
          <Row style={{ flexWrap: 'wrap' }}>
            <StatChip
              icon="grid"
              label={t('machinePanel.stats.slots')}
              value={`${type.slots}×${cap}`}
            />
            <StatChip
              icon="bolt"
              label={t('machinePanel.stats.power')}
              value={moneyShortPrice(type.powerCentsPerDay)}
            />
            <StatChip
              icon="wrench"
              label={t('machinePanel.stats.breakdowns')}
              value={`${(type.breakdownPerDay * 100).toFixed(1)}%`}
            />
            <StatChip
              icon="lock"
              label={t('machinePanel.stats.theft')}
              value={
                type.theftRisk >= 1.4
                  ? t('machinePanel.stats.theftHigh')
                  : type.theftRisk >= 1
                    ? t('machinePanel.stats.theftMed')
                    : t('machinePanel.stats.theftLow')
              }
            />
            <StatChip
              icon="bag"
              label={t('machinePanel.stats.sold')}
              value={String(machine.stats.unitsTotal)}
            />
            <StatChip
              icon="coin"
              label={t('machinePanel.stats.revenue')}
              value={moneyShort(machine.stats.revenueTotalCents)}
            />
            {ownedResearch.map((r) => (
              <StatChip
                key={r}
                icon="star"
                label={t('machinePanel.stats.upgrade')}
                value={r}
                color={theme.brand}
              />
            ))}
          </Row>

          <Row style={{ flexWrap: 'wrap' }}>
            {ownedWraps.map((w) => (
              <Chip
                key={w}
                label={content.wrap(w, WRAPS[w].name)}
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
              label={t('machinePanel.actions.rotate')}
              onPress={() =>
                useGame.getState().act((d) => rotateMachine(d, machine.id, machine.heading + 90))
              }
            />
            {!machine.contract.renegotiated ? (
              <IconChip
                icon="handshake"
                label={t('machinePanel.actions.renegotiate')}
                onPress={() => {
                  const r = useGame.getState().act((d) => renegotiate(d, machine.id));
                  show(
                    r.ok
                      ? t('machinePanel.toast.commission', { pct: pct(r.commission, 1) })
                      : simError(r.error),
                    r.ok ? 'success' : 'error',
                  );
                }}
              />
            ) : null}
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
                      useGame.getState().act((d) => pickUpMachine(d, machine.id));
                      finishLeave();
                    },
                  },
                ])
              }
            />
          </Row>
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

/** Prices on coils: "$1.50" (cents matter here, unlike the HUD). */
function moneyShortPrice(cents: number): string {
  return money(cents);
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
});
