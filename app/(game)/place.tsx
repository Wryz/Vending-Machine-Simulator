import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTRACT } from '@/config/economy';
import type { MachineTypeId } from '@/config/machines';
import { headingFacing, placeMachine, quotePlacement, type PlaceParams } from '@/sim';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import { track } from '@/services/analytics';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { money, pct } from '@/ui/format';
import { Chip, Mono, Row, Section, T, Toast } from '@/ui/kit';
import { ContractSheet } from '@/ui/objects/ContractSheet';
import { SPACE } from '@/ui/theme';

const HEADINGS = [
  { label: 'Faces N', deg: 0 },
  { label: 'E', deg: 90 },
  { label: 'S', deg: 180 },
  { label: 'W', deg: 270 },
];

/** Place a machine: choose the term and sign the location contract (SPEC §4.5). */
export default function Place() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{
    lat: string;
    lng: string;
    typeId: MachineTypeId;
    machineId?: string;
    placeId?: string;
  }>();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const [termDays, setTermDays] = useState<number>(30);
  const [exclusive, setExclusive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lat = Number(p.lat);
  const lng = Number(p.lng);

  const venuePlace = useMemo(() => {
    for (const id of world.neighbors(world.cellOf(lat, lng), 1)) {
      const found = world.cells.get(id)?.places.find((x) => x.id === p.placeId);
      if (found) return found;
    }
    return null;
  }, [world, lat, lng, p.placeId]);
  // Default: face away from the venue door, towards passers-by.
  const [heading, setHeading] = useState<number>(() =>
    venuePlace ? Math.round(headingFacing(venuePlace, { lat, lng })) : 180,
  );

  const params: PlaceParams = {
    lat,
    lng,
    heading,
    termDays,
    exclusive,
    placeId: p.placeId || undefined,
    machineId: p.machineId || undefined,
    typeId: p.machineId ? undefined : p.typeId,
  };
  const quote = quotePlacement(game, world, params);
  if (!quote.ok) return <Toast text={quote.error} tone="error" />;
  const afford = game.cashCents >= quote.totalCents;

  const sign = () => {
    const res = useGame.getState().act((d, w) => placeMachine(d, w, params));
    if (!res.ok) {
      setError(res.error);
      haptic.error();
      sound.play('error');
      return;
    }
    sound.play('thunk');
    track('machine_placed', { type: quote.type.id, chapter: game.chapter });
    const firstMachine =
      useGame.getState().game!.machines.filter((m) => m.status === 'active').length === 1;
    router.back();
    if (firstMachine)
      setTimeout(
        () => router.navigate({ pathname: '/map', params: { focus: res.machine.id } }),
        350,
      );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: SPACE.l,
        paddingBottom: insets.bottom + SPACE.xl,
        gap: SPACE.l,
      }}
    >
      <Section title="Term">
        <Row>
          {CONTRACT.termsDays.map((d) => (
            <Chip
              key={d}
              label={`${d} days`}
              active={termDays === d}
              onPress={() => setTermDays(d)}
            />
          ))}
        </Row>
        <T size={12} muted>
          Business days. Longer terms lower the commission. Contracts renew while the venue is
          happy.
        </T>
      </Section>
      <Section title="Exclusivity">
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={14} style={{ flex: 1 }}>
            Keep Brightvend out of this block (+{pct(CONTRACT.exclusivityCommission)} commission)
          </T>
          <Switch
            value={exclusive}
            onValueChange={setExclusive}
            accessibilityLabel="Exclusive contract"
          />
        </Row>
      </Section>
      <Section title="Facing">
        <Row>
          {HEADINGS.map((h) => (
            <Chip
              key={h.deg}
              label={h.label}
              active={Math.round(heading) === h.deg}
              onPress={() => setHeading(h.deg)}
            />
          ))}
        </Row>
      </Section>
      <ContractSheet
        venue={quote.venue.name}
        terms={[
          { label: 'Machine', value: quote.type.name },
          { label: 'Commission to venue', value: pct(quote.commission, 1) },
          { label: 'Term', value: `${termDays} days` },
          { label: 'Exclusive', value: exclusive ? 'Yes' : 'No' },
          { label: 'Machine price', value: money(quote.buyCents) },
          { label: 'Install', value: money(quote.installCents) },
        ]}
        disclaimer="Places shown from open map data. No affiliation or endorsement."
        disabled={!afford}
        onSign={sign}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T muted>Total today</T>
        <Mono weight="bold" color={afford ? theme.ink : theme.alert}>
          {money(quote.totalCents)}
        </Mono>
      </View>
      {error ? <Toast text={error} tone="error" /> : null}
    </ScrollView>
  );
}
