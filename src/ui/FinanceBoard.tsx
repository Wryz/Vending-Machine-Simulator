import { useT } from '@/i18n';
import { ledgerCategory } from '@/i18n/sim';
import type { GameState } from '@/sim';

import { Disclosure } from './CollapsibleSection';
import { money, moneyShort } from './format';
import { Divider, Mono, Paper, Row, T } from './kit';
import { StatGrid, type StatTile } from './StatGrid';
import { useTheme } from './ThemeProvider';
import { SPACE } from './theme';

/** Sum of the money that came in (>0) and went out (<0) in a day's ledger lines. */
function dayTotals(lines: Record<string, number>): { inCents: number; outCents: number } {
  let inCents = 0;
  let outCents = 0;
  for (const v of Object.values(lines)) {
    if (v >= 0) inCents += v;
    else outCents += v;
  }
  return { inCents, outCents };
}

/**
 * Company finances in one container (owner's call): a tidy grid where every
 * number has a one- or two-word name and a short line on what it means, then
 * today's money by category.
 */
export function FinanceBoard({ game }: { game: GameState }) {
  const t = useT();
  const theme = useTheme();
  const today = dayTotals(game.ledger.day.lines);
  const net = today.inCents + today.outCents;
  const y = game.ledger.yesterday;
  const yNet = y ? Object.values(y.lines).reduce((a, v) => a + v, 0) : null;
  const tone = (v: number) => (v > 0 ? theme.signal : v < 0 ? theme.alert : undefined);

  const tiles: StatTile[] = [
    {
      icon: 'coin',
      label: t('companyHub.finances.cash'),
      desc: t('companyHub.finances.cashDesc'),
      value: money(game.cashCents),
    },
    {
      icon: 'trend',
      label: t('companyHub.finances.netToday'),
      desc: t('companyHub.finances.netTodayDesc'),
      value: money(net, { sign: true }),
      color: tone(net),
    },
    {
      icon: 'plus',
      label: t('companyHub.finances.inToday'),
      desc: t('companyHub.finances.inTodayDesc'),
      value: moneyShort(today.inCents),
    },
    {
      icon: 'minus',
      label: t('companyHub.finances.outToday'),
      desc: t('companyHub.finances.outTodayDesc'),
      value: moneyShort(-today.outCents),
    },
    ...(yNet !== null
      ? [
          {
            icon: 'clock' as const,
            label: t('companyHub.finances.netYesterday'),
            desc: t('companyHub.finances.netYesterdayDesc'),
            value: money(yNet, { sign: true }),
            color: tone(yNet),
          },
        ]
      : []),
    {
      icon: 'box',
      label: t('companyHub.finances.unitsSold'),
      desc: t('companyHub.finances.unitsSoldDesc'),
      value: game.ledger.lifetimeUnits.toLocaleString(t.lang),
    },
    {
      icon: 'bag',
      label: t('companyHub.finances.lifetimeSales'),
      desc: t('companyHub.finances.lifetimeSalesDesc'),
      value: moneyShort(game.ledger.lifetimeSalesCents),
    },
    {
      icon: 'minus',
      label: t('companyHub.finances.lifetimeCosts'),
      desc: t('companyHub.finances.lifetimeCostsDesc'),
      value: moneyShort(game.ledger.lifetimeCostsCents),
    },
  ];

  const lines = Object.entries(game.ledger.day.lines)
    .filter(([, v]) => v !== 0)
    .sort((a, b) =>
      a[1] >= 0 !== b[1] >= 0 ? (a[1] >= 0 ? -1 : 1) : Math.abs(b[1]) - Math.abs(a[1]),
    );

  return (
    <Paper tone="surface" style={{ gap: SPACE.s }}>
      <StatGrid tiles={tiles} />
      <Divider dashed />
      <Disclosure title={t('companyHub.finances.breakdown')}>
        {lines.length === 0 ? (
          <T size={13} muted>
            {t('companyHub.finances.noActivity')}
          </T>
        ) : (
          lines.map(([cat, v]) => (
            <Row key={cat} style={{ justifyContent: 'space-between' }}>
              <T size={13} style={{ flex: 1 }}>
                {ledgerCategory(cat)}
              </T>
              <Mono size={13} color={v < 0 ? theme.alert : undefined}>
                {money(v)}
              </Mono>
            </Row>
          ))
        )}
      </Disclosure>
    </Paper>
  );
}
