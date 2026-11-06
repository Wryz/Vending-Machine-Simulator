import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { FALLBACK_CITIES } from '@/config/cities';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
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
  highlight,
  onPress,
  disabled,
}: {
  name: string;
  detail?: string;
  time: string;
  label: string;
  /** Show the label in the signal color (a saved city). */
  highlight?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={t('cities.a11y.row', { name, time, label })}
      accessibilityHint={onPress ? t('cities.a11y.switchHint') : undefined}
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
      <T size={13} color={highlight ? theme.signal : theme.muted}>
        {label}
      </T>
    </Pressable>
  );
}

/** A city's display name: the 9 fallback cities are translated, local areas keep their map name. */
function cityName(c: CityInfo): string {
  return c.kind === 'fallback' ? content.city(c.id, c.name) : c.name;
}

/** City switcher (SPEC §6.1 step 5, §8): each city is its own save slot. */
export default function Cities() {
  const theme = useTheme();
  const t = useT();
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
      show(useGame.getState().error ?? t('cities.openFailed'), 'error');
    }
  };

  const confirm = (target: CityInfo, isNew: boolean) => {
    const name = cityName(target);
    const current = city ? cityName(city) : t('cities.confirm.thisCity');
    Alert.alert(
      isNew ? t('cities.confirm.startTitle', { name }) : t('cities.confirm.goTitle', { name }),
      isNew
        ? t('cities.confirm.startBody', { current })
        : t('cities.confirm.goBody', { current }),
      [
        { text: t('cities.confirm.cancel'), style: 'cancel' },
        {
          text: isNew ? t('cities.confirm.start') : t('cities.confirm.go'),
          onPress: () => switchTo(target),
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('cities.title')} subtitle={t('cities.subtitle')}>
        {city ? (
          <Section title={t('cities.section.current')}>
            <Paper tone="surface">
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T size={18} weight="bold">
                    {cityName(city)}
                  </T>
                  {game ? (
                    <T size={13} muted>
                      {t('cities.chapterMachines', {
                        chapter: game.chapter,
                        n: game.machines.filter((m) => m.status === 'active').length,
                      })}
                    </T>
                  ) : null}
                </View>
                <Mono size={18}>{clock(now, city.timeZone)}</Mono>
              </Row>
            </Paper>
          </Section>
        ) : null}

        {otherAreas.length > 0 ? (
          <Section title={t('cities.section.area')}>
            <View>
              {otherAreas.map((c) => (
                <CityRow
                  key={cityKey(c)}
                  name={c.name}
                  time={clock(now, c.timeZone)}
                  label={t('cities.label.saved')}
                  highlight
                  disabled={switching}
                  onPress={() => confirm(c, false)}
                />
              ))}
            </View>
          </Section>
        ) : null}

        <Section title={t('cities.section.cities')}>
          <View>
            {FALLBACK_CITIES.map((c) => {
              const info = cityInfoFor(c.id);
              const isCurrent = cityKey(info) === currentKey;
              const has = saved.has(c.id);
              return (
                <CityRow
                  key={c.id}
                  name={content.city(c.id, c.name)}
                  detail={t.or(`content.cityNotes.${c.id}`, c.notes)}
                  time={clock(now, c.timeZone)}
                  label={
                    isCurrent
                      ? t('cities.label.current')
                      : has
                        ? t('cities.label.saved')
                        : t('cities.label.newSave')
                  }
                  highlight={!isCurrent && has}
                  disabled={switching}
                  onPress={isCurrent ? undefined : () => confirm(info, !has)}
                />
              );
            })}
          </View>
        </Section>

        <T size={13} muted>
          {t('cities.footer')}
        </T>
        {switching ? (
          <T size={13} color={theme.muted} accessibilityLiveRegion="polite">
            {t('cities.opening')}
          </T>
        ) : null}
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
