import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCityClock } from '@/hooks/useCityClock';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { haptic } from '@/services/haptics';
import { useGame } from '@/store/game';
import { useHud } from '@/store/hud';
import { useProfile } from '@/store/profile';

import { clock } from './format';
import { Badge } from './hud';
import { Icon, type IconName } from './icons';
import { Mono, T } from './kit';
import { sfx } from './sfx';
import { Key, SKIN } from './skin';
import { SPACE } from './theme';
import { dayIcon, temperature, WEATHER_ICON } from './weather';

export interface TabItem {
  name: string;
  icon: IconName;
  label: string;
  badge?: string;
  /** Just unlocked and not visited yet. */
  fresh?: boolean;
}

/** Ink on the light orange status band (readable, not stark black). */
const STRIP_INK = SKIN.marqueeInk;
const STRIP_SOFT = '#9A4418';

/** Top corner radius of the tab bar. */
const CORNER = 22;

/**
 * The game's tab bar (SPEC §3.6, §8): the machine's keypad along the bottom,
 * floating over the screen with rounded top corners. A status strip on top
 * shows where you are (neighbourhood) and the city's time and weather.
 * Only unlocked tabs show; a lone Map tab hides the keys and keeps the strip.
 */
export function TabBar({
  tabs,
  current,
  onSelect,
}: {
  tabs: readonly TabItem[];
  current: string;
  onSelect: (name: string) => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const setHeight = useHud((s) => s.setTabBarHeight);
  const showKeys = tabs.length > 1;
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[styles.bar, { paddingBottom: showKeys ? 0 : insets.bottom }]}
    >
      <StatusStrip />
      {showKeys ? (
        <View style={[styles.keys, { paddingBottom: Math.max(insets.bottom - 6, SPACE.s) }]}>
          {tabs.map((tab) => {
            const on = tab.name === current;
            return (
              <Animated.View
                key={tab.name}
                entering={FadeIn.duration(400)}
                layout={LinearTransition.duration(300)}
                style={styles.tab}
              >
                <View>
                  <Key
                    tone={on ? 'brand' : 'white'}
                    height={46}
                    accessibilityLabel={
                      tab.badge
                        ? t('tabBar.a11y.tabReady', { label: tab.label, badge: tab.badge })
                        : tab.fresh
                          ? t('tabBar.a11y.tabNew', { label: tab.label })
                          : tab.label
                    }
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      if (on) return;
                      sfx('pop');
                      haptic.select();
                      onSelect(tab.name);
                    }}
                    faceStyle={{ width: 54, paddingHorizontal: 0 }}
                  >
                    <Icon name={tab.icon} size={24} color={on ? '#FFFFFF' : SKIN.brandFace} />
                  </Key>
                  {tab.badge ? (
                    <Badge text={tab.badge} />
                  ) : tab.fresh ? (
                    <Badge text={t('tabBar.newBadge')} />
                  ) : null}
                </View>
                <T size={11} weight="bold" color={on ? '#FFFFFF' : '#FFE3D4'}>
                  {tab.label}
                </T>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** The city's date, e.g. "Fri 6 Nov" (English), in the UI language. */
function shortDate(at: number, timeZone: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(at));
}

/**
 * The dark orange band on top of the bar: where you are (neighbourhood, then
 * district / municipality and city) on the left; the city's local time, date
 * and weather on the right.
 */
function StatusStrip() {
  const t = useT();
  const world = useGame((s) => s.world);
  const cityInfo = useGame((s) => s.city);
  const area = useHud((s) => s.area);
  const district = useHud((s) => s.district);
  const tempUnit = useProfile((s) => s.settings.tempUnit);
  // Weather changes by the hour: re-read it when the clock ticks.
  const { now, tod } = useCityClock(world?.city.lat ?? 0, world?.city.lng ?? 0);
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!world) return null;
  const weather = world.weatherAt(now);
  const day = dayIcon(tod);
  // The fallback cities have translated names; local areas keep their map name.
  const city =
    cityInfo?.kind === 'fallback' ? content.city(world.city.id, world.city.name) : world.city.name;
  // Most specific name first; the line under it says where that is.
  const title = area ?? district ?? city;
  const under = [area && district !== city ? district : null, title !== city ? city : null].filter(Boolean).join(' · ');
  const time = clock(now, world.city.timeZone);
  const date = shortDate(now, world.city.timeZone, t.lang);
  const temp = weather ? temperature(weather.tempC, world.city.countryCode, tempUnit) : null;
  return (
    <View style={styles.strip}>
      <Pressable
        style={({ pressed }) => [styles.where, { opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={[title, under].filter(Boolean).join(', ')}
        accessibilityHint={t('tabBar.a11y.exploreCities')}
        hitSlop={8}
        onPress={() => {
          sfx('pop');
          router.push('/cities');
        }}
      >
        <Icon name="pin" size={18} color={STRIP_SOFT} />
        <View style={{ flexShrink: 1 }}>
          <T size={14} weight="bold" color={STRIP_INK} numberOfLines={1}>
            {title}
          </T>
          {under ? (
            <T size={11} weight="medium" color={STRIP_SOFT} numberOfLines={1}>
              {under}
            </T>
          ) : null}
        </View>
        <Icon name="chevron" size={14} color={STRIP_SOFT} />
      </Pressable>
      <View
        style={styles.when}
        accessible
        accessibilityLabel={[time, date, temp].filter(Boolean).join(', ')}
      >
        <View style={styles.whenRow}>
          <Icon name={day.name} size={15} color={STRIP_SOFT} />
          <Mono size={14} weight="bold" color={STRIP_INK}>
            {time}
          </Mono>
          {weather ? (
            <>
              {weather.condition !== 'clear' ? (
                <Icon name={WEATHER_ICON[weather.condition]} size={15} color={STRIP_SOFT} />
              ) : null}
              <Mono size={14} weight="bold" color={STRIP_INK}>
                {temp}
              </Mono>
            </>
          ) : null}
        </View>
        <T size={11} weight="medium" color={STRIP_SOFT}>
          {date}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // The outer bar is the light orange band; the keys sit in their own orange tray.
    backgroundColor: SKIN.cabinetLight,
    borderTopLeftRadius: CORNER,
    borderTopRightRadius: CORNER,
    shadowColor: '#7A2A08',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.m,
    paddingHorizontal: SPACE.l,
    paddingVertical: SPACE.s,
  },
  where: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  when: { alignItems: 'flex-end' },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keys: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACE.s + 2,
    paddingHorizontal: SPACE.s,
    backgroundColor: SKIN.cabinet,
    borderTopLeftRadius: CORNER,
    borderTopRightRadius: CORNER,
    // A thin dark orange edge that follows the rounded corners down the sides.
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: SKIN.cabinetDark,
  },
  tab: { alignItems: 'center', gap: 4, minWidth: 58 },
});
