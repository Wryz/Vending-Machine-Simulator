// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/report';

export default {
  title: 'Mientras no estabas…',
  nothing: 'Nada que informar.',
  done: 'Listo',
  soldMachine: 'Una máquina que vendiste',
  aMachine: 'Una máquina',
  more: '· y {n} más',
  line: {
    sales: 'Ventas',
    items: 'Vendidos',
    costs: 'Costos',
    driverRuns: 'Viajes de reparto',
    breakdowns: 'Averías',
    thefts: 'Robos',
    spoiled: 'Caducados',
  },
  cashChange: 'Variación de dinero',
  footerCapped: 'Límite sin conexión alcanzado. {time} sin contar.',
  footerThanks: 'Gracias por su compra.',
  bestSpots: 'Mejores sitios',
  issue: {
    empty: 'Se vaciaron',
    cashFull: 'Caja llena',
    contractsLost: 'Contratos perdidos',
    events: 'Eventos locales',
    chapters: 'Capítulos completados',
  },
  chapterLine: '{n}. {title}',
  lostNote: 'Las máquinas de contratos perdidos volvieron al depósito. Colócalas desde el llavero.',
  double: 'Duplícalo · ver un anuncio (+{amount})',
  doubleHint: 'Opcional. Muestra un anuncio corto y luego suma la misma cantidad otra vez.',
  noReward: 'Esta vez no hay recompensa.',
  added: '{amount} añadido',
} satisfies Shape<typeof en>;
