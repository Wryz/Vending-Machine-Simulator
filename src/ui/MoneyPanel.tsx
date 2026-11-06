import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { CHAPTERS } from '@/config/progression';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { activeMachines, type GameState } from '@/sim';

import { chapterProgress } from './chapter';
import { money, moneyShort } from './format';
import { Icon } from './icons';
import { Mono, T } from './kit';
import { RollingMoney } from './RollingMoney';
import { LedBar, SKIN } from './skin';
import { SPACE } from './theme';
import { LED_GLOW } from './weather';

export interface IncomingSale {
  id: string;
  cents: number;
  /** Where it came from (the machine's venue). */
  source: string;
}

/**
 * The top-left LED display on the map: cash on hand, the chapter goal as a
 * meter, and the money coming in (today's sales and cash waiting in the
 * machines), with the latest sales printing underneath, each naming its source.
 */
export function MoneyPanel({
  game,
  sales,
  onPress,
}: {
  game: GameState;
  /** Newest last; the panel shows the last few. */
  sales: readonly IncomingSale[];
  onPress?: () => void;
}) {
  const t = useT();
  const progress = chapterProgress(game);
  const chapter = CHAPTERS.find((c) => c.n === game.chapter) ?? CHAPTERS[CHAPTERS.length - 1];
  const today = game.ledger.day.lines.Sales ?? 0;
  const inBoxes = activeMachines(game).reduce((a, m) => a + m.cashBoxCents, 0);
  return (
    <View style={{ gap: SPACE.xs + 2, alignItems: 'flex-start' }}>
      <Pressable
        accessibilityRole={onPress ? 'button' : 'summary'}
        accessibilityLabel={t('money.a11y.panel', {
          cash: money(game.cashCents),
          n: chapter.n,
          title: content.chapterTitle(chapter.n, chapter.title),
          progress: progress.text,
          today: money(today),
          waiting: money(inBoxes),
        })}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.panel, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <RollingMoney cents={game.cashCents} size={21} color={SKIN.ledGreen} glow />
        {/* Chapter: number, meter. */}
        <View style={styles.row}>
          <View style={styles.chapter}>
            <T size={11} weight="bold" color={SKIN.marqueeInk}>
              {chapter.n}
            </T>
          </View>
          <View style={{ width: 92 }}>
            <LedBar value={Math.min(1, progress.value)} segments={10} color={SKIN.ledAmber} />
          </View>
        </View>
        {/* Money coming in: today's sales, and cash waiting in the machines. */}
        <View style={styles.row}>
          <Icon name="trend" size={14} color={SKIN.ledGreen} />
          <Mono size={12} weight="bold" color={SKIN.ledGreen} style={LED_GLOW(SKIN.ledGreen)}>
            {moneyShort(today)}
          </Mono>
          {inBoxes > 0 ? (
            <>
              <Icon name="box" size={14} color={SKIN.ledAmber} />
              <Mono size={12} weight="bold" color={SKIN.ledAmber} style={LED_GLOW(SKIN.ledAmber)}>
                {moneyShort(inBoxes)}
              </Mono>
            </>
          ) : null}
        </View>
      </Pressable>
      {sales.slice(-3).map((s) => (
        <Animated.View
          key={s.id}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(220)}
          layout={LinearTransition.duration(200)}
          style={styles.sale}
        >
          <Mono size={13} weight="bold" color={SKIN.ledGreen} style={LED_GLOW(SKIN.ledGreen)}>
            {money(s.cents, { sign: true })}
          </Mono>
          <T size={12} color="#C9CCE6" numberOfLines={1} style={{ maxWidth: 130 }}>
            {s.source}
          </T>
        </Animated.View>
      ))}
    </View>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  panel: {
    gap: 5,
    paddingHorizontal: SPACE.m,
    paddingVertical: SPACE.s,
    borderRadius: 14,
    backgroundColor: SKIN.led,
    borderWidth: 3,
    borderColor: SKIN.chrome,
    ...shadow,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chapter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SKIN.marquee,
  },
  sale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: SPACE.s + 2,
    borderRadius: 9,
    backgroundColor: SKIN.led,
    borderWidth: 2,
    borderColor: '#0E1020',
    ...shadow,
  },
});
