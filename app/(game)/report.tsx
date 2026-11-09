import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHAPTERS } from '@/config/progression';
import { t as gt, useT } from '@/i18n';
import { content } from '@/i18n/content';
import { simError, venueName } from '@/i18n/sim';
import { adsAvailable, showRewarded } from '@/services/ads';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import {
  activeMachines,
  applyAdReward,
  collectAll,
  type AdvanceReport,
  type GameState,
} from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { clock, duration, money } from '@/ui/format';
import { Button, Mono, Row, Spacer, T } from '@/ui/kit';
import { machineLabel } from '@/ui/machineStatus';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { Receipt, type ReceiptLine } from '@/ui/objects/Receipt';
import { SPACE } from '@/ui/theme';

interface StackEvents {
  addListener(event: 'beforeRemove', cb: () => void): () => void;
}

function venueNames(game: GameState | null, ids: string[]): string[] {
  const names = ids.map((id) => {
    const m = game?.machines.find((x) => x.id === id);
    return m ? `${venueName(m.venue.name)} (${machineLabel(m)})` : gt('report.soldMachine');
  });
  return [...new Set(names)];
}

/**
 * What the time away earned: sales minus the venues' cut (taken when the cash
 * box is collected, estimated per machine) minus running costs. Cash on hand
 * alone is misleading: sales wait in the cash boxes until collected.
 */
function earnings(
  report: AdvanceReport,
  game: GameState | null,
): { venueCutCents: number; profitCents: number } {
  let venueCutCents = 0;
  for (const [id, v] of Object.entries(report.perMachine)) {
    const m = game?.machines.find((x) => x.id === id);
    venueCutCents += Math.round(v.cents * (m?.contract.commission ?? 0));
  }
  return { venueCutCents, profitCents: report.salesCents - venueCutCents - report.costsCents };
}

function Issue({ title, items, color }: { title: string; items: string[]; color: string }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <View style={{ gap: 2, marginTop: SPACE.xs }}>
      <Mono size={13} weight="bold" color={color}>
        {title}
      </Mono>
      {items.slice(0, 6).map((n) => (
        <Mono key={n} size={12} color="#5C6066">
          · {n}
        </Mono>
      ))}
      {items.length > 6 ? (
        <Mono size={12} color="#5C6066">
          {t('report.more', { n: items.length - 6 })}
        </Mono>
      ) : null}
    </View>
  );
}

