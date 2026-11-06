import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { musicMoodFor } from '@/audio/soundscape';
import {
  FALLBACK_CITIES,
  LOCATION_TIMEOUT_MS,
  NEAR_CITY_KM,
  type City,
  type CityId,
} from '@/config/cities';
import { areaCheck } from '@/data/api';
import { ENV } from '@/data/env';
import { useT, type TKey } from '@/i18n';
import { content } from '@/i18n/content';
import { getTimeOfDay } from '@/map/timeOfDay';
import { distanceM } from '@/sim';
import { track } from '@/services/analytics';
import { music, sound } from '@/services/audio';
import { cityInfoFor, hasSave, useGame } from '@/store/game';
import { useProfile, type CityInfo } from '@/store/profile';
import { clock } from '@/ui/format';
import { StatChip } from '@/ui/hud';
import { Icon, type IconName } from '@/ui/icons';
import { Button, Paper, Row, Screen, T } from '@/ui/kit';
import { PRODUCT_IMAGES } from '@/ui/productImages';
import { Cabinet, Glass, Led, Marquee, SKIN } from '@/ui/skin';
import { SPACE } from '@/ui/theme';

type Step = 'cold-open' | 'intro' | 'location' | 'checking' | 'picker';

/** What "Use my location" found. */
type Found =
  | { kind: 'near'; city: City; km: number }
  | { kind: 'far'; city: City; km: number }
  | { kind: 'off' };

/** Guess the player's region from the device's time zone for the cold open. */
function guessCity(): CityId {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return FALLBACK_CITIES.find((c) => c.timeZone === tz)?.id ?? 'new-york';
}

function deviceCountry(): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const m = /-([A-Z]{2})\b/.exec(locale);
  return m ? m[1] : 'US';
}

