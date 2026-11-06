// Import single weights so only these five font files ship in the bundle.
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ENV } from '@/data/env';
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
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
  });
  const loaded = useProfile((s) => s.loaded);

  useEffect(() => {
    useProfile.getState().load();
    sound.init();
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
            <Navigator />
            <CelebrationHost />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
