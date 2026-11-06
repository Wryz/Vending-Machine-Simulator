// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: 'Mejores operadores',
  subtitle: 'Esta semana en {city}',
  you: 'Tú',
  rivalTag: 'Rival',
  day: 'Día {n} de 7 · se actualiza a medianoche',
  final: 'Clasificación final · hoy empieza otra semana',
  preview: 'Vista previa · primera clasificación a medianoche',
  of: 'de {n}',
  overnightUp: { one: 'Subes {n} puesto esta noche', other: 'Subes {n} puestos esta noche' },
  overnightDown: { one: 'Bajas {n} puesto esta noche', other: 'Bajas {n} puestos esta noche' },
  overnightSame: 'Mismo puesto que anoche',
  climbed: 'Subiste del #{from} al #{to} esta noche',
  thisWeek: 'Tus ventas esta semana',
  toPass: '{amount} más para superar a {name}',
  leading: 'Lideras la ciudad. ¡Sigue así!',
  lastWeek: 'Semana pasada: #{rank} de {n}',
  howItWorks:
    'Clasificación por ventas desde el lunes. Se actualiza cada noche a medianoche, hora local.',
  a11y: {
    row: '{rank}. {name}: {amount}',
    chip: 'Puesto {rank} de {n} en la ciudad. Abre la clasificación.',
  },
  moment: {
    label: 'Clasificación',
    passed: '¡Superaste a {name}!',
    top: '¡Eres el n.º 1 en {city}!',
    rank: '#{rank} en {city}',
  },
  company: {
    section: 'Clasificación de la ciudad',
    open: 'Ver clasificación',
    none: 'La primera clasificación llega a medianoche.',
  },
} satisfies Shape<typeof en>;
