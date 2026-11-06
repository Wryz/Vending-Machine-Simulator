import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ADS, PURCHASES } from '@/config/economy';
import { t as gt, useT } from '@/i18n';
import { simError } from '@/i18n/sim';
import { adsAvailable, showRewarded } from '@/services/ads';
import { haptic } from '@/services/haptics';
import { PRODUCTS, buy, restore, storeAvailable, type ProductKey } from '@/services/purchases';
import { applyAdReward, applyStarterPack } from '@/sim';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { duration, moneyWhole } from '@/ui/format';
import { Button, Mono, Paper, Row, Screen, Section, T } from '@/ui/kit';
import { Led, SKIN } from '@/ui/skin';
import { FlashToast, useFlash } from '@/ui/objects/Flash';
import { SPACE } from '@/ui/theme';

/** Our own product copy, translated; the price stays as the store delivers it. */
function productTitle(key: ProductKey): string {
  return gt.or(`shop.products.${key}.title`, PRODUCTS[key].title);
}
function productDetail(key: ProductKey): string {
  return gt.or(`shop.products.${key}.detail`, PRODUCTS[key].detail, {
    amount: moneyWhole(PURCHASES.starterPackCashCents),
  });
}

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
  const t = useT();
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
          {t('shop.owned')}
        </T>
      ) : (
        <Button
          style={{ marginTop: SPACE.s }}
          kind="secondary"
          label={t('shop.buy', { price })}
          disabled={disabled}
          busy={busy}
          onPress={onBuy}
        />
      )}
    </Paper>
  );
}

/** Double Profits: the headline offer. A big LED ×2, the promise in one line, the price. */
function DoubleProfitsOffer({
  owned,
  disabled,
  busy,
  onBuy,
}: {
  owned: boolean;
  disabled: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const price = PRODUCTS.doubleProfits.price;
  return (
    <Paper tone="surface" style={{ gap: SPACE.s }}>
      <Row style={{ alignItems: 'center', gap: SPACE.m }}>
        <Led color={SKIN.ledAmber} size={34}>
          ×2
        </Led>
        <View style={{ flex: 1, gap: 2 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T weight="bold" size={17} style={{ flex: 1 }}>
              {productTitle('doubleProfits')}
            </T>
            <Mono>{price}</Mono>
          </Row>
          <T size={14}>{productDetail('doubleProfits')}</T>
        </View>
      </Row>
      <T size={12} muted>
        {t('shop.doubleProfitsNote')}
      </T>
      {owned ? (
        <T size={13} color={theme.signal}>
          {t('shop.owned')}
        </T>
      ) : (
        <Button label={t('shop.buy', { price })} disabled={disabled} busy={busy} onPress={onBuy} />
      )}
    </Paper>
  );
}

/** Shop (SPEC §9): fair by design. One-time purchases and opt-in rewards; nothing shows on its own. */
export default function Shop() {
  const theme = useTheme();
  const t = useT();
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
        show(t('shop.starterAdded'), 'success');
      } else {
        show(t('shop.starterPending'), 'info');
      }
      return;
    }
    show(t('shop.yours', { title: productTitle(key) }), 'success');
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
      res.ok ? t('shop.restored') : (res.error ?? t('shop.restoreFailed')),
      res.ok ? 'success' : 'error',
    );
  };

  const doubleEarnings = async () => {
    setBusy('ad');
    const earned = await showRewarded('double-earnings');
    setBusy(null);
    if (!earned) {
      show(t('shop.noReward'), 'info');
      return;
    }
    const r = useGame.getState().act((d, w) => applyAdReward(d, w, 'double-earnings'));
    if (r.ok) {
      haptic.success();
      show(t('shop.doubled', { n: ADS.doubleEarningsMinutes }), 'success');
    } else show(simError(r.error), 'error');
  };

  const boostLeft = game ? game.boosts.doubleEarningsUntil - game.now : 0;
  const showAds = !entitlements.removeAds && adsAvailable();

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('shop.title')} subtitle={t('shop.subtitle')}>
        {!store ? (
          <Paper tone="surface">
            <T>{t('shop.noStore')}</T>
            <T size={13} muted>
              {t('shop.noStoreBody')}
            </T>
          </Paper>
        ) : null}

        <Section title={t('shop.section.purchases')}>
          <DoubleProfitsOffer
            owned={entitlements.doubleProfits}
            disabled={!store || busy !== null}
            busy={busy === 'doubleProfits'}
            onBuy={() => purchase('doubleProfits')}
          />
          <Offer
            title={productTitle('removeAds')}
            detail={productDetail('removeAds')}
            price={PRODUCTS.removeAds.price}
            owned={entitlements.removeAds}
            disabled={!store || busy !== null}
            busy={busy === 'removeAds'}
            onBuy={() => purchase('removeAds')}
          />
          {starterEligible ? (
            <Offer
              title={productTitle('starterPack')}
              detail={productDetail('starterPack')}
              price={PRODUCTS.starterPack.price}
              owned={false}
              disabled={!store || busy !== null || !game}
              busy={busy === 'starterPack'}
              onBuy={() => purchase('starterPack')}
            />
          ) : null}
        </Section>

        {showAds && game ? (
          <Section title={t('shop.section.rewards')}>
            <Paper tone="surface" style={{ gap: SPACE.xs }}>
              <T weight="bold">{t('shop.doubleTitle', { n: ADS.doubleEarningsMinutes })}</T>
              <T size={13} muted>
                {t('shop.doubleNote')}
              </T>
              {boostLeft > 0 ? (
                <T size={13} color={theme.signal}>
                  {t('shop.active', { time: duration(boostLeft) })}
                </T>
              ) : null}
              <Button
                style={{ marginTop: SPACE.s }}
                kind="secondary"
                label={
                  boostLeft > 0
                    ? t('shop.addMinutes', { n: ADS.doubleEarningsMinutes })
                    : t('shop.watchAd')
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
            label={t('shop.restore')}
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
