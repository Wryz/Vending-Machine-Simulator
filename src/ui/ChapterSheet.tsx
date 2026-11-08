import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CHAPTERS } from '@/config/progression';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import type { GameState } from '@/sim';

import { chapterGoals } from './chapterGoals';
import { Icon } from './icons';
import { Button, Mono, ProgressBar, Row, T } from './kit';
import { Glass, Marquee, useSkin } from './skin';
import { useTheme } from './ThemeProvider';
import { SPACE } from './theme';

/**
 * One chapter, opened from the row of chapter numbers on the Company tab: its
 * title, goal (with live progress for the current chapter) and what it unlocks.
 * Past chapters show as done, later ones as ahead.
 */
export function ChapterSheet({
  game,
  n,
  onClose,
}: {
  game: GameState;
  n: number | null;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const skin = useSkin();
  const chapter = n === null ? undefined : CHAPTERS.find((c) => c.n === n);
  const done = !!chapter && !!game.chapterDoneAt[chapter.n];
  const current = !!chapter && chapter.n === game.chapter;
  const goals = current ? chapterGoals(game) : [];
  const status = done
    ? { label: t('companyHub.chapterSheet.done'), icon: 'star' as const, color: theme.signal }
    : current
      ? { label: t('companyHub.chapterSheet.current'), icon: 'flame' as const, color: theme.brand }
      : { label: t('companyHub.chapterSheet.locked'), icon: 'lock' as const, color: theme.muted };

  return (
    <Modal visible={!!chapter} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        // Not one big button for VoiceOver: the card inside must stay readable (it has its own Close key).
        accessible={false}
        importantForAccessibility="no"
      >
        {chapter ? (
          <Pressable
            style={[styles.card, { backgroundColor: skin.cabinet }]}
            onPress={() => undefined}
            accessible={false}
            accessibilityViewIsModal
          >
            <Marquee
              title={t('companyHub.chapterSheet.title', { n: chapter.n })}
              subtitle={content.chapterTitle(chapter.n, chapter.title)}
            />
            <Glass padding={SPACE.m}>
              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: SPACE.m }}>
                <Row gap={6}>
                  <Icon name={status.icon} size={16} color={status.color} />
                  <T size={13} weight="bold" color={status.color}>
                    {status.label}
                  </T>
                </Row>
                <View style={{ gap: SPACE.xs }}>
                  <T size={11} weight="bold" muted>
                    {t('companyHub.chapterSheet.goal').toUpperCase()}
                  </T>
                  <T size={15} weight="bold">
                    {content.chapterGoal(chapter.n, chapter.goal)}
                  </T>
                  {goals.map((g) => (
                    <View key={g.label} style={{ gap: 4, marginTop: SPACE.xs }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <T size={13} style={{ flex: 1 }}>
                          {g.label}
                        </T>
                        <Mono size={13}>{g.value}</Mono>
                      </Row>
                      <ProgressBar value={g.progress} />
                    </View>
                  ))}
                </View>
                <View style={{ gap: SPACE.xs }}>
                  <T size={11} weight="bold" muted>
                    {(done
                      ? t('companyHub.chapterSheet.unlocked')
                      : t('companyHub.chapterSheet.unlocks')
                    ).toUpperCase()}
                  </T>
                  {chapter.unlocks.map((u, i) => (
                    <Row key={u} gap={SPACE.s}>
                      <Icon
                        name={done ? 'star' : current ? 'star' : 'lock'}
                        size={14}
                        color={done ? theme.signal : current ? theme.brand : theme.muted}
                      />
                      <T size={14} style={{ flex: 1 }}>
                        {content.chapterUnlock(chapter.n, i, u)}
                      </T>
                    </Row>
                  ))}
                </View>
              </ScrollView>
            </Glass>
            <Button label={t('companyHub.chapterSheet.close')} onPress={onClose} />
          </Pressable>
        ) : null}
      </Pressable>
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
    borderRadius: 28,
    padding: SPACE.l,
  },
});