/** The closest of the 9 cities to a point, and how far it is. */
function nearestCity(lat: number, lng: number): { city: City; km: number } {
  let best = FALLBACK_CITIES[0];
  let bestKm = Infinity;
  for (const c of FALLBACK_CITIES) {
    const km = distanceM({ lat, lng }, c) / 1000;
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return { city: best, km: bestKm };
}

/** A city's display name in the UI language. */
function cityName(c: City): string {
  return content.city(c.id, c.name);
}

/** A city's short description in the UI language. */
function cityNotes(t: ReturnType<typeof useT>, c: City): string {
  return t.or(`content.cityNotes.${c.id}`, c.notes);
}

/** A promise that rejects after `ms`. */
function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Onboarding (SPEC §6.1, §8): cold open of a lone machine glowing on a street
 * at the real local time -> why we ask for location -> approximate location
 * (once) -> area check -> start there, or pick one of the 9 cities.
 */
export default function Onboarding() {
  const t = useT();
  const insets = useSafeAreaInsets();
  // Dev QA only: open a given step, e.g. /onboarding?step=picker&city=tokyo or ?found=near.
  const qa = useLocalSearchParams<{ step?: Step; city?: CityId; found?: Found['kind'] }>();
  const qaOn = typeof __DEV__ !== 'undefined' && __DEV__;
  const [step, setStep] = useState<Step>((qaOn && qa.step) || 'cold-open');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const preview = useMemo(() => {
    const c = FALLBACK_CITIES.find((x) => x.id === guessCity())!;
    return { c, tod: getTimeOfDay(new Date(), c.lat, c.lng) };
  }, []);

  // Audio: the music fades in gently on the cold open; a soft whoosh between steps.
  useEffect(() => {
    music.start(musicMoodFor(preview.tod.weights));
  }, [preview]);
  const lastStep = useRef<Step>(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    if (!(lastStep.current === 'location' && step === 'checking')) sound.play('whoosh');
    lastStep.current = step;
  }, [step]);

  const start = async (city: CityInfo) => {
    setBusy(true);
    await useGame.getState().openCity(city);
    if (useGame.getState().status === 'ready') {
      useProfile.getState().update((p) => {
        p.onboarded = true;
      });
      track('onboarding_done', { city: city.kind === 'fallback' ? city.id : 'area' });
      router.replace('/map');
    } else {
      setNote(useGame.getState().error ?? t('onboarding.location.loadFailed'));
      setBusy(false);
    }
  };

  const [found, setFound] = useState<Found | null>(() => {
    if (!qaOn || !qa.found) return null;
    if (qa.found === 'off') return { kind: 'off' };
    return { kind: qa.found, city: FALLBACK_CITIES[3], km: qa.found === 'near' ? 4 : 1840 };
  });
  /** The city being previewed in the picker (null = the list). */
  const [picked, setPicked] = useState<City | null>(
    () => (qaOn && FALLBACK_CITIES.find((c) => c.id === qa.city)) || null,
  );

  /**
   * Approximate location, once. With the data service, check whether the
   * player's own area is playable; otherwise (or if it isn't), start in the
   * closest of the 9 cities when one is near, or suggest it.
   */
  const useMyLocation = async () => {
    setStep('checking');
    setNote(null);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain)
        perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        // Denied now or earlier: iOS won't ask again, only Settings can turn it on.
        setFound({ kind: 'off' });
        setStep('location');
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })) ??
        (await timeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
          LOCATION_TIMEOUT_MS,
        ));
      const { latitude: lat, longitude: lng } = pos.coords;
      if (ENV.dataApiUrl) {
        try {
          const res = await areaCheck(lat, lng);
          if (res.playable && res.cityId && FALLBACK_CITIES.some((c) => c.id === res.cityId)) {
            await start(cityInfoFor(res.cityId as CityId));
            return;
          }
          if (res.playable && res.res5 && res.centroid) {
            await start({
              id: `area-${res.res5}`,
              name: res.cityName ?? t('onboarding.location.yourArea'),
              lat: res.centroid.lat,
              lng: res.centroid.lng,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              countryCode: deviceCountry(),
              kind: 'area',
              res5: res.res5,
            });
            return;
          }
        } catch {
          // Fall through to the closest city.
        }
      }
      const near = nearestCity(lat, lng);
      setFound({ kind: near.km <= NEAR_CITY_KM ? 'near' : 'far', ...near });
      setStep('location');
    } catch {
      setNote(t('onboarding.location.notFound'));
      setStep('picker');
    }
  };

  if (step === 'cold-open') {
    // The front of a Coinline machine: marquee, products behind the glass, LED, coin key.
    return (
      <Cabinet style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + SPACE.m,
            paddingBottom: insets.bottom + SPACE.l,
            paddingHorizontal: SPACE.l,
            gap: SPACE.m,
          }}
        >
          <Marquee title="Coinline" subtitle={t('onboarding.coldOpen.subtitle')} />
          <Glass style={{ flex: 1 }} padding={SPACE.s} fill>
            <View style={styles.window}>
              {SHOWCASE.map((id) => (
                <View key={id} style={styles.coil}>
                  <Image source={PRODUCT_IMAGES[id]} style={styles.product} resizeMode="contain" />
                  <View style={styles.coilLine} />
                </View>
              ))}
            </View>
          </Glass>
          <Row style={{ justifyContent: 'center' }}>
            <Led
              size={16}
              accessibilityLabel={t('onboarding.coldOpen.clockA11y', {
                city: cityName(preview.c),
                time: clock(now, preview.c.timeZone),
              })}
            >
              {`${cityName(preview.c).toUpperCase()}  ${clock(now, preview.c.timeZone)}`}
            </Led>
          </Row>
          <T size={22} weight="bold" color="#FFFFFF" center accessibilityRole="header">
            {t('onboarding.coldOpen.tagline')}
          </T>
          <Button
            label={t('onboarding.coldOpen.insertCoin')}
            icon={<Icon name="coin" size={22} color="#FFFFFF" />}
            onPress={() => setStep('intro')}
            accessibilityHint={t('onboarding.coldOpen.insertCoinHint')}
          />
        </View>
      </Cabinet>
    );
  }

  if (step === 'intro') return <Intro onDone={() => setStep('location')} />;

  if (step === 'location' || step === 'checking') {
    const checking = step === 'checking';
    return (
      <Screen title={t('onboarding.location.title')} back={false} scroll={false}>
        <View style={{ flex: 1, padding: SPACE.xl, justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', gap: SPACE.l, marginTop: SPACE.xl }}>
            <View style={styles.bigIcon}>
              <Icon
                name={found?.kind === 'near' ? 'pin' : 'locate'}
                size={56}
                color={SKIN.brandFace}
              />
            </View>
            {found?.kind === 'near' ? (
              <>
                <T size={22} weight="bold" center>
                  {t('onboarding.location.nearTitle', { city: cityName(found.city) })}
                </T>
                <T center muted>
                  {t('onboarding.location.nearBody')}
                </T>
              </>
            ) : found?.kind === 'far' ? (
              <>
                <T size={22} weight="bold" center>
                  {t('onboarding.location.farTitle')}
                </T>
                <T center muted>
                  {t('onboarding.location.farBody', {
                    city: cityName(found.city),
                    km: Math.round(found.km).toLocaleString(t.lang),
                  })}
                </T>
              </>
            ) : found?.kind === 'off' ? (
              <>
                <T size={22} weight="bold" center>
                  {t('onboarding.location.offTitle')}
                </T>
                <T center muted>
                  {t('onboarding.location.offBody')}
                </T>
              </>
            ) : (
              <>
                <T size={22} weight="bold" center>
                  {t('onboarding.location.startTitle')}
                </T>
                <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  <StatChip
                    icon="locate"
                    label={t('onboarding.location.approxLabel')}
                    value={t('onboarding.location.approxValue')}
                  />
                  <StatChip
                    icon="lock"
                    label={t('onboarding.location.notStoredLabel')}
                    value={t('onboarding.location.notStoredValue')}
                  />
                  <StatChip
                    icon="clock"
                    label={t('onboarding.location.onceLabel')}
                    value={t('onboarding.location.onceValue')}
                  />
                </Row>
              </>
            )}
          </View>
          <View style={{ gap: SPACE.m }}>
            {found?.kind === 'near' || found?.kind === 'far' ? (
              <Button
                label={t('onboarding.location.startIn', { city: cityName(found.city) })}
                icon={<Icon name="play" size={20} color="#FFFFFF" />}
                onPress={() => start(cityInfoFor(found.city.id))}
                busy={busy}
              />
            ) : found?.kind === 'off' ? (
              <Button
                label={t('onboarding.location.openSettings')}
                icon={<Icon name="gear" size={20} color="#FFFFFF" />}
                onPress={() => {
                  setFound(null);
                  void Linking.openSettings();
                }}
              />
            ) : (
              <Button
                label={t('onboarding.location.useMyLocation')}
                icon={<Icon name="locate" size={20} color="#FFFFFF" />}
                onPress={useMyLocation}
                busy={checking || busy}
                accessibilityHint={t('onboarding.location.useMyLocationHint')}
              />
            )}
            <Button
              label={t('onboarding.location.exploreCities')}
              icon={<Icon name="globe" size={20} color={SKIN.keyInk} />}
              kind="secondary"
              onPress={() => setStep('picker')}
              disabled={checking || busy}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (picked) {
    const info = cityInfoFor(picked.id);
    const tod = getTimeOfDay(new Date(now), picked.lat, picked.lng);
    const night = tod.weights.night > 0.5;
    return (
      <Screen
        title={cityName(picked)}
        subtitle={t('onboarding.preview.subtitle')}
        onBack={() => setPicked(null)}
      >
        <View style={[styles.previewSky, { backgroundColor: tod.palette.sky }]}>
          <Icon
            name={night ? 'moon' : tod.dominant === 'day' ? 'sun' : 'twilight'}
            size={64}
            color={night ? '#FFFFFF' : SKIN.ledAmber}
          />
          <Led size={22}>{clock(now, picked.timeZone)}</Led>
        </View>
        <T size={16} center>
          {cityNotes(t, picked)}
        </T>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <StatChip icon="clock" label={t('onboarding.preview.localTime')} value={clock(now, picked.timeZone)} />
          <StatChip
            icon="star"
            label={
              hasSave(info) ? t('onboarding.preview.hasBusiness') : t('onboarding.preview.freshStart')
            }
            value={hasSave(info) ? t('onboarding.preview.saved') : t('onboarding.preview.new')}
          />
        </Row>
        <T size={13} muted center>
          {t('onboarding.preview.switchNote')}
        </T>
        <Button
          label={
            hasSave(info)
              ? t('onboarding.preview.continueIn', { city: cityName(picked) })
              : t('onboarding.preview.startIn', { city: cityName(picked) })
          }
          icon={<Icon name="play" size={20} color="#FFFFFF" />}
          onPress={() => start(info)}
          busy={busy}
        />
        <Button
          label={t('onboarding.preview.back')}
          kind="secondary"
          onPress={() => setPicked(null)}
          disabled={busy}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('onboarding.picker.title')}
      subtitle={note ?? t('onboarding.picker.subtitle')}
      onBack={() => {
        setNote(null);
        setStep('location');
      }}
    >
      {FALLBACK_CITIES.map((c) => {
        const info = cityInfoFor(c.id);
        const tod = getTimeOfDay(new Date(now), c.lat, c.lng);
        const night = tod.weights.night > 0.5;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={t(
              hasSave(info) ? 'onboarding.picker.rowA11ySaved' : 'onboarding.picker.rowA11y',
              { city: cityName(c), time: clock(now, c.timeZone) },
            )}
            accessibilityHint={t('onboarding.picker.rowHint')}
            disabled={busy}
            onPress={() => setPicked(c)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Paper tone="surface" style={styles.city}>
              <View style={[styles.sky, { backgroundColor: tod.palette.sky }]}>
                <Icon
                  name={night ? 'moon' : tod.dominant === 'day' ? 'sun' : 'twilight'}
                  size={22}
                  color={night ? '#FFFFFF' : SKIN.ledAmber}
                />
              </View>
              <View style={{ flex: 1 }}>
                <T weight="bold">{cityName(c)}</T>
                <T size={12} muted numberOfLines={1}>
                  {hasSave(info) ? t('onboarding.picker.saved') : cityNotes(t, c)}
                </T>
              </View>
              <Led size={14}>{clock(now, c.timeZone)}</Led>
              <Icon name="chevron" size={18} color={SKIN.chromeDark} />
            </Paper>
          </Pressable>
        );
      })}
    </Screen>
  );
}

/** Three quick cards on how the game works, before choosing where to play. */
const INTRO: readonly { icon: IconName; title: TKey; line: TKey }[] = [
  { icon: 'pin', title: 'onboarding.intro.streetsTitle', line: 'onboarding.intro.streetsLine' },
  { icon: 'box', title: 'onboarding.intro.stockTitle', line: 'onboarding.intro.stockLine' },
  { icon: 'company', title: 'onboarding.intro.empireTitle', line: 'onboarding.intro.empireLine' },
];

function Intro({ onDone }: { onDone: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const last = page === INTRO.length - 1;
  return (
    <Cabinet style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: insets.top + SPACE.m, paddingBottom: insets.bottom + SPACE.l }}>
        <View style={{ paddingHorizontal: SPACE.l }}>
          <Marquee title={t('onboarding.intro.title')} />
        </View>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {INTRO.map((c) => (
            <View key={c.title} style={{ width, padding: SPACE.l, justifyContent: 'center' }}>
              <Glass padding={SPACE.xl}>
                <View style={{ alignItems: 'center', gap: SPACE.l, paddingVertical: SPACE.xl }}>
                  <View style={styles.bigIcon}>
                    <Icon name={c.icon} size={56} color={SKIN.brandFace} />
                  </View>
                  <T size={24} weight="bold" center accessibilityRole="header">
                    {t(c.title)}
                  </T>
                  <T size={16} center muted>
                    {t(c.line)}
                  </T>
                </View>
              </Glass>
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: SPACE.l, gap: SPACE.m }}>
          <Row style={{ justifyContent: 'center', gap: 6 }}>
            {INTRO.map((c, i) => (
              <View
                key={c.title}
                style={[
                  styles.introDot,
                  { width: i === page ? 18 : 8, opacity: i === page ? 1 : 0.55 },
                ]}
              />
            ))}
          </Row>
          <Button
            label={last ? t('onboarding.intro.letsGo') : t('onboarding.intro.next')}
            onPress={() => {
              if (last) onDone();
              else {
                scroller.current?.scrollTo({ x: width * (page + 1), animated: true });
                setPage(page + 1);
              }
            }}
          />
          {!last ? <Button label={t('onboarding.intro.skip')} kind="quiet" onPress={onDone} /> : null}
        </View>
      </View>
    </Cabinet>
  );
}

/** Products shown in the cold open's window (4 × 4). */
const SHOWCASE = [
  'northfield-cola', 'kettle-crisp', 'volt-bar', 'clearpeak-water',
  'lumen-gummies', 'orchard-juice', 'cocoa-drift', 'volt-energy',
  'ridge-pretzels', 'sparkline-lemon', 'cup-noodles', 'latte',
  'crunchwell', 'harbor-tea', 'capsule-critters', 'saltline-peanuts',
]; // prettier-ignore

const styles = StyleSheet.create({
  window: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-around' },
  coil: {
    width: '25%',
    height: '25%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  product: { width: '78%', height: '78%' },
  coilLine: {
    width: '86%',
    height: 5,
    borderRadius: 3,
    backgroundColor: SKIN.chromeDark,
    marginTop: 2,
  },
  bigIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 6,
    borderColor: SKIN.chrome,
  },
  city: { flexDirection: 'row', alignItems: 'center', gap: SPACE.m, padding: SPACE.m },
  previewSky: {
    height: 180,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.m,
  },
  introDot: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  sky: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