/** "While you were away…" (SPEC §3.6, §13): a thermal receipt of what happened offline. */
export default function Report() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  // Keep our own copy so the receipt stays put while the sheet closes, but follow
  // a newer report that lands while it is open (the shell never stacks a second sheet).
  const live = useGame((s) => s.offlineReport);
  const [report, setReport] = useState(live);
  if (live && live !== report) setReport(live);
  const game = useGame((s) => s.game);
  const world = useGame((s) => s.world);
  const removeAds = useProfile((s) => s.entitlements.removeAds);
  const { flash, show } = useFlash();
  const [doubled, setDoubled] = useState(false);
  const [busy, setBusy] = useState(false);
  // What the machines hold now, after commission: what Collect pays.
  const waitingCents = game
    ? activeMachines(game).reduce(
        (a, m) => a + m.cashBoxCents - Math.round(m.cashBoxCents * m.contract.commission),
        0,
      )
    : 0;

  // The report is read when the player closes the sheet (Done or a swipe). Not on
  // unmount: the navigator remounts once at launch when the language is applied, and
  // clearing the report then left an empty sheet behind.
  useEffect(
    () =>
      // expo-router's useNavigation() is typed without stack events; beforeRemove exists on stacks.
      (navigation as unknown as StackEvents).addListener('beforeRemove', () =>
        useGame.getState().dismissOfflineReport(),
      ),
    [navigation],
  );
  // Nothing to show (already read): close instead of showing an empty sheet.
  useEffect(() => {
    if (report) return;
    const id = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/map')), 0);
    return () => clearTimeout(id);
  }, [report]);

  useEffect(() => {
    if (report && earnings(report, useGame.getState().game).profitCents > 0) sound.play('coins');
  }, [report]);

  const done = () => {
    useGame.getState().dismissOfflineReport();
    if (router.canGoBack()) router.back();
    else router.replace('/map');
  };

  if (!report) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          padding: SPACE.l,
          paddingBottom: insets.bottom + SPACE.l,
          gap: SPACE.l,
        }}
      >
        <T>{t('report.nothing')}</T>
        <Button label={t('report.done')} onPress={done} />
      </View>
    );
  }

  const tz = world?.city.timeZone ?? 'UTC';
  const leftAt = report.fromAt - report.skippedMs;
  const away = report.toAt - leftAt;
  const { venueCutCents, profitCents } = earnings(report, game);
  const bonus = Math.max(0, profitCents);
  const canDouble = !removeAds && adsAvailable() && bonus > 0 && !doubled;

  const lines: ReceiptLine[] = [
    { label: t('report.line.sales'), value: money(report.salesCents) },
    { label: t('report.line.items'), value: report.units.toLocaleString(t.lang) },
  ];
  if (venueCutCents > 0)
    lines.push({ label: t('report.line.venueCut'), value: money(-venueCutCents), tone: 'bad' });
  lines.push({
    label: t('report.line.costs'),
    value: money(-report.costsCents),
    tone: report.costsCents > 0 ? 'bad' : 'muted',
  });
  if (report.driverRuns > 0)
    lines.push({
      label: t('report.line.driverRuns'),
      value: String(report.driverRuns),
      tone: 'muted',
    });
  if (report.breakdowns > 0)
    lines.push({
      label: t('report.line.breakdowns'),
      value: String(report.breakdowns),
      tone: 'bad',
    });
  if (report.thefts > 0)
    lines.push({ label: t('report.line.thefts'), value: String(report.thefts), tone: 'bad' });
  if (report.spoiledUnits > 0)
    lines.push({
      label: t('report.line.spoiled'),
      value: String(report.spoiledUnits),
      tone: 'bad',
    });

  const best = Object.entries(report.perMachine)
    .filter(([, v]) => v.cents > 0)
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 3)
    .map(([id, v]) => ({
      name: game?.machines.find((m) => m.id === id)?.venue.name ?? t('report.aMachine'),
      cents: v.cents,
    }));

  // Empty every machine's cash box from here (owner's call, 2026-11-08).
  const collect = () => {
    const r = useGame.getState().act((d) => collectAll(d));
    if (!r.ok) return show(simError(r.error), 'error');
    haptic.success();
    sound.play('coins');
    // Collecting ends the receipt: close it instead of showing it again without the button.
    done();
  };

  const doubleIt = async () => {
    setBusy(true);
    const earned = await showRewarded('double-offline');
    setBusy(false);
    if (!earned) {
      show(t('report.noReward'), 'info');
      return;
    }
    const r = useGame
      .getState()
      .act((d, w) => applyAdReward(d, w, 'double-offline', { offlineNetCents: bonus }));
    if (r.ok) {
      setDoubled(true);
      haptic.success();
      sound.play('coins');
      show(t('report.added', { amount: money(r.bonusCents ?? bonus) }), 'success');
    } else show(simError(r.error), 'error');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: SPACE.l,
          paddingBottom: insets.bottom + SPACE.xxl,
          gap: SPACE.l,
        }}
      >
        <T size={20} weight="bold" accessibilityRole="header">
          {t('report.title')}
        </T>
        <T size={16} muted>
          {t('report.awayFor', { time: duration(away) })}
        </T>
        {waitingCents > 0 ? (
          <View style={{ gap: SPACE.s }}>
            <T size={13} muted>
              {t('report.inMachines')}
            </T>
            <T size={32} weight="bold">
              {money(waitingCents)}
            </T>
            <Button
              label={t('report.collect', { amount: money(waitingCents) })}
              onPress={collect}
            />
          </View>
        ) : null}
        <Receipt
          title={world ? content.city(world.city.id, world.city.name) : 'Coinline'}
          subtitle={`${clock(leftAt, tz)} – ${clock(report.toAt, tz)} · ${duration(away)}`}
          lines={lines}
          total={{
            label: t('report.profit'),
            value: money(profitCents, { sign: true }),
            tone: profitCents >= 0 ? 'good' : 'bad',
          }}
          footer={
            report.skippedMs > 0
              ? t('report.footerCapped', { time: duration(report.skippedMs) })
              : t('report.footerThanks')
          }
        >
          {best.length > 0 ? (
            <View style={{ gap: 2, marginTop: SPACE.xs }}>
              <Mono size={13} weight="bold" color={theme.paperInk}>
                {t('report.bestSpots')}
              </Mono>
              {best.map((b) => (
                <Row key={b.name} style={{ justifyContent: 'space-between' }}>
                  <Mono size={12} color="#5C6066" style={{ flexShrink: 1 }}>
                    · {b.name}
                  </Mono>
                  <Mono size={12} color={theme.paperInk}>
                    {money(b.cents)}
                  </Mono>
                </Row>
              ))}
            </View>
          ) : null}
          <Issue
            title={t('report.issue.empty')}
            items={venueNames(game, report.becameEmpty)}
            color="#B5473A"
          />
          <Issue
            title={t('report.issue.cashFull')}
            items={venueNames(game, report.cashBoxFull)}
            color="#2E7D5B"
          />
          <Issue
            title={t('report.issue.contractsLost')}
            items={venueNames(game, report.contractsLost)}
            color="#B5473A"
          />
          <Issue
            title={t('report.issue.events')}
            items={[...new Set(report.events.map((e) => content.eventByName(e)))]}
            color={theme.paperInk}
          />
          <Issue
            title={t('report.issue.chapters')}
            items={report.chaptersCompleted.map((n) => {
              const title = CHAPTERS.find((c) => c.n === n)?.title ?? '';
              return t('report.chapterLine', { n, title: content.chapterTitle(n, title) });
            })}
            color="#2E7D5B"
          />
        </Receipt>

        {report.contractsLost.length > 0 ? (
          <T size={13} muted>
            {t('report.lostNote')}
          </T>
        ) : null}

        {canDouble ? (
          <Button
            kind="secondary"
            label={t('report.double', { amount: money(bonus) })}
            busy={busy}
            accessibilityHint={t('report.doubleHint')}
            onPress={doubleIt}
          />
        ) : null}
        <Button
          kind={waitingCents > 0 ? 'secondary' : undefined}
          label={t('report.done')}
          onPress={done}
        />
        <Spacer h={SPACE.s} />
      </ScrollView>
      <FlashToast flash={flash} />
    </View>
  );
}
