import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useT } from '@/i18n';
import { useProfile } from '@/store/profile';

import { Icon } from './icons';
import { Row, T } from './kit';
import { Plate } from './skin';
import { useTheme } from './ThemeProvider';
import { SPACE, TOUCH } from './theme';

/** A chevron that points right when closed and down when open. */
function Chevron({ open, color, size = 18 }: { open: boolean; color: string; size?: number }) {
  return (
    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
      <Icon name="chevron" size={size} color={color} />
    </View>
  );
}

/**
 * A section with an engraved plate that opens and closes. The open state is
 * remembered per `id` in the profile (missing = `defaultOpen`). `summary` stays
 * visible next to the plate while closed (e.g. a count or a value).
 */
export function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = false,
  summary,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  summary?: ReactNode;
}) {
  const t = useT();
  const theme = useTheme();
  const stored = useProfile((s) => s.sectionsOpen?.[id]);
  const open = stored ?? defaultOpen;
  const toggle = () =>
    useProfile.getState().update((p) => {
      p.sectionsOpen = { ...(p.sectionsOpen ?? {}), [id]: !open };
    });
  return (
    <View style={{ gap: SPACE.s }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={
          open ? t('companyHub.section.hintOpen') : t('companyHub.section.hintClosed')
        }
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => ({
          minHeight: TOUCH,
          opacity: pressed ? 0.7 : 1,
          justifyContent: 'center',
        })}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Plate>{title}</Plate>
          <Row gap={SPACE.s}>
            {!open ? summary : null}
            <Chevron open={open} color={theme.muted} />
          </Row>
        </Row>
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** A small inline block that opens and closes (local state, default closed). */
export function Disclosure({
  title,
  children,
  color,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  color?: string;
  defaultOpen?: boolean;
}) {
  const t = useT();
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const ink = color ?? theme.ink;
  return (
    <View style={{ gap: SPACE.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={
          open ? t('companyHub.section.hintOpen') : t('companyHub.section.hintClosed')
        }
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => ({
          minHeight: TOUCH,
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Row gap={SPACE.xs}>
          <Chevron open={open} color={ink} size={16} />
          <T size={13} weight="bold" color={ink} style={{ flex: 1 }}>
            {title}
          </T>
        </Row>
      </Pressable>
      {open ? children : null}
    </View>
  );
}
