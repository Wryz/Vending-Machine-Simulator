// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: 'Ciudades',
  subtitle: 'Cada ciudad tiene su propio negocio',
  section: {
    current: 'Ciudad actual',
    area: 'Tu zona',
    cities: 'Ciudades',
  },
  chapterMachines: {
    one: 'Capítulo {chapter} · {n} máquina',
    other: 'Capítulo {chapter} · {n} máquinas',
  },
  label: {
    saved: 'Guardada',
    current: 'Actual',
    newSave: 'Nueva',
  },
  a11y: {
    row: '{name}, hora local {time}, {label}',
    switchHint: 'Cambiar a esta ciudad',
  },
  openFailed: 'No se pudo abrir esa ciudad.',
  confirm: {
    startTitle: '¿Empezar en {name}?',
    goTitle: '¿Ir a {name}?',
    startBody: 'Un negocio nuevo con una partida nueva. Tu progreso en {current} queda guardado.',
    goBody: 'Primero se guarda tu progreso en {current}.',
    thisCity: 'esta ciudad',
    cancel: 'Cancelar',
    start: 'Empezar',
    go: 'Ir',
  },
  footer:
    'Al cambiar, primero se guarda este negocio. Termina el capítulo 5 para vender la empresa y empezar de nuevo donde quieras con ventaja.',
  opening: 'Abriendo ciudad…',
} satisfies Shape<typeof en>;
