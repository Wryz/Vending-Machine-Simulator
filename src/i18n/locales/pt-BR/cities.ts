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
  },
  footer:
    'Ao trocar, este negócio é salvo antes. Conclua o capítulo 5 para vender a empresa e recomeçar em qualquer lugar com vantagem.',
  opening: 'Abrindo cidade…',
} satisfies Shape<typeof en>;
