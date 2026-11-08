import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PICKER } from '@/config/picker';
import { cityAt, flagOf, nearestCity, stripCities, type PickerCity } from '@/data/cityIndex';
import type { CityIndexEntry } from '@/data/types';
import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { useCityIndex } from '@/store/cityIndex';

import { RoundButton } from '../hud';
import { Icon } from '../icons';
import { T } from '../kit';
import { Key, Marquee, SKIN } from '../skin';
import { RADIUS, SPACE } from '../theme';
import { PickerGlobe, type GlobeDot } from './PickerGlobe';

export type PickerMode = 'start' | 'switch' | 'sell';

/** A city's name as the player sees it: "Hanoi", or "Hanoi · North" for an outer district. */
export function useCityLabel() {
  const t = useT();
  return (e: Pick<CityIndexEntry, 'n' | 'd'>) =>
    e.d ? t('picker.district', { city: e.n, dir: t(`picker.dir.${e.d}`) }) : e.n;
}

const CARD_W = 128;
const CARD_GAP = SPACE.s;

/**
 * The one place a city is chosen (onboarding, Cities, selling the company): a
 * globe centered on you, a strip of cities along the bottom (near you first,
 * then the big cities further away) and one key to go. Drag the globe to aim
 * the crosshair anywhere: it snaps to the closest city or outer district.
 */
