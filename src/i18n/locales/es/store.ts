// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/store';

export default {
  stillCounting: 'Aún contando monedas.',
  noGame: 'No hay partida cargada.',
  load: {
    noApi: 'La API de datos no está configurada.',
    badPack: 'Paquete de región no compatible.',
    noPack: 'No hay paquete incluido para {id}',
    http: 'HTTP {status}',
  },
} satisfies Shape<typeof en>;
