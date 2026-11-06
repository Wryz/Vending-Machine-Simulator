import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCityClock } from '@/hooks/useCityClock';
import { haptic } from '@/services/haptics';
import { useGame } from '@/store/game';
import { useHud } from '@/store/hud';

import { clock } from './format';
import { Badge } from './hud';
import { Icon, type IconName } from './icons';
import { Mono, T } from './kit';
import { sfx } from './sfx';
import { Key, SKIN } from './skin';
import { SPACE } from './theme';
import { dayIcon, LED_GLOW, temperature, WEATHER_ICON } from './weather';

export interface TabItem {
  name: string;
  icon: IconName;
  label: string;
  badge?: string;
  /** Just unlocked and not visited yet. */
  fresh?: boolean;
}

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
  const insets = useSafeAreaInsets();
  const setHeight = useHud((s) => s.setTabBarHeight);
  const showKeys = tabs.length > 1;
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={[
        styles.bar,
        { paddingBottom: showKeys ? Math.max(insets.bottom - 6, SPACE.s) : insets.bottom },
      ]}
    >
      <StatusStrip />
      {showKeys ? (
        <View style={styles.keys}>
          {tabs.map((t) => {
            const on = t.name === current;
            return (
              <Animated.View
                key={t.name}
                entering={FadeIn.duration(400)}
                layout={LinearTransition.duration(300)}
                style={styles.tab}
              >
                <View>
                  <Key
                    tone={on ? 'brand' : 'white'}
                    height={46}
                    accessibilityLabel={
                      t.badge ? `${t.label}, ${t.badge} ready` : t.fresh ? `${t.label}, new` : t.label
                    }
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      if (on) return;
                      sfx('pop');
                      haptic.select();
                      onSelect(t.name);
                    }}
                    faceStyle={{ width: 54, paddingHorizontal: 0 }}
                  >
                    <Icon name={t.icon} size={24} color={on ? '#FFFFFF' : SKIN.brandFace} />
                  </Key>
                  {t.badge ? <Badge text={t.badge} /> : t.fresh ? <Badge text="NEW" /> : null}
                </View>
                <T size={11} weight="bold" color={on ? '#FFFFFF' : '#FFE3D4'}>
                  {t.label}
                </T>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Neighbourhood on the left; local time, weather and temperature on the right. */
function StatusStrip() {
  const world = useGame((s) => s.world);
  const area = useHud((s) => s.area);
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
  const place = area ?? world.city.name;
  return (
    <View style={styles.strip}>
      <Pressable
        style={({ pressed }) => [styles.where, { opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={area ? `${area}, ${world.city.name}` : world.city.name}
        accessibilityHint="Explore other cities"
        hitSlop={8}
        onPress={() => {
          sfx('pop');
          router.push('/cities');
        }}
      >
        <Icon name="pin" size={16} color="#FFE3D4" />
        <T size={14} weight="bold" color="#FFFFFF" numberOfLines={1} style={{ flexShrink: 1 }}>
          {place}
        </T>
        <Icon name="chevron" size={14} color="#FFE3D4" />
      </Pressable>
      <View
        style={styles.led}
        accessible
        accessibilityLabel={`${clock(now, world.city.timeZone)}${
          weather ? `, ${temperature(weather.tempC, world.city.countryCode)}` : ''
        }`}
      >
        <Icon name={day.name} size={15} color={day.color} />
        <Mono size={13} weight="bold" color={SKIN.ledGreen} style={LED_GLOW(SKIN.ledGreen)}>
          {clock(now, world.city.timeZone)}
        </Mono>
        {weather ? (
          <>
            {weather.condition !== 'clear' ? (
              <Icon name={WEATHER_ICON[weather.condition]} size={15} color={SKIN.ledAmber} />
            ) : null}
            <Mono size={13} weight="bold" color={SKIN.ledAmber} style={LED_GLOW(SKIN.ledAmber)}>
              {temperature(weather.tempC, world.city.countryCode)}
            </Mono>
          </>
        ) : null}
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
    paddingTop: SPACE.s,
    paddingHorizontal: SPACE.s,
    backgroundColor: SKIN.cabinetDark,
    borderTopLeftRadius: CORNER,
    borderTopRightRadius: CORNER,
    gap: SPACE.s,
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
    gap: SPACE.s,
    paddingHorizontal: SPACE.s,
    minHeight: 28,
  },
  where: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  led: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: SPACE.s + 2,
    borderRadius: 8,
    backgroundColor: SKIN.led,
  },
  keys: { flexDirection: 'row', justifyContent: 'space-around' },
  tab: { alignItems: 'center', gap: 4, minWidth: 58 },
});
