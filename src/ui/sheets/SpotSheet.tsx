import { router } from 'expo-router';
import { forwardRef, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { MachineTypeId } from '@/config/machines';
import { SHEET_OPEN_SHARE } from '@/config/map';
import { CATEGORY_LABEL, VENUE_CATEGORIES, VENUE_RADIUS_M } from '@/config/places';
import { TUTORIAL } from '@/config/tutorial';
import type { PlaceCategory } from '@/data/types';
import { useT } from '@/i18n';
import { logText, simError } from '@/i18n/sim';
import {
  availableMachineTypes,
  evaluateSpot,
  hidePlace,
  localTime,
  type GameState,
  type SpotReport,
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
import { GuideLine, Pulse, useTutorialStep } from '../guide';
import { GameSheet, SheetScroll, type GameSheetHandle } from './GameSheet';
import { MachineChooser } from './MachineChooser';

export interface SpotPoint {
  lat: number;
  lng: number;
  /** A map place that was tapped: the card opens on it (and hosts there when it can). */
  placeId?: string;
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
          key={`${point.lat},${point.lng},${point.placeId ?? ''}`}
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
  const storedId = machineId || game.machines.find((m) => m.status === 'stored')?.id || '';
  const stored = game.machines.find((m) => m.id === storedId);
  const types = availableMachineTypes(game, world);
  // The card's numbers use your stored machine, else the first type you can buy (you pick on Place).
  const typeId: MachineTypeId = stored?.typeId ?? types[0]?.id ?? 'used-snack';
  const [placeId, setPlaceId] = useState<string | undefined>(point.placeId);

  const spot = useMemo(
    () => evaluateSpot(game, world, point, typeId, game.now, placeId),
    [game, world, point, typeId, placeId],
  );
  /** The place the card is about: the one tapped on the map, then the one picked with "Use". */
  const focus = placeId ? spot.nearby.find((p) => p.id === placeId) : undefined;
  const hourNow = Math.floor(localTime(game.now, world.city.timeZone, world.city.countryCode).hour);
  const rating = Math.round(spot.rating);
  const canPlace = !spot.districtLocked && !spot.blocked;
  const [choosing, setChoosing] = useState(false);
  const goPlace = (pick: MachineTypeId, ownedId: string | null) => {
    setChoosing(false);
    router.push({
      pathname: '/place',
      params: {
        lat: String(point.lat),
        lng: String(point.lng),
        typeId: pick,
        machineId: ownedId ?? '',
        placeId: spot.venue.placeId,
      },
    });
  };
  // Choose which machine first (the stored one, a type to buy, or what opens later).
  const place = () => setChoosing(true);
  // Tutorial: say whether this is a good first spot, with a Place key up top.
  const guiding = useTutorialStep() === 'place';
  const quiet = spot.rating < TUTORIAL.quietBelowStars;

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
          title={
            focus
              ? focus.name
              : spot.venue.category === 'street'
                ? t('spotSheet.streetCorner')
                : spot.venue.name
          }
          subtitle={
            focus
              ? categoryLabel(focus.category)
              : spot.venue.category === 'street'
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

      {guiding && canPlace ? (
        quiet ? (
          <GuideLine text={t('coach.guide.spotQuiet')} />
        ) : (
          <GuideLine
            text={t('coach.guide.spotGood')}
            action={{ label: t('coach.guide.placeKey'), onPress: place }}
          />
        )
      ) : null}

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

      {spot.districtLocked ? (
        <T color={theme.alert}>
          {spot.hood
            ? t('spotSheet.hoodLocked', { name: spot.hood, n: spot.districtChapter })
            : t('spotSheet.districtLocked', { n: spot.districtChapter })}
        </T>
      ) : null}
      {spot.blocked ? <T color={theme.alert}>{simError(spot.blocked)}</T> : null}
      <Pulse on={guiding && canPlace && !quiet}>
        <Button
          label={stored ? t('spotSheet.placeMine') : t('spotSheet.placeHere')}
          disabled={!canPlace}
          onPress={place}
        />
      </Pulse>
      <MachineChooser
        visible={choosing}
        game={game}
        world={world}
        point={point}
        placeId={spot.venue.placeId}
        stored={stored ? { id: stored.id, typeId: stored.typeId } : null}
        onPick={goPlace}
        onClose={() => setChoosing(false)}
      />

      <AreaFacts spot={spot} hourNow={hourNow} categoryLabel={categoryLabel} />

      <View style={{ gap: SPACE.s }}>
        <Plate>{t('spotSheet.nearby')}</Plate>
        <T size={12} color="#FFFFFF">
          {t('spotSheet.hostExplain', { pct: `${Math.round(spot.commission * 100)}%` })}
        </T>
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
            {spot.venue.placeId === p.id ? (
              // The current host: a badge, not a button (nothing to do).
              <View style={styles.hostBadge} accessible accessibilityLabel={`${t('spotSheet.yourHost')} · ${p.name}`}>
                <T size={12} weight="bold" color="#FFFFFF">
                  {t('spotSheet.yourHost')}
                </T>
              </View>
            ) : p.distanceM <= VENUE_RADIUS_M && VENUE_CATEGORIES.includes(p.category) ? (
              <Chip
                label={t('spotSheet.makeHost')}
                onPress={() => setPlaceId(p.id)}
                accessibilityLabel={`${t('spotSheet.makeHost')} · ${p.name}`}
              />
            ) : null}
            <Chip
              label={t('spotSheet.report')}
              accessibilityLabel={`${t('spotSheet.report')} · ${p.name}`}
              onPress={() => report(p.id, p.name)}
            />
          </Row>
        ))}
        <T size={11} color="#FFE3D4">
          {t('spotSheet.attribution')}
        </T>
      </View>
    </SheetScroll>
  );
}

