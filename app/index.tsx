import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useGame } from '@/store/game';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';

/** Entry: resume the last city (cold start straight to the map), or onboard. */
export default function Index() {
  const theme = useTheme();
  const { onboarded, lastCityKey, cities } = useProfile();
  const status = useGame((s) => s.status);
  const last = lastCityKey ? cities[lastCityKey] : null;

  useEffect(() => {
    // Resume once; a failed load lands on 'error' and goes to onboarding.
    if (onboarded && last && useGame.getState().status === 'idle')
      useGame.getState().openCity(last);
  }, [onboarded, last]);

  if (!onboarded || !last) return <Redirect href="/onboarding" />;
  if (status === 'ready') return <Redirect href="/map" />;
  if (status === 'error') return <Redirect href="/onboarding" />;
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}
    >
      <ActivityIndicator color={theme.ink} />
    </View>
  );
}
