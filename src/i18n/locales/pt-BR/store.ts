// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/store';

export default {
  stillCounting: 'Ainda contando moedas.',
  noGame: 'Nenhum jogo carregado.',
  load: {
    noApi: 'A API de dados não está configurada.',
    badPack: 'Pacote de região não suportado.',
    noPack: 'Nenhum pacote incluído para {id}',
    http: 'HTTP {status}',
  },
} satisfies Shape<typeof en>;