/**
 * What the open data says about this block: everyone walking past (not only
 * buyers), who lives here, what's here, the vending around, and the night.
 */
function AreaFacts({
  spot,
  hourNow,
  categoryLabel,
}: {
  spot: SpotReport;
  hourNow: number;
  categoryLabel: (c: PlaceCategory) => string;
}) {
  const t = useT();
  const passing = Math.round(spot.footfall[hourNow] ?? 0);
  const places = (Object.entries(spot.area.places) as [PlaceCategory, number | undefined][])
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 8);
  const vending = spot.competitors;
  return (
    <View style={{ gap: SPACE.s }}>
      <Plate>{t('spotSheet.about')}</Plate>
      <Row gap={SPACE.s}>
        <View style={{ flex: 1, gap: 4 }}>
          <Led size={20} accessibilityLabel={t('spotSheet.a11y.passing', { n: passing })}>
            {compact(passing)}
          </Led>
          <Row gap={4} style={{ justifyContent: 'center' }}>
            <Icon name="people" size={14} color="#FFFFFF" />
            <T size={12} weight="bold" color="#FFFFFF">
              {t('spotSheet.passing')}
            </T>
          </Row>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Led
            size={20}
            accessibilityLabel={t('spotSheet.a11y.residents', { n: spot.area.residents })}
          >
            {compact(spot.area.residents)}
          </Led>
          <Row gap={4} style={{ justifyContent: 'center' }}>
            <Glyph category="residential" size={14} color="#FFFFFF" />
            <T size={12} weight="bold" color="#FFFFFF">
              {t('spotSheet.residents')}
            </T>
          </Row>
        </View>
      </Row>
      <Glass padding={SPACE.m}>
        <Sparkline values={spot.footfall} highlight={hourNow} height={36} />
        <View style={{ gap: 8, marginTop: SPACE.m }}>
          {places.length ? (
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {places.map(([c, n]) => (
                <Row key={c} gap={4} style={styles.fact}>
                  <Glyph category={c} size={16} />
                  <T size={12} weight="bold">
                    {Math.round(n ?? 0)}
                  </T>
                  <T size={12} muted>
                    {categoryLabel(c)}
                  </T>
                </Row>
              ))}
            </Row>
          ) : null}
          <Row gap={SPACE.s}>
            <Icon name="shop" size={16} />
            <T size={13} style={{ flex: 1 }}>
              {t('spotSheet.vending', {
                yours: vending.yours,
                rival: vending.rival,
                stores: vending.stores,
              })}
            </T>
          </Row>
          <Row gap={SPACE.s}>
            <Icon name="moon" size={16} />
            <T size={13} style={{ flex: 1 }}>
              {t(`spotSheet.night.${spot.theftRisk}`)}
            </T>
          </Row>
        </View>
      </Glass>
    </View>
  );
}

/** 1234 → 1.2k: LED numbers stay short. */
function compact(n: number): string {
  const v = Math.round(n);
  if (v < 1000) return String(v);
  if (v < 100_000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(v / 1000)}k`;
}

const styles = StyleSheet.create({
  hostBadge: {
    backgroundColor: SKIN.cabinetDark,
    borderRadius: 14,
    paddingHorizontal: SPACE.m,
    paddingVertical: 6,
  },
  fact: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.s,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
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
