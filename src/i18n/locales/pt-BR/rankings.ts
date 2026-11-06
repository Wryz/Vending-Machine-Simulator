// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: 'Melhores operadores',
  subtitle: 'Esta semana em {city}',
  you: 'Você',
  rivalTag: 'Rival',
  day: 'Dia {n} de 7 · atualiza à meia-noite',
  final: 'Classificação final · nova semana começa hoje',
  preview: 'Prévia ao vivo · primeiro ranking à meia-noite',
  of: 'de {n}',
  overnightUp: { one: 'Subiu {n} posição esta noite', other: 'Subiu {n} posições esta noite' },
  overnightDown: { one: 'Caiu {n} posição esta noite', other: 'Caiu {n} posições esta noite' },
  overnightSame: 'Mesma posição de ontem',
  climbed: 'Você subiu de #{from} para #{to} esta noite',
  thisWeek: 'Suas vendas nesta semana',
  toPass: 'Mais {amount} para passar {name}',
  leading: 'Você lidera a cidade. Continue assim!',
  lastWeek: 'Semana passada: #{rank} de {n}',
  howItWorks: 'Ranking por vendas desde segunda. Atualiza toda noite à meia-noite, horário local.',
  a11y: {
    row: '{rank}. {name}: {amount}',
    chip: 'Posição {rank} de {n} na cidade. Abre o ranking.',
  },
  moment: {
    label: 'Ranking da cidade',
    passed: 'Você passou {name}!',
    top: 'Você é o nº 1 em {city}!',
    rank: '#{rank} em {city}',
  },
  company: {
    section: 'Ranking da cidade',
    open: 'Abrir ranking',
    none: 'O primeiro ranking sai à meia-noite.',
  },
} satisfies Shape<typeof en>;
