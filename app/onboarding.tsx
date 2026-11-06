import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { musicMoodFor } from '@/audio/soundscape';
import { FALLBACK_CITIES, type CityId } from '@/config/cities';
import { areaCheck } from '@/data/api';
import { ENV } from '@/data/env';
import { getTimeOfDay } from '@/map/timeOfDay';
import { track } from '@/services/analytics';
import { music, sound } from '@/services/audio';
import { cityInfoFor, hasSave, useGame } from '@/store/game';
import { useProfile, type CityInfo } from '@/store/profile';
import { clock } from '@/ui/format';
import { StatChip } from '@/ui/hud';
import { Icon } from '@/ui/icons';
import { Button, Paper, Row, Screen, T } from '@/ui/kit';
import { PRODUCT_IMAGES } from '@/ui/productImages';
import { Cabinet, Glass, Led, Marquee, SKIN } from '@/ui/skin';
import { SPACE } from '@/ui/theme';

type Step = 'cold-open' | 'location' | 'checking' | 'picker';

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

/**
 * Onboarding (SPEC §6.1, §8): cold open of a lone machine glowing on a street
 * at the real local time -> why we ask for location -> approximate location
 * (once) -> area check -> start there, or pick one of the 9 cities.
 */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('cold-open');
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
      setNote(useGame.getState().error ?? 'Could not load that city.');
      setBusy(false);
    }
  };

  const useMyArea = async () => {
    setStep('checking');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setNote('No problem. Pick a city to start your business.');
        setStep('picker');
        return;
      }
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
      if (!ENV.dataApiUrl) throw new Error('offline');
      const res = await areaCheck(pos.coords.latitude, pos.coords.longitude);
      if (res.playable && res.cityId && FALLBACK_CITIES.some((c) => c.id === res.cityId)) {
        await start(cityInfoFor(res.cityId as CityId));
        return;
      }
      if (res.playable && res.res5 && res.centroid) {
        await start({
          id: `area-${res.res5}`,
          name: res.cityName ?? 'Your area',
          lat: res.centroid.lat,
          lng: res.centroid.lng,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          countryCode: deviceCountry(),
          kind: 'area',
          res5: res.res5,
        });
        return;
      }
      setNote("Your area doesn't have enough map data yet. Pick a city to start your business.");
      setStep('picker');
    } catch {
      setNote("We couldn't check your area right now. Pick a city to start your business.");
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
          <Marquee title="Coinline" subtitle="Vending Machine Simulator" />
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
              accessibilityLabel={`${preview.c.name}, ${clock(now, preview.c.timeZone)}`}
            >
              {`${preview.c.name.toUpperCase()}  ${clock(now, preview.c.timeZone)}`}
            </Led>
          </Row>
          <T size={22} weight="bold" color="#FFFFFF" center accessibilityRole="header">
            One used machine. $250. A whole city.
          </T>
          <Button
            label="Insert coin"
            icon={<Icon name="coin" size={22} color="#FFFFFF" />}
            onPress={() => setStep('location')}
            accessibilityHint="Start your vending business"
          />
        </View>
      </Cabinet>
    );
  }

  if (step === 'location' || step === 'checking') {
    return (
      <Screen title="Your city" back={false} scroll={false}>
        <View style={{ flex: 1, padding: SPACE.xl, justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', gap: SPACE.l, marginTop: SPACE.xl }}>
            <View style={styles.bigIcon}>
              <Icon name="locate" size={56} color={SKIN.brandFace} />
            </View>
            <T size={22} weight="bold" center>
              Build in your own city
            </T>
            <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              <StatChip
                icon="locate"
                label="Location is rounded to about 1 kilometre"
                value="~1 km"
              />
              <StatChip icon="lock" label="Your location is never stored" value="Not stored" />
              <StatChip icon="clock" label="Used once, to build your city" value="Once" />
            </Row>
          </View>
          <View style={{ gap: SPACE.m }}>
            <Button
              label="Use my area"
              icon={<Icon name="locate" size={20} color="#FFFFFF" />}
              onPress={useMyArea}
              busy={step === 'checking' || busy}
              accessibilityHint="Uses your approximate location once. It is rounded to about 1 km and never stored."
            />
            <Button
              label="Pick a city"
              icon={<Icon name="globe" size={20} color={SKIN.keyInk} />}
              kind="secondary"
              onPress={() => setStep('picker')}
              disabled={step === 'checking'}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Pick a city" subtitle={note ?? 'Each city has its own save'} back={false}>
      {FALLBACK_CITIES.map((c) => {
        const info = cityInfoFor(c.id);
        const tod = getTimeOfDay(new Date(now), c.lat, c.lng);
        const night = tod.weights.night > 0.5;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, local time ${clock(now, c.timeZone)}${hasSave(info) ? ', saved' : ''}`}
            disabled={busy}
            onPress={() => start(info)}
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
                <T weight="bold">{c.name}</T>
                {hasSave(info) ? (
                  <T size={12} weight="bold" color={SKIN.brandFace}>
                    Saved
                  </T>
                ) : null}
              </View>
              <Led size={14}>{clock(now, c.timeZone)}</Led>
            </Paper>
          </Pressable>
        );
      })}
    </Screen>
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
  sky: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
