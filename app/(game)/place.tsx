import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTRACT } from '@/config/economy';
import type { MachineTypeId } from '@/config/machines';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError, venueName } from '@/i18n/sim';
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
  { key: 'n', deg: 0 },
  { key: 'e', deg: 90 },
  { key: 's', deg: 180 },
  { key: 'w', deg: 270 },
] as const;

/** Place a machine: choose the term and sign the location contract (SPEC §4.5). */
export default function Place() {
  const theme = useTheme();
  const t = useT();
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
  if (!quote.ok) return <Toast text={simError(quote.error)} tone="error" />;
  const afford = game.cashCents >= quote.totalCents;

  const sign = () => {
    const res = useGame.getState().act((d, w) => placeMachine(d, w, params));
    if (!res.ok) {
      setError(simError(res.error));
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
      <Section title={t('place.section.term')}>
        <Row>
          {CONTRACT.termsDays.map((d) => (
            <Chip
              key={d}
              label={t('place.days', { n: d })}
              active={termDays === d}
              onPress={() => setTermDays(d)}
            />
          ))}
        </Row>
        <T size={12} muted>
          {t('place.termNote')}
        </T>
      </Section>
      <Section title={t('place.section.exclusivity')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={14} style={{ flex: 1 }}>
            {t('place.exclusive', { pct: pct(CONTRACT.exclusivityCommission) })}
          </T>
          <Switch
            value={exclusive}
            onValueChange={setExclusive}
            accessibilityLabel={t('place.exclusiveA11y')}
          />
        </Row>
      </Section>
      <Section title={t('place.section.facing')}>
        <Row>
          {HEADINGS.map((h) => (
            <Chip
              key={h.deg}
              label={t(`place.heading.${h.key}`)}
              active={Math.round(heading) === h.deg}
              onPress={() => setHeading(h.deg)}
            />
          ))}
        </Row>
      </Section>
      <ContractSheet
        venue={venueName(quote.venue.name)}
        terms={[
          {
            label: t('place.contract.machine'),
            value: content.machineType(quote.type.id, quote.type.name),
          },
          { label: t('place.contract.commission'), value: pct(quote.commission, 1) },
          { label: t('place.contract.term'), value: t('place.days', { n: termDays }) },
          {
            label: t('place.contract.exclusive'),
            value: exclusive ? t('place.contract.yes') : t('place.contract.no'),
          },
          { label: t('place.contract.price'), value: money(quote.buyCents) },
          { label: t('place.contract.install'), value: money(quote.installCents) },
        ]}
        disclaimer={t('place.disclaimer')}
        disabled={!afford}
        onSign={sign}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T muted>{t('place.total')}</T>
        <Mono weight="bold" color={afford ? theme.ink : theme.alert}>
          {money(quote.totalCents)}
        </Mono>
      </View>
      {error ? <Toast text={error} tone="error" /> : null}
    </ScrollView>
  );
}
