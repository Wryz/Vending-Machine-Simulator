import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MACHINE_SHEET } from '@/config/map';
import { useT } from '@/i18n';

import { Toast } from '../kit';
import { MachinePanel, type ToastTone } from '../machine/MachinePanel';
import { sfx } from '../sfx';
import { SPACE } from '../theme';
import { GameSheet, SheetScroll, type GameSheetHandle } from './GameSheet';

/**
 * A machine's controls as a sheet over the map (SPEC §8): tapping a machine
 * flies the map to it and opens this at once, so the street (and the people
 * buying) stay in view above. The 3D close-up is one tap away.
 */
export const MachineSheet = forwardRef<
  GameSheetHandle,
  {
    machineId: string | null;
    bottomInset: number;
    onDismiss: () => void;
    /** The sheet moved between its detents (the map keeps the machine above it). */
    onSnap?: (index: number) => void;
  }
>(function MachineSheet({ machineId, bottomInset, onDismiss, onSnap }, ref) {
  const t = useT();
  const sheet = useRef<GameSheetHandle>(null);
  useImperativeHandle(
    ref,
    () => ({ open: () => sheet.current?.open(), close: () => sheet.current?.close() }),
    [],
  );
  const [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const show = (text: string, tone: ToastTone) => {
    setToast({ text, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  const close = () => {
    sfx('pop');
    sheet.current?.close();
  };

  return (
    <GameSheet
      ref={sheet}
      openShare={MACHINE_SHEET.snapPoints[0]}
      closeLabel={t('machineSheet.a11y.close')}
      onDismiss={() => {
        setToast(null);
        onDismiss();
      }}
      onSnap={onSnap}
    >
      {machineId ? (
        <>
          <SheetScroll
            contentContainerStyle={{
              paddingHorizontal: SPACE.l,
              paddingTop: SPACE.xs,
              paddingBottom: bottomInset + SPACE.xxl,
            }}
          >
            <MachinePanel
              // A different machine starts with a fresh restock plan.
              key={machineId}
              machineId={machineId}
              onToast={show}
              onGone={close}
            />
          </SheetScroll>
          {toast ? (
            <View pointerEvents="none" style={styles.toast}>
              <Toast text={toast.text} tone={toast.tone} />
            </View>
          ) : null}
        </>
      ) : null}
    </GameSheet>
  );
});

const styles = StyleSheet.create({
  toast: { position: 'absolute', top: SPACE.s, left: SPACE.l, right: SPACE.l, zIndex: 3 },
});
