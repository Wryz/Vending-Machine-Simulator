// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/collections';

export default {
  title: 'Colecciones',
  noGame: 'No hay ningún negocio abierto.',
  subtitle: { one: '{n} objeto coleccionado', other: '{n} objetos coleccionados' },
  rarity: {
    common: 'Común',
    uncommon: 'Poco común',
    rare: 'Raro',
    ultra: 'Ultra',
  },
  reveal: {
    a11y: 'Conseguiste {item}, {rarity}',
    a11yNew: 'Conseguiste {item}, {rarity}, nuevo',
    isNew: '{rarity} · Nuevo',
    duplicate: '{rarity} · Repetido',
  },
  perkDone: 'Completa. +{pct} de ventas en máquinas de {family}.',
  perkGoal: 'Completa la serie para +{pct} de ventas en máquinas de {family}.',
  a11y: {
    owned: '{item}, {rarity}, tienes {n}',
    missing: 'Número {n}, aún sin encontrar',
  },
  section: {
    pulls: 'Tiradas',
    odds: 'Probabilidades',
  },
  buyPull: 'Comprar tirada · {price}',
  locked:
    'Las tiradas se compran desde el capítulo 3 (S.R.L.). Las máquinas de cápsulas pueden dar una tirada gratis al recoger su dinero.',
  freePull: {
    one: 'Tirada gratis · ver un anuncio (queda {n} hoy)',
    other: 'Tirada gratis · ver un anuncio (quedan {n} hoy)',
  },
  noFreePulls: 'No quedan tiradas gratis hoy',
  freePullHint: 'Opcional. Muestra un anuncio corto y luego abre una cápsula.',
  capsuleDrop:
    'Las máquinas de cápsulas también dan una tirada gratis el {pct} de las veces que recoges su dinero.',
  oddsNote:
    'Cada tirada elige una rareza con estas probabilidades y luego un objeto al azar de esa rareza. Las tiradas solo usan dinero del juego.',
  noReward: 'Esta vez no hay recompensa.',
} satisfies Shape<typeof en>;
