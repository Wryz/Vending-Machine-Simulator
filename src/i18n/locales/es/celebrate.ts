// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/celebrate';

export default {
  kind: {
    chapter: 'Capítulo completado',
    trophy: 'Trofeo',
    order: 'Pedido completado',
    streak: 'Pedidos listos',
    event: 'Pronto cerca',
    info: 'Nota',
  },
  a11y: '{label}: {title}. Toca para cerrar.',
  moment: {
    chapterTitle: '{n}. {title}',
    next: 'Siguiente: {goal}',
    unlocked: 'Desbloqueado: {unlock}',
    eventTitle: '{event} en {place}',
    startsMin: 'Empieza en {n} min',
    startsHours: 'Empieza en {n} h',
    orderReady: 'Pedido listo para cobrar',
  },
} satisfies Shape<typeof en>;
