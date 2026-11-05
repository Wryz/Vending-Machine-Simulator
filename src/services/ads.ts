import { Platform } from 'react-native';
import MobileAds, {
  AdEventType,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { ENV } from '@/data/env';
import { useProfile } from '@/store/profile';

import { track } from './analytics';

/**
 * Rewarded ads only (SPEC §9): never interstitials, never on launch, never
 * mid-interaction. Ads are requested non-personalized unless the player opts
 * in under Settings (which triggers App Tracking Transparency). Audience is
 * adult; content rating MA (SPEC §11).
 */
let initialized = false;

function unitId(): string | null {
  const id = Platform.OS === 'ios' ? ENV.admobRewardedIos : ENV.admobRewardedAndroid;
  if (id) return id;
  return __DEV__ ? TestIds.REWARDED : null;
}

export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    await MobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.MA,
      tagForUnderAgeOfConsent: false,
    });
    await MobileAds().initialize();
  } catch {
    // Ads are optional.
  }
}

export function adsAvailable(): boolean {
  return unitId() !== null;
}

/**
 * Show one rewarded ad. Resolves true only if the reward was earned.
 * The caller grants the reward via the sim (`applyAdReward`).
 */
export function showRewarded(placement: string): Promise<boolean> {
  const id = unitId();
  if (!id) return Promise.resolve(false);
  const personalized = useProfile.getState().settings.personalizedAds;
  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const ad = RewardedAd.createForAdRequest(id, { requestNonPersonalizedAdsOnly: !personalized });
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      unsubs.forEach((u) => u());
      track(ok ? 'ad_reward_earned' : 'ad_reward_skipped', { placement });
      resolve(ok);
    };
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        ad.show().catch(() => done(false));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => done(earned)),
      ad.addAdEventListener(AdEventType.ERROR, () => done(false)),
    ];
    setTimeout(() => done(earned), 45_000);
    ad.load();
  });
}
