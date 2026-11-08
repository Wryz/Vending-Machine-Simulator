import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { musicMoodFor } from '@/audio/soundscape';
import { START } from '@/config/economy';
import { getMachineType } from '@/config/machines';
import type { PickerCity } from '@/data/cityIndex';
import { useT, type TKey } from '@/i18n';
import { getTimeOfDay } from '@/map/timeOfDay';
import { track } from '@/services/analytics';
import { music, sound } from '@/services/audio';
import { useCityIndex } from '@/store/cityIndex';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { currencyForCountry } from '@/ui/currency';
import { clock, moneyWhole } from '@/ui/format';
import { Icon, type IconName } from '@/ui/icons';
import { Button, Row, T } from '@/ui/kit';
import { CityPicker, useCityLabel } from '@/ui/picker/CityPicker';
import { cityInfoFromPick, guessOrigin, useYou } from '@/ui/picker/where';
import { PRODUCT_IMAGES } from '@/ui/productImages';
import { Cabinet, Glass, Led, Marquee, SKIN } from '@/ui/skin';
import { SPACE } from '@/ui/theme';

/** The used starter machine's price, for the cold open's tagline. */
const USED_MACHINE_CENTS = getMachineType(START.starterMachineType).purchaseCents;

type Step = 'cold-open' | 'intro' | 'pick';

/**
 * Onboarding (SPEC §6.1, §8): cold open of a lone machine glowing at the
 * player's local time -> how it works -> the globe city picker, centered on
 * your phone's region (or on you, once you share an approximate location).
 */
export default function Onboarding() {
  const t = useT();
  const label = useCityLabel();
  const insets = useSafeAreaInsets();
  const index = useCityIndex((s) => s.entries);
  const [step, setStep] = useState<Step>('cold-open');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { you, locate } = useYou();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const guess = useMemo(() => guessOrigin(index), [index]);
  // The cold open shows the biggest city in your time zone, at its real local time.
  const preview = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const home = index.filter((e) => e.z === tz && !e.d).sort((a, b) => b.p - a.p)[0];
    const name = home ? label(home) : '';
    return {
      name,
      tz: home?.z ?? tz,
      cc: home?.c ?? '',
      tod: getTimeOfDay(new Date(), guess.lat, guess.lng),
    };
    // Names are fixed for the session; recomputing with the label fn adds nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, guess]);

  // Audio: the music fades in gently on the cold open; a soft whoosh between steps.
  useEffect(() => {
    music.start(musicMoodFor(preview.tod.weights));
  }, [preview]);
  const lastStep = useRef<Step>(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    sound.play('whoosh');
    lastStep.current = step;
  }, [step]);

  const start = async (c: PickerCity, spot: { lat: number; lng: number } | null) => {
    setBusy(true);
    setError(null);
    await useGame.getState().openCity(cityInfoFromPick(c, label(c), spot));
    if (useGame.getState().status === 'ready') {
      useProfile.getState().update((p) => {
        p.onboarded = true;
      });
      track('onboarding_done', { city: 'area', near: you ? Math.round(c.km) : -1 });
      router.replace('/map');
    } else {
      setError(t('picker.offline', { city: label(c) }));
      setBusy(false);
    }
  };

  if (step === 'cold-open') {
    // The front of a Coinline machine: marquee, products behind the glass, LED, coin key.
    const time = clock(now, preview.tz);
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
              accessibilityLabel={
                preview.name
                  ? t('onboarding.coldOpen.clockA11y', { city: preview.name, time })
                  : time
              }
            >
              {preview.name ? `${preview.name.toUpperCase()}  ${time}` : time}
            </Led>
          </Row>
          <T size={22} weight="bold" color="#FFFFFF" center accessibilityRole="header">
            {t('onboarding.coldOpen.tagline', {
              amount: moneyWhole(USED_MACHINE_CENTS, currencyForCountry(preview.cc || 'US')),
            })}
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

  if (step === 'intro') return <Intro onDone={() => setStep('pick')} />;

  return (
    <CityPicker
      mode="start"
      origin={you ?? guess}
      you={you}
      status={{}}
      busy={busy}
      error={error}
      onLocate={async () => {
        const r = await locate();
        if (r !== 'ok') setError(t('onboarding.location.offBody'));
      }}
      onPick={start}
    />
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
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + SPACE.m,
          paddingBottom: insets.bottom + SPACE.l,
        }}
      >
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
          {!last ? (
            <Button label={t('onboarding.intro.skip')} kind="quiet" onPress={onDone} />
          ) : null}
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
