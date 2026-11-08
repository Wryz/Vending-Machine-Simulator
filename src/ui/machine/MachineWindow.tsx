import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { MACHINE_WINDOW as W } from '@/config/machines';

import { Mono } from '../kit';
import { PRODUCT_IMAGES } from '../productImages';
import { useSkin } from '../skin';
import { SPACE } from '../theme';

export interface WindowSlot {
  productId: string | null;
  /** Units in the coil (as far as the player knows). */
  qty: number;
  /** Units planned to go in (shown see-through at the back until loaded). */
  planned: number;
  /** Price label under the coil. */
  price: string;
  accessibilityLabel: string;
}

/** Coils drawn for this many units of a coil's capacity (at least one when not empty). */
function shown(units: number, cap: number): number {
  if (units <= 0) return 0;
  return Math.min(W.depth, Math.max(1, Math.round((units / Math.max(1, cap)) * W.depth)));
}

/**
 * The machine with its door open (SPEC §3.6): a shelf per row, a spiral coil
 * per slot, and the products in each coil one behind another, smaller and
 * dimmer towards the back. A fuller coil shows more products. Planned
 * restocks wait see-through at the back; once loaded they slide in from the
 * back. Tap a coil to pick it (product and price).
 */
export function MachineWindow({
  slots,
  cols,
  cap,
  selected,
  onSelect,
  addRow,
}: {
  slots: WindowSlot[];
  cols: number;
  cap: number;
  selected: number | null;
  onSelect: (slot: number) => void;
  /** The machine can take another row of slots: an empty, dashed shelf to buy it from. */
  addRow?: { label: string; hint: string; disabled?: boolean; onPress: () => void };
}) {
  const skin = useSkin();
  const [width, setWidth] = useState(0);
  // Products already in the coils when the window opens don't animate in.
  const [live, setLive] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const inner = Math.max(0, width - SPACE.s * 2);
  const cellW = inner / Math.max(1, cols);
  const size = Math.min(W.productMaxPt, cellW * W.productShare);
  const rise = size * W.risePerStep;
  const cellH = Math.round(size + rise * (W.depth - 1) + size * 0.32);
  const rows: WindowSlot[][] = [];
  for (let i = 0; i < slots.length; i += cols) rows.push(slots.slice(i, i + cols));

  return (
    <View
      style={[styles.frame, { backgroundColor: skin.chrome, borderBottomColor: skin.chromeDark }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.interior}>
        {/* The light strip along the top of the cabinet. */}
        <View style={styles.light} />
        {width > 0
          ? rows.map((row, r) => (
              <View key={r}>
                <View style={{ flexDirection: 'row', height: cellH }}>
                  {row.map((slot, c) => {
                    const i = r * cols + c;
                    return (
                      <Coil
                        key={i}
                        index={i}
                        slot={slot}
                        cap={cap}
                        width={cellW}
                        height={cellH}
                        size={size}
                        rise={rise}
                        selected={selected === i}
                        animate={live}
                        onPress={() => onSelect(i)}
                      />
                    );
                  })}
                </View>
                {/* Shelf edge: slot code and price under each coil. */}
                <View style={styles.shelf}>
                  {row.map((slot, c) => {
                    const i = r * cols + c;
                    const on = selected === i;
                    return (
                      <View key={i} style={{ width: cellW, alignItems: 'center' }}>
                        <View style={[styles.tag, on ? { backgroundColor: skin.brandFace } : null]}>
                          <Mono size={9} weight="bold" color={on ? '#FFFFFF' : '#8A8FA8'}>
                            {String.fromCharCode(65 + r)}
                            {c + 1}
                          </Mono>
                          <Mono size={12} weight="bold" color={on ? '#FFFFFF' : skin.ledGreen}>
                            {slot.productId ? slot.price : '—'}
                          </Mono>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          : null}
        {addRow && width > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addRow.label}
            accessibilityHint={addRow.hint}
            accessibilityState={{ disabled: !!addRow.disabled }}
            disabled={addRow.disabled}
            onPress={addRow.onPress}
            style={({ pressed }) => [
              styles.addRow,
              {
                height: Math.max(48, Math.round(cellH * 0.6)),
                opacity: addRow.disabled ? 0.55 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Mono size={22} weight="bold" color={skin.ledGreen}>
              +
            </Mono>
            <Mono size={13} weight="bold" color="#FFFFFF">
              {addRow.label}
            </Mono>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** A small stable number in -1..1 for a slot and depth (products don't sit perfectly in line). */
function wobble(slot: number, k: number, salt: number): number {
  const x = Math.sin(slot * 127.1 + k * 311.7 + salt * 74.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function Coil({
  index,
  slot,
  cap,
  width,
  height,
  size,
  rise,
  selected,
  animate,
  onPress,
}: {
  index: number;
  slot: WindowSlot;
  cap: number;
  width: number;
  height: number;
  size: number;
  rise: number;
  selected: boolean;
  animate: boolean;
  onPress: () => void;
}) {
  const skin = useSkin();
  const real = shown(slot.qty, cap);
  const total = Math.max(real, shown(slot.qty + slot.planned, cap));
  const image = slot.productId ? PRODUCT_IMAGES[slot.productId] : undefined;
  const base = height - size * 0.14;
  // Depth step k: 0 = front. Scale, bottom edge and dimming for each.
  const at = (k: number) => {
    const s = 1 - k * W.shrinkPerStep;
    return { s, bottom: base - k * rise, dim: 1 - k * W.dimPerStep };
  };
  // The spiral's turn around product k: a ring around its lower body.
  const ring = (k: number) => {
    const { s, bottom } = at(k);
    const px = size * s;
    return {
      cx: width / 2,
      cy: bottom - px * W.ringHeight,
      rx: px * W.ringWidth,
      ry: px * W.ringDepth,
    };
  };
  /** The front half of turn k (passes in front of product k), left to right. */
  const frontArc = (k: number) => {
    const a = ring(k);
    const b = ring(k + 0.5);
    return `M ${a.cx - a.rx} ${a.cy} A ${a.rx} ${a.ry} 0 0 0 ${b.cx + b.rx} ${b.cy}`;
  };
  /** The back half of turn k (behind product k), right to left, up to the next turn. */
  const backArc = (k: number) => {
    const a = ring(k + 0.5);
    const b = ring(k + 1);
    return `M ${a.cx + a.rx} ${a.cy} A ${a.rx} ${a.ry} 0 0 0 ${b.cx - b.rx} ${b.cy}`;
  };
  const wire = (k: number, back = false) => ({
    // The back half of a turn is in the cabinet's shadow.
    stroke: back ? '#8E94AE' : k === 0 ? '#F2F4F9' : '#CBD0DF',
    strokeOpacity: Math.max(0.3, 1 - k * 0.12),
    strokeWidth: Math.max(1.2, 2.3 - k * 0.18),
    fill: 'none',
    strokeLinecap: 'round' as const,
  });

  // A sale while the door is open: the front product drops out of the coil
  // with its price. (Adjusting state on a prop change, React's documented pattern.)
  const [prevQty, setPrevQty] = useState(slot.qty);
  const [prevProduct, setPrevProduct] = useState(slot.productId);
  const [drops, setDrops] = useState<number[]>([]);
  if (slot.qty !== prevQty || slot.productId !== prevProduct) {
    if (animate && slot.qty < prevQty && slot.productId === prevProduct && !slot.planned)
      setDrops((d) => [...d, (d[d.length - 1] ?? 0) + 1].slice(-3));
    setPrevQty(slot.qty);
    setPrevProduct(slot.productId);
  }
  useEffect(() => {
    if (!drops.length) return;
    const timer = setTimeout(() => setDrops([]), W.dropMs + 300);
    return () => clearTimeout(timer);
  }, [drops]);

  // Back to front: the back half of a turn, its product, then the front half.
  const layers: ReactNode[] = [];
  for (let k = W.depth - 1; k >= 0; k--) {
    layers.push(
      <Svg key={`b${k}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Path d={backArc(k)} {...wire(k + 0.5, true)} />
      </Svg>,
    );
    if (image && k < total) {
      const { s, bottom, dim } = at(k);
      const ghost = k >= real;
      const px = size * s * (1 + W.sizeJitter * wobble(index, k, 3));
      layers.push(
        <View
          key={`${k}-${ghost ? 'g' : 'r'}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (width - px) / 2 + px * W.shiftJitter * wobble(index, k, 1),
            top: bottom - px,
            width: px,
            height: px,
            transform: [{ rotate: `${W.leanDeg * wobble(index, k, 2)}deg` }],
          }}
        >
          <Animated.View
            entering={animate && !ghost ? loadIn(k, rise) : undefined}
            style={{ flex: 1, opacity: ghost ? W.plannedOpacity * dim : 1 }}
          >
            <Image source={image} style={styles.product} resizeMode="contain" />
            {/* Further back is in shadow: a solid shade, not see-through. */}
            {k > 0 && !ghost ? (
              <Image
                source={image}
                style={[styles.product, styles.shade, { opacity: 1 - dim }]}
                resizeMode="contain"
                tintColor={INTERIOR}
              />
            ) : null}
          </Animated.View>
        </View>,
      );
    }
    layers.push(
      <Svg key={`f${k}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Path d={frontArc(k)} {...wire(k)} />
      </Svg>,
    );
  }

  const front = at(0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={slot.accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ width, height }}
    >
      {selected ? (
        <View pointerEvents="none" style={[styles.selected, { borderColor: skin.brandFace }]} />
      ) : null}
      {layers}
      {image
        ? drops.map((id) => (
            <Animated.View
              key={`drop${id}`}
              pointerEvents="none"
              entering={dropOut(height)}
              style={{
                position: 'absolute',
                left: (width - size) / 2,
                top: front.bottom - size,
                width: size,
                height: size,
                opacity: 0,
              }}
            >
              <Image source={image} style={styles.product} resizeMode="contain" />
            </Animated.View>
          ))
        : null}
      {drops.map((id) => (
        <Animated.View
          key={`pop${id}`}
          pointerEvents="none"
          entering={pricePop(size)}
          style={[styles.pop, { top: front.bottom - size * 1.1, opacity: 0 }]}
        >
          <Mono size={13} weight="bold" color={skin.ledGreen}>
            +{slot.price}
          </Mono>
        </Animated.View>
      ))}
    </Pressable>
  );
}

/** A sold product tips forward off the coil and drops into the bin. */
function dropOut(height: number) {
  return new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }] },
    35: {
      opacity: 1,
      transform: [{ translateY: height * 0.12 }, { rotate: '-14deg' }, { scale: 1.06 }],
    },
    100: {
      opacity: 0,
      transform: [{ translateY: height * 0.95 }, { rotate: '-32deg' }, { scale: 1.1 }],
    },
  }).duration(W.dropMs);
}

/** "+€1.85" floats up from the coil. */
function pricePop(size: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 0 }, { scale: 0.7 }] },
    20: { opacity: 1, transform: [{ translateY: -size * 0.15 }, { scale: 1.1 }] },
    100: { opacity: 0, transform: [{ translateY: -size * 0.7 }, { scale: 1 }] },
  }).duration(W.dropMs + 300);
}

/** A loaded product slides in from the back of the coil. */
function loadIn(k: number, rise: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -rise * 2.5 }, { scale: 0.8 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  })
    .duration(W.loadInMs)
    .delay(k * W.loadStaggerMs);
}

/** The cabinet's inside (also the shade on products further back). */
const INTERIOR = '#363B58';

const styles = StyleSheet.create({
  frame: {
    borderRadius: 14,
    padding: 6,
    borderBottomWidth: 4,
  },
  interior: {
    borderRadius: 9,
    paddingHorizontal: SPACE.s,
    paddingBottom: SPACE.s,
    paddingTop: SPACE.s + 6,
    backgroundColor: INTERIOR,
    overflow: 'hidden',
  },
  light: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    backgroundColor: '#FFF3D6',
    opacity: 0.9,
  },
  shelf: {
    flexDirection: 'row',
    height: 24,
    alignItems: 'center',
    backgroundColor: '#D7DBE6',
    borderRadius: 3,
    borderBottomWidth: 3,
    borderBottomColor: '#9EA4B8',
    marginBottom: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 5,
    borderRadius: 4,
    backgroundColor: '#1E2133',
  },
  selected: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    bottom: 2,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  product: { width: '100%', height: '100%' },
  shade: { position: 'absolute', left: 0, top: 0 },
  pop: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
