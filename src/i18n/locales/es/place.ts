// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  heading: {
    n: 'Mira al N',
    e: 'E',
    s: 'S',
    w: 'O',
  },
  section: {
    term: 'Plazo',
    exclusivity: 'Exclusividad',
    facing: 'Orientación',
  },
  days: { one: '{n} día', other: '{n} días' },
  termNote:
    'Días hábiles. Plazos más largos bajan la comisión. Los contratos se renuevan mientras el local esté contento.',
  exclusive: 'Mantén a Brightvend fuera de esta cuadra (+{pct} de comisión)',
  exclusiveA11y: 'Contrato exclusivo',
  contract: {
    machine: 'Máquina',
    commission: 'Comisión al local',
    term: 'Plazo',
    exclusive: 'Exclusivo',
    yes: 'Sí',
    no: 'No',
    price: 'Precio de la máquina',
    install: 'Instalación',
  },
  disclaimer: 'Lugares de datos de mapas abiertos. Sin afiliación ni respaldo.',
  total: 'Total hoy',
} satisfies Shape<typeof en>;
