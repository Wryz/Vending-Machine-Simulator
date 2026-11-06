// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/orders';

export default {
  title: 'Pedidos',
  streakLabel: 'Sequência em dias',
  streakValue: { one: '{n} dia', other: '{n} dias' },
  streakBonusLabel:
    'Conclua os três para um bônus de sequência, multiplicado pela sequência, até {cap}. Perdeu um dia, recomeça.',
  streakBonusValue: '{amount} × sequência',
  empty: 'Novos pedidos chegam com o dia.',
  progress: '{have} / {target}',
  claimed: 'Resgatado',
  done: 'Feito',
  claim: 'Resgatar',
  streakToast: {
    title: 'Sequência de {n} dias',
    subtitle: 'Todos os pedidos de hoje estão feitos.',
  },
  trophies: 'Troféus {got}/{total}',
  a11y: {
    trophyUnlocked: '{title}: {desc}, desbloqueado',
    trophyLocked: '{title}: {desc}, bloqueado',
  },
} satisfies Shape<typeof en>;
