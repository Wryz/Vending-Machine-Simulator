import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { Product } from '@/config/products';
import { useT } from '@/i18n';

import { Icon } from '../icons';
import { Mono, Row, T } from '../kit';
import { PRODUCT_IMAGES } from '../productImages';
import { Key, useSkin } from '../skin';
import { useTheme } from '../ThemeProvider';
import { SPACE } from '../theme';

/** Narrowest product key; the keys grow to fill the row (owner's request, 2026-11-08). */
const MIN_KEY = 84;
const GAP = SPACE.s;
const MAX_IMAGE = 84;

/** A coil's code on the shelf tag: row letter, column number ("B3"). */
export function coilCode(slot: number, cols: number): string {
  return `${String.fromCharCode(65 + Math.floor(slot / Math.max(1, cols)))}${(slot % Math.max(1, cols)) + 1}`;
}

/**
 * Pick what goes in a coil (machine panel). The top strip says plainly what
 * is being replaced: what is in the coil now → what replaces it. The product
 * keys fill the panel's width in centred rows, so a short list never hugs the
 * left edge.
 */
export function ProductPicker({
  coil,
  current,
  chosen,
  products,
  onPick,
  onClose,
}: {
  /** The coil's shelf code ("B3"). */
  coil: string;
  /** In the coil now (null: empty). */
  current: Product | null;
  /** Planned to go in instead (null: nothing picked yet, or a top-up of the same product). */
  chosen: Product | null;
  products: readonly Product[];
  onPick: (productId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const skin = useSkin();
  const [width, setWidth] = useState(0);

  const fit = Math.max(1, Math.floor((width + GAP) / (MIN_KEY + GAP)));
  const cols = Math.max(1, Math.min(products.length, fit));
  const keyW = width > 0 ? Math.floor((width - GAP * (cols - 1)) / cols) : MIN_KEY;
  const img = Math.min(MAX_IMAGE, Math.round(keyW * 0.62));
  const swap = !!chosen && !!current && chosen.id !== current.id;
  const headline = swap
    ? t('machinePanel.picker.swapping', { from: current!.name, to: chosen!.name })
    : current
      ? t('machinePanel.picker.replacing', { product: current.name })
      : chosen
        ? t('machinePanel.picker.filling', { product: chosen.name })
        : t('machinePanel.picker.empty');

  return (
    <View style={{ gap: SPACE.m }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={[styles.code, { backgroundColor: skin.led }]}>
          <Mono size={13} weight="bold" color={skin.ledGreen}>
            {t('machinePanel.picker.coil', { code: coil })}
          </Mono>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('machinePanel.a11y.close')}
          hitSlop={10}
          onPress={onClose}
        >
          <Icon name="close" size={20} color={theme.muted} />
        </Pressable>
      </Row>

      {/* What is in the coil now → what replaces it. */}
      <View
        accessible
        accessibilityLabel={headline}
        style={[styles.swap, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}
      >
        <Thumb product={current} label={t('machinePanel.picker.now')} faded={swap} />
        <Icon name="chevron" size={22} color={theme.brand} />
        <Thumb
          product={swap || (!current && chosen) ? chosen : null}
          label={t('machinePanel.picker.new')}
          highlight
        />
        <T size={14} weight="bold" style={{ flex: 1 }} numberOfLines={3}>
          {headline}
        </T>
      </View>

      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.grid, { gap: GAP }]}
      >
        {width > 0
          ? products.map((pr) => {
              const isNew = chosen?.id === pr.id && pr.id !== current?.id;
              const inCoil = current?.id === pr.id;
              return (
                <Key
                  key={pr.id}
                  tone={isNew ? 'brand' : 'white'}
                  height={img + 30}
                  onPress={() => onPick(pr.id)}
                  accessibilityLabel={
                    inCoil
                      ? t('machinePanel.a11y.topUp', { product: pr.name })
                      : current
                        ? t('machinePanel.a11y.replaceWith', {
                            from: current.name,
                            product: pr.name,
                          })
                        : t('machinePanel.a11y.load', { product: pr.name })
                  }
                  accessibilityState={{ selected: isNew || inCoil }}
                  style={{ width: keyW }}
                  faceStyle={{ paddingHorizontal: 4, flexDirection: 'column', gap: 0 }}
                >
                  <Image
                    source={PRODUCT_IMAGES[pr.id]}
                    style={{ width: img, height: img }}
                    resizeMode="contain"
                  />
                  <T
                    size={11}
                    weight="bold"
                    numberOfLines={1}
                    color={isNew ? '#FFFFFF' : skin.keyInk}
                  >
                    {pr.name}
                  </T>
                  {inCoil || isNew ? (
                    <View style={[styles.badge, { backgroundColor: isNew ? theme.ink : skin.led }]}>
                      <Mono size={8} weight="bold" color={isNew ? '#FFFFFF' : skin.ledGreen}>
                        {isNew
                          ? t('machinePanel.picker.newBadge')
                          : t('machinePanel.picker.inCoil')}
                      </Mono>
                    </View>
                  ) : null}
                </Key>
              );
            })
          : null}
      </View>
    </View>
  );
}

/** A product (or an empty slot) in the swap strip. */
function Thumb({
  product,
  label,
  faded,
  highlight,
}: {
  product: Product | null;
  label: string;
  faded?: boolean;
  highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: theme.surface,
            borderColor: highlight && product ? theme.brand : theme.line,
            borderStyle: product ? 'solid' : 'dashed',
            opacity: faded ? 0.5 : 1,
          },
        ]}
      >
        {product ? (
          <Image
            source={PRODUCT_IMAGES[product.id]}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        ) : (
          <T size={18} weight="bold" muted>
            ?
          </T>
        )}
      </View>
      <Mono size={9} weight="bold" color={theme.muted}>
        {label}
      </Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  code: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  swap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
    padding: SPACE.s,
    borderRadius: 12,
    borderWidth: 2,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
