import { router } from 'expo-router';
import { View } from 'react-native';

import { getMachineType } from '@/config/machines';
import type { GameState, Machine } from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { duration, money } from '@/ui/format';
import { Button, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { hasTelemetry, machineLabel, machineStatus } from '@/ui/machineStatus';
import { KeyTag, type MachineStatus } from '@/ui/objects/KeyTag';
import { SPACE } from '@/ui/theme';

/** Problems first, so the key you need is on top. */
const STATUS_ORDER: Record<MachineStatus, number> = {
  broken: 0,
  'cash-full': 1,
  empty: 2,
  low: 3,
  unknown: 4,
  ok: 5,
  stored: 6,
};

function cashLabel(game: GameState, m: Machine): string {
  if (hasTelemetry(game, m)) return money(m.cashBoxCents);
  const ago = Math.max(0, game.now - m.seen.at);
  return ago < 60_000
    ? money(m.seen.cashBoxCents)
    : `${money(m.seen.cashBoxCents)} · ${duration(ago)} ago`;
}

/** Key ring (SPEC §3.6, §8): one key per owned machine. */
export default function Keys() {
  const theme = useTheme();
  const game = useGame((s) => s.game);

  if (!game) {
    return (
      <Screen tab title="Key ring">
        <T muted>No business is open.</T>
      </Screen>
    );
  }

  const active = game.machines
    .filter((m) => m.status === 'active')
    .map((m) => ({ m, status: machineStatus(game, m) }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.m.venue.name.localeCompare(b.m.venue.name),
    );
  const stored = game.machines.filter((m) => m.status === 'stored');
  const accent = (m: Machine) => theme.family[getMachineType(m.typeId).family];

  return (
    <Screen tab title="Key ring" subtitle={`${active.length} placed · ${stored.length} in storage`}>
      <Section title="Placed">
        {active.length === 0 ? (
          <Paper tone="surface">
            <T muted>None placed yet.</T>
          </Paper>
        ) : (
          <View style={{ gap: SPACE.xs }}>
            {active.map(({ m, status }) => (
              <KeyTag
                key={m.id}
                name={machineLabel(m)}
                place={m.venue.name}
                accent={accent(m)}
                status={status}
                amount={cashLabel(game, m)}
                onPress={() => router.navigate({ pathname: '/map', params: { focus: m.id } })}
              />
            ))}
          </View>
        )}
      </Section>

      {stored.length > 0 ? (
        <Section title="In storage">
          <View style={{ gap: SPACE.s }}>
            {stored.map((m) => {
              const place = () =>
                router.navigate({ pathname: '/map', params: { placeMachineId: m.id } });
              return (
                <Row key={m.id} gap={SPACE.s}>
                  <View style={{ flex: 1 }}>
                    <KeyTag
                      name={machineLabel(m)}
                      place="Ready to place"
                      accent={accent(m)}
                      status="stored"
                      onPress={place}
                    />
                  </View>
                  <Button
                    label="Place"
                    kind="secondary"
                    onPress={place}
                    accessibilityHint={`Choose a spot on the map for this ${machineLabel(m)}`}
                  />
                </Row>
              );
            })}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}
