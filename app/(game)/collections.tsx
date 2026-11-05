import { FAMILY_LABEL } from '@/config/machines';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ADS } from '@/config/economy';
import { COLLECTION_PULL, COLLECTIONS, RARITY_ODDS, type Rarity } from '@/config/progression';
import { adsAvailable, showRewarded } from '@/services/ads';
import { haptic } from '@/services/haptics';
import { sound } from '@/services/audio';
import { applyAdReward, buyPull, isSeriesComplete, localTime } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { money, pct } from '@/ui/format';
import { Button, Chip, Mono, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE } from '@/ui/theme';

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  ultra: 'Ultra',
};

function useRarityColor(): Record<Rarity, string> {
  const theme = useTheme();
  return {
    common: '#6B6F75',
    uncommon: theme.signal,
    rare: theme.family.drinks,
    ultra: theme.amber,
  };
}

function findItem(itemId: string) {
  for (const s of COLLECTIONS) {
    const item = s.items.find((i) => i.id === itemId);
    if (item) return { series: s, item };
  }
  return null;
}

/** The capsule you just opened: a calm fade and settle, no bounce. */
function Reveal({ itemId, isNew }: { itemId: string; isNew: boolean }) {
  const theme = useTheme();
  const colors = useRarityColor();
  const o = useSharedValue(0);
  const s = useSharedValue(0.9);
  useEffect(() => {
    o.value = withTiming(1, { duration: 320 });
    s.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [o, s]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  const found = findItem(itemId);
  if (!found) return null;
  const { item, series } = found;
  return (
    <Animated.View
      style={style}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={`You got ${item.name}, ${RARITY_LABEL[item.rarity]}${isNew ? ', new' : ''}`}
    >
      <Paper
        style={{
          alignItems: 'center',
          gap: SPACE.xs,
          borderTopWidth: 4,
          borderTopColor: colors[item.rarity],
        }}
      >
        <Mono size={11} color="#6B6F75">
          {series.name.toUpperCase()}
        </Mono>
        <T size={20} weight="bold" color={theme.paperInk} center>
          {item.name}
        </T>
        <T size={13} weight="medium" color={colors[item.rarity]}>
          {RARITY_LABEL[item.rarity]}
          {isNew ? ' · New' : ' · Duplicate'}
        </T>
      </Paper>
    </Animated.View>
  );
}

/** Collection binder (SPEC §4.7, §8): series pages, rarity, completion perks, disclosed odds. */
export default function Collections() {
  const theme = useTheme();
  const colors = useRarityColor();
  const game = useGame((s) => s.game);
  const world = useGame((s) => s.world);
  const removeAds = useProfile((s) => s.entitlements.removeAds);
  const { flash, show } = useFlash();
  const [seriesId, setSeriesId] = useState(COLLECTIONS[0].id);
  const [reveal, setReveal] = useState<{ key: number; itemId: string; isNew: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  if (!game || !world) {
    return (
      <Screen title="Collections">
        <T muted>No business is open.</T>
      </Screen>
    );
  }

  const series = COLLECTIONS.find((s) => s.id === seriesId) ?? COLLECTIONS[0];
  const owned = series.items.filter((i) => (game.collection[i.id] ?? 0) > 0).length;
  const complete = isSeriesComplete(game, series.id);
  const unlocked = game.chapter >= 3 || !!game.chapterDoneAt[2];
  const today = localTime(game.now, world.city.timeZone, world.city.countryCode).dateKey;
  const usedToday = game.freePulls.dateKey === today ? game.freePulls.count : 0;
  const freeLeft = Math.max(0, ADS.freeCapsulePullsPerDay - usedToday);
  const showAds = !removeAds && adsAvailable();

  const revealed = (itemId: string, wasNew: boolean) => {
    haptic.success();
    sound.play('vend');
    setReveal((r) => ({ key: (r?.key ?? 0) + 1, itemId, isNew: wasNew }));
  };

  const pull = () => {
    const before = { ...game.collection };
    const r = useGame.getState().act((d) => buyPull(d, series.id));
    if (r.ok) revealed(r.itemId, !(before[r.itemId] > 0));
    else {
      haptic.error();
      show(r.error, 'error');
    }
  };

  const freePull = async () => {
    setBusy(true);
    const earned = await showRewarded('free-pull');
    setBusy(false);
    if (!earned) {
      show('No reward this time.', 'info');
      return;
    }
    const before = { ...(useGame.getState().game?.collection ?? {}) };
    const r = useGame
      .getState()
      .act((d, w) => applyAdReward(d, w, 'free-pull', { seriesId: series.id }));
    if (r.ok && r.itemId) revealed(r.itemId, !(before[r.itemId] > 0));
    else if (!r.ok) show(r.error, 'error');
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title="Collections"
        subtitle={`${Object.keys(game.collection).length} items collected`}
      >
        <Row gap={SPACE.s} style={{ flexWrap: 'wrap' }}>
          {COLLECTIONS.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              active={s.id === series.id}
              onPress={() => setSeriesId(s.id)}
            />
          ))}
        </Row>

        <Paper>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={18} weight="bold" color={theme.paperInk} accessibilityRole="header">
              {series.name}
            </T>
            <Mono color={theme.paperInk}>
              {owned}/{series.items.length}
            </Mono>
          </Row>
          <T size={13} color={complete ? theme.signal : '#5C6066'}>
            {complete
              ? `Complete. +${pct(series.perkSalesBonus)} sales for ${FAMILY_LABEL[series.perkFamily]} machines.`
              : `Complete the set for +${pct(series.perkSalesBonus)} sales on ${FAMILY_LABEL[series.perkFamily]} machines.`}
          </T>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, marginTop: SPACE.m }}
          >
            {series.items.map((item, i) => {
              const count = game.collection[item.id] ?? 0;
              const have = count > 0;
              return (
                <View
                  key={item.id}
                  accessible
                  accessibilityLabel={
                    have
                      ? `${item.name}, ${RARITY_LABEL[item.rarity]}, ${count} owned`
                      : `Number ${i + 1}, not found yet`
                  }
                  style={{
                    width: '31%',
                    flexGrow: 1,
                    minHeight: 84,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: have ? colors[item.rarity] : '#D8D5CD',
                    borderStyle: have ? 'solid' : 'dashed',
                    backgroundColor: have ? '#FFFFFF' : 'transparent',
                    padding: SPACE.s,
                    justifyContent: 'space-between',
                  }}
                >
                  <Mono size={11} color="#9A9DA1">
                    #{i + 1}
                  </Mono>
                  {have ? (
                    <>
                      <T size={13} weight="bold" color={theme.paperInk}>
                        {item.name}
                      </T>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <T size={11} color={colors[item.rarity]}>
                          {RARITY_LABEL[item.rarity]}
                        </T>
                        {count > 1 ? (
                          <Mono size={11} color="#6B6F75">
                            ×{count}
                          </Mono>
                        ) : null}
                      </Row>
                    </>
                  ) : (
                    <T size={22} color="#9A9DA1" center>
                      ?
                    </T>
                  )}
                </View>
              );
            })}
          </View>
        </Paper>

        {reveal ? <Reveal key={reveal.key} itemId={reveal.itemId} isNew={reveal.isNew} /> : null}

        <Section title="Pulls">
          {unlocked ? (
            <Button
              label={`Buy a pull · ${money(COLLECTION_PULL.pullCostCents)}`}
              disabled={game.cashCents < COLLECTION_PULL.pullCostCents}
              onPress={pull}
            />
          ) : (
            <T size={13} muted>
              Buying pulls unlocks in chapter 3 (LLC). Capsule machines can still drop a free pull
              when you collect their cash.
            </T>
          )}
          {showAds ? (
            <Button
              kind="secondary"
              label={
                freeLeft > 0
                  ? `Free pull · watch an ad (${freeLeft} left today)`
                  : 'No free pulls left today'
              }
              disabled={freeLeft <= 0}
              busy={busy}
              accessibilityHint="Optional. Plays a short ad, then opens one capsule."
              onPress={freePull}
            />
          ) : null}
          <T size={13} muted>
            Capsule machines also drop a free pull {pct(COLLECTION_PULL.freePullOnCollect)} of the
            time when you collect their cash.
          </T>
        </Section>

        <Section title="Odds">
          <Paper tone="surface" style={{ gap: SPACE.xs }}>
            {(Object.entries(RARITY_ODDS) as [Rarity, number][]).map(([rarity, p]) => (
              <Row key={rarity} style={{ justifyContent: 'space-between', minHeight: 26 }}>
                <Row gap={SPACE.s}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors[rarity],
                    }}
                  />
                  <T size={14}>{RARITY_LABEL[rarity]}</T>
                </Row>
                <Mono size={14}>{pct(p, 1)}</Mono>
              </Row>
            ))}
            <T size={13} muted style={{ marginTop: SPACE.xs }}>
              Each pull picks a rarity with these odds, then an item of that rarity at random. Pulls
              use in-game money only.
            </T>
          </Paper>
        </Section>
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
