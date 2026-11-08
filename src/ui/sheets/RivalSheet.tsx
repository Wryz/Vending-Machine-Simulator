import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { COMPETITION, RIVAL } from '@/config/economy';
import { SHEET_OPEN_SHARE } from '@/config/map';
import { useT } from '@/i18n';
import { simError, venueName } from '@/i18n/sim';
import { rivalMatchup, undercutRival, type RivalNewsKind } from '@/sim';
import { useGame } from '@/store/game';
import { tauntFor } from '@/store/rivalMoments';

import { money } from '../format';
import { Icon } from '../icons';
import { T, Toast } from '../kit';
import { BRIGHTVEND, RivalPortrait } from '../RivalPortrait';
import { sfx } from '../sfx';
import { Glass, Key, keyInk, Led, Marquee, useSkin } from '../skin';
import { useTheme } from '../ThemeProvider';
import { RADIUS, SPACE } from '../theme';
import { GameSheet, SheetScroll, type GameSheetHandle } from './GameSheet';

/**
 * A rival machine, tapped on the map (SPEC §4.6): Rex Brightley's portrait
 * and a taunt, its price against yours at your nearest machine, and one clear
 * counter-move ("Undercut"), plus "Find a better spot" (busy-streets overlay).
 * A violet Brightvend cabinet, so it never reads as one of yours.
 */
export const RivalSheet = forwardRef<
  GameSheetHandle,
  {
    rivalId: string | null;
    bottomInset: number;
    onDismiss: () => void;
    /** "Find a better spot": show busy streets on the map. */
    onBetterSpot: () => void;
  }
