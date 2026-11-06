import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { t, useT } from '@/i18n';

import { useTheme } from '../ThemeProvider';
import { Mono, StatusDot, T } from '../kit';
import { SPACE, TOUCH } from '../theme';

export type MachineStatus = 'ok' | 'low' | 'empty' | 'cash-full' | 'broken' | 'stored' | 'unknown';

export function statusColor(
  status: MachineStatus,
  theme: { signal: string; amber: string; alert: string; muted: string },
): string {
  switch (status) {
    case 'low':
    case 'empty':
      return theme.amber;
    case 'cash-full':
      return theme.signal;
    case 'broken':
      return theme.alert;
    case 'ok':
      return theme.muted;
    default:
      return theme.muted;
  }
}

/** Status label in the current language. */
export function statusLabel(status: MachineStatus): string {
  switch (status) {
    case 'ok':
      return t('objects.status.ok');
    case 'low':
      return t('objects.status.low');
    case 'empty':
      return t('objects.status.empty');
    case 'cash-full':
      return t('objects.status.cashFull');
    case 'broken':
      return t('objects.status.broken');
    case 'stored':
      return t('objects.status.stored');
    default:
      return t('objects.status.unknown');
  }
}

/** Status labels by status, read in the current language (kept for existing callers). */
export const STATUS_LABEL: Readonly<Record<MachineStatus, string>> = {
  get ok() {
    return statusLabel('ok');
  },
  get low() {
    return statusLabel('low');
  },
  get empty() {
    return statusLabel('empty');
  },
  get 'cash-full'() {
    return statusLabel('cash-full');
  },
  get broken() {
    return statusLabel('broken');
  },
  get stored() {
    return statusLabel('stored');
  },
  get unknown() {
    return statusLabel('unknown');
  },
};

/**
 * A key on the key ring (SPEC §3.6): one per owned machine. The tag shows
 * the machine type and its status.
 */
export function KeyTag({
  name,
  place,
  accent,
  status,
  amount,
  onPress,
}: {
  name: string;
  place: string;
  accent: string;
  status: MachineStatus;
  amount?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const tr = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('objects.keyTag.a11y', { name, place, status: statusLabel(status) })}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: TOUCH + 16,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Svg width={46} height={30} viewBox="0 0 46 30">
        <Circle cx={12} cy={15} r={10} fill="none" stroke="#A9ADB1" strokeWidth={3} />
        <Path d="M22 13 h20 v4 h-3 v4 h-3 v-4 h-3 v3 h-3 v-3 h-8 z" fill="#B9BDC1" />
      </Svg>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACE.s,
          backgroundColor: theme.paper,
          borderLeftWidth: 6,
          borderLeftColor: accent,
          borderRadius: 4,
          paddingVertical: SPACE.s,
          paddingHorizontal: SPACE.m,
        }}
      >
        <View style={{ flex: 1 }}>
          <T size={14} weight="bold" color={theme.paperInk} numberOfLines={1}>
            {name}
          </T>
          <T size={12} color="#5C6066" numberOfLines={1}>
            {place}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <StatusDot color={statusColor(status, theme)} />
            <T size={11} color="#5C6066">
              {statusLabel(status)}
            </T>
          </View>
          {amount ? (
            <Mono size={12} color={theme.paperInk}>
              {amount}
            </Mono>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
