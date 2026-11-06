// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/place';

export default {
  heading: {
    n: 'Frente N',
    e: 'L',
    s: 'S',
    w: 'O',
  },
  section: {
    term: 'Prazo',
    exclusivity: 'Exclusividade',
    facing: 'Direção',
  },
  days: { one: '{n} dia', other: '{n} dias' },
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
