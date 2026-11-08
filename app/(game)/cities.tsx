import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import type { PickerCity } from '@/data/cityIndex';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError } from '@/i18n/sim';
import { reputationFor, sellCompany } from '@/sim';
import { track } from '@/services/analytics';
import { haptic } from '@/services/haptics';
import { removeKey, writeJson } from '@/services/storage';
import { useCityIndex } from '@/store/cityIndex';
import { hasSave, prefetchCity, useGame } from '@/store/game';
import { cityKey, useProfile, type CityInfo } from '@/store/profile';
import { CityPicker, useCityLabel } from '@/ui/picker/CityPicker';
import { cityInfoFromPick, guessOrigin, legacySavesByRegion, useYou } from '@/ui/picker/where';

/** A city's display name: the former built-in nine are translated, others keep their map name. */
function cityName(c: CityInfo): string {
  return c.kind === 'fallback' ? content.city(c.id, c.name) : c.name;
}

/**
 * Choosing a city after onboarding (SPEC §6.1, §8), on the same globe picker:
 * travel to a saved city or start a new one (each city is its own save slot),
 * or, with ?mode=sell, pick where to restart after selling the company.
 */
export default function Cities() {
  const t = useT();
  const label = useCityLabel();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'sell' ? 'sell' : 'switch';
  const city = useGame((s) => s.city);
  const game = useGame((s) => s.game);
  const cities = useProfile((s) => s.cities);
  const index = useCityIndex((s) => s.entries);
  const { you, locate } = useYou();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saves from before regions, shown on the region that covers the same city.
  const legacy = useMemo(() => legacySavesByRegion(index, Object.values(cities)), [index, cities]);
  const status = useMemo(() => {
    const out: Record<string, 'playing' | 'saved'> = {};
    for (const c of Object.values(cities))
      if (c.kind === 'area' && c.res5 && hasSave(c)) out[c.res5] = 'saved';
    for (const [r, c] of Object.entries(legacy)) if (hasSave(c)) out[r] = 'saved';
    if (city?.kind === 'area' && city.res5) out[city.res5] = 'playing';
    if (city?.kind === 'fallback') {
      const r = Object.entries(legacy).find(([, c]) => c.id === city.id)?.[0];
      if (r) out[r] = 'playing';
    }
    return out;
  }, [cities, legacy, city]);

  const origin = you ?? (city ? { lat: city.lat, lng: city.lng } : guessOrigin(index));
  type Spot = { lat: number; lng: number } | null;
  // A saved city reopens where it was; a new one starts at your chosen spot (or downtown).
  const targetFor = (c: PickerCity, spot: Spot = null): CityInfo =>
    legacy[c.r] ?? cities[`area-${c.r}`] ?? cityInfoFromPick(c, label(c), spot);

  const open = async (target: CityInfo) => {
    setBusy(true);
    setError(null);
    // Download first: offline, the player stays in this city and sees why.
    if (!(await prefetchCity(target))) {
      setBusy(false);
      setError(t('picker.offline', { city: cityName(target) }));
      return;
    }
    useGame.getState().close();
    await useGame.getState().openCity(target);
    if (useGame.getState().status === 'ready') router.replace('/map');
    else {
      setBusy(false);
      setError(t('picker.offline', { city: cityName(target) }));
    }
  };

  const travel = (c: PickerCity, spot: Spot) => {
    const target = targetFor(c, spot);
    const isNew = !status[c.r];
    const name = cityName(target);
    const current = city ? cityName(city) : t('cities.confirm.thisCity');
    Alert.alert(
      isNew ? t('cities.confirm.startTitle', { name }) : t('cities.confirm.goTitle', { name }),
      isNew ? t('cities.confirm.startBody', { current }) : t('cities.confirm.goBody', { current }),
      [
        { text: t('cities.confirm.cancel'), style: 'cancel' },
        {
          text: isNew ? t('cities.confirm.start') : t('cities.confirm.go'),
          onPress: () => {
            track('city_switch', { city: target.kind === 'fallback' ? target.id : 'area' });
            void open(target);
          },
        },
      ],
    );
  };

  // Prestige (SPEC §4.8): sell this business and restart in the picked city with your perks.
  const sell = (c: PickerCity, spot: Spot) => {
    if (!game || !city) return;
    const target = targetFor(c, spot);
    const replacing = hasSave(target) && cityKey(city) !== cityKey(target);
    const targetName = cityName(target);
    Alert.alert(
      t('company.sell.title'),
      t(replacing ? 'company.sell.bodyReplacing' : 'company.sell.body', {
        rep: reputationFor(game),
        target: targetName,
        city: cityName(city),
      }),
      [
        { text: t('company.sell.cancel'), style: 'cancel' },
        {
          text: t('company.sell.confirm'),
          style: 'destructive',
          onPress: async () => {
            const current = useGame.getState().game;
            if (!current) return;
            // Nothing is sold until the new city is on the device.
            setBusy(true);
            setError(null);
            if (!(await prefetchCity(target))) {
              setBusy(false);
              setError(t('picker.offline', { city: targetName }));
              return;
            }
            const res = sellCompany(
              current,
              target.id,
              Date.now(),
              Math.floor(Math.random() * 2 ** 31),
            );
            if ('error' in res) {
              setBusy(false);
              setError(simError(res.error));
              return;
            }
            track('prestige', {
              city: target.kind === 'fallback' ? target.id : 'area',
              count: res.state.prestige.sales,
            });
            haptic.success();
            const soldKey = cityKey(city);
            writeJson(`save-${cityKey(target)}`, res.state);
            useGame.getState().close();
            await useGame.getState().openCity(target);
            // The sold business is gone; its slot is freed unless we restarted in the same city.
            // Only now: openCity has made the new city the last one, so launch never finds no city.
            if (soldKey !== cityKey(target) && useGame.getState().status === 'ready') {
              removeKey(`save-${soldKey}`);
              useProfile.getState().update((p) => {
                delete p.cities[soldKey];
              });
            }
            if (useGame.getState().status === 'ready') router.replace('/map');
            else {
              setBusy(false);
              setError(t('picker.offline', { city: targetName }));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <CityPicker
        mode={mode}
        origin={origin}
        you={you}
        status={status}
        busy={busy}
        error={error}
        onLocate={() => void locate()}
        onPick={mode === 'sell' ? sell : travel}
        onBack={() => router.back()}
      />
    </View>
  );
}
