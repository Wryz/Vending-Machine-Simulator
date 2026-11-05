import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FALLBACK_CITIES, type CityId } from '@/config/cities';
import { CLOSEUP_CAMERA, FAMILY_ACCENT, SNACK_MACHINE_DIMENSIONS } from '@/config/machines';
import { areaCheck } from '@/data/api';
import { ENV } from '@/data/env';
import { closeupCamera } from '@/map/cameraMatch';
import { getTimeOfDay } from '@/map/timeOfDay';
import { track } from '@/services/analytics';
import { cityInfoFor, hasSave, useGame } from '@/store/game';
import { useProfile, type CityInfo } from '@/store/profile';
import { MachineScene } from '@/three/MachineScene';
import { useTheme } from '@/ui/ThemeProvider';
import { clock } from '@/ui/format';
import { Button, Mono, Paper, Spacer, T } from '@/ui/kit';
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
  const theme = useTheme();
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
    const tod = getTimeOfDay(new Date(), c.lat, c.lng);
    const to = closeupCamera(200, SNACK_MACHINE_DIMENSIONS.heightM, {
      ...CLOSEUP_CAMERA,
      distanceM: 3.4,
      eyeHeightM: 1.4,
    });
    const from = {
      ...to,
      position: [to.position[0] * 1.8, 2.6, to.position[2] * 1.8] as [number, number, number],
    };
    return { c, tod, from, to };
  }, []);

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
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <MachineScene
          typeId="used-snack"
          accent={FAMILY_ACCENT.snacks}
          slots={Array.from({ length: 30 }, (_, i) => ({
            color: ['#C9473A', '#E0B341', '#3E6FB0', '#4F8A5B', '#D9732B'][i % 5],
            fill: 0.8,
          }))}
          sun={preview.tod.sun}
          palette={preview.tod.palette}
          heading={200}
          from={preview.from}
          to={preview.to}
          durationMs={6000}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: SPACE.xl,
            paddingBottom: insets.bottom + SPACE.xl,
            gap: SPACE.m,
          }}
        >
          <Paper>
            <Mono size={12} muted>
              {preview.c.name.toUpperCase()} · {clock(now, preview.c.timeZone)}
            </Mono>
            <Spacer h={SPACE.s} />
            <T size={24} weight="bold">
              One used machine. $250. A whole city.
            </T>
            <Spacer h={SPACE.s} />
            <T muted>Build a vending business on the real map of your city, one spot at a time.</T>
          </Paper>
          <Button label="Start" onPress={() => setStep('location')} />
        </View>
      </View>
    );
  }

  if (step === 'location' || step === 'checking') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          padding: SPACE.xl,
          paddingTop: insets.top + SPACE.xxl,
          justifyContent: 'space-between',
          paddingBottom: insets.bottom + SPACE.xl,
        }}
      >
        <View style={{ gap: SPACE.m }}>
          <T size={26} weight="bold" accessibilityRole="header">
            Your city, to build your business in
          </T>
          <T muted>
            We use your approximate location once, to build your city: real streets, real places and
            the real time of day. It is rounded to about 1 km and never stored.
          </T>
        </View>
        <View style={{ gap: SPACE.m }}>
          <Button label="Use my area" onPress={useMyArea} busy={step === 'checking' || busy} />
          <Button
            label="Pick a city instead"
            kind="secondary"
            onPress={() => setStep('picker')}
            disabled={step === 'checking'}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: SPACE.l,
          paddingTop: insets.top + SPACE.xl,
          paddingBottom: insets.bottom + SPACE.xl,
          gap: SPACE.m,
        }}
      >
        <T size={24} weight="bold" accessibilityRole="header">
          Pick a city
        </T>
        <T muted>
          {note ??
            'Pick a city to start your business. You can switch any time; each city has its own save.'}
        </T>
        {FALLBACK_CITIES.map((c) => {
          const info = cityInfoFor(c.id);
          const tod = getTimeOfDay(new Date(now), c.lat, c.lng);
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, local time ${clock(now, c.timeZone)}`}
              disabled={busy}
              onPress={() => start(info)}
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <Paper
                tone="surface"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACE.m,
                  padding: SPACE.m,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: tod.palette.sky,
                    borderWidth: 1,
                    borderColor: theme.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 16,
                      borderRadius: 2,
                      backgroundColor: tod.weights.night > 0.5 ? '#FFE9C7' : FAMILY_ACCENT.snacks,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="bold">{c.name}</T>
                  <T size={13} muted>
                    {c.notes}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Mono size={13}>{clock(now, c.timeZone)}</Mono>
                  {hasSave(info) ? (
                    <T size={11} muted>
                      Saved
                    </T>
                  ) : null}
                </View>
              </Paper>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
