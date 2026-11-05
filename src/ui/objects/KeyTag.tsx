import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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

export const STATUS_LABEL: Record<MachineStatus, string> = {
  ok: 'Running',
  low: 'Low stock',
  empty: 'Empty',
  'cash-full': 'Cash box full',
  broken: 'Broken',
  stored: 'In storage',
  unknown: 'No telemetry',
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} at ${place}, ${STATUS_LABEL[status]}`}
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
              {STATUS_LABEL[status]}
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
