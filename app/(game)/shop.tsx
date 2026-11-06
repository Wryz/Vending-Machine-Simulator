import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ADS } from '@/config/economy';
import { adsAvailable, showRewarded } from '@/services/ads';
import { haptic } from '@/services/haptics';
import { PRODUCTS, buy, restore, storeAvailable, type ProductKey } from '@/services/purchases';
import { applyAdReward, applyStarterPack } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { duration } from '@/ui/format';
import { Button, Mono, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE } from '@/ui/theme';

const COSMETICS = ['wrapNight', 'wrapLinen', 'lightingWarm'] as const;

function Offer({
  title,
  detail,
  price,
  owned,
  disabled,
  busy,
  onBuy,
}: {
  title: string;
  detail: string;
  price: string;
  owned: boolean;
  disabled: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const theme = useTheme();
  return (
    <Paper tone="surface" style={{ gap: SPACE.xs }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <T weight="bold" style={{ flex: 1 }}>
          {title}
        </T>
        <Mono>{price}</Mono>
      </Row>
      <T size={13} muted>
        {detail}
      </T>
      {owned ? (
        <T size={13} color={theme.signal}>
          Owned
        </T>
      ) : (
        <Button
          style={{ marginTop: SPACE.s }}
          kind="secondary"
          label={`Buy · ${price}`}
          disabled={disabled}
          busy={busy}
          onPress={onBuy}
        />
      )}
    </Paper>
  );
}

/** Shop (SPEC §9): fair by design. One-time purchases and opt-in rewards; nothing shows on its own. */
export default function Shop() {
  const theme = useTheme();
  const game = useGame((s) => s.game);
  const entitlements = useProfile((s) => s.entitlements);
  const { flash, show } = useFlash();
  const [busy, setBusy] = useState<ProductKey | 'restore' | 'ad' | null>(null);
  const store = storeAvailable();
  const starterEligible = !!game?.chapterDoneAt[1] && !entitlements.starterPackClaimed;

  useEffect(() => {
    if (starterEligible && !useProfile.getState().entitlements.starterPackOffered) {
      useProfile.getState().update((p) => {
        p.entitlements.starterPackOffered = true;
      });
    }
  }, [starterEligible]);

  const purchase = async (key: ProductKey) => {
    setBusy(key);
    const res = await buy(key);
    setBusy(null);
    if (!res.ok) {
      if (res.error) show(res.error, 'error');
      return;
    }
    haptic.success();
    if (key === 'starterPack') {
      const applied = useGame.getState().act((d) => applyStarterPack(d));
      if (applied.ok) {
        useProfile.getState().update((p) => {
          p.entitlements.starterPackClaimed = true;
        });
        show('Starter Pack added. Two snack machines are in storage.', 'success');
      } else {
        show('Purchase recorded. Open a city to receive the Starter Pack.', 'info');
      }
      return;
    }
    show(`${PRODUCTS[key].title} is yours.`, 'success');
  };

  const doRestore = async () => {
    setBusy('restore');
    const res = await restore();
    setBusy(null);
    // A restored Starter Pack is delivered to the open game (once per install).
    if (res.ok && useProfile.getState().entitlements.starterPackOwed) {
      const applied = useGame.getState().act((d) => applyStarterPack(d));
      if (applied.ok)
        useProfile.getState().update((p) => {
          p.entitlements.starterPackClaimed = true;
          p.entitlements.starterPackOwed = false;
        });
    }
    show(
      res.ok ? 'Purchases restored.' : (res.error ?? 'Could not restore purchases.'),
      res.ok ? 'success' : 'error',
    );
  };

  const doubleEarnings = async () => {
    setBusy('ad');
    const earned = await showRewarded('double-earnings');
    setBusy(null);
    if (!earned) {
      show('No reward this time.', 'info');
      return;
    }
    const r = useGame.getState().act((d, w) => applyAdReward(d, w, 'double-earnings'));
    if (r.ok) {
      haptic.success();
      show(`Earnings doubled for ${ADS.doubleEarningsMinutes} minutes.`, 'success');
    } else show(r.error, 'error');
  };

  const boostLeft = game ? game.boosts.doubleEarningsUntil - game.now : 0;
  const showAds = !entitlements.removeAds && adsAvailable();

  return (
    <View style={{ flex: 1 }}>
      <Screen title="Shop" subtitle="One-time purchases. No subscriptions.">
        {!store ? (
          <Paper tone="surface">
            <T>The store isn&apos;t available in this build.</T>
            <T size={13} muted>
              Everything in the game can be earned by playing.
            </T>
          </Paper>
        ) : null}

        <Section title="Purchases">
          <Offer
            title={PRODUCTS.removeAds.title}
            detail={PRODUCTS.removeAds.detail}
            price={PRODUCTS.removeAds.price}
            owned={entitlements.removeAds}
            disabled={!store || busy !== null}
            busy={busy === 'removeAds'}
            onBuy={() => purchase('removeAds')}
          />
          {starterEligible ? (
            <Offer
              title={PRODUCTS.starterPack.title}
              detail={PRODUCTS.starterPack.detail}
              price={PRODUCTS.starterPack.price}
              owned={false}
              disabled={!store || busy !== null || !game}
              busy={busy === 'starterPack'}
              onBuy={() => purchase('starterPack')}
            />
          ) : null}
        </Section>

        <Section title="Looks">
          {COSMETICS.map((key) => (
            <Offer
              key={key}
              title={PRODUCTS[key].title}
              detail={PRODUCTS[key].detail}
              price={PRODUCTS[key].price}
              owned={entitlements.wraps.includes(key)}
              disabled={!store || busy !== null}
              busy={busy === key}
              onBuy={() => purchase(key)}
            />
          ))}
          <T size={13} muted>
            Apply wraps and lighting from a machine&apos;s close-up. Cosmetic only.
          </T>
        </Section>

        {showAds && game ? (
          <Section title="Free rewards">
            <Paper tone="surface" style={{ gap: SPACE.xs }}>
              <T weight="bold">Double earnings for {ADS.doubleEarningsMinutes} minutes</T>
              <T size={13} muted>
                Optional. A short ad plays only when you tap.
              </T>
              {boostLeft > 0 ? (
                <T size={13} color={theme.signal}>
                  Active · {duration(boostLeft)} left
                </T>
              ) : null}
              <Button
                style={{ marginTop: SPACE.s }}
                kind="secondary"
                label={
                  boostLeft > 0
                    ? `Add ${ADS.doubleEarningsMinutes} minutes · watch an ad`
                    : 'Watch an ad'
                }
                busy={busy === 'ad'}
                disabled={busy !== null}
                onPress={doubleEarnings}
              />
            </Paper>
          </Section>
        ) : null}

        {store ? (
          <Button
            kind="quiet"
            label="Restore purchases"
            busy={busy === 'restore'}
            disabled={busy !== null}
            onPress={doRestore}
          />
        ) : null}
      </Screen>
      <FlashToast flash={flash} />
    </View>
  );
}
