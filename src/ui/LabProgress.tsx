import { View } from 'react-native';

import { useT } from '@/i18n';

import { duration } from './format';
import { T } from './kit';
import { useTheme } from './ThemeProvider';
import { SPACE } from './theme';

/** The research in the lab: a bar and the time left (it applies when done). */
export function LabProgress({
  lab,
  now,
  family,
}: {
  lab: { startedAt: number; doneAt: number };
  now: number;
  family: string | null;
}) {
  const t = useT();
  const theme = useTheme();
  const share = Math.min(1, Math.max(0, (now - lab.startedAt) / (lab.doneAt - lab.startedAt)));
  return (
    <View style={{ gap: 4, marginTop: SPACE.xs }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.line, overflow: 'hidden' }}>
        <View style={{ width: `${share * 100}%`, height: 8, backgroundColor: theme.signal }} />
      </View>
      <T size={12} muted>
        {family
          ? t('company.research.inLabFamily', {
              family,
              time: duration(Math.max(0, lab.doneAt - now)),
            })
          : t('company.research.inLab', { time: duration(Math.max(0, lab.doneAt - now)) })}
      </T>
    </View>
  );
}
