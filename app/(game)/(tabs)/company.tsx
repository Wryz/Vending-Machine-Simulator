import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { RIVAL, STAFF } from '@/config/economy';
import { ALCOHOL_ALLOWED_COUNTRIES } from '@/config/machines';
import { CHAPTERS } from '@/config/progression';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError } from '@/i18n/sim';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import { showLeaderboards, useGameCenter } from '@/services/gameCenter';
import {
  LIQUOR_PERMIT_CENTS,
  activeMachines,
  buyLiquorPermit,
  buyWarehouse,
  featureUnlocked,
  playerShare,
  type ActionResult,
  type GameState,
  type World,
} from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { ChapterSheet } from '@/ui/ChapterSheet';
import { chapterGoals } from '@/ui/chapterGoals';
import { CollapsibleSection, Disclosure } from '@/ui/CollapsibleSection';
import { FinanceBoard } from '@/ui/FinanceBoard';
import { money, moneyShort, pct } from '@/ui/format';
import { Button, Mono, Paper, ProgressBar, Row, Screen, Section, T } from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { LockedCard } from '@/ui/hud';
import { Icon } from '@/ui/icons';
import { markSeen } from '@/ui/markSeen';
import { moreBadges } from '@/ui/moreBadges';
import { MoreKey } from '@/ui/MoreKey';
import { PermitCard } from '@/ui/objects/small';
import { StatGrid } from '@/ui/StatGrid';
import { SPACE, TOUCH } from '@/ui/theme';
import { FirstTip } from '@/ui/guide';

