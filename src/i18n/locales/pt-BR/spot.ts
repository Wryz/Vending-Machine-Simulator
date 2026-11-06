// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: 'Esquina',
  ratingA11y: '{n} de 5',
  district: 'Distrito {n}',
  venueLine: '{category} · {distance} · Distrito {n}',
  section: {
    machine: 'Máquina',
    why: 'Por quê',
    nearby: 'Locais próximos',
  },
  owned: '{name} (sua)',
  stat: {
    now: 'Clientes agora',
    day: 'Por dia útil',
    sales: 'Vendas est./dia',
  },
  perHour: '{n}/h',
  best: 'Melhor: {list}',
  theft: 'Risco de furto: {risk}',
  risk: {
    low: 'baixo',
    medium: 'médio',
    high: 'alto',
  },
  competitors: 'Concorrentes: {n}',
  commission: 'Comissão pedida ~{pct}',
  noNearby: 'Nenhum local com nome a até 400 m.',
  host: 'Sede',
  use: 'Usar',
  report: 'Denunciar',
  disclaimer: 'Locais exibidos a partir de dados abertos de mapas. Sem afiliação ou endosso.',
  districtLocked: 'Este distrito é liberado num capítulo futuro.',
  placeMine: 'Instalar minha máquina aqui',
  placeType: 'Instalar {type} aqui',
  reportAlert: {
    title: 'Denunciar este local?',
    body: '{name} será ocultado do seu jogo.',
    cancel: 'Cancelar',
    hide: 'Ocultar',
  },
} satisfies Shape<typeof en>;
