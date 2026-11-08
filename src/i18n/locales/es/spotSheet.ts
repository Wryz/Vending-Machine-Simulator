// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: 'Esquina',
  district: 'Distrito {n}',
  venueLine: '{category} · {distance}',
  perHour: 'por hora',
  perDay: 'por día',
  yours: '{type} (tuya)',
  districtLocked: 'Este distrito se desbloquea en un capítulo posterior.',
  placeMine: 'Colocar mi máquina aquí',
  placeType: 'Colocar {type}',
  nearby: 'Cerca',
  noNearby: 'No hay lugares con nombre a menos de 400 m.',
  placeLine: '{category} · {distance}',
  host: 'Sede',
  use: 'Usar',
  report: 'Reportar',
  attribution: 'Lugares de datos de mapas abiertos. Sin afiliación ni respaldo.',
  about: 'Sobre esta zona',
  passing: 'pasan / h',
  residents: 'residentes',
  vending: 'Vending cerca: {yours} tuyas · {rival} rival · {stores} tiendas',
  night: {
    low: 'Animada de noche: segura para máquinas',
    medium: 'Tranquila de noche',
    high: 'Desierta de noche: más vandalismo',
  },
  a11y: {
    passing: '{n} personas pasan por hora',
    residents: '{n} residentes',
    customers: '{n} clientes por hora',
    sales: '{amount} en ventas por día',
  },
  reportAlert: {
    title: '¿Reportar este lugar?',
    body: '{name} se ocultará en tu juego.',
    cancel: 'Cancelar',
    confirm: 'Ocultar',
  },
} satisfies Shape<typeof en>;
