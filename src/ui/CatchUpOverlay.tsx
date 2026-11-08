import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useT } from '@/i18n';
import { useGame } from '@/store/game';

import { Icon } from './icons';
import { T } from './kit';
import { Led, LedBar, useSkin } from './skin';
import { SPACE } from './theme';

/** While a long catch-up runs on return: the machine counts the coins. */
export function CatchUpOverlay() {
  const t = useT();
  const skin = useSkin();
  const busy = useGame((s) => s.catchingUp);
  const progress = useGame((s) => s.catchUpProgress);
  if (!busy) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      exiting={FadeOut.duration(200)}
      style={styles.scrim}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('catchUp.a11y')}
    >
      <View style={[styles.card, { backgroundColor: skin.cabinet, borderColor: skin.cabinetEdge }]}>
        <View style={styles.coin}>
          <Icon name="coin" size={34} color="#FFFFFF" />
        </View>
        <T size={18} weight="bold" color={skin.onCabinet} center>
          {t('catchUp.title')}
        </T>
        <Led size={16} color={skin.ledAmber}>
          {t('catchUp.led')}
        </Led>
        <View style={styles.meter}>
          <LedBar value={progress} segments={12} color={skin.ledAmber} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28,31,51,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: SPACE.m,
    paddingVertical: SPACE.xl,
    paddingHorizontal: SPACE.xxl,
    borderRadius: 24,
    borderWidth: 4,
  },
  meter: { alignSelf: 'stretch' },
  coin: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC94D',
    borderWidth: 4,
    borderColor: '#E8A21A',
  },
});
