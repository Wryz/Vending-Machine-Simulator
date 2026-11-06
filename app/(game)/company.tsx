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
import {
  Button,
  Mono,
  Paper,
  ProgressBar,
  Row,
  Screen,
  Section,
  Spacer,
  T,
} from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { Receipt, type ReceiptLine } from '@/ui/objects/Receipt';
import { LockedCard, StatChip } from '@/ui/hud';
import { Icon } from '@/ui/icons';
import { PermitCard } from '@/ui/objects/small';
import { SPACE, TOUCH } from '@/ui/theme';

const FAMILIES = Object.keys(FAMILY_LABEL) as MachineFamily[];

interface Goal {
  label: string;
  value: string;
  progress: number;
}

/** Progress toward the current chapter's goal, computed like the sim does (CHAPTER_GOALS). */
function chapterGoals(game: GameState): Goal[] {
  const machines = activeMachines(game).length;
  const count = (have: number, need: number, label: string): Goal => ({
    label,
    value: `${Math.min(have, need)} / ${need}`,
    progress: have / need,
  });
  switch (game.chapter) {
    case 1: {
      const need = CHAPTER_GOALS[1].salesCents;
      return [
        {
          label: 'Sales',
          value: `${moneyShort(Math.min(need, game.ledger.lifetimeSalesCents))} / ${moneyShort(need)}`,
          progress: game.ledger.lifetimeSalesCents / need,
        },
      ];
    }
    case 2:
      return [
        count(machines, CHAPTER_GOALS[2].machines, 'Machines running'),
        count(game.vanLevel, CHAPTER_GOALS[2].vanLevel, 'Van'),
      ];
    case 3:
      return [
        count(machines, CHAPTER_GOALS[3].machines, 'Machines running'),
        count(game.drivers.length, CHAPTER_GOALS[3].drivers, 'Drivers'),
      ];
    case 4:
      return [
        count(machines, CHAPTER_GOALS[4].machines, 'Machines running'),
        count(game.drivers.length, CHAPTER_GOALS[4].drivers, 'Drivers'),
      ];
    case 5: {
      const share = game.rival.active ? playerShare(game) : 0;
      return [
        {
          label: `Your share vs ${RIVAL.name}`,
          value: `${pct(share)} / ${pct(CHAPTER_GOALS[5].share)}`,
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
      label,
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
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? `${label}, researched` : `Research for ${label}`}
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
        {done ? `${label} ✓` : label}
      </T>
    </Pressable>
  );
}

/** Company (SPEC §8): chapters, P&L, staff, warehouse, permits, research, market share, prestige. */
export default function Company() {
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
      show(r.error, 'error');
    }
  };

  if (!game || !world) {
    return (
      <Screen title="Company">
        <T muted>No business is open.</T>
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
    Alert.alert(
      'Sell the company?',
      `You bank ${reputation} Reputation and restart in ${target.name} with your perks.` +
        (replacing ? ` Your saved business in ${target.name} will be replaced.` : '') +
        ` This business in ${world.city.name} is sold.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          style: 'destructive',
          onPress: async () => {
            const current = useGame.getState().game;
            if (!current) return;
            const res = sellCompany(current, id, Date.now(), Math.floor(Math.random() * 2 ** 31));
            if ('error' in res) {
              show(res.error, 'error');
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
      <Screen title="Company" subtitle={`Coinline · ${world.city.name}`}>
        {/* Chapter progress */}
        <Section title={`Chapter ${game.chapter}`}>
          <Paper tone="surface">
            <T size={18} weight="bold" accessibilityHint={chapter?.goal}>
              {chapter?.title ?? 'Prestige'}
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
                {chapter.unlocks.map((u) => (
                  <StatChip
                    key={u}
                    icon="star"
                    label="Unlocks next"
                    value={u}
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
              return (
                <View
                  key={c.n}
                  accessible
                  accessibilityLabel={`Chapter ${c.n}, ${c.title}${done ? ', done' : current ? ', current' : ''}`}
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
        <Section title="Finances">
          <Row style={{ flexWrap: 'wrap' }}>
            <StatChip icon="coin" label="Cash" value={money(game.cashCents)} />
            <StatChip
              icon="bag"
              label="Lifetime sales"
              value={moneyShort(game.ledger.lifetimeSalesCents)}
            />
            <StatChip
              icon="box"
              label="Units sold"
              value={game.ledger.lifetimeUnits.toLocaleString('en-US')}
            />
            <StatChip
              icon="minus"
              label="Lifetime costs"
              value={moneyShort(game.ledger.lifetimeCostsCents)}
            />
          </Row>
          <Receipt
            title="Today"
            subtitle={game.ledger.day.dateKey || undefined}
            lines={
              today.lines.length
                ? today.lines
                : [{ label: 'No activity yet', value: '', tone: 'muted' }]
            }
            total={{
              label: 'Net',
              value: money(today.total, { sign: true }),
              tone: today.total >= 0 ? 'good' : 'bad',
            }}
          />
          {yesterday ? (
            <Receipt
              title="Yesterday"
              subtitle={game.ledger.yesterday?.dateKey}
              lines={yesterday.lines}
              total={{
                label: 'Net',
                value: money(yesterday.total, { sign: true }),
                tone: yesterday.total >= 0 ? 'good' : 'bad',
              }}
            />
          ) : null}
        </Section>

        {/* Staff & warehouse */}
        <Section title="Staff and warehouse">
          <Row style={{ flexWrap: 'wrap' }}>
            <StatChip icon="grid" label="Machines placed" value={String(machines)} />
            {stored ? <StatChip icon="box" label="In storage" value={String(stored)} /> : null}
            <StatChip icon="people" label="Drivers" value={String(game.drivers.length)} />
            {game.drivers.length ? (
              <StatChip
                icon="coin"
                label="Wages per day"
                value={moneyShort(game.drivers.length * STAFF.driverWageCentsPerDay)}
              />
            ) : null}
          </Row>
          <Button
            kind="secondary"
            icon={<Icon name="route" size={20} color={theme.ink} />}
            label="Routes"
            onPress={() => router.push('/routes')}
          />
          {game.chapter < 3 ? (
            <LockedCard icon="box" title="Warehouse" chapter={3} />
          ) : (
            <Paper tone="surface" style={{ gap: SPACE.s }}>
              <T weight="bold">Warehouse</T>
              <Row style={{ flexWrap: 'wrap' }}>
                <StatChip
                  icon="percent"
                  label="Off wholesale"
                  value={`−${pct(STAFF.warehouseDiscount)}`}
                />
                <StatChip
                  icon="box"
                  label="Driver load"
                  value={String(STAFF.warehouseDriverCapacity)}
                />
                <StatChip
                  icon="coin"
                  label="Rent per day"
                  value={moneyShort(STAFF.warehouseRentCentsPerDay)}
                />
              </Row>
              {game.warehouse ? (
                <StatChip icon="star" label="Owned" value="Yours" color={theme.signal} />
              ) : (
                <Button
                  icon={<Icon name="plus" size={20} color={theme.onBrand} />}
                  label={`Buy · ${moneyShort(STAFF.warehouseBuyCents)}`}
                  disabled={game.cashCents < STAFF.warehouseBuyCents}
                  onPress={() => run((d) => buyWarehouse(d), 'Warehouse bought')}
                />
              )}
            </Paper>
          )}
        </Section>

        {/* Permits */}
        <Section title="Permits">
          <PermitCard
            title="Liquor permit"
            holder={`Coinline · ${world.city.name}`}
            valid={game.liquorPermit}
            detail={
              !alcoholAllowed
                ? 'Alcohol vending is not allowed in this city.'
                : 'Beer and wine machines. Keep 300 m from schools and youth places.'
            }
          />
          {!game.liquorPermit && alcoholAllowed ? (
            game.chapter < 5 ? (
              <LockedCard icon="lock" title="Liquor permit" chapter={5} />
            ) : (
              <Button
                label={`Apply · ${money(LIQUOR_PERMIT_CENTS)}`}
                disabled={game.cashCents < LIQUOR_PERMIT_CENTS}
                onPress={() => run((d, w) => buyLiquorPermit(d, w), 'Liquor permit granted')}
              />
            )
          ) : null}
        </Section>

        {/* Research */}
        <Section title="Research">
          {RESEARCH.map((r: Research) => {
            const locked = game.chapter < r.unlockChapter;
            const families =
              r.id === 'id-check' ? familiesOpen.filter((f) => f === 'alcohol') : familiesOpen;
            const globalDone = !!r.global && hasResearch(game, r.id, 'snacks');
            return (
              <Paper key={r.id} tone="surface" style={{ gap: SPACE.xs }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <T weight="bold" accessibilityHint={r.description}>
                      {r.name}
                    </T>
                    <T size={13} muted numberOfLines={1}>
                      {r.description}
                    </T>
                  </View>
                  <Mono size={13} muted={locked}>
                    {money(r.costCents)}
                    {r.global ? '' : '/family'}
                  </Mono>
                </Row>
                {locked ? (
                  <StatChip
                    icon="lock"
                    label={`Unlocks in chapter ${r.unlockChapter}`}
                    value={`Ch. ${r.unlockChapter}`}
                  />
                ) : r.global ? (
                  globalDone ? (
                    <StatChip icon="star" label="Researched" value="Done" color={theme.signal} />
                  ) : (
                    <Button
                      kind="secondary"
                      label={`Research · ${money(r.costCents)}`}
                      disabled={game.cashCents < r.costCents}
                      onPress={() => run((d) => buyResearch(d, r.id), `Researched ${r.name}`)}
                    />
                  )
                ) : families.length === 0 ? (
                  <StatChip icon="grid" label="No machines of this kind yet" value="—" />
                ) : (
                  <Row gap={SPACE.s} style={{ flexWrap: 'wrap', marginTop: SPACE.xs }}>
                    {families.map((f) => (
                      <FamilyButton
                        key={f}
                        label={FAMILY_LABEL[f]}
                        color={theme.family[f]}
                        done={hasResearch(game, r.id, f)}
                        disabled={game.cashCents < r.costCents}
                        onPress={() =>
                          run((d) => buyResearch(d, r.id, f), `${r.name}: ${FAMILY_LABEL[f]}`)
                        }
                      />
                    ))}
                  </Row>
                )}
              </Paper>
            );
          })}
        </Section>

        {/* Market share */}
        <Section title="Market share">
          {game.rival.active ? (
            <Paper tone="surface" style={{ gap: SPACE.s }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T>You</T>
                <Mono>{pct(share)}</Mono>
              </Row>
              <ProgressBar value={share} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T muted>
                  {RIVAL.name} · {game.rival.machines.length} machines
                </T>
                <Mono muted>{pct(1 - share)}</Mono>
              </Row>
            </Paper>
          ) : (
            <LockedCard icon="people" title={RIVAL.name} chapter={RIVAL.arrivesChapter} />
          )}
        </Section>

        {/* Prestige */}
        <Section title="Prestige">
          <Paper tone="surface" style={{ gap: SPACE.xs }}>
            <Row style={{ flexWrap: 'wrap' }}>
              <StatChip icon="coin" label="Valuation" value={moneyShort(valuation)} />
              <StatChip
                icon="star"
                label="Reputation from a sale"
                value={`+${reputation}`}
                color={theme.brand}
              />
              <StatChip
                icon="star"
                label="Reputation banked"
                value={String(game.prestige.reputation)}
              />
              {game.prestige.sales > 0 ? (
                <StatChip
                  icon="handshake"
                  label="Companies sold"
                  value={String(game.prestige.sales)}
                />
              ) : null}
            </Row>
            <Spacer h={SPACE.s} />
            {canSellCompany(game) ? (
              <>
                <Button
                  kind={picking ? 'secondary' : 'danger'}
                  label={picking ? 'Keep the company' : 'Sell the company'}
                  busy={selling}
                  onPress={() => setPicking((p) => !p)}
                />
                {picking ? (
                  <View style={{ marginTop: SPACE.s }}>
                    {FALLBACK_CITIES.map((c) => (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Restart in ${c.name}`}
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
                          <T weight="medium">{c.name}</T>
                          <T size={13} muted>
                            {c.notes}
                          </T>
                        </Row>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <LockedCard icon="handshake" title="Sell the company" chapter={5} />
            )}
          </Paper>
          {PRESTIGE_PERKS.map((p) => {
            const level = game.prestige.perks[p.id] ?? 0;
            const maxed = level >= p.maxLevel;
            return (
              <Paper key={p.id} tone="surface" style={{ gap: SPACE.xs }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T weight="bold">{p.name}</T>
                  <Mono size={13}>
                    {level}/{p.maxLevel}
                  </Mono>
                </Row>
                <T size={13} muted numberOfLines={1}>
                  {p.description}
                </T>
                {maxed ? (
                  <StatChip icon="star" label="Maxed" value="Max" color={theme.signal} />
                ) : (
                  <Button
                    kind="secondary"
                    label={`Buy · ${p.costRep} Reputation`}
                    disabled={game.prestige.reputation < p.costRep}
                    onPress={() =>
                      run((d) => buyPrestigePerk(d, p.id), `${p.name} level ${level + 1}`)
                    }
                  />
                )}
              </Paper>
            );
          })}
        </Section>

        <Section title="More">
          <Row gap={SPACE.s} style={{ flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              label="Collections"
              onPress={() => router.push('/collections')}
            />
            <Button kind="secondary" label="Cities" onPress={() => router.push('/cities')} />
            <Button kind="secondary" label="Shop" onPress={() => router.push('/shop')} />
            <Button kind="secondary" label="Settings" onPress={() => router.push('/settings')} />
          </Row>
        </Section>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
