// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: 'Coleções',
  noGame: 'Nenhum negócio aberto.',
  subtitle: { one: '{n} item coletado', other: '{n} itens coletados' },
  rarity: {
    common: 'Comum',
    uncommon: 'Incomum',
    rare: 'Raro',
    ultra: 'Ultra',
  },
  reveal: {
    a11y: 'Você ganhou {item}, {rarity}',
    a11yNew: 'Você ganhou {item}, {rarity}, novo',
    isNew: '{rarity} · Novo',
    duplicate: '{rarity} · Repetido',
  },
  perkDone: 'Completa. +{pct} de vendas em máquinas de {family}.',
  perkGoal: 'Complete a coleção para +{pct} de vendas em máquinas de {family}.',
  a11y: {
    owned: '{item}, {rarity}, {n} no álbum',
    missing: 'Número {n}, ainda não encontrado',
  },
  section: {
    pulls: 'Giros',
    odds: 'Chances',
  },
  buyPull: 'Comprar giro · {price}',
  locked:
    'Comprar giros é liberado no capítulo 3 (Ltda.). Máquinas de cápsula ainda podem dar um giro grátis quando você coleta o dinheiro delas.',
  freePull: {
    one: 'Giro grátis · veja um anúncio (resta {n} hoje)',
    other: 'Giro grátis · veja um anúncio (restam {n} hoje)',
  },
  noFreePulls: 'Sem giros grátis hoje',
  freePullHint: 'Opcional. Passa um anúncio curto e abre uma cápsula.',
  capsuleDrop:
    'Máquinas de cápsula também dão um giro grátis em {pct} das vezes que você coleta o dinheiro.',
  oddsNote:
    'Cada giro sorteia uma raridade com essas chances e depois um item aleatório dessa raridade. Giros usam só dinheiro do jogo.',
  noReward: 'Sem prêmio desta vez.',
} satisfies Shape<typeof en>;
