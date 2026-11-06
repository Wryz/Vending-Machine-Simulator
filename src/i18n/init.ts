import { useProfile } from '@/store/profile';

import { deviceLanguage } from './detect';
import { applyLanguage } from './index';

/**
 * App startup: detect the phone language once and follow the profile's saved
 * choice from then on. Returns an unsubscribe function.
 */
export function bindLanguageToProfile(): () => void {
  const device = deviceLanguage();
  applyLanguage(device, useProfile.getState().language);
  return useProfile.subscribe((s, prev) => {
    if (s.language !== prev.language) applyLanguage(device, s.language);
  });
}
