import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { SERVICE, STAFF } from '@/config/economy';
import { CHAPTER_GOALS, RESEARCH } from '@/config/progression';
import { useT, type TKey } from '@/i18n';
import { simError, venueName } from '@/i18n/sim';
import { haptic } from '@/services/haptics';
import {
  assignRoute,
  autoAssignRoutes,
  type ActionResult,
  buyVan,
  driverCapacity,
  fireDriver,
  hasResearch,
  hireDriver,
  vanCapacity,
  type Driver,
  type GameState,
  type Machine,
  type World,
} from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { duration, money, moneyShort } from '@/ui/format';
import { LockedCard, StatChip } from '@/ui/hud';
import { Icon } from '@/ui/icons';
import { Button, Divider, Mono, Paper, Row, Screen, Section, StatusDot, T } from '@/ui/kit';
import { machineLabel, machineStatus } from '@/ui/machineStatus';
import { Clipboard } from '@/ui/objects/Clipboard';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { STATUS_LABEL, statusColor } from '@/ui/objects/KeyTag';
import { SPACE, TOUCH } from '@/ui/theme';

const VAN_NAMES: readonly TKey[] = [
  'routes.vans.v0',
  'routes.vans.v1',
  'routes.vans.v2',
  'routes.vans.v3',
];

