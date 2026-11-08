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
  districtLocked: 'Esta área abre no capítulo {n}. Sua área aberta tem contorno laranja.',
  lockedType: '🔒 {type} · Cap. {n}',
  hoodLocked: '{name} abre no capítulo {n}. Sua área aberta tem contorno laranja.',
  placeMine: 'Instalar minha máquina aqui',
  placeType: 'Instalar {type}',
  nearby: 'Por perto',
  noNearby: 'Nenhum local com nome a até 400 m.',
  placeLine: '{category} · {distance}',
  host: 'Sede',
  use: 'Usar',
  report: 'Denunciar',
  attribution: 'Locais de dados abertos de mapas. Sem afiliação ou endosso.',
  about: 'Sobre esta área',
  passing: 'passam / h',
  residents: 'moradores',
  vending: 'Vending perto: {yours} suas · {rival} rival · {stores} lojas',
  night: {
    low: 'Movimentada à noite: segura para máquinas',
    medium: 'Calma à noite',
    high: 'Deserta à noite: mais vandalismo',
  },
  a11y: {
    passing: '{n} pessoas passam por hora',
    residents: '{n} moradores',
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
