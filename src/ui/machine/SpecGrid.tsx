import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';

import { Icon, type IconName } from '../icons';
import { T } from '../kit';
import { useSkin } from '../skin';
import { useTheme } from '../ThemeProvider';
import { SPACE } from '../theme';

/** One stat: an icon, the number, and a short line saying what the number is. */
export interface Spec {
  icon: IconName;
  value: string;
  label: string;
  color?: string;
  /** Opens in this chapter: a lock and "Chapter N" instead of the value. */
  lockedUntil?: number;
}

/**
 * A grid of labelled stats on chrome plates (the machine's spec sheet): equal
 * cells, three to a row, everything centered; a short last row sits centered.
 */
export function SpecGrid({ specs, columns = 3 }: { specs: Spec[]; columns?: number }) {
  return (
    <View style={styles.grid}>
      {specs.map((s, i) => (
        <View key={`${s.label}-${i}`} style={[styles.cellWrap, { width: `${100 / columns}%` }]}>
          <SpecCell spec={s} />
        </View>
      ))}
    </View>
  );
}

function SpecCell({ spec }: { spec: Spec }) {
  const t = useT();
  const theme = useTheme();
  const skin = useSkin();
  const locked = spec.lockedUntil !== undefined;
  const value = locked ? t('machinePanel.stats.chapter', { n: spec.lockedUntil! }) : spec.value;
  const ink = locked ? theme.muted : (spec.color ?? skin.keyInk);
  return (
    <View
      accessible
      accessibilityLabel={t('hud.statValue', { label: spec.label, value })}
      style={[
        styles.cell,
        { backgroundColor: theme.dark ? theme.raised : skin.chrome, borderColor: skin.chromeDark },
      ]}
    >
      <View style={styles.valueRow}>
        <Icon name={locked ? 'lock' : spec.icon} size={16} color={ink} />
        <T
          size={15}
          weight="bold"
          color={ink}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={styles.shrink}
        >
          {value}
        </T>
      </View>
      <T
        size={11}
        muted
        center
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={styles.full}
      >
        {spec.label}
      </T>
    </View>
  );
}

/**
 * The headline numbers (sales and items sold) side by side in one plate,
 * bigger than the spec cells below.
 */
export function FeaturedStats({ stats }: { stats: Spec[] }) {
  const t = useT();
  const theme = useTheme();
  const skin = useSkin();
  return (
    <View
      style={[
        styles.featured,
        { backgroundColor: theme.dark ? theme.raised : skin.chrome, borderColor: skin.chromeDark },
      ]}
    >
      {stats.map((s, i) => (
        <View
          key={`${s.label}-${i}`}
          accessible
          accessibilityLabel={t('hud.statValue', { label: s.label, value: s.value })}
          style={[
            styles.featuredCell,
            i > 0 ? { borderLeftWidth: 1, borderLeftColor: skin.chromeDark } : null,
          ]}
        >
          <View style={styles.valueRow}>
            <Icon name={s.icon} size={20} color={s.color ?? skin.keyInk} />
            <T
              size={24}
              weight="bold"
              color={s.color ?? skin.keyInk}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={styles.shrink}
            >
              {s.value}
            </T>
          </View>
          <T size={12} muted center numberOfLines={2} style={styles.full}>
            {s.label}
          </T>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  full: { maxWidth: '100%' },
  featured: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACE.m,
    paddingHorizontal: SPACE.s,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', margin: -3 },
  cellWrap: { padding: 3 },
  cell: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: SPACE.s,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    maxWidth: '100%',
  },
});
