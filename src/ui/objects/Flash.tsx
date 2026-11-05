import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '../kit';
import { SPACE } from '../theme';

export type FlashTone = 'info' | 'error' | 'success';
export interface Flash {
  id: number;
  text: string;
  tone: FlashTone;
}

/** A short-lived message ("Researched Telemetry", "Not enough cash."). */
export function useFlash(ms = 2600) {
  const [flash, setFlash] = useState<Flash | null>(null);
  const show = useCallback((text: string, tone: FlashTone = 'info') => {
    setFlash((f) => ({ id: (f?.id ?? 0) + 1, text, tone }));
  }, []);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), ms);
    return () => clearTimeout(t);
  }, [flash, ms]);
  return { flash, show };
}

/** Floats a toast above the bottom edge. Render as the last child of a flex:1 container. */
export function FlashToast({ flash }: { flash: Flash | null }) {
  const insets = useSafeAreaInsets();
  if (!flash) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: SPACE.l,
        right: SPACE.l,
        bottom: insets.bottom + SPACE.l,
      }}
    >
      <Toast key={flash.id} text={flash.text} tone={flash.tone} />
    </View>
  );
}
