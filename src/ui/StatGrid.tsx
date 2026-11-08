import { View } from 'react-native';

import { Icon, type IconName } from './icons';
import { Mono, Row, T } from './kit';
import { useTheme } from './ThemeProvider';
import { SPACE } from './theme';

export interface StatTile {
  icon: IconName;
  /** One or two words: what the number is. */
  label: string;
  value: string;
  /** Optional few words on what it means. */
  desc?: string;
  color?: string;
}

/** One stat: icon and short name, the number, a few words on what it is. */
function Tile({ tile }: { tile: StatTile }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${tile.label}: ${tile.value}${tile.desc ? `. ${tile.desc}` : ''}`}
      style={{ width: '48%', gap: 2, paddingVertical: SPACE.xs }}
    >
      <Row gap={6}>
        <Icon name={tile.icon} size={14} color={theme.muted} />
        <T size={12} weight="bold" muted numberOfLines={1} style={{ flex: 1 }}>
          {tile.label}
        </T>
      </Row>
      <Mono size={18} weight="bold" color={tile.color} numberOfLines={1}>
        {tile.value}
      </Mono>
      {tile.desc ? (
        <T size={11} muted numberOfLines={1}>
          {tile.desc}
        </T>
      ) : null}
    </View>
  );
}

/** A tidy two-column grid of labelled numbers (put it inside one Paper). */
export function StatGrid({ tiles }: { tiles: StatTile[] }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: SPACE.s,
      }}
    >
      {tiles.map((tile) => (
        <Tile key={tile.label} tile={tile} />
      ))}
    </View>
  );
}
