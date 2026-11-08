import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import { claimRewards } from '@/sim';
import { useCelebrations, type Moment } from '@/store/celebrations';
import { useGame } from '@/store/game';

import { moneyShort } from './format';
import { Icon, type IconName } from './icons';
import { Button, Row, T } from './kit';
import { Glass, Marquee, SKIN } from './skin';
import { SPACE } from './theme';

const ICON: Partial<Record<Moment['kind'], IconName>> = {
  chapter: 'company',
  trophy: 'star',
  research: 'bolt',
};

/**
 * The big moments, together (owner's call, 2026-11-08): chapter complete,
 * trophies and finished research wait here and show in one modal. One key
 * claims every waiting reward (trophy cash), or just says OK.
 */
export function MomentsModal() {
  const t = useT();
  const list = useCelebrations((s) => s.modal);
  const clear = useCelebrations((s) => s.clearModal);
  const unclaimed = useGame((s) => s.game?.unclaimed ?? []);
  const ready = useGame((s) => s.status === 'ready' && !s.catchingUp);
  const total = unclaimed.reduce((a, r) => a + r.cents, 0);
  // A chime when something new joins the modal.
  const seen = useRef(0);
  useEffect(() => {
    if (ready && list.length > seen.current) {
      sound.play('success');
      haptic.success();
    }
    seen.current = list.length;
  }, [list.length, ready]);
  // Rewards waiting from an earlier session still get their modal.
  if (!ready || (!list.length && total <= 0)) return null;

  const close = () => {
    if (total > 0) {
      const res = useGame.getState().act((d) => claimRewards(d));
      if (res.ok) {
        sound.play('coins');
        haptic.success();
      }
    } else {
      sound.play('click');
    }
    clear();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(160)}
      style={styles.backdrop}
      accessibilityViewIsModal
    >
      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.card}>
        <Marquee title={t('celebrate.modal.title')} />
        <Glass padding={SPACE.m}>
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: SPACE.m }}>
            {list.map((m) => (
              <Row key={m.id} gap={SPACE.m} style={{ alignItems: 'flex-start' }}>
                <View style={styles.disc}>
                  <Icon name={ICON[m.kind] ?? 'star'} size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T size={11} weight="bold" muted>
                    {t(`celebrate.kind.${m.kind as 'chapter' | 'trophy' | 'research'}`).toUpperCase()}
                  </T>
                  <T size={16} weight="bold">
                    {m.title}
                  </T>
                  {m.subtitle ? <T size={13}>{m.subtitle}</T> : null}
                  {m.lines?.map((l, i) => (
                    <T key={i} size={13} muted>
                      {`• ${l.label}`}
                    </T>
                  ))}
                </View>
                {m.amountCents ? (
                  <T size={15} weight="bold" color={SKIN.ledGreen}>
                    {`+${moneyShort(m.amountCents)}`}
                  </T>
                ) : null}
              </Row>
            ))}
            {!list.length ? <T>{t('celebrate.modal.waiting')}</T> : null}
          </ScrollView>
        </Glass>
        <Button
          label={
            total > 0 ? t('celebrate.modal.claim', { amount: moneyShort(total) }) : t('celebrate.modal.ok')
          }
          onPress={close}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 16, 40, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: SPACE.l,
    zIndex: 50,
  },
  card: {
    gap: SPACE.m,
    backgroundColor: SKIN.cabinet,
    borderRadius: 28,
    padding: SPACE.l,
  },
  disc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SKIN.cabinetDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
