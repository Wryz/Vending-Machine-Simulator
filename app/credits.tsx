import { Linking, Pressable, View } from 'react-native';

import { LINKS } from '@/config/links';
import { useT, type TFn } from '@/i18n';
import { useProfile } from '@/store/profile';
import { useTheme } from '@/ui/ThemeProvider';
import { Paper, Screen, Section, T } from '@/ui/kit';
import { SPACE, TOUCH } from '@/ui/theme';

interface Credit {
  name: string;
  detail: string;
  license: string;
  url?: string;
}

const DATA = (t: TFn): Credit[] => [
  {
    name: '© OpenStreetMap contributors',
    detail: t('credits.data.osm'),
    license: 'Open Database License (ODbL)',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'OpenFreeMap',
    detail: t('credits.data.openfreemap'),
    license: t('credits.data.openfreemapLicense'),
    url: 'https://openfreemap.org',
  },
  {
    name: '© OpenMapTiles',
    detail: t('credits.data.openmaptiles'),
    license: 'CC BY 4.0 (schema), ODbL (data)',
    url: 'https://www.openmaptiles.org',
  },
  {
    name: 'Protomaps',
    detail: t('credits.data.protomaps'),
    license: t('credits.data.protomapsLicense'),
    url: 'https://protomaps.com',
  },
  {
    name: t('credits.data.populationName'),
    detail: t('credits.data.population'),
    license: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'MET Norway',
    detail: t('credits.data.met'),
    license: t('credits.data.metLicense'),
    url: 'https://api.met.no',
  },
];

const SOFTWARE = (t: TFn): Credit[] => [
  {
    name: 'Nunito',
    detail: t('credits.software.nunito'),
    license: 'SIL Open Font License 1.1',
    url: 'https://github.com/googlefonts/nunito',
  },
  {
    name: 'MapLibre',
    detail: t('credits.software.maplibre'),
    license: 'BSD-2-Clause',
    url: 'https://github.com/maplibre/maplibre-native',
  },
  {
    name: 'three.js',
    detail: t('credits.software.three'),
    license: 'MIT',
    url: 'https://github.com/mrdoob/three.js',
  },
  {
    name: 'h3-js',
    detail: t('credits.software.h3'),
    license: 'Apache-2.0',
    url: 'https://github.com/uber/h3-js',
  },
  {
    name: 'suncalc',
    detail: t('credits.software.suncalc'),
    license: 'BSD-2-Clause',
    url: 'https://github.com/mourner/suncalc',
  },
];

function CreditRow({ c }: { c: Credit }) {
  const t = useT();
  const theme = useTheme();
  const url = c.url;
  const open = url ? () => Linking.openURL(url).catch(() => undefined) : undefined;
  return (
    <Pressable
      accessibilityRole={open ? 'link' : undefined}
      accessibilityLabel={t('credits.rowA11y', { name: c.name, license: c.license })}
      accessibilityHint={open ? t('credits.opensHint') : undefined}
      onPress={open}
      disabled={!open}
      style={({ pressed }) => ({
        minHeight: TOUCH + 8,
        paddingVertical: SPACE.s,
        borderBottomWidth: 1,
        borderColor: theme.line,
        opacity: pressed ? 0.65 : 1,
        gap: 2,
      })}
    >
      <T weight="medium">{c.name}</T>
      <T size={13} muted>
        {c.detail}
      </T>
      <T size={13} color={open ? theme.signal : theme.muted}>
        {c.license}
        {open ? ' ↗' : ''}
      </T>
    </Pressable>
  );
}

/** Credits and licenses (SPEC §6.4, §11). */
export default function Credits() {
  const t = useT();
  const installId = useProfile((s) => s.installId);
  return (
    <Screen title={t('credits.title')} subtitle={t('credits.subtitle')}>
      <Section title={t('credits.sections.help')}>
        <View>
          <CreditRow
            c={{
              name: t('credits.privacy.name'),
              detail: t('credits.privacy.detail'),
              license: t('credits.open'),
              url: LINKS.privacy,
            }}
          />
          <CreditRow
            c={{
              name: t('credits.support.name'),
              detail: t('credits.support.detail'),
              license: t('credits.open'),
              url: LINKS.support,
            }}
          />
        </View>
        <T size={12} muted selectable style={{ marginTop: SPACE.s }}>
          {t('credits.installId', { id: installId })}
        </T>
      </Section>
      <Paper tone="surface">
        <T>{t('credits.placesNote')}</T>
        <T size={13} muted style={{ marginTop: SPACE.xs }}>
          {t('credits.brandsNote')}
        </T>
      </Paper>
      <Section title={t('credits.sections.data')}>
        <View>
          {DATA(t).map((c) => (
            <CreditRow key={c.name} c={c} />
          ))}
        </View>
      </Section>
      <Section title={t('credits.sections.software')}>
        <View>
          {SOFTWARE(t).map((c) => (
            <CreditRow key={c.name} c={c} />
          ))}
        </View>
      </Section>
      <T size={13} muted center>
        {t('credits.madeBy')}
      </T>
    </Screen>
  );
}
