import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ACHIEVEMENTS, STREAK_BONUS } from '@/config/progression';
import { claimGoal, goalProgress, type DailyGoal } from '@/sim';
import { haptic } from '@/services/haptics';
import { useCelebrations } from '@/store/celebrations';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { moneyShort } from '@/ui/format';
import { StatChip } from '@/ui/hud';
import { Icon } from '@/ui/icons';
import { Button, Mono, Paper, ProgressBar, Row, Screen, Section, T } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

function label(g: DailyGoal): string {
  const n = g.kind === 'sales' ? moneyShort(g.target) : g.target.toLocaleString('en-US');
  return g.title.replace('{n}', n);
}

function progressText(g: DailyGoal, have: number): string {
  if (g.kind === 'sales')
    return `${moneyShort(Math.min(have, g.target))} / ${moneyShort(g.target)}`;
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
    <Screen title="Orders">
      <Row style={{ flexWrap: 'wrap' }}>
        <StatChip
          icon="flame"
          label="Streak in days"
          value={`${goals.streak} day${goals.streak === 1 ? '' : 's'}`}
          color={goals.streak > 0 ? theme.brand : undefined}
        />
        <StatChip
          icon="coin"
          label={`Finish all three for a streak bonus, times the streak, up to ${STREAK_BONUS.cap}. Miss a day and it starts again.`}
          value={`${moneyShort(STREAK_BONUS.baseCentsByChapter[ci])} × streak`}
          color={theme.signal}
        />
      </Row>

      <View style={{ gap: SPACE.s }}>
        {goals.items.length === 0 ? <T muted>New orders arrive with the day.</T> : null}
        {goals.items.map((g, i) => {
          const have = goals.day[g.kind];
          const p = goalProgress(game, g);
          return (
            <Animated.View
              key={g.id}
              entering={FadeInDown.delay(i * 80)
                .springify()
                .damping(16)}
            >
              <Paper tone="surface" style={{ gap: SPACE.s, opacity: g.claimed ? 0.6 : 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T weight="bold" style={{ flex: 1 }}>
                    {label(g)}
                  </T>
                  <Mono size={15} weight="bold" color={theme.signal}>
                    {`+${moneyShort(g.rewardCents)}`}
                  </Mono>
                </Row>
                <ProgressBar value={p} color={p >= 1 ? theme.signal : theme.brand} />
                <Row style={{ justifyContent: 'space-between' }}>
                  <Mono size={13} muted>
                    {progressText(g, have)}
                  </Mono>
                  {g.claimed ? (
                    <StatChip icon="star" label="Claimed" value="Done" color={theme.signal} />
                  ) : p >= 1 ? (
                    <Button
                      label="Claim"
                      icon={<Icon name="coin" size={18} color={theme.onBrand} />}
                      onPress={() => claim(g)}
                      style={{ minHeight: 40, paddingHorizontal: SPACE.l }}
                    />
                  ) : null}
                </Row>
              </Paper>
            </Animated.View>
          );
        })}
      </View>

      <Section title={`Trophies ${unlocked}/${ACHIEVEMENTS.length}`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
          {ACHIEVEMENTS.map((a) => {
            const got = a.id in game.achievements;
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={`${a.title}: ${a.description}${got ? ', unlocked' : ', locked'}`}
                style={{
                  width: '48.5%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACE.s,
                  padding: SPACE.m,
                  borderRadius: 18,
                  backgroundColor: theme.surface,
                  opacity: got ? 1 : 0.55,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: got ? theme.amber : theme.line,
                  }}
                >
                  <Icon
                    name={got ? 'star' : 'lock'}
                    size={18}
                    color={got ? '#FFFFFF' : theme.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={13} numberOfLines={1}>
                    {a.title}
                  </T>
                  {a.rewardCents ? (
                    <Mono size={12} color={got ? theme.signal : theme.muted}>
                      {moneyShort(a.rewardCents)}
                    </Mono>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}
