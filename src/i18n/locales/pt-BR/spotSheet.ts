// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: 'Esquina',
  district: 'Distrito {n}',
  venueLine: '{category} · {distance}',
  perHour: 'por hora',
  perDay: 'por dia',
  yours: '{type} (sua)',
  districtLocked: 'Este distrito é liberado num capítulo futuro.',
  placeMine: 'Instalar minha máquina aqui',
  placeType: 'Instalar {type}',
  nearby: 'Por perto',
  noNearby: 'Nenhum local com nome a até 400 m.',
  placeLine: '{category} · {distance}',
  host: 'Sede',
  use: 'Usar',
  report: 'Denunciar',
  attribution: 'Locais de dados abertos de mapas. Sem afiliação ou endosso.',
  a11y: {
    customers: '{n} clientes por hora',
    sales: '{amount} em vendas por dia',
  },
  reportAlert: {
    title: 'Denunciar este local?',
    body: '{name} será ocultado do seu jogo.',
    cancel: 'Cancelar',
    confirm: 'Ocultar',
  },
} satisfies Shape<typeof en>;
