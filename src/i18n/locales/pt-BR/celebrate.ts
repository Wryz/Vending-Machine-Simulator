// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: 'Capítulo concluído',
    trophy: 'Troféu',
    order: 'Pedido concluído',
    streak: 'Todos os pedidos feitos',
    event: 'Em breve por perto',
    info: 'Aviso',
    research: 'Pesquisa concluída',
  },
  modal: {
    title: 'Boas notícias',
    claim: 'Resgatar {amount}',
    ok: 'OK',
    waiting: 'Recompensas esperando por você.',
  },
  a11y: '{label}: {title}. Toque para fechar.',
  moment: {
    chapterTitle: '{n}. {title}',
    next: 'Próximo: {goal}',
    unlocked: 'Desbloqueado: {unlock}',
    eventTitle: '{event} em {place}',
    startsMin: 'Começa em {n} min',
    startsHours: 'Começa em {n} h',
    orderReady: 'Pedido pronto para resgatar',
  },
} satisfies Shape<typeof en>;