export function CityPicker({
  mode,
  origin,
  you,
  status,
  busy,
  error,
  onLocate,
  onPick,
  onBack,
}: {
  mode: PickerMode;
  /** Where the globe starts and distances count from: you, or the city you're in. */
  origin: { lat: number; lng: number };
  /** Your approximate location, once shared (a blue dot; "Use my location" otherwise). */
  you: { lat: number; lng: number } | null;
  /** Your cities by region id: the one you're playing and the ones with a save. */
  status: Record<string, 'playing' | 'saved'>;
  busy: boolean;
  error: string | null;
  onLocate?: () => void;
  onPick: (city: PickerCity) => void;
  onBack?: () => void;
}) {
  const t = useT();
  const label = useCityLabel();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const index = useCityIndex((s) => s.entries);
  useEffect(() => {
    void useCityIndex.getState().refresh();
  }, []);

  const cards = useMemo(() => stripCities(index, origin), [index, origin]);
  // Where "near you" ends and "big cities" begin.
  const firstFar = cards.findIndex((c) => c.km > PICKER.localKm);
  const [selected, setSelected] = useState<PickerCity | null>(() => cards[0] ?? null);
  const [aim, setAim] = useState<{ lat: number; lng: number } | null>(null);
  const [fly, setFly] = useState(() => ({ ...origin, zoom: 1.6, key: 0 }));
  const list = useRef<FlatList<PickerCity>>(null);

  // The globe follows you once you share where you are.
  const lastOrigin = useRef(origin);
  useEffect(() => {
    if (lastOrigin.current.lat === origin.lat && lastOrigin.current.lng === origin.lng) return;
    lastOrigin.current = origin;
    setFly((f) => ({ ...origin, zoom: PICKER.cardZoom, key: f.key + 1 }));
    list.current?.scrollToOffset({ offset: 0, animated: true });
  }, [origin]);

  const choose = (c: PickerCity, from: 'card' | 'globe') => {
    setSelected(c);
    setAim(null);
    haptic.select();
    if (from === 'card')
      setFly((f) => ({ lat: c.a, lng: c.o, zoom: PICKER.cardZoom, key: f.key + 1 }));
    const i = cards.findIndex((x) => x.r === c.r);
    if (i >= 0) list.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.5 });
  };

  // The crosshair: when the globe comes to rest, pick what's under it.
  const onCenter = (p: { lat: number; lng: number }, settled: boolean) => {
    if (!settled) return;
    const hit = cityAt(index, p);
    if (hit) {
      if (hit.r !== selected?.r) choose({ ...hit, km: distanceFrom(hit) }, 'globe');
      setAim(null);
    } else {
      setSelected(null);
      setAim(p);
    }
  };
  const distanceFrom = (c: CityIndexEntry) =>
    cards.find((x) => x.r === c.r)?.km ?? stripCities([c], origin)[0]?.km ?? 0;
  const nearest = aim ? nearestCity(index, aim) : null;

  const dots: GlobeDot[] = useMemo(() => {
    const out: GlobeDot[] = cards
      .slice(0, PICKER.maxPins)
      .map((c) => ({ id: c.r, lat: c.a, lng: c.o, selected: c.r === selected?.r }));
    if (selected && !out.some((d) => d.id === selected.r))
      out.push({ id: selected.r, lat: selected.a, lng: selected.o, selected: true });
    if (you) out.push({ id: 'you', lat: you.lat, lng: you.lng, you: true });
    return out;
  }, [cards, selected, you]);

  const km = (c: PickerCity) =>
    c.km < 1 ? t('picker.here') : t('picker.km', { n: Math.round(c.km).toLocaleString() });
  const here = selected ? status[selected.r] : undefined;
  const keyLabel = selected
    ? here === 'playing'
      ? t('picker.youreHere')
      : t(mode === 'sell' ? 'picker.sell' : here === 'saved' ? 'picker.go' : 'picker.start', {
          city: label(selected),
        })
    : nearest
      ? t('picker.flyNearest', { city: label(nearest) })
      : t('picker.none');

  const onKey = () => {
    if (selected) {
      if (here !== 'playing') onPick(selected);
      return;
    }
    if (nearest) choose({ ...nearest, km: distanceFrom(nearest) }, 'card');
  };

  // Layout: the globe fills the space above the strip.
  const top = insets.top + SPACE.s;
  const stripH = 112;
  const bottomBlock = stripH + 64 + insets.bottom + SPACE.l * 2;
  const globeCy = top + 64 + (height - top - 64 - bottomBlock) / 2;

  return (
    <View style={styles.root}>
      <View accessible accessibilityLabel={t('picker.a11y.globe')} style={StyleSheet.absoluteFill}>
        <PickerGlobe
          width={width}
          height={height}
          cy={globeCy}
          dots={dots}
          flyTo={fly}
          onCenter={onCenter}
          onDot={(id) => {
            const c = cards.find((x) => x.r === id);
            if (c) choose(c, 'card');
          }}
        />
      </View>

      {/* Crosshair and what it's on. */}
      <View
        pointerEvents="none"
        style={[styles.crossWrap, { top: globeCy - 14, left: width / 2 - 14 }]}
      >
        <View style={styles.cross} />
      </View>
      <View pointerEvents="none" style={[styles.bubbleWrap, { top: globeCy - 74 }]}>
        <Animated.View
          key={selected?.r ?? (nearest ? `n-${nearest.r}` : 'none')}
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={styles.bubble}
        >
          {selected ? (
            <T size={15} weight="bold" color={SKIN.keyInk} numberOfLines={1}>
              {`${flagOf(selected.c)} ${label(selected)}`.trim()}
            </T>
          ) : (
            <>
              <T size={14} weight="bold" color={SKIN.keyInk} numberOfLines={1}>
                {t('picker.none')}
              </T>
              {nearest ? (
                <T size={12} color="#4A4F6A" numberOfLines={1}>
                  {t('picker.nearest', {
                    city: label(nearest),
                    km: t('picker.km', { n: Math.round(nearest.km).toLocaleString() }),
                  })}
                </T>
              ) : null}
            </>
          )}
        </Animated.View>
      </View>

      {/* Header. */}
      <View style={[styles.header, { top }]} pointerEvents="box-none">
        {onBack ? (
          <RoundButton icon="back" label={t('kit.a11y.back')} onPress={onBack} />
        ) : (
          <View style={{ width: 50 }} />
        )}
        <Marquee title={t('picker.title')} subtitle={t('picker.subtitle')} style={{ flex: 1 }} />
        {onLocate ? (
          <RoundButton icon="locate" label={t('picker.locate')} onPress={onLocate} active={!you} />
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>
      {onLocate && !you ? (
        <Pressable
          onPress={onLocate}
          accessibilityRole="button"
          accessibilityLabel={t('picker.locate')}
          accessibilityHint={t('picker.locateHint')}
          style={[styles.locatePill, { top: top + 112 }]}
        >
          <Icon name="locate" size={18} color="#FFFFFF" />
          <View>
            <T size={14} weight="bold" color="#FFFFFF">
              {t('picker.locate')}
            </T>
            <T size={11} color="#FFE7D6">
              {t('picker.locateHint')}
            </T>
          </View>
        </Pressable>
      ) : null}

      {/* The strip and the key. */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACE.m }]}>
        <FlatList
          ref={list}
          horizontal
          data={cards}
          keyExtractor={(c) => c.r}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACE.l, gap: CARD_GAP }}
          getItemLayout={(_, i) => ({
            length: CARD_W + CARD_GAP,
            offset: SPACE.l + (CARD_W + CARD_GAP) * i,
            index: i,
          })}
          onScrollToIndexFailed={() => undefined}
          style={{ height: stripH, flexGrow: 0 }}
          renderItem={({ item, index: i }) => (
            <CityCard
              city={item}
              name={label(item)}
              distance={km(item)}
              badge={status[item.r] ? t(`picker.${status[item.r]}`) : null}
              section={
                i === 0 ? t('picker.nearYou') : i === firstFar ? t('picker.bigCities') : null
              }
              selected={item.r === selected?.r}
              onPress={() => choose(item, 'card')}
              a11y={t('picker.a11y.card', { city: label(item), km: km(item) })}
            />
          )}
        />
        {error ? (
          <T size={13} color={SKIN.redFace} center style={{ marginTop: SPACE.xs }}>
            {error}
          </T>
        ) : null}
        <Key
          tone="brand"
          onPress={onKey}
          disabled={busy || (!selected && !nearest) || here === 'playing'}
          accessibilityLabel={keyLabel}
          style={{ marginHorizontal: SPACE.l, marginTop: SPACE.s }}
          faceStyle={styles.keyFace}
        >
          <Icon
            name={selected ? (mode === 'sell' ? 'handshake' : 'pin') : 'globe'}
            size={20}
            color="#FFFFFF"
          />
          <T size={17} weight="bold" color="#FFFFFF" numberOfLines={1} style={{ flexShrink: 1 }}>
            {busy && selected ? t('picker.opening', { city: label(selected) }) : keyLabel}
          </T>
        </Key>
      </View>
    </View>
  );
}

