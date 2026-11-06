// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: 'Pedidos',
  streakLabel: 'Racha en días',
  streakValue: { one: '{n} día', other: '{n} días' },
  streakBonusLabel:
    'Completa los tres para un bono de racha, multiplicado por la racha, hasta {cap}. Si fallas un día, vuelve a empezar.',
  streakBonusValue: '{amount} × racha',
  empty: 'Los pedidos nuevos llegan con el día.',
  progress: '{have} / {target}',
  claimed: 'Cobrado',
  done: 'Listo',
  claim: 'Cobrar',
  streakToast: {
    title: 'Día {n} de racha',
    subtitle: 'Completaste todos los pedidos de hoy.',
  },
  trophies: 'Trofeos {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}: {desc}, desbloqueado',
    trophyLocked: '{title}: {desc}, bloqueado',
  },
} satisfies Shape<typeof en>;
