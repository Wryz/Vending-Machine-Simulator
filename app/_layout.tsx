// Import single weights so only these font files ship in the bundle.
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ENV } from '@/data/env';
import { useLang } from '@/i18n';
import { bindLanguageToProfile } from '@/i18n/init';
import { initAds } from '@/services/ads';
import { sound } from '@/services/audio';
import { initPurchases } from '@/services/purchases';
import { useProfile } from '@/store/profile';
import { CelebrationHost } from '@/ui/CelebrationHost';
import { ThemeProvider, useTheme } from '@/ui/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Navigator() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(game)" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="credits" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="diagnostics" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const loaded = useProfile((s) => s.loaded);
  const lang = useLang();

  useEffect(() => {
    useProfile.getState().load();
    sound.init();
    return bindLanguageToProfile();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    initPurchases();
    // Ads SDK starts after launch and never shows anything on its own (SPEC §9).
    if (!useProfile.getState().entitlements.removeAds) initAds();
  }, [loaded]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError, loaded]);

  const ready = (fontsLoaded || fontError) && loaded;
  useEffect(() => {
    // Unattended QA (dev builds only): jump to a route once the app can navigate.
    if (!ready || !ENV.qaRoute) return;
    const t = setTimeout(() => router.push(ENV.qaRoute as never), 1500);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            {/* Re-keyed on the language so every string, memoized or not, re-renders.
                Navigation state lives in the container, so the current screen stays. */}
            <Navigator key={lang} />
            <CelebrationHost key={`c-${lang}`} />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