function CityCard({
  city,
  name,
  distance,
  badge,
  section,
  selected,
  onPress,
  a11y,
}: {
  city: PickerCity;
  name: string;
  distance: string;
  badge: string | null;
  section: string | null;
  selected: boolean;
  onPress: () => void;
  a11y: string;
}) {
  const flag = flagOf(city.c);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        { transform: [{ translateY: pressed ? 2 : 0 }] },
      ]}
    >
      {section ? (
        <View style={styles.section}>
          <T size={10} weight="bold" color={SKIN.marqueeInk} numberOfLines={1}>
            {section.toUpperCase()}
          </T>
        </View>
      ) : null}
      <View style={styles.cardTop}>
        <T size={28}>{flag || '🏙️'}</T>
        {badge ? (
          <View style={styles.badge}>
            <T size={10} weight="bold" color="#FFFFFF">
              {badge}
            </T>
          </View>
        ) : null}
      </View>
      <T size={14} weight="bold" color={SKIN.keyInk} numberOfLines={2} style={{ lineHeight: 17 }}>
        {name}
      </T>
      <T size={12} color="#5B6080" numberOfLines={1}>
        {distance}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#CFE9FF' },
  header: {
    position: 'absolute',
    left: SPACE.l,
    right: SPACE.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
  },
  locatePill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
    paddingVertical: SPACE.s,
    paddingHorizontal: SPACE.m,
    borderRadius: RADIUS.pill,
    backgroundColor: SKIN.cabinet,
    borderBottomWidth: 3,
    borderBottomColor: SKIN.cabinetEdge,
  },
  crossWrap: { position: 'absolute', width: 28, height: 28 },
  cross: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,107,44,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bubble: {
    maxWidth: 280,
    paddingVertical: 6,
    paddingHorizontal: SPACE.m,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: SPACE.m,
    backgroundColor: SKIN.cabinet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 4,
    borderTopColor: SKIN.cabinetLight,
  },
  card: {
    width: CARD_W,
    height: 104,
    marginTop: 8,
    padding: SPACE.s,
    borderRadius: 16,
    backgroundColor: SKIN.keyFace,
    borderBottomWidth: 4,
    borderBottomColor: SKIN.keyEdge,
    justifyContent: 'space-between',
  },
  cardSelected: {
    backgroundColor: SKIN.marquee,
    borderWidth: 3,
    borderColor: SKIN.bulb,
    borderBottomWidth: 5,
    borderBottomColor: SKIN.cabinetEdge,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: SKIN.greenFace,
  },
  section: {
    position: 'absolute',
    top: -10,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.pill,
    backgroundColor: SKIN.marquee,
  },
  keyFace: {
    flexDirection: 'row',
    gap: SPACE.s,
    paddingHorizontal: SPACE.l,
    justifyContent: 'center',
  },
});