/** The current chapter: what it takes to level up, what finishing it unlocks, and every chapter's number. */
function ChapterCard({ game }: { game: GameState }) {
  const t = useT();
  const theme = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  const chapter = CHAPTERS.find((c) => c.n === game.chapter);
  const goals = chapterGoals(game);
  const last = !chapter || chapter.n >= CHAPTERS.length;

  return (
    <>
      <Paper tone="surface" style={{ gap: SPACE.s }}>
        <T size={18} weight="bold">
          {chapter ? content.chapterTitle(chapter.n, chapter.title) : t('company.chapter.prestige')}
        </T>
        {last ? (
          <T size={13} muted>
            {t('companyHub.chapter.last')}
          </T>
        ) : (
          <View style={{ gap: SPACE.xs }}>
            <T size={11} weight="bold" muted>
              {t('companyHub.chapter.requirements').toUpperCase()}
            </T>
            <T size={14} weight="bold">
              {t('companyHub.chapter.toReach', { n: game.chapter + 1 })}
            </T>
            {chapter ? (
              <T size={13} muted>
                {content.chapterGoal(chapter.n, chapter.goal)}
              </T>
            ) : null}
          </View>
        )}
        {goals.map((g) => (
          <View key={g.label} style={{ gap: SPACE.xs }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={13} style={{ flex: 1 }}>
                {g.label}
              </T>
              <Mono size={13}>{g.value}</Mono>
            </Row>
            <ProgressBar value={g.progress} color={g.progress >= 1 ? theme.signal : undefined} />
          </View>
        ))}
        {chapter && !last && chapter.unlocks.length ? (
          <Disclosure title={t('companyHub.chapter.rewards')} color={theme.brand}>
            {chapter.unlocks.map((u, i) => (
              <Row key={u} gap={SPACE.s}>
                <Icon name="star" size={14} color={theme.brand} />
                <T size={13} style={{ flex: 1 }}>
                  {content.chapterUnlock(chapter.n, i, u)}
                </T>
              </Row>
            ))}
          </Disclosure>
        ) : null}
      </Paper>
      {/* Chapter steps: done, current, ahead. Each opens that chapter. */}
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: SPACE.s }}>
        {CHAPTERS.map((c) => {
          const done = !!game.chapterDoneAt[c.n];
          const current = c.n === game.chapter;
          const size = current ? 40 : 32;
          const stepVars = { n: c.n, title: content.chapterTitle(c.n, c.title) };
          return (
            <Pressable
              key={c.n}
              accessibilityRole="button"
              accessibilityLabel={t(
                done
                  ? 'company.chapter.stepDone'
                  : current
                    ? 'company.chapter.stepCurrent'
                    : 'company.chapter.step',
                stepVars,
              )}
              accessibilityHint={t('companyHub.chapter.stepHint')}
              hitSlop={{ top: (TOUCH - size) / 2, bottom: (TOUCH - size) / 2, left: 2, right: 2 }}
              onPress={() => {
                haptic.select();
                setOpen(c.n);
              }}
              style={({ pressed }) => ({
                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? theme.signal : current ? theme.brand : theme.line,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}
            >
              {done ? (
                <Icon name="star" size={16} color="#FFFFFF" />
              ) : (
                <T size={14} weight="bold" color={current ? theme.onBrand : theme.muted}>
                  {String(c.n)}
                </T>
              )}
            </Pressable>
          );
        })}
      </Row>
      <T size={11} muted center>
        {t('companyHub.chapter.stepsHint')}
      </T>
      <ChapterSheet game={game} n={open} onClose={() => setOpen(null)} />
    </>
  );
}

/**
 * Company (SPEC §8): chapter, finances, staff, warehouse, permits and market
 * share in sections that open and close; research, rankings, prestige and
 * trophies behind the More keys, each with a number when there's news.
 */
export default function Company() {
  const t = useT();
  const theme = useTheme();
  const game = useGame((s) => s.game);
  const world = useGame((s) => s.world);
  const seenMore = useProfile((s) => s.seenMore);
  const gameCenter = useGameCenter((s) => s.available && s.authenticated);
  const { flash, show } = useFlash();

  const run = (fn: (d: GameState, w: World) => ActionResult, success: string) => {
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

  if (!game || !world) {
    return (
      <Screen tab title={t('company.title')}>
        <T muted>{t('company.noBusiness')}</T>
      </Screen>
    );
  }

  const machines = activeMachines(game).length;
  const stored = game.machines.length - machines;
  const alcoholAllowed = ALCOHOL_ALLOWED_COUNTRIES.includes(world.city.countryCode);
  const share = playerShare(game);
  const badges = moreBadges(game, seenMore);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        tab
        title={t('company.title')}
        subtitle={t('company.subtitle', { city: world.city.name })}
      >
        <FirstTip id="company" />

        <CollapsibleSection
          id="chapter"
          title={t('company.chapter.section', { n: game.chapter })}
          defaultOpen
        >
          <ChapterCard game={game} />
        </CollapsibleSection>

        <CollapsibleSection
          id="finances"
          title={t('company.finances.section')}
          defaultOpen
          summary={<Mono size={14}>{moneyShort(game.cashCents)}</Mono>}
        >
          <FinanceBoard game={game} />
        </CollapsibleSection>

        {/* More: screens of their own, with a number when there's something new. */}
        <Section title={t('company.more.section')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
            <MoreKey
              icon="bolt"
              label={t('companyHub.more.research')}
              badge={badges.research}
              onPress={() => router.push('/research')}
            />
            {featureUnlocked(game, 'rankings') ? (
              <MoreKey
                icon="trend"
                label={t('companyHub.more.rankings')}
                badge={badges.rankings}
                onPress={() => {
                  markSeen(game, 'rankings');
                  router.push('/rankings');
                }}
              />
            ) : null}
            {gameCenter ? (
              <MoreKey
                icon="globe"
                label={t('companyHub.more.globalRanking')}
                onPress={() => void showLeaderboards(game.cityId)}
              />
            ) : null}
            <MoreKey
              icon="star"
              label={t('companyHub.more.trophies')}
              badge={badges.trophies}
              onPress={() => router.push('/trophies')}
            />
            <MoreKey
              icon="handshake"
              label={t('companyHub.more.prestige')}
              badge={badges.prestige}
              onPress={() => router.push('/prestige')}
            />
            <MoreKey
              icon="grid"
              label={t('company.more.collections')}
              onPress={() => router.push('/collections')}
            />
            <MoreKey
              icon="pin"
              label={t('company.more.cities')}
              onPress={() => router.push('/cities')}
            />
            <MoreKey
              icon="shop"
              label={t('company.more.shop')}
              onPress={() => router.push('/shop')}
            />
            <MoreKey
              icon="gear"
              label={t('company.more.settings')}
              onPress={() => router.push('/settings')}
            />
          </View>
        </Section>

        <CollapsibleSection
          id="staff"
          title={t('company.staff.section')}
          summary={<Mono size={14}>{String(machines)}</Mono>}
        >
          <Paper tone="surface">
            <StatGrid
              tiles={[
                { icon: 'grid', label: t('company.staff.machinesPlaced'), value: String(machines) },
                ...(stored
                  ? [
                      {
                        icon: 'box' as const,
                        label: t('company.staff.inStorage'),
                        value: String(stored),
                      },
                    ]
                  : []),
                {
                  icon: 'people',
                  label: t('company.staff.drivers'),
                  value: String(game.drivers.length),
                },
                ...(game.drivers.length
                  ? [
                      {
                        icon: 'coin' as const,
                        label: t('company.staff.wagesPerDay'),
                        value: moneyShort(game.drivers.length * STAFF.driverWageCentsPerDay),
                      },
                    ]
                  : []),
              ]}
            />
          </Paper>
          <Button
            kind="secondary"
            icon={<Icon name="route" size={20} color={theme.ink} />}
            label={t('company.staff.routes')}
            onPress={() => router.navigate('/routes')}
          />
          {game.chapter < 3 ? (
            <LockedCard icon="box" title={t('company.warehouse.title')} chapter={3} />
          ) : (
            <Paper tone="surface" style={{ gap: SPACE.s }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T weight="bold">{t('company.warehouse.title')}</T>
                {game.warehouse ? (
                  <Row gap={4}>
                    <Icon name="star" size={14} color={theme.signal} />
                    <T size={13} weight="bold" color={theme.signal}>
                      {t('company.warehouse.owned')}
                    </T>
                  </Row>
                ) : null}
              </Row>
              <StatGrid
                tiles={[
                  {
                    icon: 'percent',
                    label: t('company.warehouse.offWholesale'),
                    value: t('company.warehouse.discount', { pct: pct(STAFF.warehouseDiscount) }),
                  },
                  {
                    icon: 'box',
                    label: t('company.warehouse.driverLoad'),
                    value: String(STAFF.warehouseDriverCapacity),
                  },
                  {
                    icon: 'coin',
                    label: t('company.warehouse.rentPerDay'),
                    value: moneyShort(STAFF.warehouseRentCentsPerDay),
                  },
                ]}
              />
              {!game.warehouse ? (
                <Button
                  icon={<Icon name="plus" size={20} color={theme.onBrand} />}
                  label={t('company.warehouse.buy', { cost: moneyShort(STAFF.warehouseBuyCents) })}
                  disabled={game.cashCents < STAFF.warehouseBuyCents}
                  onPress={() => run((d) => buyWarehouse(d), t('company.warehouse.bought'))}
                />
              ) : null}
            </Paper>
          )}
        </CollapsibleSection>

        <CollapsibleSection id="permits" title={t('company.permits.section')}>
          <PermitCard
            title={t('company.permits.liquor')}
            holder={t('company.subtitle', { city: world.city.name })}
            valid={game.liquorPermit}
            detail={!alcoholAllowed ? t('company.permits.notAllowed') : t('company.permits.detail')}
          />
          {!game.liquorPermit && alcoholAllowed ? (
            game.chapter < 5 ? (
              <LockedCard icon="lock" title={t('company.permits.liquor')} chapter={5} />
            ) : (
              <Button
                label={t('company.permits.apply', { cost: money(LIQUOR_PERMIT_CENTS) })}
                disabled={game.cashCents < LIQUOR_PERMIT_CENTS}
                onPress={() => run((d, w) => buyLiquorPermit(d, w), t('company.permits.granted'))}
              />
            )
          ) : null}
        </CollapsibleSection>

        {/* Brightvend shows up early now (after the tutorial); no chapter lock to show. */}
        {game.rival.active ? (
          <CollapsibleSection
            id="market"
            title={t('company.market.section')}
            summary={<Mono size={14}>{pct(share)}</Mono>}
          >
            <Paper tone="surface" style={{ gap: SPACE.s }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T>{t('company.market.you')}</T>
                <Mono>{pct(share)}</Mono>
              </Row>
              <ProgressBar value={share} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T muted>
                  {t('company.market.rival', {
                    rival: RIVAL.name,
                    n: game.rival.machines.length,
                  })}
                </T>
                <Mono muted>{pct(1 - share)}</Mono>
              </Row>
            </Paper>
          </CollapsibleSection>
        ) : null}
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
