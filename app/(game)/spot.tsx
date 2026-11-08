import { FAMILY_LABEL } from '@/config/machines';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_LABEL } from '@/config/places';
import { getMachineType, type MachineTypeId } from '@/config/machines';
import type { PlaceCategory } from '@/data/types';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError } from '@/i18n/sim';
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
  const t = useT();
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

  const category = (c: PlaceCategory) => t.or(`content.places.${c}`, CATEGORY_LABEL[c]);
  const typeName = (id: MachineTypeId) => content.machineType(id, getMachineType(id).name);

  const report = (id: string, name: string) =>
    Alert.alert(t('spot.reportAlert.title'), t('spot.reportAlert.body', { name }), [
      { text: t('spot.reportAlert.cancel'), style: 'cancel' },
      {
        text: t('spot.reportAlert.hide'),
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
            {spot.venue.category === 'street' ? t('spot.streetCorner') : spot.venue.name}
          </T>
          <T size={18} color={theme.amber} accessibilityLabel={t('spot.ratingA11y', { n: spot.rating })}>
            {stars}
          </T>
        </Row>
        <T muted size={13}>
          {spot.venue.category === 'street'
            ? t('spot.district', { n: spot.district })
            : t('spot.venueLine', {
                category: category(spot.venue.category as PlaceCategory),
                distance: meters(spot.venue.distanceM),
                n: spot.district,
              })}
        </T>
      </View>

      {stored || types.length ? (
        <Section title={t('spot.section.machine')}>
          <Row style={{ flexWrap: 'wrap' }}>
            {stored ? (
              <Chip
                label={t('spot.owned', { name: typeName(stored.typeId) })}
                active={typeId === stored.typeId}
                onPress={() => setTypeId(stored.typeId)}
              />
            ) : null}
            {types.slice(0, 8).map((mt) => (
              <Chip
                key={mt.id}
                label={content.machineType(mt.id, mt.name)}
                color={theme.family[mt.family]}
                active={typeId === mt.id && !(stored && stored.typeId === mt.id)}
                onPress={() => setTypeId(mt.id)}
              />
            ))}
          </Row>
        </Section>
      ) : null}

      <Paper tone="surface">
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T size={12} muted>
              {t('spot.stat.now')}
            </T>
            <Mono size={18} weight="bold">
              {t('spot.perHour', { n: spot.nowCustomers.toFixed(1) })}
            </Mono>
          </View>
          <View>
            <T size={12} muted>
              {t('spot.stat.day')}
            </T>
            <Mono size={18} weight="bold">
              {Math.round(spot.dailyCustomers)}
            </Mono>
          </View>
          <View>
            <T size={12} muted>
              {t('spot.stat.sales')}
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

      <Section title={t('spot.section.why')}>
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
            label={t('spot.best', {
              list: spot.bestFamilies
                .map((f) => t.or(`content.families.${f.family}`, FAMILY_LABEL[f.family]))
                .join(', '),
            })}
          />
          <Chip
            label={t('spot.theft', { risk: t(`spot.risk.${spot.theftRisk}`) })}
            color={
              spot.theftRisk === 'high'
                ? theme.alert
                : spot.theftRisk === 'medium'
                  ? theme.amber
                  : theme.signal
            }
          />
          <Chip
            label={t('spot.competitors', {
              n: spot.competitors.yours + spot.competitors.rival + spot.competitors.stores,
            })}
          />
          <Chip label={t('spot.commission', { pct: pct(spot.commission) })} />
        </Row>
      </Section>

      <Section title={t('spot.section.nearby')}>
        {spot.nearby.length === 0 ? <T muted>{t('spot.noNearby')}</T> : null}
        {spot.nearby.map((p) => (
          <Row key={p.id} style={{ minHeight: 40 }}>
            <Glyph category={p.category} size={20} />
            <View style={{ flex: 1 }}>
              <T size={14} numberOfLines={1}>
                {p.name}
              </T>
              <T size={12} muted>
                {category(p.category)} · {meters(p.distanceM)}
              </T>
            </View>
            {p.distanceM <= 120 && p.category !== 'competitor' ? (
              <Chip
                label={
                  placeId === p.id || (!placeId && spot.venue.placeId === p.id)
                    ? t('spot.host')
                    : t('spot.use')
                }
                active={spot.venue.placeId === p.id}
                onPress={() => setPlaceId(p.id)}
              />
            ) : null}
            <Chip label={t('spot.report')} onPress={() => report(p.id, p.name)} />
          </Row>
        ))}
        <T size={11} muted>
          {t('spot.disclaimer')}
        </T>
      </Section>

      {spot.districtLocked ? (
        <T color={theme.alert}>
          {spot.hood
            ? t('spotSheet.hoodLocked', { name: spot.hood, n: spot.districtChapter })
            : t('spotSheet.districtLocked', { n: spot.districtChapter })}
        </T>
      ) : null}
      {spot.blocked ? <T color={theme.alert}>{simError(spot.blocked)}</T> : null}
      <Button
        label={
          stored && stored.typeId === typeId
            ? t('spot.placeMine')
            : t('spot.placeType', { type: typeName(typeId) })
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
