import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CHAPTERS } from '@/config/progression';
import { getMachineType } from '@/config/machines';
import { haptic } from '@/services/haptics';
import type { GameState } from '@/sim';

import { chapterProgress } from '../chapter';
import { Badge } from '../hud';
import { Icon, type IconName } from '../icons';
import { ProgressBar, Row, T } from '../kit';
import { machineStatus } from '../machineStatus';
import { STATUS_LABEL, statusColor } from '../objects/KeyTag';
import { sfx } from '../sfx';
import { useTheme } from '../ThemeProvider';
import { RADIUS, SPACE } from '../theme';

/** Height of the collapsed sheet above the home indicator. */
export const HOME_SHEET_PEEK = 168;

/**
 * The map's one persistent sheet (SPEC §8): chapter goal and the main
 * actions when collapsed; the fleet when pulled up. Short copy only.
 */
export const HomeSheet = forwardRef<
  BottomSheet,
  {
    game: GameState;
    bottomInset: number;
    ordersReady: number;
    onMachine: (id: string) => void;
    onChange?: (index: number) => void;
  }
>(function HomeSheet({ game, bottomInset, ordersReady, onMachine, onChange }, ref) {
  const theme = useTheme();
  const snapPoints = useMemo(() => [HOME_SHEET_PEEK + bottomInset, '55%', '88%'], [bottomInset]);
  const progress = chapterProgress(game);
  const chapter = CHAPTERS.find((c) => c.n === game.chapter) ?? CHAPTERS[CHAPTERS.length - 1];
  const machines = game.machines.filter((m) => m.status === 'active');
  const stored = game.machines.filter((m) => m.status === 'stored').length;

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={onChange}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: theme.bg, borderRadius: RADIUS.l + 4 }}
      handleIndicatorStyle={{ backgroundColor: theme.line, width: 44, height: 5 }}
      style={[styles.sheet, { shadowColor: theme.shadow }]}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACE.l,
          paddingBottom: bottomInset + SPACE.xl,
          gap: SPACE.l,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chapter ${chapter.n}, ${chapter.title}. ${progress.text}`}
          onPress={() => router.push('/company')}
          style={{ gap: 6 }}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={SPACE.s}>
              <View style={[styles.chapter, { backgroundColor: theme.brand }]}>
                <T size={13} weight="bold" color={theme.onBrand}>
                  {chapter.n}
                </T>
              </View>
              <T size={16} weight="bold">
                {chapter.title}
              </T>
            </Row>
            <T size={13} weight="medium" muted>
              {progress.text}
            </T>
          </Row>
          <ProgressBar value={progress.value} />
        </Pressable>

        <Row style={{ justifyContent: 'space-between' }}>
          <Action icon="keys" label="Keys" onPress={() => router.push('/keys')} />
          <Action icon="route" label="Routes" onPress={() => router.push('/routes')} />
          <Action
            icon="orders"
            label="Orders"
            badge={ordersReady > 0 ? String(ordersReady) : undefined}
            onPress={() => router.push('/orders')}
          />
          <Action icon="company" label="Company" onPress={() => router.push('/company')} />
          <Action icon="shop" label="Shop" onPress={() => router.push('/shop')} />
        </Row>

        <View style={{ gap: SPACE.s }}>
          <T size={17} weight="bold">
            Your machines
          </T>
          {machines.length === 0 ? (
            <T muted>{stored ? 'Tap a busy spot on the map to place one.' : 'None yet.'}</T>
          ) : null}
          {machines.map((m) => {
            const type = getMachineType(m.typeId);
            const status = machineStatus(game, m);
            const color = status === 'ok' ? theme.signal : statusColor(status, theme);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`${m.venue.name}, ${type.name}, ${STATUS_LABEL[status]}`}
                onPress={() => {
                  haptic.select();
                  onMachine(m.id);
                }}
                style={({ pressed }) => [
                  styles.machine,
                  {
                    backgroundColor: theme.surface,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: theme.family[type.family] }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T weight="bold" numberOfLines={1}>
                    {m.venue.name}
                  </T>
                  <Row gap={6}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <T size={13} muted>
                      {STATUS_LABEL[status]}
                    </T>
                  </Row>
                </View>
                <Icon name="chevron" size={18} color={theme.muted} />
              </Pressable>
            );
          })}
        </View>

        <T size={10} muted center>
          © OpenFreeMap © OpenMapTiles © OpenStreetMap contributors
        </T>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

function Action({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} ready` : label}
      onPress={() => {
        haptic.select();
        sfx('pop');
        onPress();
      }}
      style={({ pressed }) => [styles.action, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.brandSoft }]}>
        <Icon name={icon} size={24} color={theme.dark ? theme.ink : theme.brand} />
        {badge ? <Badge text={badge} /> : null}
      </View>
      <T size={12} weight="medium">
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    shadowOpacity: 1,
    elevation: 12,
  },
  chapter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { alignItems: 'center', gap: 6, minWidth: 56 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  machine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: RADIUS.m,
  },
  swatch: { width: 14, height: 40, borderRadius: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
