// Machine-drafted es translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/onboarding';

export default {
  coldOpen: {
    subtitle: 'Simulador de máquinas expendedoras',
    clockA11y: '{city}, {time}',
    tagline: 'Una máquina usada. $250. Toda una ciudad.',
    insertCoin: 'Inserta moneda',
    insertCoinHint: 'Empieza tu negocio de máquinas expendedoras',
  },
  intro: {
    title: 'Cómo funciona',
    streetsTitle: 'Calles reales',
    streetsLine:
      'Coloca máquinas expendedoras en lugares reales de ciudades reales, donde la gente camina de verdad.',
    stockTitle: 'Llena, pon precio, recoge',
    stockLine: 'Llena tus máquinas, pon precios justos y mira a los clientes llegar y comprar.',
    empireTitle: 'De negocio extra a imperio',
    empireLine: 'Pasa de una máquina usada a camionetas, repartidores y una ciudad entera.',
    next: 'Siguiente',
    letsGo: '¡Vamos!',
    skip: 'Omitir',
  },
  location: {
    title: '¿Dónde empezar?',
    nearTitle: 'Estás cerca de {city}',
    nearBody: 'Crea tu negocio en las calles a tu alrededor.',
    farTitle: 'Tu zona aún no está en el mapa',
    farBody: 'La ciudad más cercana es {city}, a {km} km. Llegarán más ciudades.',
    offTitle: 'La ubicación está desactivada para Coinline',
    offBody: 'Activa la ubicación en Ajustes o elige una ciudad tú mismo.',
    startTitle: 'Empieza cerca de ti',
    approxLabel: 'Solo ubicación aproximada',
    approxValue: '~1 km',
    notStoredLabel: 'Tu ubicación nunca se guarda',
    notStoredValue: 'No se guarda',
    onceLabel: 'Se usa una vez, para elegir tu ciudad',
    onceValue: 'Una vez',
    startIn: 'Empezar en {city}',
    openSettings: 'Abrir Ajustes',
    useMyLocation: 'Usar mi ubicación',
    useMyLocationHint:
      'Usa tu ubicación aproximada una vez para encontrar la ciudad más cercana. Nunca se guarda.',
    exploreCities: 'Explorar ciudades',
    notFound: 'No pudimos encontrar tu ubicación. Elige una ciudad para empezar.',
    yourArea: 'Tu zona',
    loadFailed: 'No se pudo cargar esa ciudad.',
  },
  preview: {
    subtitle: 'Vista previa',
    localTime: 'Hora local real',
    hasBusiness: 'Tienes un negocio aquí',
    freshStart: 'Un nuevo comienzo',
    saved: 'Guardada',
    new: 'Nueva',
    switchNote:
      'Puedes cambiar de ciudad cuando quieras desde el mapa. Cada ciudad tiene su propio negocio.',
    continueIn: 'Seguir en {city}',
    startIn: 'Empezar en {city}',
    back: 'Volver a ciudades',
  },
  picker: {
    title: 'Explorar ciudades',
    subtitle: 'Toca una ciudad para echar un vistazo',
    rowA11y: '{city}, hora local {time}',
    rowA11ySaved: '{city}, hora local {time}, guardada',
    rowHint: 'Ver esta ciudad',
    saved: 'Guardada',
  },
} satisfies Shape<typeof en>;
