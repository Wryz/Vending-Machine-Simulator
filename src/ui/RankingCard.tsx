import { router } from 'expo-router';
import { View } from 'react-native';

import { useT } from '@/i18n';
import { featureUnlocked, rankChange, weeklyScore, type GameState } from '@/sim';

import { moneyShort } from './format';
import { Button, Mono, Paper, Row, Section, T } from './kit';
import { Led, useSkin } from './skin';
import { SPACE } from './theme';

/**
 * Company tab: the city ranking at a glance (place, overnight move, this
 * week's sales) and a key to open the full board (SPEC §4.8).
 */
export function RankingCard({ game }: { game: GameState }) {
  const t = useT();
  const skin = useSkin();
  if (!featureUnlocked(game, 'rankings')) return null;
  const change = rankChange(game);
  const moveColor = !change
    ? skin.ledAmber
    : change.delta > 0
      ? skin.ledGreen
      : change.delta < 0
        ? skin.ledRed
        : skin.ledAmber;
  return (
    <Section title={t('rankings.company.section')}>
      <Paper tone="surface" style={{ gap: SPACE.m }}>
        <Row gap={SPACE.m}>
          <Led size={26} color={change?.rank === 1 ? skin.ledAmber : skin.ledGreen}>
            {change ? `#${change.rank}` : '#–'}
          </Led>
          <View style={{ flex: 1, gap: 2 }}>
            {change ? (
              <Row gap={6}>
                <Mono
                  size={14}
                  weight="bold"
                  color={moveColor === skin.ledAmber ? undefined : moveColor}
                >
                  {change.delta > 0 ? '▲' : change.delta < 0 ? '▼' : '■'}
                </Mono>
                <T size={13} weight="bold" style={{ flex: 1 }}>
                  {change.delta > 0
                    ? t('rankings.overnightUp', { n: change.delta })
                    : change.delta < 0
                      ? t('rankings.overnightDown', { n: -change.delta })
                      : t('rankings.of', { n: change.of })}
                </T>
              </Row>
            ) : (
              <T size={13}>{t('rankings.company.none')}</T>
            )}
            <Row gap={6}>
              <T size={12} muted>
                {t('rankings.thisWeek')}
              </T>
              <Mono size={13} weight="bold">
                {moneyShort(weeklyScore(game))}
              </Mono>
            </Row>
          </View>
        </Row>
        <Button
          kind="secondary"
          label={t('rankings.company.open')}
          onPress={() => router.push('/rankings')}
        />
      </Paper>
    </Section>
  );
}
