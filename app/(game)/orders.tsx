import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ACHIEVEMENTS, STREAK_BONUS } from '@/config/progression';
import { claimGoal, goalProgress, type DailyGoal } from '@/sim';
import { haptic } from '@/services/haptics';
import { useCelebrations } from '@/store/celebrations';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { money } from '@/ui/format';
import { Button, Mono, ProgressBar, Row, Screen, Section, T } from '@/ui/kit';
import { Clipboard } from '@/ui/objects/Clipboard';
import { SPACE } from '@/ui/theme';

function label(g: DailyGoal): string {
  const n =
    g.kind === 'sales' ? money(g.target, { compact: true }) : g.target.toLocaleString('en-US');
  return g.title.replace('{n}', n);
}

function progressText(g: DailyGoal, have: number): string {
  if (g.kind === 'sales')
    return `${money(Math.min(have, g.target), { compact: true })} / ${money(g.target, { compact: true })}`;
  return `${Math.min(have, g.target).toLocaleString('en-US')} / ${g.target.toLocaleString('en-US')}`;
}

/** Today's orders (daily goals), the streak, and the trophy shelf. */
export default function Orders() {
  const theme = useTheme();
  const game = useGame((s) => s.game)!;
  const goals = game.goals;
  const push = useCelebrations((s) => s.push);
  const ci = Math.max(0, Math.min(5, game.chapter - 1));

  const claim = (g: DailyGoal) => {
    const r = useGame.getState().act((d) => claimGoal(d, g.id));
    if (!r.ok) {
      haptic.warning();
      return;
    }
    push({ kind: 'order', title: label(g), amountCents: r.rewardCents });
    if (r.streakBonusCents > 0) {
      const streak = useGame.getState().game?.goals.streak ?? 1;
      push({
        kind: 'streak',
        title: `Day ${streak} streak`,
        subtitle: 'All of today’s orders are done.',
        amountCents: r.streakBonusCents,
      });
    }
  };

  const unlocked = ACHIEVEMENTS.filter((a) => a.id in game.achievements).length;

  return (
    <Screen
      title="Orders"
      subtitle={`Today · streak ${goals.streak} day${goals.streak === 1 ? '' : 's'}`}
    >
      <Clipboard title="Today's orders">
        {goals.items.length === 0 ? (
          <T color={theme.paperInk}>New orders arrive with the day. Check back in a moment.</T>
        ) : null}
        {goals.items.map((g, i) => {
          const have = goals.day[g.kind];
          const p = goalProgress(game, g);
          return (
            <Animated.View
              key={g.id}
              entering={FadeInDown.delay(i * 80).duration(300)}
              style={{ gap: 6, paddingVertical: SPACE.s }}
            >
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <T
                  weight="bold"
                  color={theme.paperInk}
                  style={{ flex: 1, textDecorationLine: g.claimed ? 'line-through' : 'none' }}
                >
                  {label(g)}
                </T>
                <Mono size={13} color="#2E7D5B">
                  {money(g.rewardCents, { sign: true, compact: true })}
                </Mono>
              </Row>
              <ProgressBar value={p} color={p >= 1 ? '#2E7D5B' : '#D9932B'} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Mono size={12} color="#5C6066">
                  {progressText(g, have)}
                </Mono>
                {g.claimed ? (
                  <T size={12} color="#2E7D5B">
                    Claimed
                  </T>
                ) : p >= 1 ? (
                  <Button
                    label="Claim"
                    onPress={() => claim(g)}
                    style={{ minHeight: 40, paddingHorizontal: SPACE.m }}
                  />
                ) : null}
              </Row>
            </Animated.View>
          );
        })}
        <T size={12} color="#5C6066">
          {`Finish all three for a streak bonus of ${money(STREAK_BONUS.baseCentsByChapter[ci], { compact: true })} × streak (up to ${STREAK_BONUS.cap}). Miss a day and it starts again.`}
        </T>
      </Clipboard>

      <Section title={`Trophies · ${unlocked}/${ACHIEVEMENTS.length}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
          {ACHIEVEMENTS.map((a) => {
            const got = a.id in game.achievements;
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.title}: ${a.description}${got ? ', unlocked' : ', locked'}`}
                style={{
                  width: '48%',
                  padding: SPACE.m,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: got ? theme.amber : theme.line,
                  backgroundColor: got ? theme.paper : 'transparent',
                  opacity: got ? 1 : 0.6,
                  gap: 2,
                }}
              >
                <T weight="bold" size={14} color={got ? theme.paperInk : theme.ink}>
                  {got ? '★ ' : ''}
                  {a.title}
                </T>
                <T size={12} color={got ? '#5C6066' : theme.muted}>
                  {a.description}
                </T>
                {a.rewardCents ? (
                  <Mono size={11} color={got ? '#2E7D5B' : theme.muted}>
                    {money(a.rewardCents, { compact: true })}
                  </Mono>
                ) : null}
              </View>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}
