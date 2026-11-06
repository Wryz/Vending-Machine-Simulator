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
import { Row, T } from '../kit';
import { machineStatus } from '../machineStatus';
import { STATUS_LABEL, statusColor } from '../objects/KeyTag';
import { sfx } from '../sfx';
import { Cabinet, Key, Led, LedBar, Marquee, Plate, SKIN } from '../skin';
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
      backgroundComponent={({ style }) => (
        <Cabinet
          screws={false}
          style={[style, { borderTopLeftRadius: RADIUS.l + 4, borderTopRightRadius: RADIUS.l + 4 }]}
        />
      )}
      handleIndicatorStyle={{ backgroundColor: SKIN.chrome, width: 56, height: 6 }}
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
          style={{ gap: SPACE.s }}
        >
          <Row gap={SPACE.s}>
            <View style={styles.chapter}>
              <T size={15} weight="bold" color={SKIN.marqueeInk}>
                {chapter.n}
              </T>
            </View>
            <Marquee title={chapter.title} style={{ flex: 1 }} />
          </Row>
          <Row gap={SPACE.s}>
            <View style={{ flex: 1 }}>
              <LedBar value={progress.value} color={SKIN.ledAmber} />
            </View>
            <Led size={14} color={SKIN.ledAmber}>
              {progress.text}
            </Led>
          </Row>
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
          <Plate>Your machines</Plate>
          {machines.length === 0 ? (
            <T color="#FFFFFF">
              {stored ? 'Tap a busy spot on the map to place one.' : 'None yet.'}
            </T>
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
                    backgroundColor: '#FFFFFF',
                    borderColor: SKIN.chrome,
                    borderBottomColor: SKIN.chromeDark,
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

        <T size={10} color="#FFE3D4" center>
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
  return (
    <View style={styles.action}>
      <View>
        <Key
          onPress={() => {
            sfx('pop');
            onPress();
          }}
          accessibilityLabel={badge ? `${label}, ${badge} ready` : label}
          height={54}
          faceStyle={{ width: 58, paddingHorizontal: 0 }}
        >
          <Icon name={icon} size={26} color={SKIN.brandFace} />
        </Key>
        {badge ? <Badge text={badge} /> : null}
      </View>
      <T size={12} weight="bold" color="#FFFFFF">
        {label}
      </T>
    </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.marquee,
    borderWidth: 4,
    borderColor: SKIN.cabinetEdge,
  },
  action: { alignItems: 'center', gap: 6, minWidth: 56 },
  machine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    padding: SPACE.m,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    borderBottomWidth: 5,
  },
  swatch: { width: 14, height: 40, borderRadius: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
