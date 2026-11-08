import { useEffect } from 'react';
import { View } from 'react-native';

import { useT } from '@/i18n';
import { localTime, playerRank, standings, weeklyScore, type RankEntry } from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { money, moneyShort } from '@/ui/format';
import { Mono, Paper, Row, Screen, T } from '@/ui/kit';
import { Led, useSkin } from '@/ui/skin';
import { RADIUS, SPACE } from '@/ui/theme';
import { FirstTip } from '@/ui/guide';
import { markSeen } from '@/ui/markSeen';

/** One operator on the board: place in a small LED, name, this week's sales. */
function BoardRow({ entry, place }: { entry: RankEntry; place: number }) {
  const t = useT();
  const theme = useTheme();
  const skin = useSkin();
  const me = entry.kind === 'player';
  const name = me ? t('rankings.you') : entry.name;
  return (
    <View
      accessible
      accessibilityLabel={t('rankings.a11y.row', {
        rank: place,
        name,
        amount: money(entry.scoreCents),
      })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE.m,
        paddingVertical: SPACE.s,
        paddingHorizontal: SPACE.m,
        borderRadius: RADIUS.m,
        backgroundColor: me ? theme.brandSoft : theme.dark ? theme.surface : '#FFFFFF',
        borderWidth: me ? 2 : 1,
        borderColor: me ? theme.brand : skin.chrome,
      }}
    >
      <Led
        size={15}
        color={place === 1 ? skin.ledAmber : me ? skin.ledGreen : '#C9CCE6'}
        style={{ minWidth: 44, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2 }}
      >
        {`#${place}`}
      </Led>
      <View style={{ flex: 1, gap: 1 }}>
        <T size={15} weight={me ? 'bold' : 'medium'} numberOfLines={1}>
          {name}
        </T>
        {entry.kind === 'rival' ? (
          <T size={11} weight="bold" color={theme.alert}>
            {t('rankings.rivalTag')}
          </T>
        ) : null}
      </View>
      <Mono size={15} weight="bold" color={me ? theme.brand : undefined}>
        {moneyShort(entry.scoreCents)}
      </Mono>
    </View>
  );
}

/**
 * City ranking board (SPEC §4.8): "Top operators in <City>", this week's sales,
 * updated every night at local midnight. Before the first midnight it shows a
 * live preview.
 */
export default function Rankings() {
  const t = useT();
  const theme = useTheme();
  const skin = useSkin();
  const game = useGame((s) => s.game);
  const boardRank = game?.rankings.board?.rank;
  // Opening the board from anywhere (More key, cash panel) clears its badge.
  useEffect(() => {
    const g = useGame.getState().game;
    if (g) markSeen(g, 'rankings');
  }, [boardRank]);
  const world = useGame((s) => s.world);
  useGame((s) => s.version);
  if (!game || !world) return null;

  const board = game.rankings.board;
  const local = localTime(game.now, world.city.timeZone, world.city.countryCode);
  // Live standings: the AI field's share of today so far (for "to pass" and the preview).
  const live = standings(game, local.hour / 24, local.dateKey);
  const liveRank = playerRank(live);
  const entries = board ? board.entries : live;
  const rank = board ? board.rank : liveRank;
  const delta = board && board.prevRank !== null ? board.prevRank - board.rank : null;
  const ahead = liveRank > 1 ? live[liveRank - 2] : null;
  const mine = weeklyScore(game);
  const last = game.rankings.lastWeek;

  const status = !board
    ? t('rankings.preview')
    : board.final
      ? t('rankings.final')
      : t('rankings.day', { n: board.day });
  const deltaText =
    delta === null
      ? null
      : delta > 0
        ? t('rankings.overnightUp', { n: delta })
        : delta < 0
          ? t('rankings.overnightDown', { n: -delta })
          : t('rankings.overnightSame');
  const deltaColor =
    delta && delta > 0 ? skin.ledGreen : delta && delta < 0 ? skin.ledRed : skin.ledAmber;

  return (
    <Screen
      title={t('rankings.title')}
      subtitle={t('rankings.subtitle', { city: world.city.name })}
    >
      <FirstTip id="rankings" />
      {/* The big LED: your place, how it moved overnight, your sales this week. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACE.m,
          padding: SPACE.m,
          borderRadius: RADIUS.l,
          backgroundColor: skin.led,
          borderWidth: 3,
          borderColor: skin.chrome,
        }}
      >
        <View style={{ alignItems: 'center', minWidth: 76 }}>
          <Led size={38} color={rank === 1 ? skin.ledAmber : skin.ledGreen} style={{ padding: 0 }}>
            {`#${rank}`}
          </Led>
          <Mono size={12} color="#C9CCE6">
            {t('rankings.of', { n: entries.length })}
          </Mono>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {deltaText ? (
            <Row gap={6}>
              <Mono size={15} weight="bold" color={deltaColor}>
                {delta! > 0 ? '▲' : delta! < 0 ? '▼' : '■'}
              </Mono>
              <T size={13} weight="bold" color={deltaColor} style={{ flex: 1 }}>
                {deltaText}
              </T>
            </Row>
          ) : null}
          <Mono size={20} weight="bold" color={skin.ledGreen}>
            {money(mine)}
          </Mono>
          <T size={12} color="#C9CCE6">
            {t('rankings.thisWeek')}
          </T>
        </View>
      </View>

      <Paper tone="surface" style={{ gap: SPACE.xs }}>
        <T size={13} weight="bold">
          {ahead
            ? t('rankings.toPass', {
                amount: moneyShort(Math.max(1, ahead.scoreCents - mine + 1)),
                name: ahead.kind === 'player' ? t('rankings.you') : ahead.name,
              })
            : t('rankings.leading')}
        </T>
        <T size={12} muted>
          {status}
        </T>
      </Paper>

      <View style={{ gap: SPACE.s }}>
        {entries.map((e, i) => (
          <BoardRow key={e.id} entry={e} place={i + 1} />
        ))}
      </View>

      <View style={{ gap: SPACE.xs }}>
        {last ? (
          <T size={13} weight="medium">
            {t('rankings.lastWeek', { rank: last.rank, n: last.of })}
          </T>
        ) : null}
        <T size={12} color={theme.muted}>
          {t('rankings.howItWorks')}
        </T>
      </View>
    </Screen>
  );
}
