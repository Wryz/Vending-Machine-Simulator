import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getMachineType, type MachineType, type MachineTypeId } from '@/config/machines';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import {
  availableMachineTypes,
  evaluateSpot,
  upcomingFamilies,
  type GameState,
  type World,
} from '@/sim';

import { moneyShort } from '../format';
import { Icon } from '../icons';
import { Button, T } from '../kit';
import { Marquee, SKIN } from '../skin';
import { useTheme } from '../ThemeProvider';
import { RADIUS, SPACE, TOUCH } from '../theme';

/**
 * Pick which machine to place at a spot (after "Place a machine here"): the
 * one in storage first, then every type you can buy with its price and what it
 * would take here a day, then the families that open later (locked, with their
 * chapter) so you can see what's coming.
 */
export function MachineChooser({
  visible,
  game,
  world,
  point,
  placeId,
  stored,
  onPick,
  onClose,
}: {
  visible: boolean;
  game: GameState;
  world: World;
  point: { lat: number; lng: number };
  placeId?: string;
  /** A machine in storage you can place for free (just the install). */
  stored: { id: string; typeId: MachineTypeId } | null;
  onPick: (typeId: MachineTypeId, ownedId: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const types = useMemo(() => availableMachineTypes(game, world), [game, world]);
  const upcoming = useMemo(() => upcomingFamilies(game, world), [game, world]);
  // What each type would take here a day (only computed while open).
  const perDay = useMemo(() => {
    const out = new Map<MachineTypeId, number>();
    if (!visible) return out;
    const ids = new Set<MachineTypeId>(types.map((x) => x.id));
    if (stored) ids.add(stored.typeId);
    for (const id of ids)
      out.set(id, evaluateSpot(game, world, point, id, game.now, placeId).dailySalesCents);
    return out;
  }, [visible, types, stored, game, world, point, placeId]);
  const name = (id: MachineTypeId) => content.machineType(id, getMachineType(id).name);

  const row = (mt: MachineType, owned: boolean) => (
    <Pressable
      key={`${owned ? 'own' : 'buy'}-${mt.id}`}
      accessibilityRole="button"
      accessibilityLabel={
        owned
          ? t('spotSheet.chooser.a11yOwned', { type: name(mt.id) })
          : t('spotSheet.chooser.a11yBuy', {
              type: name(mt.id),
              price: moneyShort(mt.purchaseCents + mt.installCents),
            })
      }
      onPress={() => onPick(mt.id, owned ? (stored?.id ?? null) : null)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.dot, { backgroundColor: theme.family[mt.family] }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <T size={15} weight="bold">
          {owned ? t('spotSheet.yours', { type: name(mt.id) }) : name(mt.id)}
        </T>
        <T size={12} muted>
          {t('spotSheet.chooser.perDay', { amount: moneyShort(perDay.get(mt.id) ?? 0) })}
        </T>
      </View>
      <T size={14} weight="bold">
        {owned
          ? t('spotSheet.chooser.install', { price: moneyShort(mt.installCents) })
          : moneyShort(mt.purchaseCents + mt.installCents)}
      </T>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Marquee title={t('spotSheet.chooser.title')} />
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: SPACE.s }}>
            {stored ? row(getMachineType(stored.typeId), true) : null}
            {types.map((mt) => row(mt, false))}
            {upcoming.map((u) => (
              <View
                key={`lock-${u.type.id}`}
                style={[styles.row, styles.locked]}
                accessible
                accessibilityLabel={t('spotSheet.chooser.a11yLocked', {
                  type: name(u.type.id),
                  n: u.chapter,
                })}
              >
                <Icon name="lock" size={18} color={theme.muted} />
                <T size={15} weight="bold" muted style={{ flex: 1 }}>
                  {name(u.type.id)}
                </T>
                <T size={12} muted>
                  {t('spotSheet.chooser.chapter', { n: u.chapter })}
                </T>
              </View>
            ))}
          </ScrollView>
          <Button kind="secondary" label={t('spotSheet.chooser.cancel')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 40, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: SPACE.l,
  },
  card: {
    gap: SPACE.m,
    backgroundColor: SKIN.cabinet,
    borderRadius: 28,
    padding: SPACE.l,
  },
  row: {
    minHeight: TOUCH + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.s,
    paddingHorizontal: SPACE.m,
    borderBottomWidth: 4,
    borderBottomColor: SKIN.chromeDark,
  },
  locked: { backgroundColor: '#F1EDF5' },
  dot: { width: 12, height: 12, borderRadius: 6 },
});

