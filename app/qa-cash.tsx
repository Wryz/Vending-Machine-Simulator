import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENCIES } from '@/config/currency';
import { useCurrency } from '@/store/currency';
import { T } from '@/ui/kit';
import { CoinTray } from '@/ui/objects/CoinTray';
import { SPACE } from '@/ui/theme';

/**
 * Dev builds only: the cash box tray in a few currencies, for checking the
 * notes-and-coins picture, e.g. `EXPO_PUBLIC_QA_ROUTE='/qa-cash?c=JPY'` (one currency per visit).
 */
export default function QaCash() {
  const insets = useSafeAreaInsets();
  const { c = 'USD' } = useLocalSearchParams<{ c?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const code = (c in CURRENCIES ? c : 'USD') as keyof typeof CURRENCIES;
  // One currency per visit: the tray reads the app-wide currency.
  const rows: [keyof typeof CURRENCIES, number, number][] = [
    [code, 3741, 900],
    [code, 18_000, 5_400],
    [code, 1_250_000, 375_000],
  ];
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFF6EE' }}
      contentContainerStyle={{ padding: SPACE.l, paddingTop: insets.top + SPACE.l, gap: SPACE.l }}
    >
      {rows.map(([code, gross, commission]) => (
        <QaRow key={gross} code={code} gross={gross} commission={commission} />
      ))}
    </ScrollView>
  );
}

function QaRow({
  code,
  gross,
  commission,
}: {
  code: keyof typeof CURRENCIES;
  gross: number;
  commission: number;
}) {
  // Each row sets the currency before its tray renders (dev preview only).
  useCurrency.setState({ currency: CURRENCIES[code] });
  return (
    <View style={{ gap: SPACE.xs }}>
      <T weight="bold">{code}</T>
      <CoinTray grossCents={gross} commissionCents={commission} />
    </View>
  );
}
