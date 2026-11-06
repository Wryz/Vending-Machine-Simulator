import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { SERVICE, STAFF } from '@/config/economy';
import { CHAPTER_GOALS, RESEARCH } from '@/config/progression';
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

const VAN_NAMES = ['Car boot', 'Van', 'Box van', 'Truck'];

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
  const theme = useTheme();
  const status = machineStatus(game, machine);
  const ink = theme.paperInk;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={`${machineLabel(machine)} at ${machine.venue.name}${note ? `, ${note}` : ''}`}
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
          {machine.venue.name}
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
      show(r.error, 'error');
    }
    return r;
  };

  if (!game) {
    return (
      <Screen title="Route clipboard">
        <T muted>No business is open.</T>
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
    else show(r.error, 'error');
  };

  const confirmFire = (d: Driver) =>
    Alert.alert(`Let ${d.name} go?`, 'Their route will be left without a driver.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Let ${d.name} go`,
        style: 'destructive',
        onPress: () => run((draft) => fireDriver(draft, d.id), `${d.name} has left`),
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title="Routes"
        subtitle={`${active.length} machines · ${game.drivers.length} drivers`}
      >
        <Section title="Van">
          <Paper tone="surface" style={{ gap: SPACE.m }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={17} weight="bold">
                {VAN_NAMES[Math.min(game.vanLevel, VAN_NAMES.length - 1)]}
              </T>
              <Row gap={SPACE.s}>
                <StatChip icon="box" label="Items per trip" value={String(vanCapacity(game))} />
                {game.chapter === 2 && game.vanLevel < CHAPTER_GOALS[2].vanLevel ? (
                  <StatChip
                    icon="star"
                    label="Chapter goal: buy a van"
                    value="Goal"
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
                label={`${VAN_NAMES[game.vanLevel + 1] ?? `Level ${game.vanLevel + 1}`} · ${moneyShort(nextVanCost)}`}
                disabled={game.cashCents < nextVanCost}
                accessibilityHint={`Upgrade: carries ${SERVICE.vanCapacityByLevel[game.vanLevel + 1]} items per trip`}
                onPress={() => run((d) => buyVan(d), 'Van upgraded')}
              />
            ) : null}
          </Paper>
        </Section>

        <Section title="Drivers">
          {!driversUnlocked ? (
            <LockedCard icon="people" title="Drivers" chapter={3} />
          ) : (
            <Clipboard title="Routes">
              <Row style={{ flexWrap: 'wrap' }}>
                <StatChip icon="route" label="Stops per route" value={`≤${STAFF.stopsPerRoute}`} />
                <StatChip
                  icon="clock"
                  label="Run every (business hours)"
                  value={`${STAFF.routeIntervalHours} h`}
                />
                <StatChip
                  icon="box"
                  label="Items per driver"
                  value={String(driverCapacity(game))}
                />
                <StatChip
                  icon="coin"
                  label="Wage per day"
                  value={moneyShort(STAFF.driverWageCentsPerDay)}
                />
              </Row>
              {game.drivers.length === 0 ? (
                <T size={14} color={ink}>
                  No drivers yet.
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
                          {stops.length}/{STAFF.stopsPerRoute} stops ·{' '}
                          {stops.length === 0
                            ? 'no route'
                            : nextRun > 60_000
                              ? `next run in ${duration(nextRun)}`
                              : 'on the road'}
                        </T>
                      </View>
                      <Mono size={13} color={ink}>
                        {money(-STAFF.driverWageCentsPerDay)}/day
                      </Mono>
                    </Row>
                    {(isEditing ? active : stops).map((m) => {
                      const owner = routeOf.get(m.id);
                      const checked = d.machineIds.includes(m.id);
                      const note =
                        owner && owner.id !== d.id ? `on ${owner.name}'s route` : undefined;
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
                        Place machines on the map first.
                      </T>
                    ) : null}
                    <Row gap={SPACE.s} style={{ marginTop: SPACE.xs }}>
                      <Button
                        style={{ flex: 1 }}
                        kind="secondary"
                        label={isEditing ? 'Done' : 'Edit route'}
                        onPress={() => setEditing(isEditing ? null : d.id)}
                      />
                      <Button
                        kind="quiet"
                        label="Let go"
                        onPress={() => confirmFire(d)}
                        accessibilityHint={`Fire ${d.name}`}
                      />
                    </Row>
                  </View>
                );
              })}
              <Divider dashed />
              {unassigned.length > 0 && game.drivers.length > 0 ? (
                <T size={13} color={theme.amber}>
                  {unassigned.length === 1 ? '1 machine is' : `${unassigned.length} machines are`}{' '}
                  not on a route.
                </T>
              ) : null}
              <Row gap={SPACE.s}>
                <Button
                  style={{ flex: 1 }}
                  label={`Hire · ${money(STAFF.driverHireCents)}`}
                  disabled={game.vanLevel < 1 || game.cashCents < STAFF.driverHireCents}
                  onPress={() => run((d) => hireDriver(d), 'Driver hired')}
                />
                {game.drivers.length > 0 ? (
                  <Button
                    kind="secondary"
                    label="Auto-assign"
                    accessibilityHint="Group nearby machines into routes"
                    onPress={() => {
                      setEditing(null);
                      run((d) => autoAssignRoutes(d), 'Routes assigned');
                    }}
                  />
                ) : null}
              </Row>
              {game.vanLevel < 1 ? (
                <T size={13} color="#5C6066">
                  Drivers need a van.
                </T>
              ) : null}
              {game.drivers.length > 0 ? (
                <T size={12} color="#5C6066">
                  Daily wages {money(-wages)}
                </T>
              ) : null}
            </Clipboard>
          )}
        </Section>

        <Section title="Auto-reorder">
          {game.chapter < (autoReorderInfo?.unlockChapter ?? 4) ? (
            <LockedCard
              icon="box"
              title="Auto-reorder"
              chapter={autoReorderInfo?.unlockChapter ?? 4}
            />
          ) : (
            <Paper tone="surface" style={{ gap: SPACE.m }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T weight="bold">Auto-reorder</T>
                <StatChip
                  icon={autoReorder ? 'star' : 'lock'}
                  label={
                    autoReorder ? 'Drivers refill each coil to its par level' : 'Not researched yet'
                  }
                  value={autoReorder ? 'On' : 'Off'}
                  color={autoReorder ? theme.signal : undefined}
                />
              </Row>
              {!autoReorder ? (
                <Button
                  kind="secondary"
                  icon={<Icon name="star" size={20} color={theme.ink} />}
                  label={`Research · ${moneyShort(autoReorderInfo?.costCents ?? 0)}`}
                  onPress={() => router.push('/company')}
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