/** One checklist line: a box you tick to put a machine on this route. */
function Stop({
  machine,
  game,
  checked,
  disabled,
  note,
  onToggle,
}: {
  machine: Machine;
  game: GameState;
  checked: boolean;
  disabled?: boolean;
  note?: string;
  onToggle?: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const status = machineStatus(game, machine);
  const ink = theme.paperInk;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={t(note ? 'routes.stop.a11yNote' : 'routes.stop.a11y', {
        machine: machineLabel(machine),
        place: venueName(machine.venue.name),
        note: note ?? '',
      })}
      disabled={disabled || !onToggle}
      onPress={onToggle}
      style={({ pressed }) => ({
        minHeight: TOUCH,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE.m,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        borderBottomWidth: 1,
        borderColor: '#E0DDD5',
        paddingVertical: SPACE.xs,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 3,
          borderWidth: 1.5,
          borderColor: ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? (
          <T size={15} weight="bold" color={ink}>
            ✓
          </T>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <T size={14} weight="medium" color={ink}>
          {venueName(machine.venue.name)}
        </T>
        <T size={12} color="#5C6066">
          {machineLabel(machine)}
          {note ? ` · ${note}` : ''}
        </T>
      </View>
      <Row gap={4}>
        <StatusDot color={statusColor(status, theme)} />
        <T size={11} color="#5C6066">
          {STATUS_LABEL[status]}
        </T>
      </Row>
    </Pressable>
  );
}

/** Route clipboard (SPEC §3.6, §8): van, drivers and their routes, auto-reorder. */
export default function Routes() {
  const t = useT();
  const theme = useTheme();
  const game = useGame((s) => s.game);
  const { flash, show } = useFlash();
  const [editing, setEditing] = useState<string | null>(null);

  const run = (fn: (d: GameState, w: World) => ActionResult, success: string) => {
    const r = useGame.getState().act(fn);
    if (r.ok) {
      haptic.success();
      show(success, 'success');
    } else {
      haptic.error();
      show(simError(r.error), 'error');
    }
    return r;
  };

  if (!game) {
    return (
      <Screen tab title={t('routes.emptyTitle')}>
        <T muted>{t('routes.noBusiness')}</T>
      </Screen>
    );
  }

  const ink = theme.paperInk;
  const active = game.machines.filter((m) => m.status === 'active');
  const nextVanCost = SERVICE.vanUpgradeCostCents[game.vanLevel + 1];
  const driversUnlocked = game.chapter >= 3 || !!game.chapterDoneAt[2];
  const routeOf = new Map<string, Driver>();
  for (const d of game.drivers) for (const id of d.machineIds) routeOf.set(id, d);
  const unassigned = active.filter((m) => !routeOf.has(m.id));
  const wages = game.drivers.length * STAFF.driverWageCentsPerDay;
  const autoReorder = hasResearch(game, 'auto-reorder', 'snacks');
  const autoReorderInfo = RESEARCH.find((r) => r.id === 'auto-reorder');

  const toggle = (d: Driver, machineId: string) => {
    const on = d.machineIds.includes(machineId);
    const next = on ? d.machineIds.filter((id) => id !== machineId) : [...d.machineIds, machineId];
    const r = useGame.getState().act((draft) => assignRoute(draft, d.id, next));
    if (r.ok) haptic.select();
    else show(simError(r.error), 'error');
  };

  const confirmFire = (d: Driver) =>
    Alert.alert(t('routes.fire.title', { name: d.name }), t('routes.fire.body'), [
      { text: t('routes.fire.cancel'), style: 'cancel' },
      {
        text: t('routes.fire.confirm', { name: d.name }),
        style: 'destructive',
        onPress: () =>
          run((draft) => fireDriver(draft, d.id), t('routes.fire.done', { name: d.name })),
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        tab
        title={t('routes.title')}
        subtitle={t('routes.subtitle', { machines: active.length, drivers: game.drivers.length })}
      >
        <Section title={t('routes.van.section')}>
          <Paper tone="surface" style={{ gap: SPACE.m }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={17} weight="bold">
                {t(VAN_NAMES[Math.min(game.vanLevel, VAN_NAMES.length - 1)]!)}
              </T>
              <Row gap={SPACE.s}>
                <StatChip
                  icon="box"
                  label={t('routes.van.itemsPerTrip')}
                  value={String(vanCapacity(game))}
                />
                {game.chapter === 2 && game.vanLevel < CHAPTER_GOALS[2].vanLevel ? (
                  <StatChip
                    icon="star"
                    label={t('routes.van.chapterGoal')}
                    value={t('routes.van.goal')}
                    color={theme.brand}
                  />
                ) : null}
              </Row>
            </Row>
            {nextVanCost !== undefined ? (
              <Button
                kind={game.cashCents >= nextVanCost ? 'primary' : 'secondary'}
                icon={
                  <Icon
                    name="plus"
                    size={20}
                    color={game.cashCents >= nextVanCost ? theme.onBrand : theme.ink}
                  />
                }
                label={t('routes.van.buy', {
                  name: VAN_NAMES[game.vanLevel + 1]
                    ? t(VAN_NAMES[game.vanLevel + 1]!)
                    : t('routes.vanLevel', { n: game.vanLevel + 1 }),
                  cost: moneyShort(nextVanCost),
                })}
                disabled={game.cashCents < nextVanCost}
                accessibilityHint={t('routes.van.buyHint', {
                  n: SERVICE.vanCapacityByLevel[game.vanLevel + 1] ?? 0,
                })}
                onPress={() => run((d) => buyVan(d), t('routes.van.upgraded'))}
              />
            ) : null}
          </Paper>
        </Section>

        <Section title={t('routes.drivers.section')}>
          {!driversUnlocked ? (
            <LockedCard icon="people" title={t('routes.drivers.section')} chapter={3} />
          ) : (
            <Clipboard title={t('routes.drivers.clipboard')}>
              <Row style={{ flexWrap: 'wrap' }}>
                <StatChip
                  icon="route"
                  label={t('routes.drivers.stopsPerRoute')}
                  value={`≤${STAFF.stopsPerRoute}`}
                />
                <StatChip
                  icon="clock"
                  label={t('routes.drivers.runEvery')}
                  value={t('routes.drivers.hours', { n: STAFF.routeIntervalHours })}
                />
                <StatChip
                  icon="box"
                  label={t('routes.drivers.itemsPerDriver')}
                  value={String(driverCapacity(game))}
                />
                <StatChip
                  icon="coin"
                  label={t('routes.drivers.wagePerDay')}
                  value={moneyShort(STAFF.driverWageCentsPerDay)}
                />
              </Row>
              {game.drivers.length === 0 ? (
                <T size={14} color={ink}>
                  {t('routes.drivers.none')}
                </T>
              ) : null}
              {game.drivers.map((d) => {
                const stops = d.machineIds
                  .map((id) => game.machines.find((m) => m.id === id))
                  .filter((m): m is Machine => !!m);
                const isEditing = editing === d.id;
                const full = d.machineIds.length >= STAFF.stopsPerRoute;
                const nextRun = d.nextRunAt - game.now;
                return (
                  <View key={d.id} style={{ gap: SPACE.xs, marginTop: SPACE.s }}>
                    <Divider dashed />
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <T weight="bold" color={ink}>
                          {d.name}
                        </T>
                        <T size={12} color="#5C6066">
                          {t('routes.drivers.stops', {
                            stops: stops.length,
                            max: STAFF.stopsPerRoute,
                            state:
                              stops.length === 0
                                ? t('routes.drivers.noRoute')
                                : nextRun > 60_000
                                  ? t('routes.drivers.nextRun', { time: duration(nextRun) })
                                  : t('routes.drivers.onTheRoad'),
                          })}
                        </T>
                      </View>
                      <Mono size={13} color={ink}>
                        {t('routes.drivers.perDay', {
                          amount: money(-STAFF.driverWageCentsPerDay),
                        })}
                      </Mono>
                    </Row>
                    {(isEditing ? active : stops).map((m) => {
                      const owner = routeOf.get(m.id);
                      const checked = d.machineIds.includes(m.id);
                      const note =
                        owner && owner.id !== d.id
                          ? t('routes.drivers.otherRoute', { name: owner.name })
                          : undefined;
                      return (
                        <Stop
                          key={m.id}
                          machine={m}
                          game={game}
                          checked={checked}
                          note={note}
                          disabled={isEditing && !checked && full}
                          onToggle={isEditing ? () => toggle(d, m.id) : undefined}
                        />
                      );
                    })}
                    {isEditing && active.length === 0 ? (
                      <T size={13} color="#5C6066">
                        {t('routes.drivers.placeFirst')}
                      </T>
                    ) : null}
                    <Row gap={SPACE.s} style={{ marginTop: SPACE.xs }}>
                      <Button
                        style={{ flex: 1 }}
                        kind="secondary"
                        label={isEditing ? t('routes.drivers.done') : t('routes.drivers.editRoute')}
                        onPress={() => setEditing(isEditing ? null : d.id)}
                      />
                      <Button
                        kind="quiet"
                        label={t('routes.drivers.letGo')}
                        onPress={() => confirmFire(d)}
                        accessibilityHint={t('routes.drivers.letGoHint', { name: d.name })}
                      />
                    </Row>
                  </View>
                );
              })}
              <Divider dashed />
              {unassigned.length > 0 && game.drivers.length > 0 ? (
                <T size={13} color={theme.amber}>
                  {t('routes.drivers.unassigned', { n: unassigned.length })}
                </T>
              ) : null}
              <Row gap={SPACE.s}>
                <Button
                  style={{ flex: 1 }}
                  label={t('routes.drivers.hire', { cost: money(STAFF.driverHireCents) })}
                  disabled={game.vanLevel < 1 || game.cashCents < STAFF.driverHireCents}
                  onPress={() => run((d) => hireDriver(d), t('routes.drivers.hired'))}
                />
                {game.drivers.length > 0 ? (
                  <Button
                    kind="secondary"
                    label={t('routes.drivers.autoAssign')}
                    accessibilityHint={t('routes.drivers.autoAssignHint')}
                    onPress={() => {
                      setEditing(null);
                      run((d) => autoAssignRoutes(d), t('routes.drivers.assigned'));
                    }}
                  />
                ) : null}
              </Row>
              {game.vanLevel < 1 ? (
                <T size={13} color="#5C6066">
                  {t('routes.drivers.needVan')}
                </T>
              ) : null}
              {game.drivers.length > 0 ? (
                <T size={12} color="#5C6066">
                  {t('routes.drivers.dailyWages', { amount: money(-wages) })}
                </T>
              ) : null}
            </Clipboard>
          )}
        </Section>

        <Section title={t('routes.autoReorder.title')}>
          {game.chapter < (autoReorderInfo?.unlockChapter ?? 4) ? (
            <LockedCard
              icon="box"
              title={t('routes.autoReorder.title')}
              chapter={autoReorderInfo?.unlockChapter ?? 4}
            />
          ) : (
            <Paper tone="surface" style={{ gap: SPACE.m }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T weight="bold">{t('routes.autoReorder.title')}</T>
                <StatChip
                  icon={autoReorder ? 'star' : 'lock'}
                  label={
                    autoReorder ? t('routes.autoReorder.onLabel') : t('routes.autoReorder.offLabel')
                  }
                  value={autoReorder ? t('routes.autoReorder.on') : t('routes.autoReorder.off')}
                  color={autoReorder ? theme.signal : undefined}
                />
              </Row>
              {!autoReorder ? (
                <Button
                  kind="secondary"
                  icon={<Icon name="star" size={20} color={theme.ink} />}
                  label={t('routes.autoReorder.research', {
                    cost: moneyShort(autoReorderInfo?.costCents ?? 0),
                  })}
                  onPress={() => router.navigate('/company')}
                />
              ) : null}
            </Paper>
          )}
        </Section>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