>(function RivalSheet({ rivalId, bottomInset, onDismiss, onBetterSpot }, ref) {
  const t = useT();
  const skin = useSkin();
  const dark = useTheme().dark;
  const game = useGame((s) => s.game);
  const sheet = useRef<GameSheetHandle>(null);
  useImperativeHandle(
    ref,
    () => ({ open: () => sheet.current?.open(), close: () => sheet.current?.close() }),
    [],
  );
  const close = () => {
    sfx('pop');
    sheet.current?.close();
  };
  const match = useMemo(
    () => (game && rivalId ? rivalMatchup(game, rivalId) : null),
    [game, rivalId],
  );
  // One taunt per opening (not one per tick).
  const taunt = useMemo<string>(() => {
    if (!rivalId) return '';
    const lead = game?.rival.lead ?? null;
    if (lead) return tauntFor(lead === 'rival' ? 'behind' : 'passed');
    const pool: RivalNewsKind[] = ['placed', 'arrives'];
    return tauntFor(pool[Math.floor(Math.random() * pool.length)]);
    // A new taunt only for a different machine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalId]);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const show = (text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  };
  const priceLocked = !!game && game.chapter < 2 && !game.chapterDoneAt[1];
  const canUndercut = !!match && match.nearbyIds.length > 0 && !priceLocked;
  const undercut = () => {
    if (!rivalId) return;
    const r = useGame.getState().act((d) => undercutRival(d, rivalId));
    if (!r.ok) return show(simError(r.error));
    if (r.slots > 0) {
      sfx('success');
      show(t('rival.sheet.undercutDone', { n: r.slots }));
    } else show(t('rival.sheet.undercutNone'));
  };

  return (
    <GameSheet
      ref={sheet}
      openShare={SHEET_OPEN_SHARE.rival}
      closeLabel={t('rival.sheet.a11y.close')}
      cabinet={
        dark
          ? // After dark: the same violet, deepened like the house cabinet.
            { color: '#4E3BB0', light: '#5D49C2', dark: '#36287F' }
          : { color: BRIGHTVEND.violet, light: '#9A86FF', dark: BRIGHTVEND.violetDark }
      }
      onDismiss={() => {
        setToast(null);
        onDismiss();
      }}
    >
      {match ? (
        <>
          <SheetScroll
            contentContainerStyle={{
              paddingHorizontal: SPACE.l,
              paddingTop: SPACE.xs,
              paddingBottom: bottomInset + SPACE.xxl,
              gap: SPACE.m,
            }}
          >
            <Marquee
              title={t('rival.sheet.title', { rival: RIVAL.name })}
              subtitle={t('rival.sheet.owner', { owner: RIVAL.owner })}
            />
            {/* The owner and his line. */}
            <View style={styles.faceRow}>
              <View
                accessible
                accessibilityLabel={t('rival.sheet.a11y.portrait', { owner: RIVAL.owner })}
                style={styles.portrait}
              >
                <RivalPortrait size={76} />
              </View>
              <View style={styles.bubble}>
                <View style={styles.bubbleTail} />
                <T size={15} weight="bold" color={BRIGHTVEND.ink}>
                  {`“${taunt}”`}
                </T>
              </View>
            </View>
            {/* Prices first: theirs vs yours. */}
            <Glass padding={SPACE.m}>
              <View style={styles.prices}>
                <View style={styles.priceCol}>
                  <T size={12} weight="bold" muted>
                    {t('rival.sheet.theirs')}
                  </T>
                  <Led color={skin.ledRed} size={22}>
                    {match.theirsCents !== null ? money(match.theirsCents) : '—'}
                  </Led>
                </View>
                <View style={[styles.divider, { backgroundColor: skin.iconSoft }]} />
                <View style={styles.priceCol}>
                  <T size={12} weight="bold" muted>
                    {t('rival.sheet.yours')}
                  </T>
                  <Led size={22}>{match.yoursCents !== null ? money(match.yoursCents) : '—'}</Led>
                </View>
              </View>
              <T size={13} muted center style={{ marginTop: SPACE.s }}>
                {match.nearest
                  ? t('rival.sheet.distance', {
                      m: match.nearest.distanceM,
                      venue: venueName(match.nearest.venueName),
                    })
                  : t('rival.sheet.noneNearby')}
              </T>
            </Glass>
            {/* The counter-moves. */}
            <View style={styles.keys}>
              <Key
                tone="brand"
                style={{ flex: 1 }}
                disabled={!canUndercut}
                accessibilityLabel={t('rival.sheet.a11y.undercut', { rival: RIVAL.name })}
                accessibilityHint={t('rival.sheet.undercutHint', {
                  m: COMPETITION.radiusM,
                  pct: Math.round(RIVAL.counterPriceRatio * 100),
                })}
                onPress={undercut}
              >
                <View style={styles.keyRow}>
                  <Icon name="tag" size={20} color={keyInk('brand', skin)} />
                  <T size={16} weight="bold" color={keyInk('brand', skin)}>
                    {t('rival.sheet.undercut')}
                  </T>
                </View>
              </Key>
              <Key
                style={{ flex: 1 }}
                accessibilityLabel={t('rival.sheet.a11y.betterSpot')}
                onPress={() => {
                  close();
                  onBetterSpot();
                }}
              >
                <View style={styles.keyRow}>
                  <Icon name="flame" size={20} color={keyInk('white', skin)} />
                  <T size={15} weight="bold" color={keyInk('white', skin)} numberOfLines={1}>
                    {t('rival.sheet.betterSpot')}
                  </T>
                </View>
              </Key>
            </View>
            <T size={12} color="#FFFFFF" center>
              {priceLocked
                ? t('rival.sheet.undercutLocked')
                : t('rival.sheet.undercutHint', {
                    m: COMPETITION.radiusM,
                    pct: Math.round(RIVAL.counterPriceRatio * 100),
                  })}
            </T>
          </SheetScroll>
          {toast ? (
            <View pointerEvents="none" style={styles.toast}>
              <Toast text={toast} />
            </View>
          ) : null}
        </>
      ) : null}
    </GameSheet>
  );
});

const styles = StyleSheet.create({
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.m },
  portrait: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.l,
    paddingHorizontal: SPACE.m,
    paddingVertical: SPACE.s + 2,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  prices: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  priceCol: { alignItems: 'center', gap: 4 },
  divider: { width: 2, height: 44, borderRadius: 1 },
  keys: { flexDirection: 'row', gap: SPACE.m },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  toast: { position: 'absolute', top: SPACE.s, left: SPACE.l, right: SPACE.l, zIndex: 3 },
});
