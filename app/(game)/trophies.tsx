import { useEffect } from 'react';
import { View } from 'react-native';

import { ACHIEVEMENTS } from '@/config/progression';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { sound } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { claimRewards } from '@/sim';
import { useGame } from '@/store/game';
import { useTheme } from '@/ui/ThemeProvider';
import { moneyShort } from '@/ui/format';
import { Icon } from '@/ui/icons';
import { Button, Mono, Paper, Row, Screen, T } from '@/ui/kit';
import { markSeen } from '@/ui/markSeen';
import { trophiesUnlocked } from '@/ui/moreBadges';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE } from '@/ui/theme';

/** Trophies (Company → More): the shelf, and any rewards still waiting to be claimed. */
export default function Trophies() {
  const t = useT();
  const theme = useTheme();
  const game = useGame((s) => s.game);
  useGame((s) => s.version);
  const { flash, show } = useFlash();
  const got = game ? trophiesUnlocked(game) : 0;

  // Opening the screen (or a trophy landing while it is open) clears the badge.
  useEffect(() => {
    const g = useGame.getState().game;
    if (g) markSeen(g, 'trophies');
  }, [got]);

  if (!game) return null;
  const waiting = game.unclaimed.reduce((a, r) => a + r.cents, 0);

  const claim = () => {
    const r = useGame.getState().act((d) => claimRewards(d));
    if (r.ok) {
      sound.play('coins');
      haptic.success();
      show(t('companyHub.trophies.claimed', { amount: moneyShort(r.cents) }), 'success');
    } else haptic.warning();
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title={t('companyHub.trophies.title')}
        subtitle={t('companyHub.trophies.subtitle', { got, total: ACHIEVEMENTS.length })}
      >
        {waiting > 0 ? (
          <Paper tone="surface" style={{ gap: SPACE.s }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6} style={{ flex: 1 }}>
                <Icon name="star" size={18} color={theme.amber} />
                <T weight="bold">{t('companyHub.trophies.waiting')}</T>
              </Row>
              <Mono size={15} weight="bold" color={theme.signal}>
                {`+${moneyShort(waiting)}`}
              </Mono>
            </Row>
            <Button
              label={t('companyHub.trophies.claim', { amount: moneyShort(waiting) })}
              icon={<Icon name="coin" size={18} color={theme.onBrand} />}
              onPress={claim}
            />
          </Paper>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
          {ACHIEVEMENTS.map((a) => {
            const has = a.id in game.achievements;
            const title = content.achievementTitle(a.id, a.title);
            const desc = content.achievementDesc(a.id, a.description);
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={t(
                  has ? 'orders.a11y.trophyUnlocked' : 'orders.a11y.trophyLocked',
                  {
                    title,
                    desc,
                  },
                )}
                style={{
                  width: '48.5%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACE.s,
                  padding: SPACE.m,
                  borderRadius: 18,
                  backgroundColor: theme.surface,
                  opacity: has ? 1 : 0.55,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: has ? theme.amber : theme.line,
                  }}
                >
                  <Icon
                    name={has ? 'star' : 'lock'}
                    size={18}
                    color={has ? '#FFFFFF' : theme.muted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="bold" size={13} numberOfLines={1}>
                    {title}
                  </T>
                  <T size={11} muted numberOfLines={2}>
                    {desc}
                  </T>
                  {a.rewardCents ? (
                    <Mono size={12} color={has ? theme.signal : theme.muted}>
                      {moneyShort(a.rewardCents)}
                    </Mono>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
