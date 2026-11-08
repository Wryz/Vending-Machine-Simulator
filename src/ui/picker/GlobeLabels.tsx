'use no memo';
// Re-renders from a ref-driven subscription; keep the React Compiler out.
import { memo, useEffect, useState, type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GLOBE } from '@/config/map';
import { PICKER } from '@/config/picker';
import { placeLabel, type PickerView } from '@/three/globe/pickerView';

import { FONTS } from '../theme';

/**
 * Continent and ocean names over the GPU globe (plain RN Text, stacked above
 * the GL view). They follow the view at most once per animation frame, and
 * only this small component re-renders: a dozen absolutely positioned
 * Texts, the names facing you and not zoomed past their kind's max zoom.
 */

export interface GlobeLabelItem {
  key: string;
  text: string;
  lat: number;
  lng: number;
  ocean: boolean;
}

const L = PICKER.labels;
const BOX_W = 280;

const Label = memo(function Label({
  item,
  x,
  y,
  opacity,
  scale,
}: {
  item: GlobeLabelItem;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}) {
  const c = GLOBE.colors;
  const size = (item.ocean ? L.oceanSize : L.continentSize) * L.maxScale;
  const boxH = Math.ceil(size * 1.4);
  return (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={[
        styles.label,
        {
          height: boxH,
          lineHeight: boxH,
          fontSize: size,
          letterSpacing: L.letterSpacing * L.maxScale,
          color: item.ocean ? c.labelOcean : c.labelLand,
          opacity: opacity * (item.ocean ? c.labelOceanOpacity : c.labelLandOpacity),
          // Drawn at the largest size and scaled down, so it stays crisp.
          transform: [
            { translateX: x - BOX_W / 2 },
            { translateY: y - boxH / 2 },
            { scale: scale / L.maxScale },
          ],
        },
      ]}
    >
      {item.text}
    </Text>
  );
});

export function GlobeLabels({
  items,
  viewRef,
  subscribeRef,
  width,
  height,
  cy,
}: {
  items: GlobeLabelItem[];
  /** The live view (mutated on every touch). */
  viewRef: RefObject<PickerView>;
  /** Registers a listener called whenever the view changes; returns the unsubscribe. */
  subscribeRef: RefObject<(fn: () => void) => () => void>;
  width: number;
  height: number;
  cy: number;
}) {
  const [view, setView] = useState<PickerView | null>(null);
  useEffect(() => {
    let frame = 0;
    const off = subscribeRef.current(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setView({ ...viewRef.current });
      });
    });
    // Catch up with anything that moved before we subscribed.
    setView({ ...viewRef.current });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      off();
    };
  }, [viewRef, subscribeRef]);

  return (
    <View pointerEvents="none" style={styles.layer}>
      {view &&
        items.map((it) => {
          const at = placeLabel(it, view, width, height, cy);
          return at ? (
            <Label key={it.key} item={it} x={at.x} y={at.y} opacity={at.alpha} scale={at.scale} />
          ) : null;
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Above the GL view (its own native layer) whatever the platform's stacking.
  layer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2, elevation: 2 },
  label: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BOX_W,
    textAlign: 'center',
    fontFamily: FONTS.uiBold,
  },
});
