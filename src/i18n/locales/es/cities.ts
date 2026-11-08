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
    branchTitle: '¿Abrir una sucursal en {name}?',
    branchBody: 'El dinero, el capítulo y la investigación de tu empresa vienen contigo, y {current} sigue vendiendo mientras no estás.',
    branch: 'Abrir sucursal',
    lockedTitle: 'Las sucursales se abren en el capítulo {n}',
    lockedBody: 'Desde el capítulo {n}, cada ciudad que abras es una sucursal de una sola empresa. Hasta entonces, {name} sería un negocio aparte con su propio dinero.',
    separate: 'Empezar aparte',
    farTitle: '{name} se abre en el capítulo {n}',
    farBody: 'Tu empresa crece desde tu ciudad de origen: primero tu estado o provincia, luego tu país, tu región, tu continente y al final el mundo entero.',
    fullTitle: '{count} ciudades es el límite por ahora',
    fullBody: 'Tu empresa puede llevar {count} ciudades. El siguiente capítulo permite más.',
  },
  footer:
    'Al cambiar se guarda primero esta ciudad. Desde el capítulo 3 tus ciudades son sucursales de una empresa, con dinero y progreso compartidos.',
  opening: 'Abriendo ciudad…',
} satisfies Shape<typeof en>;
