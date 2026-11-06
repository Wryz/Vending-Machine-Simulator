// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: 'Esquina',
  ratingA11y: '{n} de 5',
  district: 'Distrito {n}',
  venueLine: '{category} · {distance} · Distrito {n}',
  section: {
    machine: 'Máquina',
    why: 'Por qué',
    nearby: 'Lugares cercanos',
  },
  owned: '{name} (tuya)',
  stat: {
    now: 'Clientes ahora',
    day: 'Por día hábil',
    sales: 'Ventas est./día',
  },
  perHour: '{n}/h',
  best: 'Mejor: {list}',
  theft: 'Riesgo de robo: {risk}',
  risk: {
    low: 'bajo',
    medium: 'medio',
    high: 'alto',
  },
  competitors: 'Competidores: {n}',
  commission: 'Comisión pedida ~{pct}',
  noNearby: 'No hay lugares con nombre a menos de 400 m.',
  host: 'Sede',
  use: 'Usar',
  report: 'Reportar',
  disclaimer: 'Lugares de datos de mapas abiertos. Sin afiliación ni respaldo.',
  districtLocked: 'Este distrito se desbloquea en un capítulo posterior.',
  placeMine: 'Colocar mi máquina aquí',
  placeType: 'Colocar {type} aquí',
  reportAlert: {
    title: '¿Reportar este lugar?',
    body: '{name} se ocultará en tu juego.',
    cancel: 'Cancelar',
    hide: 'Ocultar',
  },
} satisfies Shape<typeof en>;
