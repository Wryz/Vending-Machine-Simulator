import { Platform } from 'react-native';
import MobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
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
/**
 * Google's consent tool (UMP): in the EEA, UK and Switzerland ads need the
 * player's answer first. Elsewhere, or until a message is published in the
 * AdMob console, it shows nothing and ads may be requested.
 */
let consentAllowsAds = true;

function unitId(): string | null {
  const id = Platform.OS === 'ios' ? ENV.admobRewardedIos : ENV.admobRewardedAndroid;
  if (id) return id;
  return __DEV__ ? TestIds.REWARDED : null;
}

export async function initAds(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const info = await AdsConsent.gatherConsent();
    consentAllowsAds = info.canRequestAds;
  } catch {
    // No consent message set up, or offline: keep the earlier answer.
    try {
      consentAllowsAds = (await AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      consentAllowsAds = true;
    }
  }
  if (!consentAllowsAds) return;
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

/** Players under the consent rules (EEA, UK, Switzerland) can change their answer in Settings. */
export async function privacyChoicesAvailable(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/** Google's privacy choices form; ads follow the new answer. */
export async function showPrivacyChoices(): Promise<void> {
  try {
    const info = await AdsConsent.showPrivacyOptionsForm();
    consentAllowsAds = info.canRequestAds;
  } catch {
    // Nothing to show (not required here, or offline).
  }
}

export function adsAvailable(): boolean {
  return consentAllowsAds && unitId() !== null;
}

/**
 * Show one rewarded ad. Resolves true only if the reward was earned.
 * The caller grants the reward via the sim (`applyAdReward`).
 */
export function showRewarded(placement: string): Promise<boolean> {
  const id = unitId();
  if (!id || !consentAllowsAds) return Promise.resolve(false);
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
        // Loaded in time: the ad now runs until the player closes it.
        clearTimeout(loadTimer);
        ad.show().catch(() => done(false));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => done(earned)),
      ad.addAdEventListener(AdEventType.ERROR, () => done(false)),
    ];
    // Only the load can time out; a long ad that is playing must still pay out.
    const loadTimer = setTimeout(() => done(false), 45_000);
    ad.load();
  });
}
