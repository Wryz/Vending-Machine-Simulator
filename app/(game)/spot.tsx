import { FAMILY_LABEL } from '@/config/machines';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_LABEL } from '@/config/places';
import { getMachineType, type MachineTypeId } from '@/config/machines';
import type { PlaceCategory } from '@/data/types';
import { availableMachineTypes, evaluateSpot, hidePlace, localTime } from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { meters, money, pct } from '@/ui/format';
import { Button, Chip, Mono, Paper, Row, Section, T } from '@/ui/kit';
import { Glyph, Sparkline } from '@/ui/objects/small';
import { SPACE } from '@/ui/theme';

/** Spot Card (SPEC §4.1, §8): readable reasons why a spot is good or bad. */
export default function SpotCard() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat: string; lng: string; machineId?: string }>();
  const game = useGame((s) => s.game)!;
  const world = useGame((s) => s.world)!;
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const storedId = params.machineId || game.machines.find((m) => m.status === 'stored')?.id || '';
  const stored = game.machines.find((m) => m.id === storedId);
  const types = availableMachineTypes(game, world);
  const [typeId, setTypeId] = useState<MachineTypeId>(
    stored?.typeId ?? types[0]?.id ?? 'used-snack',
  );
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);

  const spot = useMemo(
    () => evaluateSpot(game, world, { lat, lng }, typeId, game.now, placeId),
    [game, world, lat, lng, typeId, placeId],
  );
  const hourNow = Math.floor(localTime(game.now, world.city.timeZone, world.city.countryCode).hour);
  const stars = '★'.repeat(Math.round(spot.rating)) + '☆'.repeat(5 - Math.round(spot.rating));
  const canPlace = !spot.districtLocked && !spot.blocked;

  const report = (id: string, name: string) =>
    Alert.alert('Report this place?', `${name} will be hidden from your game.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide it',
        style: 'destructive',
        onPress: () => useGame.getState().act((d) => hidePlace(d, id)),
      },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: SPACE.l,
        paddingBottom: insets.bottom + SPACE.xl,
        gap: SPACE.l,
      }}
    >
      <View style={{ gap: 4 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={20} weight="bold" accessibilityRole="header" style={{ flex: 1 }}>
            {spot.venue.category === 'street' ? 'Street corner' : spot.venue.name}
          </T>
          <T size={18} color={theme.amber} accessibilityLabel={`${spot.rating} of 5`}>
            {stars}
          </T>
        </Row>
        <T muted size={13}>
          {spot.venue.category === 'street'
            ? `District ${spot.district}`
            : `${CATEGORY_LABEL[spot.venue.category as PlaceCategory]} · ${meters(spot.venue.distanceM)} · District ${spot.district}`}
        </T>
      </View>

      {stored || types.length ? (
        <Section title="Machine">
          <Row style={{ flexWrap: 'wrap' }}>
            {stored ? (
              <Chip
                label={`${getMachineType(stored.typeId).name} (owned)`}
                active={typeId === stored.typeId}
                onPress={() => setTypeId(stored.typeId)}
              />
            ) : null}
            {types.slice(0, 8).map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                color={theme.family[t.family]}
                active={typeId === t.id && !(stored && stored.typeId === t.id)}
                onPress={() => setTypeId(t.id)}
              />
            ))}
          </Row>
        </Section>
      ) : null}

      <Paper tone="surface">
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T size={12} muted>
              Customers now
            </T>
            <Mono size={18} weight="bold">
              {spot.nowCustomers.toFixed(1)}/h
            </Mono>
          </View>
          <View>
            <T size={12} muted>
              Per business day
            </T>
            <Mono size={18} weight="bold">
              {Math.round(spot.dailyCustomers)}
            </Mono>
          </View>
          <View>
            <T size={12} muted>
              Est. sales/day
            </T>
            <Mono size={18} weight="bold" color={theme.signal}>
              {money(spot.dailySalesCents, { compact: true })}
            </Mono>
          </View>
        </Row>
        <View style={{ marginTop: SPACE.m }}>
          <Sparkline values={spot.hourly} highlight={hourNow} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Mono size={10} muted>
              00
            </Mono>
            <Mono size={10} muted>
              06
            </Mono>
            <Mono size={10} muted>
              12
            </Mono>
            <Mono size={10} muted>
              18
            </Mono>
            <Mono size={10} muted>
              23
            </Mono>
          </Row>
        </View>
      </Paper>

      <Section title="Why">
        {spot.reasons.map((r, i) => (
          <Row key={i} style={{ alignItems: 'flex-start' }}>
            <T color={r.good ? theme.signal : theme.alert}>{r.good ? '+' : '−'}</T>
            <T size={14} style={{ flex: 1 }}>
              {r.text}
            </T>
          </Row>
        ))}
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip
            label={`Best: ${spot.bestFamilies.map((f) => FAMILY_LABEL[f.family]).join(', ')}`}
          />
          <Chip
            label={`Theft risk: ${spot.theftRisk}`}
            color={
              spot.theftRisk === 'high'
                ? theme.alert
                : spot.theftRisk === 'medium'
                  ? theme.amber
                  : theme.signal
            }
          />
          <Chip
            label={`Competitors: ${spot.competitors.yours + spot.competitors.rival + spot.competitors.stores}`}
          />
          <Chip label={`Commission ask ~${pct(spot.commission)}`} />
        </Row>
      </Section>

      <Section title="Nearby places">
        {spot.nearby.length === 0 ? <T muted>No named places within 400 m.</T> : null}
        {spot.nearby.map((p) => (
          <Row key={p.id} style={{ minHeight: 40 }}>
            <Glyph category={p.category} size={20} />
            <View style={{ flex: 1 }}>
              <T size={14} numberOfLines={1}>
                {p.name}
              </T>
              <T size={12} muted>
                {p.label} · {meters(p.distanceM)}
              </T>
            </View>
            {p.distanceM <= 120 && p.category !== 'competitor' ? (
              <Chip
                label={
                  placeId === p.id || (!placeId && spot.venue.placeId === p.id) ? 'Host' : 'Use'
                }
                active={spot.venue.placeId === p.id}
                onPress={() => setPlaceId(p.id)}
              />
            ) : null}
            <Chip label="Report" onPress={() => report(p.id, p.name)} />
          </Row>
        ))}
        <T size={11} muted>
          Places shown from open map data. No affiliation or endorsement.
        </T>
      </Section>

      {spot.districtLocked ? (
        <T color={theme.alert}>This district unlocks in a later chapter.</T>
      ) : null}
      {spot.blocked ? <T color={theme.alert}>{spot.blocked}</T> : null}
      <Button
        label={
          stored && stored.typeId === typeId
            ? 'Place my machine here'
            : `Place a ${getMachineType(typeId).name} here`
        }
        disabled={!canPlace}
        onPress={() =>
          router.replace({
            pathname: '/place',
            params: {
              lat: String(lat),
              lng: String(lng),
              typeId,
              machineId: stored && stored.typeId === typeId ? stored.id : '',
              placeId: spot.venue.placeId,
            },
          })
        }
      />
    </ScrollView>
  );
}
