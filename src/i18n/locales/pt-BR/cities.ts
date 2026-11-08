// Machine-drafted pt-BR translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: 'Cidades',
  subtitle: 'Cada cidade tem seu próprio negócio',
  section: {
    current: 'Cidade atual',
    area: 'Sua região',
    cities: 'Cidades',
  },
  chapterMachines: {
    one: 'Capítulo {chapter} · {n} máquina',
    other: 'Capítulo {chapter} · {n} máquinas',
  },
  label: {
    saved: 'Salva',
    current: 'Atual',
    newSave: 'Novo jogo',
  },
  a11y: {
    row: '{name}, hora local {time}, {label}',
    switchHint: 'Ir para esta cidade',
  },
  openFailed: 'Não foi possível abrir essa cidade.',
  confirm: {
    startTitle: 'Começar em {name}?',
    goTitle: 'Ir para {name}?',
    startBody: 'Um negócio novo, com um jogo novo. Seu progresso em {current} continua salvo.',
    goBody: 'Seu progresso em {current} é salvo antes.',
    thisCity: 'esta cidade',
    cancel: 'Cancelar',
    start: 'Começar',
    go: 'Ir',
    branchTitle: 'Abrir uma filial em {name}?',
    branchBody: 'O dinheiro, o capítulo e a pesquisa da sua empresa vêm junto, e {current} continua vendendo enquanto você está fora.',
    branch: 'Abrir filial',
    lockedTitle: 'Filiais abrem no capítulo {n}',
    lockedBody: 'A partir do capítulo {n}, cada cidade que você abre é filial de uma só empresa. Até lá, {name} seria um negócio separado, com dinheiro próprio.',
    separate: 'Começar separado',
    fullTitle: '{count} cidades é o limite por enquanto',
    fullBody: 'Sua empresa pode operar {count} cidades. O próximo capítulo libera mais.',
  },
  footer:
    'Ao trocar, esta cidade é salva primeiro. A partir do capítulo 3, suas cidades são filiais de uma empresa, com dinheiro e progresso compartilhados.',
  opening: 'Abrindo cidade…',
} satisfies Shape<typeof en>;
