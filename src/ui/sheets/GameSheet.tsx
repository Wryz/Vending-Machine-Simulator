import {
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../icons';
import { sfx } from '../sfx';
import { Cabinet, Key, SKIN } from '../skin';
import { RADIUS, SPACE, TOUCH } from '../theme';

/** Open and close a sheet safely, whatever it is doing right now. */
export interface GameSheetHandle {
  /** Show the sheet (at its first detent), or keep it up if it is already showing. */
  open(): void;
  /** Hide the sheet (cancels an open that is waiting on a close). */
  close(): void;
}

type Phase = 'closed' | 'opening' | 'open' | 'closing';

/**
 * The frame every map sheet shares (SPEC §3.6, §8): a cabinet with a grabber
 * row, opening at `openShare` of the screen and pulling up to full screen.
 *
 * Content never scrolls inside the short detent: dragging it lifts the whole
 * sheet to the top, and only there does a `SheetScroll` scroll (the library
 * locks the scroll below the top detent). Long content is reached by pulling
 * the sheet up, not by scrolling a small window.
 *
 * `open()`/`close()` also guard a library race: a `present()` made while the
 * sheet is still animating closed is dropped by the sheet, and the close then
 * finishes and fires `onDismiss`. Here that open is held until the close lands
 * and then replayed, so a tap during a close always opens the sheet.
 */
export const GameSheet = forwardRef<
  GameSheetHandle,
  {
    /** Share of the screen the sheet opens at (the second detent is full screen). */
    openShare: number;
    /** The sheet is fully gone (not called when an open is queued behind the close). */
    onDismiss: () => void;
    /** The sheet settled on a detent: 0 = opening detent, 1 = full screen. */
    onSnap?: (index: number) => void;
    /** Shows a close key on the right of the grabber. */
    closeLabel?: string;
    /** Cabinet colors (defaults to the house cabinet). */
    cabinet?: { color: string; light: string; dark: string };
    children: ReactNode;
  }
>(function GameSheet({ openShare, onDismiss, onSnap, closeLabel, cabinet, children }, ref) {
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheetModal>(null);
  const phase = useRef<Phase>('closed');
  const reopen = useRef(false);
  const snapPoints = useMemo(() => [`${Math.round(openShare * 100)}%`, '100%'], [openShare]);

  // Latest callbacks without re-creating the sheet's handlers.
  const dismissed = useRef(onDismiss);
  const snapped = useRef(onSnap);
  useEffect(() => {
    dismissed.current = onDismiss;
    snapped.current = onSnap;
  });

  const open = useCallback(() => {
    if (phase.current === 'closing') {
      // present() now would be dropped; replay it once the close lands.
      reopen.current = true;
      return;
    }
    if (phase.current !== 'closed') return;
    phase.current = 'opening';
    sheet.current?.present();
  }, []);
  const close = useCallback(() => {
    reopen.current = false;
    if (phase.current === 'closed' || phase.current === 'closing') return;
    phase.current = 'closing';
    sheet.current?.dismiss();
  }, []);
  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  const onAnimate = useCallback((_from: number, to: number) => {
    // Pulled down by the player (or closed by the library): it is closing now.
    if (to === -1 && (phase.current === 'open' || phase.current === 'opening')) {
      phase.current = 'closing';
    }
  }, []);
  const onChange = useCallback((index: number) => {
    if (index < 0) return;
    if (phase.current === 'closing' && !reopen.current) {
      // A close asked for before the open finished mounting: close it now.
      sheet.current?.dismiss();
      return;
    }
    phase.current = 'open';
    reopen.current = false;
    snapped.current?.(index);
  }, []);
  const onModalDismiss = useCallback(() => {
    phase.current = 'closed';
    if (reopen.current) {
      reopen.current = false;
      // Let the library finish unmounting before presenting again.
      setTimeout(() => {
        if (phase.current !== 'closed') return;
        phase.current = 'opening';
        sheet.current?.present();
      }, 0);
      return;
    }
    dismissed.current();
  }, []);

  // Stable component types, so the grabber row isn't remounted (mid-drag) on every render.
  const colors = cabinet ?? null;
  const background = useCallback(
    ({ style }: BottomSheetBackgroundProps) => (
      <Cabinet
        screws={false}
        color={colors?.color}
        light={colors?.light}
        dark={colors?.dark}
        style={[style, styles.cabinet]}
      />
    ),
    [colors?.color, colors?.light, colors?.dark],
  );
  const handle = useCallback(
    () => (
      <View style={styles.handle}>
        <View style={styles.keySpace} />
        <View style={styles.grabber} />
        {closeLabel ? (
          <Key
            round
            height={TOUCH - 6}
            accessibilityLabel={closeLabel}
            onPress={() => {
              sfx('pop');
              close();
            }}
            faceStyle={styles.closeFace}
          >
            <Icon name="close" size={20} color={SKIN.keyInk} />
          </Key>
        ) : (
          <View style={styles.keySpace} />
        )}
      </View>
    ),
    [closeLabel, close],
  );

  return (
    <BottomSheetModal
      ref={sheet}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      // Full screen stops under the status bar / Dynamic Island.
      topInset={insets.top}
      onAnimate={onAnimate}
      onChange={onChange}
      onDismiss={onModalDismiss}
      backgroundComponent={background}
      handleComponent={handle}
    >
      {children}
    </BottomSheetModal>
  );
});

/**
 * The body of a `GameSheet`. Below full screen it doesn't scroll (a drag lifts
 * the sheet instead); at full screen it scrolls.
 */
export function SheetScroll(props: ComponentProps<typeof BottomSheetScrollView>) {
  return <BottomSheetScrollView {...props} />;
}

const styles = StyleSheet.create({
  cabinet: { borderTopLeftRadius: RADIUS.l + 4, borderTopRightRadius: RADIUS.l + 4 },
  handle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.l,
    paddingTop: SPACE.s,
    paddingBottom: SPACE.xs,
  },
  keySpace: { width: TOUCH - 6 },
  grabber: { width: 56, height: 6, borderRadius: 3, backgroundColor: SKIN.chrome },
  closeFace: { paddingHorizontal: 0, width: TOUCH - 6 },
});
