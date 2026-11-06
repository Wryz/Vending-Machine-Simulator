import { I18nManager, Platform, Settings } from 'react-native';

import { pickLanguage, type Lang } from './languages';

/**
 * The phone's preferred languages, best first, without a native module:
 * - iOS: NSUserDefaults `AppleLanguages` (honours the per-app Language setting
 *   once the app declares its localizations), then `AppleLocale`.
 * - Android: I18nManager's locale identifier.
 * - Anywhere: Hermes `Intl`'s default locale.
 */
export function deviceLocales(): string[] {
  const out: string[] = [];
  const push = (x: unknown) => {
    if (typeof x === 'string' && x) out.push(x);
    else if (Array.isArray(x)) for (const y of x) push(y);
  };
  try {
    if (Platform.OS === 'ios') {
      push(Settings.get('AppleLanguages'));
      push(Settings.get('AppleLocale'));
    }
  } catch {
    // Settings unavailable (tests, web): fall through.
  }
  try {
    push(I18nManager.getConstants?.().localeIdentifier);
  } catch {
    // Not available on this platform.
  }
  try {
    push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // No Intl.
  }
  return out;
}

export function deviceLanguage(): Lang {
  return pickLanguage(deviceLocales());
}
