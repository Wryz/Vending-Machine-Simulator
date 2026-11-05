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
import { money, pct } from '@/ui/format';
import {
  Button,
  Divider,
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
import { PermitCard } from '@/ui/objects/small';
import { SPACE, TOUCH } from '@/ui/theme';

const FAMILIES = Object.keys(FAMILY_LABEL) as MachineFamily[];

function chapterTitle(n: number): string {
  return CHAPTERS.find((c) => c.n === n)?.title ?? `Chapter ${n}`;
}

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
          value: `${money(Math.min(need, game.ledger.lifetimeSalesCents))} / ${money(need)}`,
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
            <T size={18} weight="bold">
              {chapter?.title ?? 'Prestige'}
            </T>
            <T muted>{chapter?.goal}</T>
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
            {game.chapter === 5 && !game.rival.active ? (
              <T size={13} muted>
                {RIVAL.name} hasn&apos;t arrived yet.
              </T>
            ) : null}
            {chapter && chapter.n < 6 ? (
              <T size={13} muted style={{ marginTop: SPACE.xs }}>
                Unlocks: {chapter.unlocks.join(', ')}
              </T>
            ) : null}
          </Paper>
          <View>
            {CHAPTERS.map((c) => {
              const done = !!game.chapterDoneAt[c.n];
              const current = c.n === game.chapter;
              return (
                <Row key={c.n} style={{ minHeight: 32 }} gap={SPACE.m}>
                  <Mono
                    size={13}
                    color={done ? theme.signal : current ? theme.ink : theme.muted}
                    style={{ width: 20 }}
                  >
                    {done ? '✓' : String(c.n)}
                  </Mono>
                  <T
                    size={14}
                    weight={current ? 'bold' : 'regular'}
                    color={done || current ? theme.ink : theme.muted}
                    accessibilityLabel={`Chapter ${c.n}, ${c.title}${done ? ', done' : current ? ', current' : ''}`}
                  >
                    {c.title}
                  </T>
                </Row>
              );
            })}
          </View>
        </Section>

        {/* Finances */}
        <Section title="Finances">
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Cash</T>
            <Mono weight="bold" size={16}>
              {money(game.cashCents)}
            </Mono>
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
          <Paper tone="surface">
            {(
              [
                ['Lifetime sales', money(game.ledger.lifetimeSalesCents)],
                ['Cash collected', money(game.ledger.lifetimeNetCents)],
                ['Lifetime costs', money(-game.ledger.lifetimeCostsCents)],
                ['Units sold', game.ledger.lifetimeUnits.toLocaleString('en-US')],
              ] as const
            ).map(([k, v]) => (
              <Row key={k} style={{ justifyContent: 'space-between', minHeight: 28 }}>
                <T size={14} muted>
                  {k}
                </T>
                <Mono size={14}>{v}</Mono>
              </Row>
            ))}
          </Paper>
        </Section>

        {/* Staff & warehouse */}
        <Section title="Staff and warehouse">
          <Paper tone="surface">
            <Row style={{ justifyContent: 'space-between' }}>
              <T weight="medium">
                {machines} machines placed{stored ? ` · ${stored} in storage` : ''}
              </T>
            </Row>
            <Row style={{ justifyContent: 'space-between', marginTop: SPACE.xs }}>
              <T size={14} muted>
                {game.drivers.length === 1 ? '1 driver' : `${game.drivers.length} drivers`}
              </T>
              <Mono size={14}>{money(-game.drivers.length * STAFF.driverWageCentsPerDay)}/day</Mono>
            </Row>
            <Button
              style={{ marginTop: SPACE.m }}
              kind="secondary"
              label="Route clipboard"
              onPress={() => router.push('/routes')}
            />
            <Divider />
            <T weight="bold">Warehouse</T>
            {game.warehouse ? (
              <T size={13} muted>
                Yours. {pct(STAFF.warehouseDiscount)} off wholesale, drivers carry{' '}
                {STAFF.warehouseDriverCapacity} items. Rent {money(STAFF.warehouseRentCentsPerDay)}{' '}
                a day.
              </T>
            ) : game.chapter < 3 ? (
              <T size={13} muted>
                Unlocks in chapter 3 ({chapterTitle(3)}).
              </T>
            ) : (
              <>
                <T size={13} muted>
                  {pct(STAFF.warehouseDiscount)} off wholesale and bigger driver loads. Rent{' '}
                  {money(STAFF.warehouseRentCentsPerDay)} a day.
                </T>
                <Button
                  style={{ marginTop: SPACE.s }}
                  label={`Buy warehouse · ${money(STAFF.warehouseBuyCents)}`}
                  disabled={game.cashCents < STAFF.warehouseBuyCents}
                  onPress={() => run((d) => buyWarehouse(d), 'Warehouse bought')}
                />
              </>
            )}
          </Paper>
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
              <T size={13} muted>
                Unlocks in chapter 5 ({chapterTitle(5)}).
              </T>
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
          <T size={13} muted>
            Upgrades apply to every machine of a family, now and later.
          </T>
          {RESEARCH.map((r: Research) => {
            const locked = game.chapter < r.unlockChapter;
            const families =
              r.id === 'id-check' ? familiesOpen.filter((f) => f === 'alcohol') : familiesOpen;
            const globalDone = !!r.global && hasResearch(game, r.id, 'snacks');
            return (
              <Paper key={r.id} tone="surface" style={{ gap: SPACE.xs }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <T weight="bold">{r.name}</T>
                    <T size={13} muted>
                      {r.description}
                    </T>
                  </View>
                  <Mono size={13} muted={locked}>
                    {money(r.costCents)}
                    {r.global ? '' : '/family'}
                  </Mono>
                </Row>
                {locked ? (
                  <T size={13} muted>
                    Unlocks in chapter {r.unlockChapter} ({chapterTitle(r.unlockChapter)}).
                  </T>
                ) : r.global ? (
                  globalDone ? (
                    <T size={13} color={theme.signal}>
                      Researched ✓
                    </T>
                  ) : (
                    <Button
                      kind="secondary"
                      label={`Research · ${money(r.costCents)}`}
                      disabled={game.cashCents < r.costCents}
                      onPress={() => run((d) => buyResearch(d, r.id), `Researched ${r.name}`)}
                    />
                  )
                ) : families.length === 0 ? (
                  <T size={13} muted>
                    No machines of this kind yet.
                  </T>
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
              <T size={13} muted>
                Rolling share of vending sales in the city. Good service, exclusive contracts and
                fair prices win it back.
              </T>
            </Paper>
          ) : (
            <T size={13} muted>
              {RIVAL.name} arrives in chapter {RIVAL.arrivesChapter} (
              {chapterTitle(RIVAL.arrivesChapter)}).
            </T>
          )}
        </Section>

        {/* Prestige */}
        <Section title="Prestige">
          <Paper tone="surface" style={{ gap: SPACE.xs }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T>Valuation</T>
              <Mono weight="bold">{money(valuation)}</Mono>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T>Reputation from a sale</T>
              <Mono>+{reputation}</Mono>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T>Reputation banked</T>
              <Mono>{game.prestige.reputation}</Mono>
            </Row>
            {game.prestige.sales > 0 ? (
              <T size={13} muted>
                Companies sold: {game.prestige.sales}
              </T>
            ) : null}
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
                    <T size={13} muted>
                      Pick where to start again.
                    </T>
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
              <T size={13} muted>
                Finish chapter 5 ({chapterTitle(5)}) to sell the company.
              </T>
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
                <T size={13} muted>
                  {p.description}
                </T>
                {maxed ? (
                  <T size={13} color={theme.signal}>
                    Maxed
                  </T>
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
