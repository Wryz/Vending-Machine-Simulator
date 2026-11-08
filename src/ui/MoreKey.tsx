import { View } from 'react-native';

import { useT } from '@/i18n';

import { Badge } from './hud';
import { Icon, type IconName } from './icons';
import { T } from './kit';
import { Key, keyInk, useSkin } from './skin';

/**
 * A keypad key with an icon and a short name under it, for the Company → More
 * grid. `badge` (> 0) shows a small number: something new behind the key.
 */
export function MoreKey({
  icon,
  label,
  badge = 0,
  onPress,
}: {
  icon: IconName;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  const t = useT();
  const skin = useSkin();
  const text = badge > 99 ? '99+' : String(badge);
  return (
    <View style={{ width: '31%', minWidth: 92 }}>
      <Key
        tone="white"
        height={72}
        onPress={onPress}
        accessibilityLabel={badge > 0 ? t('hud.buttonBadge', { label, badge: text }) : label}
        faceStyle={{ flexDirection: 'column', gap: 4, paddingHorizontal: 4 }}
      >
        <Icon name={icon} size={24} color={keyInk('white', skin)} />
        <T
          size={12}
          weight="bold"
          color={keyInk('white', skin)}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          center
        >
          {label}
        </T>
      </Key>
      {badge > 0 ? <Badge text={text} /> : null}
    </View>
  );
}
