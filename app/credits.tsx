import { Linking, Pressable, View } from 'react-native';

import { useTheme } from '@/ui/ThemeProvider';
import { Paper, Screen, Section, T } from '@/ui/kit';
import { SPACE, TOUCH } from '@/ui/theme';

interface Credit {
  name: string;
  detail: string;
  license: string;
  url?: string;
}

const DATA: Credit[] = [
  {
    name: '© OpenStreetMap contributors',
    detail: 'Map data, place names and building footprints.',
    license: 'Open Database License (ODbL)',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'OpenFreeMap',
    detail: 'Basemap vector tiles and map fonts, hosted free by OpenFreeMap.',
    license: 'Free public instance; tiles from OpenStreetMap data (ODbL)',
    url: 'https://openfreemap.org',
  },
  {
    name: '© OpenMapTiles',
    detail: 'Vector tile schema used by the basemap.',
    license: 'CC BY 4.0 (schema), ODbL (data)',
    url: 'https://www.openmaptiles.org',
  },
  {
    name: 'Protomaps',
    detail:
      'Place data from OpenStreetMap via the Protomaps planet build; self-hosted tiles option. Overture Maps Places is planned.',
    license: 'Built from OpenStreetMap data (ODbL)',
    url: 'https://protomaps.com',
  },
  {
    name: 'Population',
    detail: 'Estimated from OpenStreetMap buildings.',
    license: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'MET Norway',
    detail:
      'Live weather from the Norwegian Meteorological Institute (api.met.no), with no changes beyond mapping to game conditions. Offline, the game uses climate normals.',
    license: 'CC BY 4.0 and NLOD 2.0',
    url: 'https://api.met.no',
  },
];

const SOFTWARE: Credit[] = [
  {
    name: 'Instrument Sans',
    detail: 'Interface typeface.',
    license: 'SIL Open Font License 1.1',
    url: 'https://github.com/Instrument/instrument-sans',
  },
  {
    name: 'JetBrains Mono',
    detail: 'Receipts and numbers.',
    license: 'SIL Open Font License 1.1',
    url: 'https://github.com/JetBrains/JetBrainsMono',
  },
  {
    name: 'MapLibre',
    detail: 'Map rendering.',
    license: 'BSD-2-Clause',
    url: 'https://github.com/maplibre/maplibre-native',
  },
  {
    name: 'three.js',
    detail: '3D close-ups.',
    license: 'MIT',
    url: 'https://github.com/mrdoob/three.js',
  },
  {
    name: 'h3-js',
    detail: 'Hexagonal grid.',
    license: 'Apache-2.0',
    url: 'https://github.com/uber/h3-js',
  },
  {
    name: 'suncalc',
    detail: 'Sun position for real daylight.',
    license: 'BSD-2-Clause',
    url: 'https://github.com/mourner/suncalc',
  },
];

function CreditRow({ c }: { c: Credit }) {
  const theme = useTheme();
  const url = c.url;
  const open = url ? () => Linking.openURL(url).catch(() => undefined) : undefined;
  return (
    <Pressable
      accessibilityRole={open ? 'link' : undefined}
      accessibilityLabel={`${c.name}. ${c.license}`}
      accessibilityHint={open ? 'Opens in your browser' : undefined}
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
  return (
    <Screen title="Credits" subtitle="Coinline · Vending Machine Simulator">
      <Paper tone="surface">
        <T>Places shown from open map data. No affiliation or endorsement.</T>
        <T size={13} muted style={{ marginTop: SPACE.xs }}>
          All products and brands in the game are invented. Use &quot;Report this place&quot; on a
          spot to hide a venue.
        </T>
      </Paper>
      <Section title="Data">
        <View>
          {DATA.map((c) => (
            <CreditRow key={c.name} c={c} />
          ))}
        </View>
      </Section>
      <Section title="Software and fonts">
        <View>
          {SOFTWARE.map((c) => (
            <CreditRow key={c.name} c={c} />
          ))}
        </View>
      </Section>
      <T size={13} muted center>
        Made by Coinline.
      </T>
    </Screen>
  );
}
