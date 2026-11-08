import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { PRESTIGE_PERKS } from '@/config/progression';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError } from '@/i18n/sim';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import {
  buyPrestigePerk,
  canSellCompany,
  companyValuationCents,
  reputationFor,
  type ActionResult,
  type GameState,
} from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { moneyShort } from '@/ui/format';
import { LockedCard, StatChip } from '@/ui/hud';
import { Button, Mono, Paper, Row, Screen, Spacer, T } from '@/ui/kit';
import { markSeen } from '@/ui/markSeen';
import { StatGrid } from '@/ui/StatGrid';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE } from '@/ui/theme';

/**
 * Prestige (Company → More): what the company is worth, selling it for
 * Reputation, and the perks Reputation buys.
 */
export default function PrestigeScreen() {
  const t = useT();
  const theme = useTheme();
  const game = useGame((s) => s.game);
  useGame((s) => s.version);
  const { flash, show } = useFlash();
  const canSell = !!game && canSellCompany(game);

  useEffect(() => {
    const g = useGame.getState().game;
    if (g) markSeen(g, 'prestige');
  }, [canSell]);

  const run = (fn: (d: GameState) => ActionResult, success: string) => {
    const r = useGame.getState().act(fn);
    if (r.ok) {
      haptic.success();
      sound.play('click');
      show(success, 'success');
    } else {
      haptic.error();
      show(simError(r.error), 'error');
    }
  };

  if (!game) return null;
  const valuation = companyValuationCents(game);
  const reputation = reputationFor(game);

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('company.prestige.section')}>
        <Paper tone="surface" style={{ gap: SPACE.xs }}>
          <StatGrid
            tiles={[
              {
                icon: 'coin',
                label: t('company.prestige.valuation'),
                value: moneyShort(valuation),
              },
              {
                icon: 'star',
                label: t('company.prestige.repFromSale'),
                value: `+${reputation}`,
                color: theme.brand,
              },
              {
                icon: 'star',
                label: t('company.prestige.repBanked'),
                value: String(game.prestige.reputation),
              },
              ...(game.prestige.sales > 0
                ? [
                    {
                      icon: 'handshake' as const,
                      label: t('company.prestige.companiesSold'),
                      value: String(game.prestige.sales),
                    },
                  ]
                : []),
            ]}
          />
          <Spacer h={SPACE.s} />
          {canSellCompany(game) ? (
            <>
              <Button
                kind="danger"
                label={t('company.prestige.sell')}
                onPress={() => router.push({ pathname: '/cities', params: { mode: 'sell' } })}
              />
            </>
          ) : (
            <LockedCard icon="handshake" title={t('company.prestige.sell')} chapter={8} />
          )}
        </Paper>
        {PRESTIGE_PERKS.map((p) => {
          const level = game.prestige.perks[p.id] ?? 0;
          const maxed = level >= p.maxLevel;
          const perkName = content.perkName(p.id, p.name);
          return (
            <Paper key={p.id} tone="surface" style={{ gap: SPACE.xs }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T weight="bold">{perkName}</T>
                <Mono size={13}>
                  {level}/{p.maxLevel}
                </Mono>
              </Row>
              <T size={13} muted numberOfLines={1}>
                {content.perkDesc(p.id, p.description)}
              </T>
              {maxed ? (
                <StatChip
                  icon="star"
                  label={t('company.prestige.maxed')}
                  value={t('company.prestige.max')}
                  color={theme.signal}
                />
              ) : (
                <Button
                  kind="secondary"
                  label={t('company.prestige.buyPerk', { cost: p.costRep })}
                  disabled={game.prestige.reputation < p.costRep}
                  onPress={() =>
                    run(
                      (d) => buyPrestigePerk(d, p.id),
                      t('company.prestige.perkToast', { name: perkName, n: level + 1 }),
                    )
                  }
                />
              )}
            </Paper>
          );
        })}
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
