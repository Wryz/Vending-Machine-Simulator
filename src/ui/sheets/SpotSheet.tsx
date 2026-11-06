import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { forwardRef, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { getMachineType, type MachineTypeId } from '@/config/machines';
import { CATEGORY_LABEL } from '@/config/places';
import type { PlaceCategory } from '@/data/types';
import {
  availableMachineTypes,
  evaluateSpot,
  hidePlace,
  localTime,
  type GameState,
  type World,
} from '@/sim';
import { useGame } from '@/store/game';

import { meters, moneyShort } from '../format';
import { Button, Chip, Mono, Row, T } from '../kit';
import { Glyph, Sparkline } from '../objects/small';
import { useTheme } from '../ThemeProvider';
import { RADIUS, SPACE } from '../theme';

export interface SpotPoint {
  lat: number;
  lng: number;
}

/**
 * Spot Card as a sheet over the map (SPEC §8): is this a good spot, and why.
 * Headline numbers and the top reasons first; details further down.
 */
export const SpotSheet = forwardRef<
  BottomSheetModal,
  {
    game: GameState;
    world: World;
    point: SpotPoint | null;
    machineId?: string;
    bottomInset: number;
    onDismiss: () => void;
  }
>(function SpotSheet({ game, world, point, machineId, bottomInset, onDismiss }, ref) {
  const theme = useTheme();
  const snapPoints = useMemo(() => ['52%', '90%'], []);
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={onDismiss}
      backgroundStyle={{ backgroundColor: theme.bg, borderRadius: RADIUS.l + 4 }}
      handleIndicatorStyle={{ backgroundColor: theme.line, width: 44, height: 5 }}
    >
      {point ? (
        <SpotBody
          // A new tap is a new spot: remount so picks from the last spot don't carry over.
          key={`${point.lat},${point.lng}`}
          game={game}
          world={world}
          point={point}
          machineId={machineId}
          bottomInset={bottomInset}
        />
      ) : null}
    </BottomSheetModal>
  );
});

function SpotBody({
  game,
  world,
  point,
  machineId,
  bottomInset,
}: {
  game: GameState;
  world: World;
  point: SpotPoint;
  machineId?: string;
  bottomInset: number;
}) {
  const theme = useTheme();
  const storedId = machineId || game.machines.find((m) => m.status === 'stored')?.id || '';
  const stored = game.machines.find((m) => m.id === storedId);
  const types = availableMachineTypes(game, world);
  const [typeId, setTypeId] = useState<MachineTypeId>(
    stored?.typeId ?? types[0]?.id ?? 'used-snack',
  );
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);

  const spot = useMemo(
    () => evaluateSpot(game, world, point, typeId, game.now, placeId),
    [game, world, point, typeId, placeId],
  );
  const hourNow = Math.floor(localTime(game.now, world.city.timeZone, world.city.countryCode).hour);
  const rating = Math.round(spot.rating);
  const canPlace = !spot.districtLocked && !spot.blocked;
  const placingOwned = !!stored && stored.typeId === typeId;

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
    <BottomSheetScrollView
      contentContainerStyle={{
        paddingHorizontal: SPACE.l,
        paddingBottom: bottomInset + SPACE.xl,
        gap: SPACE.l,
      }}
    >
      <View style={{ gap: 2 }}>
        <T size={22} weight="bold" accessibilityRole="header" numberOfLines={2}>
          {spot.venue.category === 'street' ? 'Street corner' : spot.venue.name}
        </T>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={13} muted numberOfLines={1} style={{ flex: 1 }}>
            {spot.venue.category === 'street'
              ? `District ${spot.district}`
              : `${CATEGORY_LABEL[spot.venue.category as PlaceCategory]} · ${meters(spot.venue.distanceM)}`}
          </T>
          <T size={18} color={theme.amber} accessibilityLabel={`${spot.rating} of 5`}>
            {'★'.repeat(rating)}
            <T size={18} color={theme.line}>
              {'★'.repeat(5 - rating)}
            </T>
          </T>
        </Row>
      </View>

      <Row gap={SPACE.s}>
        <Stat label="customers / h" value={spot.nowCustomers.toFixed(0)} />
        <Stat label="sales / day" value={moneyShort(spot.dailySalesCents)} color={theme.signal} />
      </Row>

      <Sparkline values={spot.hourly} highlight={hourNow} />

      <View style={{ gap: 6 }}>
        {spot.reasons.slice(0, 3).map((r, i) => (
          <Row key={i} gap={SPACE.s}>
            <View style={[styles.reason, { backgroundColor: r.good ? theme.signal : theme.alert }]}>
              <T size={12} weight="bold" color="#FFFFFF">
                {r.good ? '+' : '−'}
              </T>
            </View>
            <T size={14} style={{ flex: 1 }} numberOfLines={2}>
              {r.text}
            </T>
          </Row>
        ))}
      </View>

      {stored || types.length > 1 ? (
        <Row style={{ flexWrap: 'wrap' }}>
          {stored ? (
            <Chip
              label={`${getMachineType(stored.typeId).name} (yours)`}
              active={typeId === stored.typeId}
              onPress={() => setTypeId(stored.typeId)}
            />
          ) : null}
          {types
            .slice(0, 6)
            .map((t) =>
              stored && stored.typeId === t.id ? null : (
                <Chip
                  key={t.id}
                  label={t.name}
                  color={theme.family[t.family]}
                  active={typeId === t.id && !placingOwned}
                  onPress={() => setTypeId(t.id)}
                />
              ),
            )}
        </Row>
      ) : null}

      {spot.districtLocked ? (
        <T color={theme.alert}>This district unlocks in a later chapter.</T>
      ) : null}
      {spot.blocked ? <T color={theme.alert}>{spot.blocked}</T> : null}
      <Button
        label={placingOwned ? 'Place my machine here' : `Place ${getMachineType(typeId).name}`}
        disabled={!canPlace}
        onPress={() =>
          router.push({
            pathname: '/place',
            params: {
              lat: String(point.lat),
              lng: String(point.lng),
              typeId,
              machineId: placingOwned ? stored.id : '',
              placeId: spot.venue.placeId,
            },
          })
        }
      />

      <View style={{ gap: SPACE.s }}>
        <T size={17} weight="bold">
          Nearby
        </T>
        {spot.nearby.length === 0 ? <T muted>No named places within 400 m.</T> : null}
        {spot.nearby.map((p) => (
          <Row key={p.id} style={{ minHeight: 44 }}>
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
                label={spot.venue.placeId === p.id ? 'Host' : 'Use'}
                active={spot.venue.placeId === p.id}
                onPress={() => setPlaceId(p.id)}
              />
            ) : null}
            <Chip label="Report" onPress={() => report(p.id, p.name)} />
          </Row>
        ))}
        <T size={11} muted>
          Places from open map data. No affiliation or endorsement.
        </T>
      </View>
    </BottomSheetScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface }]}>
      <Mono size={22} weight="bold" color={color}>
        {value}
      </Mono>
      <T size={12} muted>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, padding: SPACE.m, borderRadius: RADIUS.m, gap: 2 },
  reason: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
