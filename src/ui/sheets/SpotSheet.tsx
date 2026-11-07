import { router } from 'expo-router';
import { forwardRef, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { getMachineType, type MachineTypeId } from '@/config/machines';
import { SHEET_OPEN_SHARE } from '@/config/map';
import { CATEGORY_LABEL } from '@/config/places';
import type { PlaceCategory } from '@/data/types';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { logText, simError } from '@/i18n/sim';
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
import { Button, Chip, Row, T } from '../kit';
import { Glyph, Sparkline } from '../objects/small';
import { Icon } from '../icons';
import { Glass, Led, Marquee, Plate, SKIN } from '../skin';
import { useTheme } from '../ThemeProvider';
import { RADIUS, SPACE } from '../theme';
import { GameSheet, SheetScroll, type GameSheetHandle } from './GameSheet';

export interface SpotPoint {
  lat: number;
  lng: number;
}

/**
 * Spot Card as a sheet over the map (SPEC §8): is this a good spot, and why.
 * Headline numbers and the top reasons first; details further down.
 */
export const SpotSheet = forwardRef<
  GameSheetHandle,
  {
    game: GameState;
    world: World;
    point: SpotPoint | null;
    machineId?: string;
    bottomInset: number;
    onDismiss: () => void;
  }
>(function SpotSheet({ game, world, point, machineId, bottomInset, onDismiss }, ref) {
  return (
    <GameSheet ref={ref} openShare={SHEET_OPEN_SHARE.spot} onDismiss={onDismiss}>
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
    </GameSheet>
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
  const t = useT();
  /** Place category label in the UI language (config has English). */
  const categoryLabel = (c: PlaceCategory) => t.or(`content.places.${c}`, CATEGORY_LABEL[c]);
  const typeName = (id: MachineTypeId) => content.machineType(id, getMachineType(id).name);
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
    Alert.alert(t('spotSheet.reportAlert.title'), t('spotSheet.reportAlert.body', { name }), [
      { text: t('spotSheet.reportAlert.cancel'), style: 'cancel' },
      {
        text: t('spotSheet.reportAlert.confirm'),
        style: 'destructive',
        onPress: () => useGame.getState().act((d) => hidePlace(d, id)),
      },
    ]);

  return (
    <SheetScroll
      contentContainerStyle={{
        paddingHorizontal: SPACE.l,
        paddingBottom: bottomInset + SPACE.xl,
        gap: SPACE.l,
      }}
    >
      <View style={{ gap: SPACE.s }}>
        <Marquee
          title={spot.venue.category === 'street' ? t('spotSheet.streetCorner') : spot.venue.name}
          subtitle={
            spot.venue.category === 'street'
              ? t('spotSheet.district', { n: spot.district })
              : t('spotSheet.venueLine', {
                  category: categoryLabel(spot.venue.category as PlaceCategory),
                  distance: meters(spot.venue.distanceM),
                })
          }
        />
        <Row style={{ justifyContent: 'center' }} gap={4}>
          {Array.from({ length: 5 }, (_, i) => (
            <Icon key={i} name="star" size={22} color={i < rating ? SKIN.ledAmber : '#FFC7AA'} />
          ))}
        </Row>
      </View>

      <Row gap={SPACE.s}>
        <View style={{ flex: 1, gap: 4 }}>
          <Led
            size={24}
            accessibilityLabel={t('spotSheet.a11y.customers', { n: spot.nowCustomers.toFixed(0) })}
          >
            {spot.nowCustomers.toFixed(0)}
          </Led>
          <Row gap={4} style={{ justifyContent: 'center' }}>
            <Icon name="people" size={16} color="#FFFFFF" />
            <T size={12} weight="bold" color="#FFFFFF">
              {t('spotSheet.perHour')}
            </T>
          </Row>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Led
            size={24}
            accessibilityLabel={t('spotSheet.a11y.sales', {
              amount: moneyShort(spot.dailySalesCents),
            })}
          >
            {moneyShort(spot.dailySalesCents)}
          </Led>
          <Row gap={4} style={{ justifyContent: 'center' }}>
            <Icon name="coin" size={16} color="#FFFFFF" />
            <T size={12} weight="bold" color="#FFFFFF">
              {t('spotSheet.perDay')}
            </T>
          </Row>
        </View>
      </Row>

      <Glass padding={SPACE.m}>
        <Sparkline values={spot.hourly} highlight={hourNow} />

        <View style={{ gap: 6, marginTop: SPACE.m }}>
          {spot.reasons.slice(0, 3).map((r, i) => (
            <Row key={i} gap={SPACE.s}>
              <View
                style={[styles.reason, { backgroundColor: r.good ? theme.signal : theme.alert }]}
              >
                <T size={12} weight="bold" color="#FFFFFF">
                  {r.good ? '+' : '−'}
                </T>
              </View>
              <T size={14} style={{ flex: 1 }} numberOfLines={2}>
                {logText('spotReason', r.text)}
              </T>
            </Row>
          ))}
        </View>
      </Glass>

      {stored || types.length > 1 ? (
        <Row style={{ flexWrap: 'wrap' }}>
          {stored ? (
            <Chip
              label={t('spotSheet.yours', { type: typeName(stored.typeId) })}
              active={typeId === stored.typeId}
              onPress={() => setTypeId(stored.typeId)}
            />
          ) : null}
          {types
            .slice(0, 6)
            .map((mt) =>
              stored && stored.typeId === mt.id ? null : (
                <Chip
                  key={mt.id}
                  label={content.machineType(mt.id, mt.name)}
                  color={theme.family[mt.family]}
                  active={typeId === mt.id && !placingOwned}
                  onPress={() => setTypeId(mt.id)}
                />
              ),
            )}
        </Row>
      ) : null}

      {spot.districtLocked ? <T color={theme.alert}>{t('spotSheet.districtLocked')}</T> : null}
      {spot.blocked ? <T color={theme.alert}>{simError(spot.blocked)}</T> : null}
      <Button
        label={
          placingOwned
            ? t('spotSheet.placeMine')
            : t('spotSheet.placeType', { type: typeName(typeId) })
        }
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
        <Plate>{t('spotSheet.nearby')}</Plate>
        {spot.nearby.length === 0 ? <T color="#FFFFFF">{t('spotSheet.noNearby')}</T> : null}
        {spot.nearby.map((p) => (
          <Row key={p.id} style={styles.place}>
            <Glyph category={p.category} size={20} />
            <View style={{ flex: 1 }}>
              <T size={14} numberOfLines={1}>
                {p.name}
              </T>
              <T size={12} muted>
                {t('spotSheet.placeLine', {
                  category: categoryLabel(p.category),
                  distance: meters(p.distanceM),
                })}
              </T>
            </View>
            {p.distanceM <= 120 && p.category !== 'competitor' ? (
              <Chip
                label={spot.venue.placeId === p.id ? t('spotSheet.host') : t('spotSheet.use')}
                active={spot.venue.placeId === p.id}
                onPress={() => setPlaceId(p.id)}
              />
            ) : null}
            <Chip label={t('spotSheet.report')} onPress={() => report(p.id, p.name)} />
          </Row>
        ))}
        <T size={11} color="#FFE3D4">
          {t('spotSheet.attribution')}
        </T>
      </View>
    </SheetScroll>
  );
}

const styles = StyleSheet.create({
  place: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.s,
    paddingHorizontal: SPACE.m,
    borderBottomWidth: 4,
    borderBottomColor: SKIN.chromeDark,
  },
  reason: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
