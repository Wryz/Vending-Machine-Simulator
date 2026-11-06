// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/hud';

export default {
  buttonBadge: '{label}、{badge}',
  statValue: '{label}：{value}',
  locked: {
    a11y: '{title}、第{n}章で解放',
    chip: '{n}章',
  },
} satisfies Shape<typeof en>;
