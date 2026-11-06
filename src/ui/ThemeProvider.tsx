import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useProfile } from '@/store/profile';

import { DARK, LIGHT, type Theme } from './theme';

const ThemeContext = createContext<Theme>(LIGHT);

/**
 * The UI is bright at all hours (SPEC §3.7); night shows on the map and in the
 * 3D lighting, not in the menus. Players who pick "System" get the dark UI
 * when their phone is in dark mode.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useProfile((s) => s.settings.theme);
  const scheme = useColorScheme();
  const dark = mode === 'system' && scheme === 'dark';
  return <ThemeContext.Provider value={dark ? DARK : LIGHT}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
