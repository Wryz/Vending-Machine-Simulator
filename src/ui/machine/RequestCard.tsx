import { Image, StyleSheet, View } from 'react-native';

import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';
import { REQUESTS } from '@/config/requests';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { venueName } from '@/i18n/sim';
import { machineTypeFor, type CustomerRequest } from '@/sim';

import { moneyShort } from '../format';
import { Button, Mono, T } from '../kit';
import { Glyph } from '../objects/small';
import { PRODUCT_IMAGES } from '../productImages';
import { SKIN } from '../skin';
import { SPACE } from '../theme';

/**
 * A customer's request in the machine sheet: who (where they came from, why),
 * what they want, how long they'll wait and the tip. "Load it" puts the
 * product in a coil (then Restock); when this machine can't sell it, the card
 * says which machine type nearby could.
 */
export function RequestCard({
  request,
  waitLabel,
  chapter,
  fits,
  loaded,
  priceCents,
  onLoad,
}: {
  request: CustomerRequest;
  /** Time left before they give up, already formatted. */
  waitLabel: string;
  chapter: number;
  /** This machine can sell it. */
  fits: boolean;
  /** It is already planned for a coil (waiting for Restock). */
  loaded: boolean;
  priceCents: number;
  onLoad: () => void;
}) {
  const t = useT();
  const product = getProduct(request.productId);
  const image = PRODUCT_IMAGES[product.id];
  const place = request.from.name ? venueName(request.from.name) : '';
  const other = fits ? null : machineTypeFor(product.id);
  const otherType = other ? getMachineType(other) : null;
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={styles.top}>
        <View style={styles.thumb}>
          {image ? <Image source={image} style={styles.image} resizeMode="contain" /> : null}
          <View style={styles.origin}>
            <Glyph category={request.from.category} size={14} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Mono size={11} weight="bold" color="#8A6A1E">
            {t('requests.card.label').toUpperCase()}
          </Mono>
          <T size={17} weight="bold" color={SKIN.keyInk}>
            {t('requests.card.title', { product: product.name })}
          </T>
          <T size={15} color="#4A4F6A">
            “{t(`requests.reason.${request.reason}`, { place })}”
          </T>
        </View>
      </View>
      <View style={styles.chips}>
        <Mono size={12} weight="bold" color="#5A5F7A">
          {t('requests.card.waiting', { time: waitLabel })}
        </Mono>
        <Mono size={12} weight="bold" color="#1B8F57">
          {t('requests.card.tip', {
            amount: moneyShort(Math.round(priceCents * REQUESTS.tipShare)),
          })}
        </Mono>
      </View>
      {fits ? (
        <Button
          kind={loaded ? 'secondary' : 'primary'}
          label={loaded ? t('requests.card.loaded') : t('requests.card.load')}
          disabled={loaded}
          onPress={onLoad}
        />
      ) : otherType ? (
        <T size={14} color="#8A5A00">
          {t('requests.card.otherMachine', {
            type: content.machineType(otherType.id, otherType.name),
            m: REQUESTS.serveRadiusM,
          })}
          {chapter < otherType.unlockChapter
            ? ` ${t('requests.card.locked', { n: otherType.unlockChapter })}`
            : ''}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACE.s,
    padding: SPACE.m,
    borderRadius: 16,
    backgroundColor: '#FFF6DE',
    borderWidth: 2,
    borderColor: '#FFB020',
  },
  top: { flexDirection: 'row', gap: SPACE.m, alignItems: 'center' },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: 46, height: 46 },
  origin: {
    position: 'absolute',
    left: -6,
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF3D6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
});
