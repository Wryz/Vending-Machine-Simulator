import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useCityClock } from '@/hooks/useCityClock';
import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';

import { DARK, LIGHT, type Theme } from './theme';

const ThemeContext = createContext<Theme>(LIGHT);

/**
 * UI theme follows the current city's real local time (SPEC §3.7): night UI
 * after dark there, regardless of the phone's setting, unless the player
 * chose "system" in Settings.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const city = useGame((s) => s.city);
  const mode = useProfile((s) => s.settings.theme);
  const scheme = useColorScheme();
  const { tod } = useCityClock(city?.lat ?? 40.7128, city?.lng ?? -74.006);
  const dark =
    mode === 'system' || !city
      ? scheme === 'dark'
      : tod.weights.night + tod.weights.dusk * 0.5 > 0.5;
  return <ThemeContext.Provider value={dark ? DARK : LIGHT}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
