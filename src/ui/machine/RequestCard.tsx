import { Image, Pressable, StyleSheet, View } from 'react-native';

import { getMachineType } from '@/config/machines';
import { getProduct } from '@/config/products';
import { REQUESTS } from '@/config/requests';
import { useT } from '@/i18n';
import { content } from '@/i18n/content';
import { venueName } from '@/i18n/sim';
import { machineTypeFor, type CustomerRequest } from '@/sim';

import { moneyShort } from '../format';
import { Button, Mono, T } from '../kit';
import { Icon } from '../icons';
import { Glyph } from '../objects/small';
import { PRODUCT_IMAGES } from '../productImages';
import { SKIN_LIGHT } from '../skin';
import { useTheme } from '../ThemeProvider';
import { SPACE, TOUCH } from '../theme';

/**
 * Where a request stands at this machine:
 * - `load`: nothing planned yet (add it to the restock plan);
 * - `planned`: in the plan, not ordered (order the van from here);
 * - `coming`: a van with it is on its way (wait; served when it arrives);
 * - `vanBusy`: a van without it is on its way (add it after that one).
 * A machine that can't sell it shows which type could instead.
 */
export type RequestStage =
  | { kind: 'load' }
  | { kind: 'planned'; orderLabel: string }
  | { kind: 'coming'; eta: string }
  | { kind: 'vanBusy' };

/**
 * A customer's request in the machine sheet: who (where they came from, why),
 * what they want, how long they'll wait and the tip, then the one next step
 * (add it, order the van, or wait for it). When this machine can't sell it,
 * the card says which machine type nearby could. The X waves it away.
 */
export function RequestCard({
  request,
  waitLabel,
  chapter,
  fits,
  stage,
  priceCents,
  onLoad,
  onOrder,
  onDismiss,
}: {
  request: CustomerRequest;
  /** Time left before they give up, already formatted. */
  waitLabel: string;
  chapter: number;
  /** This machine can sell it. */
  fits: boolean;
  stage: RequestStage;
  priceCents: number;
  onLoad: () => void;
  onOrder: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  // A paper note: it stays cream with dark ink after dark too (like receipts).
  const ink = SKIN_LIGHT.keyInk;
  const product = getProduct(request.productId);
  const image = PRODUCT_IMAGES[product.id];
  const place = request.from.name ? venueName(request.from.name) : '';
  const other = fits ? null : machineTypeFor(product.id);
  const otherType = other ? getMachineType(other) : null;
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('requests.card.dismiss')}
        onPress={onDismiss}
        style={({ pressed }) => [styles.close, { opacity: pressed ? 0.5 : 1 }]}
      >
        <View style={styles.closeFace}>
          <Icon name="close" size={14} color="#8A6A1E" />
        </View>
      </Pressable>
      <View style={styles.top}>
        <View style={styles.thumb}>
          {image ? <Image source={image} style={styles.image} resizeMode="contain" /> : null}
          <View style={styles.origin}>
            <Glyph category={request.from.category} size={14} />
          </View>
        </View>
        <View style={{ flex: 1, gap: 2, paddingRight: SPACE.xl }}>
          <Mono size={11} weight="bold" color="#8A6A1E">
            {t('requests.card.label').toUpperCase()}
          </Mono>
          <T size={17} weight="bold" color={ink}>
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
        stage.kind === 'coming' ? (
          <View style={styles.status}>
            <Icon name="van" size={22} color={SKIN_LIGHT.cabinetDark} />
            <View style={{ flex: 1 }}>
              <T size={15} weight="bold" color={ink}>
                {t('requests.card.coming', { time: stage.eta })}
              </T>
              <T size={13} color="#4A4F6A">
                {t('requests.card.comingNote')}
              </T>
            </View>
          </View>
        ) : stage.kind === 'vanBusy' ? (
          <View style={styles.status}>
            <Icon name="van" size={22} color="#8A5A00" />
            <T size={14} color="#8A5A00" style={{ flex: 1 }}>
              {t('requests.card.vanBusy')}
            </T>
          </View>
        ) : stage.kind === 'planned' ? (
          <>
            <T size={14} color="#4A4F6A">
              {t('requests.card.planned')}
            </T>
            <Button
              label={stage.orderLabel}
              icon={<Icon name="van" size={20} color={theme.onBrand} />}
              onPress={onOrder}
            />
          </>
        ) : (
          <Button
            label={t('requests.card.load')}
            icon={<Icon name="box" size={20} color={theme.onBrand} />}
            onPress={onLoad}
          />
        )
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
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
    padding: SPACE.s,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  // 44pt hit target in the corner; the visible face is smaller.
  close: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeFace: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFE7A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
