import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { FALLBACK_CITIES } from '@/config/cities';
import { track } from '@/services/analytics';
import { cityInfoFor, hasSave, useGame } from '@/store/game';
import { cityKey, useProfile, type CityInfo } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { clock } from '@/ui/format';
import { Mono, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE, TOUCH } from '@/ui/theme';

/** Live local clocks, refreshed every 30 s. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function CityRow({
  name,
  detail,
  time,
  label,
  onPress,
  disabled,
}: {
  name: string;
  detail?: string;
  time: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}, local time ${time}, ${label}`}
      accessibilityHint={onPress ? 'Switch to this city' : undefined}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH + 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE.m,
        paddingVertical: SPACE.s,
        borderBottomWidth: 1,
        borderColor: theme.line,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Mono size={15} style={{ minWidth: 52 }}>
        {time}
      </Mono>
      <View style={{ flex: 1 }}>
        <T weight="medium">{name}</T>
        {detail ? (
          <T size={13} muted>
            {detail}
          </T>
        ) : null}
      </View>
      <T size={13} color={label === 'Saved' ? theme.signal : theme.muted}>
        {label}
      </T>
    </Pressable>
  );
}

/** City switcher (SPEC §6.1 step 5, §8): each city is its own save slot. */
export default function Cities() {
  const theme = useTheme();
  const now = useNow();
  const city = useGame((s) => s.city);
  const game = useGame((s) => s.game);
  const cities = useProfile((s) => s.cities);
  const { flash, show } = useFlash();
  const [switching, setSwitching] = useState(false);
  const currentKey = city ? cityKey(city) : null;

  // Which fallback cities already have a save (file reads; once per visit).
  const saved = useMemo(
    () =>
      new Set(FALLBACK_CITIES.filter((c) => hasSave(cityInfoFor(c.id))).map((c) => c.id as string)),
    [],
  );
  const otherAreas = Object.entries(cities)
    .filter(([k, c]) => k !== currentKey && c.kind === 'area')
    .map(([, c]) => c);

  const switchTo = async (target: CityInfo) => {
    setSwitching(true);
    track('city_switch', { city: target.kind === 'fallback' ? target.id : 'area' });
    useGame.getState().close();
    await useGame.getState().openCity(target);
    if (useGame.getState().status === 'ready') router.replace('/map');
    else {
      setSwitching(false);
      show(useGame.getState().error ?? 'Could not open that city.', 'error');
    }
  };

  const confirm = (target: CityInfo, isNew: boolean) =>
    Alert.alert(
      isNew ? `Start in ${target.name}?` : `Go to ${target.name}?`,
      isNew
        ? `A new business with a fresh save. Your progress in ${city?.name ?? 'this city'} stays saved.`
        : `Your progress in ${city?.name ?? 'this city'} is saved first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isNew ? 'Start' : 'Go', onPress: () => switchTo(target) },
      ],
    );

  return (
    <View style={{ flex: 1 }}>
      <Screen title="Cities" subtitle="Each city keeps its own business">
        {city ? (
          <Section title="Current city">
            <Paper tone="surface">
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T size={18} weight="bold">
                    {city.name}
                  </T>
                  {game ? (
                    <T size={13} muted>
                      Chapter {game.chapter} ·{' '}
                      {game.machines.filter((m) => m.status === 'active').length} machines
                    </T>
                  ) : null}
                </View>
                <Mono size={18}>{clock(now, city.timeZone)}</Mono>
              </Row>
            </Paper>
          </Section>
        ) : null}

        {otherAreas.length > 0 ? (
          <Section title="Your area">
            <View>
              {otherAreas.map((c) => (
                <CityRow
                  key={cityKey(c)}
                  name={c.name}
                  time={clock(now, c.timeZone)}
                  label="Saved"
                  disabled={switching}
                  onPress={() => confirm(c, false)}
                />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="Cities">
          <View>
            {FALLBACK_CITIES.map((c) => {
              const info = cityInfoFor(c.id);
              const isCurrent = cityKey(info) === currentKey;
              const has = saved.has(c.id);
              return (
                <CityRow
                  key={c.id}
                  name={c.name}
                  detail={c.notes}
                  time={clock(now, c.timeZone)}
                  label={isCurrent ? 'Current' : has ? 'Saved' : 'New save'}
                  disabled={switching}
                  onPress={isCurrent ? undefined : () => confirm(info, !has)}
                />
              );
            })}
          </View>
        </Section>

        <T size={13} muted>
          Switching saves this business first. Finish chapter 5 to sell the company and restart
          anywhere with a head start.
        </T>
        {switching ? (
          <T size={13} color={theme.muted} accessibilityLiveRegion="polite">
            Opening city…
          </T>
        ) : null}
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
