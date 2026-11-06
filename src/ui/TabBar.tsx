import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/services/haptics';

import { Badge } from './hud';
import { Icon, type IconName } from './icons';
import { T } from './kit';
import { sfx } from './sfx';
import { Key, SKIN } from './skin';
import { SPACE } from './theme';

export interface TabItem {
  name: string;
  icon: IconName;
  label: string;
  badge?: string;
}

/**
 * The game's tab bar (SPEC §3.6, §8): the machine's keypad along the bottom.
 * The current tab's key is lit and pressed in; icons first, short labels under.
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
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, SPACE.s) }]}
    >
      {tabs.map((t) => {
        const on = t.name === current;
        return (
          <View key={t.name} style={styles.tab}>
            <View>
              <Key
                tone={on ? 'brand' : 'white'}
                height={46}
                accessibilityLabel={t.badge ? `${t.label}, ${t.badge} ready` : t.label}
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
              {t.badge ? <Badge text={t.badge} /> : null}
            </View>
            <T size={11} weight="bold" color={on ? '#FFFFFF' : '#FFE3D4'}>
              {t.label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACE.s,
    paddingHorizontal: SPACE.s,
    backgroundColor: SKIN.cabinet,
    borderTopWidth: 4,
    borderTopColor: SKIN.cabinetEdge,
  },
  tab: { alignItems: 'center', gap: 4, minWidth: 58 },
});
