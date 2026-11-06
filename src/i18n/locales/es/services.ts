// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/services';

export default {
  products: {
    removeAds: {
      title: 'Sin anuncios + pausas más largas',
      detail: 'Oculta las ofertas de anuncios y sube un 25% el límite sin conexión.',
    },
    starterPack: {
      title: 'Pack inicial',
      detail:
        'Mejora de camioneta, dos máquinas de snacks y $2,000 en efectivo. Se ofrece una vez tras el capítulo 1.',
    },
    wrapNight: {
      title: 'Vinilo Turno de noche',
      detail: 'Un vinilo oscuro y discreto para la máquina. Cosmético.',
    },
    wrapLinen: {
      title: 'Vinilo Lino',
      detail: 'Vinilo blanco roto y cálido. Cosmético.',
    },
    lightingWarm: {
      title: 'Pack de luz cálida',
      detail: 'Luz cálida de sodio para los productos de noche. Cosmético.',
    },
  },
  errors: {
    storeUnavailable: 'La tienda no está disponible en esta versión.',
    productNotFound: 'Producto no encontrado.',
    purchaseFailed: 'La compra falló. No se te cobró.',
    restoreFailed: 'No se pudieron restaurar las compras.',
  },
} satisfies Shape<typeof en>;
