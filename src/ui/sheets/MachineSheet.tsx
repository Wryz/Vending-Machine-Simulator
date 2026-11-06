import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MACHINE_SHEET } from '@/config/map';

import { Icon } from '../icons';
import { Toast } from '../kit';
import { MachinePanel, type ToastTone } from '../machine/MachinePanel';
import { sfx } from '../sfx';
import { Cabinet, Key, SKIN } from '../skin';
import { RADIUS, SPACE, TOUCH } from '../theme';

/**
 * A machine's controls as a sheet over the map (SPEC §8): tapping a machine
 * flies the map to it and opens this at once, so the street (and the people
 * buying) stay in view above. The 3D close-up is one tap away.
 */
export const MachineSheet = forwardRef<
  BottomSheetModal,
  {
    machineId: string | null;
    bottomInset: number;
    onDismiss: () => void;
    /** Open the 3D close-up of this machine. */
    onOpen3d: (id: string) => void;
    /** The sheet moved between its detents (the map keeps the machine above it). */
    onSnap?: (index: number) => void;
  }
>(function MachineSheet({ machineId, bottomInset, onDismiss, onOpen3d, onSnap }, ref) {
  const snapPoints = useMemo(
    () => MACHINE_SHEET.snapPoints.map((p) => `${Math.round(p * 100)}%`),
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
    (ref as React.RefObject<BottomSheetModal | null>).current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={() => {
        setToast(null);
        onDismiss();
      }}
      onChange={(i) => onSnap?.(i)}
      backgroundComponent={({ style }) => (
        <Cabinet
          screws={false}
          style={[style, { borderTopLeftRadius: RADIUS.l + 4, borderTopRightRadius: RADIUS.l + 4 }]}
        />
      )}
      // The grabber row carries the keys: 3D on the left, close on the right.
      handleComponent={() => (
        <View style={styles.handle}>
          {machineId ? (
            <Key
              round
              height={TOUCH - 6}
              accessibilityLabel="See it in 3D"
              onPress={() => {
                sfx('pop');
                onOpen3d(machineId);
              }}
              faceStyle={{ paddingHorizontal: 0, width: TOUCH - 6 }}
            >
              <Icon name="cube" size={20} color={SKIN.keyInk} />
            </Key>
          ) : (
            <View />
          )}
          <View style={styles.grabber} />
          <Key
            round
            height={TOUCH - 6}
            accessibilityLabel="Close"
            onPress={close}
            faceStyle={{ paddingHorizontal: 0, width: TOUCH - 6 }}
          >
            <Icon name="close" size={20} color={SKIN.keyInk} />
          </Key>
        </View>
      )}
    >
      {machineId ? (
        <>
          <BottomSheetScrollView
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
          </BottomSheetScrollView>
          {toast ? (
            <View pointerEvents="none" style={styles.toast}>
              <Toast text={toast.text} tone={toast.tone} />
            </View>
          ) : null}
        </>
      ) : null}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  handle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.l,
    paddingTop: SPACE.s,
    paddingBottom: SPACE.xs,
  },
  grabber: { width: 56, height: 6, borderRadius: 3, backgroundColor: SKIN.chrome },
  toast: { position: 'absolute', top: SPACE.s, left: SPACE.l, right: SPACE.l, zIndex: 3 },
});
