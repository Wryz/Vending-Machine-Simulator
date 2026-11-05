import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { T } from '../kit';
import { SPACE } from '../theme';

/** Route clipboard (SPEC §3.6): hardboard with a steel clip holding a paper sheet. */
export function Clipboard({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: '#8A6B4E',
        borderRadius: 10,
        padding: SPACE.s,
        paddingTop: SPACE.xl,
        shadowColor: theme.shadow,
        shadowOpacity: 1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 4,
          alignSelf: 'center',
          width: 96,
          height: 28,
          borderRadius: 6,
          backgroundColor: '#A9ADB1',
          borderWidth: 1,
          borderColor: '#7E8287',
          zIndex: 2,
        }}
      />
      <View
        style={{
          backgroundColor: theme.paper,
          borderRadius: 3,
          padding: SPACE.l,
          paddingTop: SPACE.xl,
          gap: SPACE.s,
        }}
      >
        <T weight="bold" size={16} color={theme.paperInk} accessibilityRole="header">
          {title}
        </T>
        {children}
      </View>
    </View>
  );
}
