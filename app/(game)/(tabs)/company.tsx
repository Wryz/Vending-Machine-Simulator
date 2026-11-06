import { FAMILY_LABEL } from '@/config/machines';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { FALLBACK_CITIES, type CityId } from '@/config/cities';
import { RIVAL, STAFF } from '@/config/economy';
import { ALCOHOL_ALLOWED_COUNTRIES, MACHINE_TYPES, type MachineFamily } from '@/config/machines';
import {
  CHAPTERS,
  CHAPTER_GOALS,
  PRESTIGE_PERKS,
  RESEARCH,
  type Research,
} from '@/config/progression';
import { t, useT, type TKey } from '@/i18n';
import { content } from '@/i18n/content';
import { ledgerCategory, simError } from '@/i18n/sim';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import { track } from '@/services/analytics';
import { removeKey, writeJson } from '@/services/storage';
import {
  LIQUOR_PERMIT_CENTS,
  activeMachines,
  buyLiquorPermit,
  buyPrestigePerk,
  buyResearch,
  buyWarehouse,
  canSellCompany,
  companyValuationCents,
  hasResearch,
  playerShare,
  reputationFor,
  sellCompany,
  type ActionResult,
  type GameState,
  type World,
} from '@/sim';
import { cityInfoFor, hasSave, useGame } from '@/store/game';
import { cityKey, useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { money, moneyShort, pct } from '@/ui/format';
import { Button, Mono, Paper, ProgressBar, Row, Screen, Section, Spacer, T } from '@/ui/kit';
import { GlobalRankingButton } from '@/ui/GameCenter';
import { RankingCard } from '@/ui/RankingCard';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { Receipt, type ReceiptLine } from '@/ui/objects/Receipt';
import { LockedCard, StatChip } from '@/ui/hud';
import { Icon } from '@/ui/icons';
import { PermitCard } from '@/ui/objects/small';
import { SPACE, TOUCH } from '@/ui/theme';

const FAMILIES = Object.keys(FAMILY_LABEL) as MachineFamily[];

/** A machine family's display name. */
function familyLabel(f: MachineFamily): string {
  return t.or(`content.families.${f}`, FAMILY_LABEL[f]);
}

interface Goal {
  label: string;
  value: string;
  progress: number;
}

/** Progress toward the current chapter's goal, computed like the sim does (CHAPTER_GOALS). */
function chapterGoals(game: GameState): Goal[] {
  const machines = activeMachines(game).length;
  const count = (have: number, need: number, labelKey: TKey): Goal => ({
    label: t(labelKey),
    value: t('company.chapter.count', { have: Math.min(have, need), need }),
    progress: have / need,
  });
  switch (game.chapter) {
    case 1: {
      const need = CHAPTER_GOALS[1].salesCents;
      return [
        {
          label: t('company.chapter.sales'),
          value: t('company.chapter.count', {
            have: moneyShort(Math.min(need, game.ledger.lifetimeSalesCents)),
            need: moneyShort(need),
          }),
          progress: game.ledger.lifetimeSalesCents / need,
        },
      ];
    }
    case 2:
      return [
        count(machines, CHAPTER_GOALS[2].machines, 'company.chapter.machinesRunning'),
        count(game.vanLevel, CHAPTER_GOALS[2].vanLevel, 'company.chapter.van'),
      ];
    case 3:
      return [
        count(machines, CHAPTER_GOALS[3].machines, 'company.chapter.machinesRunning'),
        count(game.drivers.length, CHAPTER_GOALS[3].drivers, 'company.chapter.drivers'),
      ];
    case 4:
      return [
        count(machines, CHAPTER_GOALS[4].machines, 'company.chapter.machinesRunning'),
        count(game.drivers.length, CHAPTER_GOALS[4].drivers, 'company.chapter.drivers'),
      ];
    case 5: {
      const share = game.rival.active ? playerShare(game) : 0;
      return [
        {
          label: t('company.chapter.share', { rival: RIVAL.name }),
          value: t('company.chapter.count', {
            have: pct(share),
            need: pct(CHAPTER_GOALS[5].share),
          }),
          progress: share / CHAPTER_GOALS[5].share,
        },
      ];
    }
    default:
      return [];
  }
}

function pnlLines(lines: Record<string, number>): { lines: ReceiptLine[]; total: number } {
  const entries = Object.entries(lines).filter(([, v]) => v !== 0);
  entries.sort((a, b) => {
    const ap = a[1] >= 0;
    const bp = b[1] >= 0;
    if (ap !== bp) return ap ? -1 : 1;
    return Math.abs(b[1]) - Math.abs(a[1]);
  });
  return {
    lines: entries.map(([label, v]) => ({
      label: ledgerCategory(label),
      value: money(v),
      tone: v >= 0 ? 'normal' : 'bad',
    })),
    total: entries.reduce((a, [, v]) => a + v, 0),
  };
}

/** A per-family research button with a 44 pt target. */
function FamilyButton({
  label,
  color,
  done,
  disabled,
  onPress,
}: {
  label: string;
  color: string;
  done: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        done
          ? t('company.research.familyDone', { family: label })
          : t('company.research.familyHint', { family: label })
      }
      accessibilityState={{ disabled: done || disabled }}
      disabled={done || disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: TOUCH,
        paddingHorizontal: SPACE.m,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: done ? theme.signal : theme.line,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled && !done ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T size={13} weight="medium" color={done ? theme.signal : theme.ink}>
        {done ? t('company.research.familyDoneLabel', { family: label }) : label}
      </T>
    </Pressable>
  );
}

/** Company (SPEC §8): chapters, P&L, staff, warehouse, permits, research, market share, prestige. */
export default function Company() {
  const t = useT();
  const theme = useTheme();
  const game = useGame((s) => s.game);
  const world = useGame((s) => s.world);
  const city = useGame((s) => s.city);
  const { flash, show } = useFlash();
  const [picking, setPicking] = useState(false);
  const [selling, setSelling] = useState(false);

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

  const goals = chapterGoals(game);
  const chapter = CHAPTERS.find((c) => c.n === game.chapter);
  const today = pnlLines(game.ledger.day.lines);
  const yesterday = game.ledger.yesterday ? pnlLines(game.ledger.yesterday.lines) : null;
  const machines = activeMachines(game).length;
  const stored = game.machines.length - machines;
  const familiesOpen = FAMILIES.filter((f) =>
    MACHINE_TYPES.some((t) => t.family === f && t.unlockChapter <= game.chapter),
  );
  const alcoholAllowed = ALCOHOL_ALLOWED_COUNTRIES.includes(world.city.countryCode);
  const valuation = companyValuationCents(game);
  const reputation = reputationFor(game);
  const share = playerShare(game);

  const sellTo = (id: CityId) => {
    const target = cityInfoFor(id);
    const replacing = hasSave(target) && city && cityKey(city) !== cityKey(target);
    const targetName = content.city(id, target.name);
    Alert.alert(
      t('company.sell.title'),
      t(replacing ? 'company.sell.bodyReplacing' : 'company.sell.body', {
        rep: reputation,
        target: targetName,
        city: world.city.name,
      }),
      [
        { text: t('company.sell.cancel'), style: 'cancel' },
        {
          text: t('company.sell.confirm'),
          style: 'destructive',
          onPress: async () => {
            const current = useGame.getState().game;
            if (!current) return;
            const res = sellCompany(current, id, Date.now(), Math.floor(Math.random() * 2 ** 31));
            if ('error' in res) {
              show(simError(res.error), 'error');
              return;
            }
            setSelling(true);
            track('prestige', { city: id, count: res.state.prestige.sales });
            haptic.success();
            const soldKey = city ? cityKey(city) : null;
            useGame.getState().close();
            // The sold business is gone; its slot is freed unless we restart in the same city.
            if (soldKey && soldKey !== cityKey(target)) {
              removeKey(`save-${soldKey}`);
              useProfile.getState().update((p) => {
                delete p.cities[soldKey];
              });
            }
            writeJson(`save-${cityKey(target)}`, res.state);
            await useGame.getState().openCity(target);
            if (useGame.getState().status === 'ready') router.replace('/map');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        tab
        title={t('company.title')}
        subtitle={t('company.subtitle', { city: world.city.name })}
      >
        {/* Chapter progress */}
        <Section title={t('company.chapter.section', { n: game.chapter })}>
          <Paper tone="surface">
            <T
              size={18}
              weight="bold"
              accessibilityHint={chapter ? content.chapterGoal(chapter.n, chapter.goal) : undefined}
            >
              {chapter
                ? content.chapterTitle(chapter.n, chapter.title)
                : t('company.chapter.prestige')}
            </T>
            {goals.length > 0 ? <Spacer h={SPACE.m} /> : null}
            {goals.map((g) => (
              <View key={g.label} style={{ gap: SPACE.xs, marginBottom: SPACE.s }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T size={13}>{g.label}</T>
                  <Mono size={13}>{g.value}</Mono>
                </Row>
                <ProgressBar value={g.progress} />
              </View>
            ))}
            {chapter && chapter.n < 6 ? (
              <Row style={{ flexWrap: 'wrap', marginTop: SPACE.xs }}>
                {chapter.unlocks.map((u, i) => (
                  <StatChip
                    key={u}
                    icon="star"
                    label={t('company.chapter.unlocksNext')}
                    value={content.chapterUnlock(chapter.n, i, u)}
                    color={theme.brand}
                  />
                ))}
              </Row>
            ) : null}
          </Paper>
          {/* Chapter steps: done, current, ahead. */}
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: SPACE.s }}>
            {CHAPTERS.map((c) => {
              const done = !!game.chapterDoneAt[c.n];
              const current = c.n === game.chapter;
              const stepVars = { n: c.n, title: content.chapterTitle(c.n, c.title) };
              return (
                <View
                  key={c.n}
                  accessible
                  accessibilityLabel={t(
                    done
                      ? 'company.chapter.stepDone'
                      : current
                        ? 'company.chapter.stepCurrent'
                        : 'company.chapter.step',
                    stepVars,
                  )}
                  style={{
                    width: current ? 40 : 32,
                    height: current ? 40 : 32,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? theme.signal : current ? theme.brand : theme.line,
                  }}
                >
                  {done ? (
                    <Icon name="star" size={16} color="#FFFFFF" />
                  ) : (
                    <T size={14} weight="bold" color={current ? theme.onBrand : theme.muted}>
                      {String(c.n)}
                    </T>
                  )}
                </View>
              );
            })}
          </Row>
        </Section>

        {/* Finances */}
        <Section title={t('company.finances.section')}>
          <Row style={{ flexWrap: 'wrap' }}>
            <StatChip
              icon="coin"
              label={t('company.finances.cash')}
              value={money(game.cashCents)}
            />
            <StatChip
              icon="bag"
              label={t('company.finances.lifetimeSales')}
              value={moneyShort(game.ledger.lifetimeSalesCents)}
            />
            <StatChip
              icon="box"
              label={t('company.finances.unitsSold')}
              value={game.ledger.lifetimeUnits.toLocaleString(t.lang)}
            />
            <StatChip
              icon="minus"
              label={t('company.finances.lifetimeCosts')}
              value={moneyShort(game.ledger.lifetimeCostsCents)}
            />
          </Row>
          <Receipt
            title={t('company.finances.today')}
            subtitle={game.ledger.day.dateKey || undefined}
            lines={
              today.lines.length
                ? today.lines
                : [{ label: t('company.finances.noActivity'), value: '', tone: 'muted' }]
            }
            total={{
              label: t('company.finances.net'),
              value: money(today.total, { sign: true }),
              tone: today.total >= 0 ? 'good' : 'bad',
            }}
          />
          {yesterday ? (
            <Receipt
              title={t('company.finances.yesterday')}
              subtitle={game.ledger.yesterday?.dateKey}
              lines={yesterday.lines}
              total={{
                label: t('company.finances.net'),
                value: money(yesterday.total, { sign: true }),
                tone: yesterday.total >= 0 ? 'good' : 'bad',
              }}
            />
          ) : null}
        </Section>

        {/* Staff & warehouse */}
        <Section title={t('company.staff.section')}>
          <Row style={{ flexWrap: 'wrap' }}>
            <StatChip
              icon="grid"
              label={t('company.staff.machinesPlaced')}
              value={String(machines)}
            />
            {stored ? (
              <StatChip icon="box" label={t('company.staff.inStorage')} value={String(stored)} />
            ) : null}
            <StatChip
              icon="people"
              label={t('company.staff.drivers')}
              value={String(game.drivers.length)}
            />
            {game.drivers.length ? (
              <StatChip
                icon="coin"
                label={t('company.staff.wagesPerDay')}
                value={moneyShort(game.drivers.length * STAFF.driverWageCentsPerDay)}
              />
            ) : null}
          </Row>
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
              <T weight="bold">{t('company.warehouse.title')}</T>
              <Row style={{ flexWrap: 'wrap' }}>
                <StatChip
                  icon="percent"
                  label={t('company.warehouse.offWholesale')}
                  value={t('company.warehouse.discount', { pct: pct(STAFF.warehouseDiscount) })}
                />
                <StatChip
                  icon="box"
                  label={t('company.warehouse.driverLoad')}
                  value={String(STAFF.warehouseDriverCapacity)}
                />
                <StatChip
                  icon="coin"
                  label={t('company.warehouse.rentPerDay')}
                  value={moneyShort(STAFF.warehouseRentCentsPerDay)}
                />
              </Row>
              {game.warehouse ? (
                <StatChip
                  icon="star"
                  label={t('company.warehouse.owned')}
                  value={t('company.warehouse.yours')}
                  color={theme.signal}
                />
              ) : (
                <Button
                  icon={<Icon name="plus" size={20} color={theme.onBrand} />}
                  label={t('company.warehouse.buy', { cost: moneyShort(STAFF.warehouseBuyCents) })}
                  disabled={game.cashCents < STAFF.warehouseBuyCents}
                  onPress={() => run((d) => buyWarehouse(d), t('company.warehouse.bought'))}
                />
              )}
            </Paper>
          )}
        </Section>

        {/* Permits */}
        <Section title={t('company.permits.section')}>
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
        </Section>

        {/* Research */}
        <Section title={t('company.research.section')}>
          {RESEARCH.map((r: Research) => {
            const locked = game.chapter < r.unlockChapter;
            const families =
              r.id === 'id-check' ? familiesOpen.filter((f) => f === 'alcohol') : familiesOpen;
            const globalDone = !!r.global && hasResearch(game, r.id, 'snacks');
            const name = content.researchName(r.id, r.name);
            const desc = content.researchDesc(r.id, r.description);
            return (
              <Paper key={r.id} tone="surface" style={{ gap: SPACE.xs }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <T weight="bold" accessibilityHint={desc}>
                      {name}
                    </T>
                    <T size={13} muted numberOfLines={1}>
                      {desc}
                    </T>
                  </View>
                  <Mono size={13} muted={locked}>
                    {r.global
                      ? money(r.costCents)
                      : t('company.research.perFamily', { cost: money(r.costCents) })}
                  </Mono>
                </Row>
                {locked ? (
                  <StatChip
                    icon="lock"
                    label={t('company.research.unlocksIn', { n: r.unlockChapter })}
                    value={t('company.research.chapterShort', { n: r.unlockChapter })}
                  />
                ) : r.global ? (
                  globalDone ? (
                    <StatChip
                      icon="star"
                      label={t('company.research.researched')}
                      value={t('company.research.done')}
                      color={theme.signal}
                    />
                  ) : (
                    <Button
                      kind="secondary"
                      label={t('company.research.buy', { cost: money(r.costCents) })}
                      disabled={game.cashCents < r.costCents}
                      onPress={() =>
                        run((d) => buyResearch(d, r.id), t('company.research.doneToast', { name }))
                      }
                    />
                  )
                ) : families.length === 0 ? (
                  <StatChip icon="grid" label={t('company.research.noMachines')} value="—" />
                ) : (
                  <Row gap={SPACE.s} style={{ flexWrap: 'wrap', marginTop: SPACE.xs }}>
                    {families.map((f) => (
                      <FamilyButton
                        key={f}
                        label={familyLabel(f)}
                        color={theme.family[f]}
                        done={hasResearch(game, r.id, f)}
                        disabled={game.cashCents < r.costCents}
                        onPress={() =>
                          run(
                            (d) => buyResearch(d, r.id, f),
                            t('company.research.familyToast', { name, family: familyLabel(f) }),
                          )
                        }
                      />
                    ))}
                  </Row>
                )}
              </Paper>
            );
          })}
        </Section>

        {/* City ranking board */}
        <RankingCard game={game} />

        {/* Market share */}
        <Section title={t('company.market.section')}>
          {game.rival.active ? (
            <Paper tone="surface" style={{ gap: SPACE.s }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T>{t('company.market.you')}</T>
                <Mono>{pct(share)}</Mono>
              </Row>
              <ProgressBar value={share} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T muted>
                  {t('company.market.rival', { rival: RIVAL.name, n: game.rival.machines.length })}
                </T>
                <Mono muted>{pct(1 - share)}</Mono>
              </Row>
            </Paper>
          ) : (
            <LockedCard icon="people" title={RIVAL.name} chapter={RIVAL.arrivesChapter} />
          )}
          <GlobalRankingButton cityId={game.cityId} />
        </Section>

        {/* Prestige */}
        <Section title={t('company.prestige.section')}>
          <Paper tone="surface" style={{ gap: SPACE.xs }}>
            <Row style={{ flexWrap: 'wrap' }}>
              <StatChip
                icon="coin"
                label={t('company.prestige.valuation')}
                value={moneyShort(valuation)}
              />
              <StatChip
                icon="star"
                label={t('company.prestige.repFromSale')}
                value={`+${reputation}`}
                color={theme.brand}
              />
              <StatChip
                icon="star"
                label={t('company.prestige.repBanked')}
                value={String(game.prestige.reputation)}
              />
              {game.prestige.sales > 0 ? (
                <StatChip
                  icon="handshake"
                  label={t('company.prestige.companiesSold')}
                  value={String(game.prestige.sales)}
                />
              ) : null}
            </Row>
            <Spacer h={SPACE.s} />
            {canSellCompany(game) ? (
              <>
                <Button
                  kind={picking ? 'secondary' : 'danger'}
                  label={picking ? t('company.prestige.keep') : t('company.prestige.sell')}
                  busy={selling}
                  onPress={() => setPicking((p) => !p)}
                />
                {picking ? (
                  <View style={{ marginTop: SPACE.s }}>
                    {FALLBACK_CITIES.map((c) => (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        accessibilityLabel={t('company.prestige.restartIn', {
                          city: content.city(c.id, c.name),
                        })}
                        onPress={() => sellTo(c.id)}
                        disabled={selling}
                        style={({ pressed }) => ({
                          minHeight: TOUCH,
                          justifyContent: 'center',
                          borderBottomWidth: 1,
                          borderColor: theme.line,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T weight="medium">{content.city(c.id, c.name)}</T>
                          <T size={13} muted>
                            {t.or(`content.cityNotes.${c.id}`, c.notes)}
                          </T>
                        </Row>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <LockedCard icon="handshake" title={t('company.prestige.sell')} chapter={5} />
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
        </Section>

        <Section title={t('company.more.section')}>
          <Row gap={SPACE.s} style={{ flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              label={t('company.more.collections')}
              onPress={() => router.push('/collections')}
            />
            <Button
              kind="secondary"
              label={t('company.more.cities')}
              onPress={() => router.push('/cities')}
            />
            <Button
              kind="secondary"
              label={t('company.more.shop')}
              onPress={() => router.push('/shop')}
            />
            <Button
              kind="secondary"
              label={t('company.more.settings')}
              onPress={() => router.push('/settings')}
            />
          </Row>
        </Section>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
