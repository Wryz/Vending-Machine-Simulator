// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  section: {
    term: 'Prazo',
    exclusivity: 'Exclusividade',
  },
  days: { one: '{n} dia', other: '{n} dias' },
  permanent: 'Permanente',
  permanentNote: 'Sua primeira máquina fica aqui para sempre: sem prazo nem renovações.',
  termChip: '{days} · {pct}',
  termNote:
    'Dias úteis. Prazos maiores baixam a comissão. Contratos renovam enquanto o local estiver satisfeito.',
  exclusive: 'Manter a Brightvend fora deste quarteirão (+{pct} de comissão)',
  exclusiveA11y: 'Contrato exclusivo',
  contract: {
    machine: 'Máquina',
    commission: 'Comissão do local',
    term: 'Prazo',
    exclusive: 'Exclusivo',
    yes: 'Sim',
    no: 'Não',
    price: 'Preço da máquina',
    install: 'Instalação',
  },
  disclaimer: 'Locais exibidos a partir de dados abertos de mapas. Sem afiliação ou endosso.',
  total: 'Total hoje',
} satisfies Shape<typeof en>;
