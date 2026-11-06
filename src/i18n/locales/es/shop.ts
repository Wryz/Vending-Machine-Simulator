// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/shop';

export default {
  title: 'Tienda',
  subtitle: 'Compras únicas. Sin suscripciones.',
  products: {
    removeAds: {
      title: 'Sin anuncios + pausas más largas',
      detail: 'Oculta las ofertas de anuncios y sube un 25% el límite sin conexión.',
    },
    starterPack: {
      title: 'Pack inicial',
      detail:
        'Mejora de camioneta, dos máquinas de snacks y {amount} en efectivo. Se ofrece una vez tras el capítulo 1.',
    },
    doubleProfits: {
      title: 'Ganancias dobles',
      detail: 'Cada venta paga el doble, para siempre.',
    },
  },
  owned: 'Tuyo',
  doubleProfitsNote:
    'Todas las máquinas, todas las ciudades. Los objetivos de capítulo cuentan las ventas normales.',
  buy: 'Comprar · {price}',
  starterAdded: 'Pack inicial añadido. Hay dos máquinas de snacks en el depósito.',
  starterPending: 'Compra registrada. Abre una ciudad para recibir el Pack inicial.',
  yours: '{title} ya es tuyo.',
  restored: 'Compras restauradas.',
  restoreFailed: 'No se pudieron restaurar las compras.',
  noReward: 'Esta vez no hay recompensa.',
  doubled: {
    one: 'Ganancias duplicadas durante {n} minuto.',
    other: 'Ganancias duplicadas durante {n} minutos.',
  },
  noStore: 'La tienda no está disponible en esta versión.',
  noStoreBody: 'Todo lo del juego se puede conseguir jugando.',
  section: {
    purchases: 'Compras',
    rewards: 'Recompensas gratis',
  },
  doubleTitle: {
    one: 'Duplica las ganancias durante {n} minuto',
    other: 'Duplica las ganancias durante {n} minutos',
  },
  doubleNote: 'Opcional. Solo se muestra un anuncio corto si tocas.',
  active: 'Activo · quedan {time}',
  addMinutes: {
    one: 'Suma {n} minuto · ver un anuncio',
    other: 'Suma {n} minutos · ver un anuncio',
  },
  watchAd: 'Ver un anuncio',
  restore: 'Restaurar compras',
} satisfies Shape<typeof en>;
